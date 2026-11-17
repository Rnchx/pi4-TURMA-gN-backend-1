package br.com.safra.confirmacao.tcp;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Aceita sockets enquanto o {@link ServerSocket} estiver aberto e entrega cada conexão a uma
 * {@link SupervisoraDeConexao} no pool limitado. Termina quando o servidor fecha o ServerSocket no desligamento.
 */
public final class AceitadoraDeConexao implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(AceitadoraDeConexao.class);

    private final ServerSocket servidor;
    private final ExecutorService conexoes;
    private final Servidor dono;

    public AceitadoraDeConexao(ServerSocket servidor, ExecutorService conexoes, Servidor dono) {
        this.servidor = servidor;
        this.conexoes = conexoes;
        this.dono = dono;
    }

    @Override
    public void run() {
        while (!servidor.isClosed()) {
            Socket socket;
            try {
                socket = servidor.accept();
            } catch (IOException e) {
                if (!servidor.isClosed()) {
                    log.warn("Falha ao aceitar conexão TCP: {}", e.getClass().getSimpleName());
                }
                continue;
            }
            try {
                conexoes.execute(dono.novaSupervisora(socket));
                log.debug("Conexão TCP interna estabelecida.");
            } catch (RejectedExecutionException desligando) {
                fechar(socket);
            }
        }
        log.debug("AceitadoraDeConexao encerrada.");
    }

    private static void fechar(Socket socket) {
        try {
            socket.close();
        } catch (IOException ignorado) {
            // Conexão recusada durante o desligamento.
        }
    }
}
