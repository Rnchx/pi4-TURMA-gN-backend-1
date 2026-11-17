package br.com.safra.confirmacao.tcp;

import java.time.OffsetDateTime;

/**
 * Aviso enviado a todos os clientes conectados (inclusive ao solicitante) antes de o servidor fechar os sockets.
 * Formato no socket, uma linha JSON:
 * {@code {"tipo":"comunicadoDeDesligamento","mensagem":"O servidor será desligado.","requestId":"...","emitidoEm":"..."}}.
 * {@code requestId} é o do {@link PedidoParaSair} que originou o desligamento, ou {@code null} quando o motivo foi um
 * sinal do sistema operacional. Não tem o campo {@code sucesso}, então nunca é confundido com uma resposta comum.
 */
public record ComunicadoDeDesligamento(String tipo, String mensagem, String requestId, OffsetDateTime emitidoEm)
        implements Comunicado {

    public static final String TIPO = "comunicadoDeDesligamento";
    public static final String MENSAGEM = "O servidor será desligado.";

    public static ComunicadoDeDesligamento para(PedidoParaSair pedido) {
        return new ComunicadoDeDesligamento(TIPO, MENSAGEM, pedido == null ? null : pedido.requestId(), OffsetDateTime.now());
    }
}
