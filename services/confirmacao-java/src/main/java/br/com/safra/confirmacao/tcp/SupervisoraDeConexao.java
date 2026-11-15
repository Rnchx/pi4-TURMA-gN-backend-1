package br.com.safra.confirmacao.tcp;

import tools.jackson.databind.ObjectMapper;
import java.net.Socket;
import java.net.SocketTimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Gerencia uma conexão, recebe pedidos completos e sempre encerra seus recursos. */
public final class SupervisoraDeConexao implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(SupervisoraDeConexao.class);
    private final Socket socket;
    private final ObjectMapper json;
    private final ProcessadorDeOperacoes processador;
    private final int limite;
    private final int timeoutMs;

    public SupervisoraDeConexao(Socket socket, ObjectMapper json, ProcessadorDeOperacoes processador, int limite, int timeoutMs) {
        this.socket = socket;
        this.json = json;
        this.processador = processador;
        this.limite = limite;
        this.timeoutMs = timeoutMs;
    }

    @Override public void run() {
        try (Parceiro parceiro = new Parceiro(socket, json, limite, timeoutMs)) {
            PedidoDeOperacao pedido;
            while ((pedido = parceiro.receber()) != null) {
                log.info("Solicitação TCP recebida: operação={}, requestId={}", pedido.operacao(), pedido.requestId());
                PedidoDeResultado resposta = processador.processar(pedido);
                parceiro.enviar(resposta);
                log.info("Validação TCP concluída: sucesso={}, requestId={}", resposta.sucesso(), resposta.requestId());
            }
        } catch (SocketTimeoutException e) {
            log.warn("Conexão TCP encerrada por timeout.");
        } catch (Parceiro.MensagemMuitoGrandeException e) {
            log.warn("Conexão TCP recusada: mensagem acima do limite.");
        } catch (Exception e) {
            log.warn("Conexão TCP encerrada: {}", e.getClass().getSimpleName());
        }
    }
}
