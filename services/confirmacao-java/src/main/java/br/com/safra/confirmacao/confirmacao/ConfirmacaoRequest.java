package br.com.safra.confirmacao.confirmacao;

import java.math.BigDecimal;
import java.util.List;

/**
 * Entrada de CT16, enviada pela API SAFRA com valores já recalculados no banco.
 * Números chegam como BigDecimal para rejeitar frações em campos inteiros, sem arredondamento implícito.
 */
public record ConfirmacaoRequest(
        String referencia,
        String carrinhoId,
        BigDecimal quantidadeItens,
        BigDecimal total,
        List<Item> itens) {

    public record Item(BigDecimal produtoId, String nome, BigDecimal quantidade, BigDecimal precoUnitario, BigDecimal subtotal) {
    }
}
