package br.com.safra.confirmacao.confirmacao;

import java.time.OffsetDateTime;

/** Saída de CT16. A mensagem nunca menciona pagamento aprovado. */
public record ConfirmacaoResponse(String confirmacaoId, String compraId, String mensagem, OffsetDateTime geradaEm) {

    static final String MENSAGEM = "Compra demonstrativa concluída.";
}
