package br.com.safra.confirmacao.tcp;

import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.SocketException;
import java.util.concurrent.ExecutorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Aceita sockets e entrega cada conexão a uma supervisora no pool limitado. */
public final class AceitadoraDeConexao implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(AceitadoraDeConexao.class);
    private final ServerSocket servidor;
    private final ExecutorService conexoes;
    private final ObjectMapper json;
    private final ProcessadorDeOperacoes processador;
    private final int limite;
    private final int timeoutMs;

    public AceitadoraDeConexao(ServerSocket servidor, ExecutorService conexoes, ObjectMapper json,
            ProcessadorDeOperacoes processador, int limite, int timeoutMs) {
        this.servidor = servidor;
        this.conexoes = conexoes;
        this.json = json;
        this.processador = processador;
        this.limite = limite;
        this.timeoutMs = timeoutMs;
    }

    @Override public void run() {
        while (!servidor.isClosed()) {
            try {
                var socket = servidor.accept();
                log.info("Conexão TCP interna estabelecida.");
                conexoes.execute(new SupervisoraDeConexao(socket, json, processador, limite, timeoutMs));
            } catch (SocketException e) {
                if (!servidor.isClosed()) log.warn("Falha ao aceitar conexão TCP: {}", e.getClass().getSimpleName());
            } catch (IOException e) {
                log.warn("Falha ao aceitar conexão TCP: {}", e.getClass().getSimpleName());
            }
        }
    }
}
