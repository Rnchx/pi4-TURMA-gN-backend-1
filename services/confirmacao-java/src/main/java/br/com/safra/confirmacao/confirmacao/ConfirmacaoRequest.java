package br.com.safra.confirmacao.confirmacao;

import java.math.BigDecimal;
import java.util.List;

/**
 * Entrada de CT16, enviada pela API SAFRA com os itens recalculados no banco.
 * {@code subtotal} é a soma dos itens antes de qualquer desconto; {@code cupom} é opcional (null sem cupom).
 * O desconto e o total final nunca são recebidos: o serviço os calcula dentro da transação.
 * Números chegam como BigDecimal para rejeitar frações em campos inteiros, sem arredondamento implícito.
 */
public record ConfirmacaoRequest(
        String referencia,
        String carrinhoId,
        String usuarioId,
        String metodoPagamento,
        BigDecimal quantidadeItens,
        BigDecimal subtotal,
        String cupom,
        List<Item> itens) {

    public record Item(BigDecimal produtoId, String nome, BigDecimal quantidade, BigDecimal precoUnitario, BigDecimal subtotal) {
    }
}
