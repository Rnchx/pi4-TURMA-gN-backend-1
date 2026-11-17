package br.com.safra.confirmacao.tcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.safra.confirmacao.config.Configuracao;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.ConnectException;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Servidor real em porta efêmera: concorrência, registro de parceiros e desligamento ordenado. */
class ServidorTest {

    private final ObjectMapper json = Json.criar();
    // Lista concorrente: vários clientes de teste conectam ao mesmo tempo.
    private final List<Socket> abertos = new CopyOnWriteArrayList<>();
    private Servidor servidor;
    private final AtomicBoolean recursoFechado = new AtomicBoolean();

    /** Tratador de teste: "eco" responde com os dados; "lento" demora para responder. */
    private final TratadorDePedidos tratador = pedido -> {
        if ("lento".equals(pedido.operacao())) {
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        return PedidoDeResultado.sucesso(pedido.requestId(), Map.of("operacao", pedido.operacao()));
    };

    private Servidor iniciar(int timeoutMs) throws Exception {
        servidor = new Servidor(new Configuracao.Tcp("127.0.0.1", 0, timeoutMs, 4096, 8, 100), json, tratador,
                List.of(() -> recursoFechado.set(true)));
        servidor.iniciar();
        return servidor;
    }

    @AfterEach
    void encerrar() throws Exception {
        for (Socket socket : abertos) {
            socket.close();
        }
        if (servidor != null) {
            servidor.desligar("fim do teste");
        }
    }

    private record Cliente(Socket socket, PrintWriter saida, BufferedReader entrada) {
        void enviar(String linha) {
            saida.print(linha + "\n");
            saida.flush();
        }

        String ler() throws IOException {
            return entrada.readLine();
        }
    }

    private Cliente conectar() throws Exception {
        Socket socket = new Socket("127.0.0.1", servidor.porta());
        socket.setSoTimeout(5000);
        abertos.add(socket);
        return new Cliente(socket, new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true),
                new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8)));
    }

    private static String pedido(String id, String operacao) {
        return "{\"requestId\":\"" + id + "\",\"operacao\":\"" + operacao + "\",\"dados\":{}}";
    }

    private void aguardarConexoes(int quantidade) throws InterruptedException {
        long limite = System.currentTimeMillis() + 3000;
        while (servidor.conexoesAtivas() != quantidade && System.currentTimeMillis() < limite) {
            Thread.sleep(10);
        }
        assertThat(servidor.conexoesAtivas()).isEqualTo(quantidade);
    }

    @Test
    void respondeDuasMensagensNaMesmaConexaoEJsonInvalidoSemDerrubar() throws Exception {
        iniciar(2000);
        Cliente cliente = conectar();
        cliente.enviar(pedido("a", "eco"));
        cliente.enviar("isto não é json");
        cliente.enviar(pedido("b", "eco"));
        assertThat(json.readTree(cliente.ler()).path("requestId").asText()).isEqualTo("a");
        JsonNode invalido = json.readTree(cliente.ler());
        assertThat(invalido.path("sucesso").asBoolean()).isFalse();
        assertThat(invalido.path("codigo").asText()).isEqualTo("entradaInvalida");
        assertThat(json.readTree(cliente.ler()).path("requestId").asText()).isEqualTo("b");
    }

    @Test
    void atendeVariasConexoesSimultaneas() throws Exception {
        iniciar(2000);
        ExecutorService clientes = Executors.newFixedThreadPool(5);
        try {
            List<Future<String>> respostas = new ArrayList<>();
            for (int i = 0; i < 5; i++) {
                String id = "c" + i;
                respostas.add(clientes.submit(() -> {
                    Cliente cliente = conectar();
                    cliente.enviar(pedido(id, "lento"));
                    return json.readTree(cliente.ler()).path("requestId").asText();
                }));
            }
            long inicio = System.nanoTime();
            for (int i = 0; i < 5; i++) {
                assertThat(respostas.get(i).get(5, TimeUnit.SECONDS)).isEqualTo("c" + i);
            }
            // 5 pedidos de 300 ms atendidos em paralelo, não em série (1,5 s).
            assertThat(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio)).isLessThan(1200);
        } finally {
            clientes.shutdownNow();
        }
    }

    @Test
    void supervisoraRemoveParceiroDoRegistroAoDesconectar() throws Exception {
        iniciar(2000);
        Cliente cliente = conectar();
        cliente.enviar(pedido("a", "eco"));
        cliente.ler();
        aguardarConexoes(1);
        cliente.socket().close();
        aguardarConexoes(0);
        // A aceitadora continua aceitando enquanto o servidor está ativo.
        Cliente outro = conectar();
        outro.enviar(pedido("b", "eco"));
        assertThat(json.readTree(outro.ler()).path("requestId").asText()).isEqualTo("b");
    }

    @Test
    void timeoutEncerraAConexaoELiberaORegistro() throws Exception {
        iniciar(200);
        Cliente cliente = conectar();
        aguardarConexoes(1);
        assertThat(cliente.ler()).isNull();
        aguardarConexoes(0);
    }

    @Test
    void mensagemAcimaDoLimiteRecebeErroEConexaoEhFechada() throws Exception {
        iniciar(2000);
        Cliente cliente = conectar();
        cliente.enviar("{\"requestId\":\"" + "x".repeat(5000) + "\"}");
        JsonNode erro = json.readTree(cliente.ler());
        assertThat(erro.path("codigo").asText()).isEqualTo("mensagemMuitoGrande");
        assertThat(cliente.ler()).isNull();
    }

    @Test
    void pedidoParaSairAvisaTodosOsClientesInclusiveOSolicitanteEEncerraTudo() throws Exception {
        iniciar(5000);
        Cliente primeiro = conectar();
        Cliente segundo = conectar();
        Cliente solicitante = conectar();
        aguardarConexoes(3);

        solicitante.enviar(pedido("sair-1", PedidoParaSair.OPERACAO));

        for (Cliente cliente : List.of(primeiro, segundo, solicitante)) {
            JsonNode comunicado = json.readTree(cliente.ler());
            assertThat(comunicado.path("tipo").asText()).isEqualTo(ComunicadoDeDesligamento.TIPO);
            assertThat(comunicado.path("mensagem").asText()).isEqualTo(ComunicadoDeDesligamento.MENSAGEM);
            assertThat(comunicado.path("requestId").asText()).isEqualTo("sair-1");
            assertThat(comunicado.has("sucesso")).isFalse();
            // Depois do comunicado o servidor fecha o socket.
            assertThat(cliente.ler()).isNull();
        }
        assertThat(servidor.aguardarEncerramento(10, TimeUnit.SECONDS)).isTrue();
        assertThat(servidor.ativo()).isFalse();
        assertThat(servidor.conexoesAtivas()).isZero();
        assertThat(recursoFechado).isTrue();
        // Nenhuma nova conexão é aceita.
        assertThatThrownBy(() -> new Socket("127.0.0.1", servidor.porta()).close()).isInstanceOf(ConnectException.class);
        // As threads do servidor terminaram (nada fica preso impedindo a JVM de encerrar).
        assertThat(Thread.getAllStackTraces().keySet()).noneMatch(t -> t.isAlive()
                && (t.getName().startsWith("safra-conexao-") || t.getName().equals("safra-aceitadora")
                || t.getName().equals("safra-desligamento")));
    }

    @Test
    void pedidosDeDesligamentoSimultaneosEncerramUmaUnicaVezSemDeadlock() throws Exception {
        iniciar(5000);
        Cliente a = conectar();
        Cliente b = conectar();
        aguardarConexoes(2);
        a.enviar(pedido("sair-a", PedidoParaSair.OPERACAO));
        b.enviar(pedido("sair-b", PedidoParaSair.OPERACAO));
        CountDownLatch largada = new CountDownLatch(1);
        Thread direta = Thread.ofPlatform().start(() -> {
            try {
                largada.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            servidor.desligar("teste concorrente");
        });
        largada.countDown();
        assertThat(servidor.aguardarEncerramento(10, TimeUnit.SECONDS)).isTrue();
        direta.join(5000);
        assertThat(direta.isAlive()).isFalse();
        // Cada cliente recebe exatamente um comunicado (o mesmo para todos) e depois o fim da conexão.
        String comunicadoA = a.ler();
        String comunicadoB = b.ler();
        assertThat(json.readTree(comunicadoA).path("tipo").asText()).isEqualTo(ComunicadoDeDesligamento.TIPO);
        assertThat(comunicadoA).isEqualTo(comunicadoB);
        assertThat(a.ler()).isNull();
        assertThat(b.ler()).isNull();
        // Chamadas posteriores são idempotentes e retornam imediatamente.
        servidor.desligar("de novo");
    }

    @Test
    void verificadorDeSaudeUsaOProtocoloTcp() throws Exception {
        servidor = new Servidor(new Configuracao.Tcp("127.0.0.1", 0, 2000, 4096, 4, 50), json,
                pedido -> "health".equals(pedido.operacao())
                        ? PedidoDeResultado.sucesso(pedido.requestId(), Map.of("servico", "disponivel"))
                        : PedidoDeResultado.erro(pedido.requestId(), "operacaoInvalida", "x"),
                List.of());
        servidor.iniciar();
        assertThat(VerificadorDeSaude.verificar("127.0.0.1", servidor.porta(), 2000)).isTrue();
        int porta = servidor.porta();
        servidor.desligar("teste");
        assertThat(VerificadorDeSaude.verificar("127.0.0.1", porta, 500)).isFalse();
    }
}
