package br.com.safra.confirmacao.tcp;

import tools.jackson.databind.ObjectMapper;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

/** Inicializa e encerra o ServerSocket junto com o ciclo de vida do Spring. */
@Component
public final class Servidor implements SmartLifecycle {
    private static final Logger log = LoggerFactory.getLogger(Servidor.class);
    private final ObjectMapper json;
    private final ProcessadorDeOperacoes processador;
    private final int porta;
    private final int timeoutMs;
    private final int limite;
    private final int maxConexoes;
    private volatile boolean ativo;
    private ServerSocket serverSocket;
    private ExecutorService aceitadora;
    private ExecutorService conexoes;

    public Servidor(ObjectMapper json, ProcessadorDeOperacoes processador,
            @Value("${safra.tcp.port}") int porta, @Value("${safra.tcp.timeout-ms}") int timeoutMs,
            @Value("${safra.tcp.max-message-bytes}") int limite,
            @Value("${safra.tcp.max-connections}") int maxConexoes) {
        this.json = json;
        this.processador = processador;
        this.porta = porta;
        this.timeoutMs = timeoutMs;
        this.limite = limite;
        this.maxConexoes = maxConexoes;
    }

    @Override public synchronized void start() {
        if (ativo) return;
        try {
            serverSocket = new ServerSocket();
            serverSocket.bind(new InetSocketAddress("0.0.0.0", porta), 50);
            conexoes = Executors.newFixedThreadPool(maxConexoes, Thread.ofPlatform().name("safra-conexao-", 0).factory());
            aceitadora = Executors.newSingleThreadExecutor(Thread.ofPlatform().name("safra-aceitadora").factory());
            aceitadora.execute(new AceitadoraDeConexao(serverSocket, conexoes, json, processador, limite, timeoutMs));
            ativo = true;
            log.info("Servidor TCP SAFRA iniciado na porta {}.", porta);
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível iniciar o servidor TCP.", e);
        }
    }

    @Override public synchronized void stop() {
        ativo = false;
        try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignorado) {}
        if (aceitadora != null) aceitadora.shutdownNow();
        if (conexoes != null) {
            conexoes.shutdown();
            try { if (!conexoes.awaitTermination(10, TimeUnit.SECONDS)) conexoes.shutdownNow(); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); conexoes.shutdownNow(); }
        }
        log.info("Servidor TCP SAFRA encerrado.");
    }

    @Override public boolean isRunning() { return ativo; }
    @Override public int getPhase() { return Integer.MAX_VALUE - 100; }
}
