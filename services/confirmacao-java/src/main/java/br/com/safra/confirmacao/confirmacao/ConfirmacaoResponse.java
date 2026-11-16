package br.com.safra.confirmacao.confirmacao;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Saída de CT16. A mensagem nunca menciona pagamento aprovado. Valores calculados pelo serviço. */
public record ConfirmacaoResponse(String confirmacaoId, String compraId, String metodoPagamento, String mensagem,
        OffsetDateTime geradaEm, BigDecimal subtotal, String cupom, BigDecimal desconto, BigDecimal total) {

    static final String MENSAGEM = "Compra demonstrativa concluída.";
}
