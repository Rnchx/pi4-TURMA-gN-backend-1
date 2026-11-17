package br.com.safra.confirmacao.tcp;

import java.io.IOException;
import java.net.Socket;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.ObjectMapper;

/**
 * Atende uma conexão: registra o {@link Parceiro} no servidor, lê pedidos linha a linha, responde cada um e,
 * no {@code finally}, remove o parceiro do registro e fecha o socket (inclusive em timeout ou erro).
 * Um {@link PedidoParaSair} não recebe resposta comum: dispara o desligamento, e o solicitante recebe o
 * {@link ComunicadoDeDesligamento} junto com os demais clientes.
 */
public final class SupervisoraDeConexao implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(SupervisoraDeConexao.class);
    private static final String DESCONHECIDO = "desconhecido";

    private final Socket socket;
    private final ObjectMapper json;
    private final TratadorDePedidos tratador;
    private final Servidor servidor;
    private final int limiteBytes;
    private final int timeoutMs;

    public SupervisoraDeConexao(Socket socket, ObjectMapper json, TratadorDePedidos tratador, Servidor servidor,
            int limiteBytes, int timeoutMs) {
        this.socket = socket;
        this.json = json;
        this.tratador = tratador;
        this.servidor = servidor;
        this.limiteBytes = limiteBytes;
        this.timeoutMs = timeoutMs;
    }

    @Override
    public void run() {
        Parceiro parceiro;
        try {
            parceiro = new Parceiro(socket, json, limiteBytes, timeoutMs);
        } catch (IOException e) {
            fechar(socket);
            return;
        }
        if (!servidor.registrar(parceiro)) {
            // O desligamento já começou: avisa e encerra sem atender.
            try {
                parceiro.enviar(servidor.comunicadoAtual());
            } catch (IOException ignorado) {
                // Cliente já desconectado.
            }
            fechar(parceiro);
            return;
        }
        try {
            atender(parceiro);
        } catch (SocketTimeoutException e) {
            log.info("Conexão TCP encerrada por timeout.");
        } catch (Parceiro.MensagemMuitoGrandeException e) {
            log.warn("Conexão TCP recusada: mensagem acima do limite.");
            responderSemFalhar(parceiro, PedidoDeResultado.erro(DESCONHECIDO, "mensagemMuitoGrande", "A mensagem excede o limite permitido."));
        } catch (SocketException e) {
            log.debug("Conexão TCP encerrada: {}.", e.getClass().getSimpleName());
        } catch (IOException e) {
            log.warn("Conexão TCP encerrada: {}.", e.getClass().getSimpleName());
        } finally {
            servidor.remover(parceiro);
            fechar(parceiro);
        }
    }

    private void atender(Parceiro parceiro) throws IOException {
        while (true) {
            PedidoDeOperacao pedido;
            try {
                pedido = parceiro.receber();
            } catch (Parceiro.MensagemInvalidaException e) {
                parceiro.enviar(PedidoDeResultado.erro(DESCONHECIDO, "entradaInvalida", "Mensagem TCP inválida."));
                continue;
            }
            if (pedido == null) {
                return;
            }
            if (PedidoParaSair.reconhece(pedido)) {
                if (!ProcessadorDeOperacoes.requestIdValido(pedido.requestId())) {
                    parceiro.enviar(PedidoDeResultado.erro(DESCONHECIDO, "entradaInvalida", "Mensagem TCP inválida."));
                    continue;
                }
                servidor.solicitarDesligamento(new PedidoParaSair(pedido.requestId(), parceiro.origem(), OffsetDateTime.now()));
                continue;
            }
            log.debug("Solicitação TCP recebida: operação={}, requestId={}", pedido.operacao(), pedido.requestId());
            PedidoDeResultado resposta = tratador.processar(pedido);
            try {
                parceiro.enviar(resposta);
            } catch (Parceiro.MensagemMuitoGrandeException e) {
                parceiro.enviar(PedidoDeResultado.erro(resposta.requestId(), "respostaMuitoGrande", "A resposta excede o limite permitido."));
            }
            log.debug("Operação TCP concluída: sucesso={}, requestId={}", resposta.sucesso(), resposta.requestId());
        }
    }

    private static void responderSemFalhar(Parceiro parceiro, PedidoDeResultado resposta) {
        try {
            parceiro.enviar(resposta);
        } catch (IOException ignorado) {
            // A conexão será fechada de qualquer forma.
        }
    }

    private static void fechar(AutoCloseable recurso) {
        try {
            recurso.close();
        } catch (Exception ignorado) {
            // Recurso já fechado.
        }
    }
}
