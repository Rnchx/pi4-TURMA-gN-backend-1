package br.com.safra.confirmacao.tcp;

import br.com.safra.confirmacao.config.Configuracao;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.ObjectMapper;

/**
 * Servidor TCP acadêmico: abre e controla manualmente o {@link ServerSocket}, entrega cada conexão aceita pela
 * {@link AceitadoraDeConexao} a uma {@link SupervisoraDeConexao} em um pool limitado e mantém o registro
 * thread-safe dos {@link Parceiro parceiros} ativos.
 *
 * <p>Desligamento ordenado ({@link #desligar}), executado uma única vez:
 * <ol>
 * <li>fecha o ServerSocket (nenhuma nova conexão é aceita) e bloqueia novos registros;</li>
 * <li>cria um {@link ComunicadoDeDesligamento} e o envia a todos os parceiros ativos, inclusive ao solicitante;</li>
 * <li>envia FIN e aguarda um curto intervalo para os clientes lerem o aviso;</li>
 * <li>fecha os sockets, encerra a aceitadora e as supervisoras e aguarda os executores;</li>
 * <li>fecha os recursos registrados (pool de conexões com o banco) e libera quem aguarda o encerramento.</li>
 * </ol>
 * Um {@link PedidoParaSair} recebido por uma supervisora dispara o desligamento em uma thread dedicada
 * ({@code safra-desligamento}), fora do pool de conexões: assim a sequência pode aguardar o próprio pool terminar
 * sem deadlock.
 */
public final class Servidor {

    private static final Logger log = LoggerFactory.getLogger(Servidor.class);

    private final Configuracao.Tcp configuracao;
    private final ObjectMapper json;
    private final TratadorDePedidos tratador;
    private final List<AutoCloseable> recursos;

    private final Set<Parceiro> ativos = ConcurrentHashMap.newKeySet();
    private final Object registro = new Object();
    private final AtomicBoolean desligamentoIniciado = new AtomicBoolean();
    private final CountDownLatch encerrado = new CountDownLatch(1);

    private volatile boolean aceitandoRegistros = true;
    private volatile ComunicadoDeDesligamento comunicado;
    private ServerSocket serverSocket;
    private ExecutorService aceitadora;
    private ExecutorService conexoes;

    public Servidor(Configuracao.Tcp configuracao, ObjectMapper json, TratadorDePedidos tratador, List<AutoCloseable> recursos) {
        this.configuracao = configuracao;
        this.json = json;
        this.tratador = tratador;
        this.recursos = List.copyOf(recursos);
    }

    public synchronized void iniciar() throws IOException {
        if (serverSocket != null) {
            throw new IllegalStateException("Servidor já iniciado.");
        }
        ServerSocket socket = new ServerSocket();
        socket.setReuseAddress(true);
        socket.bind(new InetSocketAddress(InetAddress.getByName(configuracao.enderecoBind()), configuracao.porta()), 50);
        serverSocket = socket;
        conexoes = Executors.newFixedThreadPool(configuracao.maxConexoes(), Thread.ofPlatform().name("safra-conexao-", 0).factory());
        aceitadora = Executors.newSingleThreadExecutor(Thread.ofPlatform().name("safra-aceitadora").factory());
        aceitadora.execute(new AceitadoraDeConexao(serverSocket, conexoes, this));
        log.info("Servidor TCP SAFRA iniciado em {}:{}.", configuracao.enderecoBind(), porta());
    }

    /** Porta efetivamente aberta (útil quando TCP_PORT=0 nos testes). */
    public int porta() {
        return serverSocket.getLocalPort();
    }

    public boolean ativo() {
        return !desligamentoIniciado.get() && serverSocket != null && !serverSocket.isClosed();
    }

    public int conexoesAtivas() {
        return ativos.size();
    }

    SupervisoraDeConexao novaSupervisora(java.net.Socket socket) {
        return new SupervisoraDeConexao(socket, json, tratador, this, configuracao.limiteBytes(), configuracao.timeoutMs());
    }

    /** Registra o parceiro. Recusa (false) quando o desligamento já começou. */
    boolean registrar(Parceiro parceiro) {
        synchronized (registro) {
            if (!aceitandoRegistros) {
                return false;
            }
            ativos.add(parceiro);
            return true;
        }
    }

    void remover(Parceiro parceiro) {
        ativos.remove(parceiro);
    }

    ComunicadoDeDesligamento comunicadoAtual() {
        ComunicadoDeDesligamento atual = comunicado;
        return atual != null ? atual : ComunicadoDeDesligamento.para(null);
    }

    /**
     * Chamado pela supervisora ao receber um {@link PedidoParaSair}. Não bloqueia: a sequência roda em uma thread
     * dedicada. Pedidos repetidos ou simultâneos são ignorados (o desligamento acontece uma única vez).
     */
    void solicitarDesligamento(PedidoParaSair pedido) {
        log.info("PedidoParaSair recebido: requestId={}, origem={}.", pedido.requestId(), pedido.origem());
        if (desligamentoIniciado.get()) {
            return;
        }
        Thread.ofPlatform().name("safra-desligamento").start(() -> desligar(pedido));
    }

    /** Desligamento por sinal do sistema operacional (shutdown hook) ou chamada direta. Bloqueia até concluir. */
    public void desligar(String motivo) {
        log.info("Desligamento solicitado: {}.", motivo);
        desligar((PedidoParaSair) null);
    }

    private void desligar(PedidoParaSair pedido) {
        if (!desligamentoIniciado.compareAndSet(false, true)) {
            aguardarEncerramentoSemInterromper();
            return;
        }
        try {
            executarDesligamento(pedido);
        } finally {
            encerrado.countDown();
        }
    }

    private void executarDesligamento(PedidoParaSair pedido) {
        // 1. Nenhuma nova conexão: fecha o ServerSocket e bloqueia novos registros.
        fecharServerSocket();
        List<Parceiro> avisar;
        synchronized (registro) {
            aceitandoRegistros = false;
            comunicado = ComunicadoDeDesligamento.para(pedido);
            avisar = new ArrayList<>(ativos);
        }
        // 2-3. Avisa todos os clientes ativos (o solicitante está entre eles).
        int avisados = 0;
        for (Parceiro parceiro : avisar) {
            try {
                parceiro.enviar(comunicado);
                parceiro.encerrarEscrita();
                avisados++;
            } catch (IOException e) {
                log.debug("Cliente já desconectado ao receber o comunicado: {}.", e.getClass().getSimpleName());
            }
        }
        log.info("ComunicadoDeDesligamento enviado a {} cliente(s) ativo(s).", avisados);
        // 4. Tempo para o flush chegar aos clientes antes de fechar os sockets.
        dormir(configuracao.esperaDesligamentoMs());
        // 5. Fecha os sockets: as supervisoras saem do read() e removem o parceiro no finally.
        for (Parceiro parceiro : avisar) {
            fecharSilenciosamente(parceiro);
        }
        // 6-8. Encerra a aceitadora e o pool das supervisoras.
        encerrar(aceitadora, "aceitadora");
        encerrar(conexoes, "conexões");
        // 9. Recursos externos (pool JDBC), na ordem inversa do registro.
        for (int i = recursos.size() - 1; i >= 0; i--) {
            fecharSilenciosamente(recursos.get(i));
        }
        log.info("Servidor TCP SAFRA encerrado.");
    }

    public void aguardarEncerramento() throws InterruptedException {
        encerrado.await();
    }

    public boolean aguardarEncerramento(long tempo, TimeUnit unidade) throws InterruptedException {
        return encerrado.await(tempo, unidade);
    }

    private void aguardarEncerramentoSemInterromper() {
        boolean interrompido = false;
        while (true) {
            try {
                encerrado.await();
                break;
            } catch (InterruptedException e) {
                interrompido = true;
            }
        }
        if (interrompido) {
            Thread.currentThread().interrupt();
        }
    }

    private synchronized void fecharServerSocket() {
        fecharSilenciosamente(serverSocket);
    }

    private void encerrar(ExecutorService executor, String nome) {
        if (executor == null) {
            return;
        }
        executor.shutdown();
        try {
            if (!executor.awaitTermination(configuracao.timeoutMs() + 2000L, TimeUnit.MILLISECONDS)) {
                log.warn("Executor de {} não terminou no prazo; interrompendo.", nome);
                executor.shutdownNow();
                executor.awaitTermination(2, TimeUnit.SECONDS);
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    private static void dormir(int milissegundos) {
        if (milissegundos <= 0) {
            return;
        }
        try {
            Thread.sleep(milissegundos);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void fecharSilenciosamente(AutoCloseable recurso) {
        if (recurso == null) {
            return;
        }
        try {
            recurso.close();
        } catch (Exception e) {
            log.debug("Falha ao fechar recurso: {}.", e.getClass().getSimpleName());
        }
    }
}
