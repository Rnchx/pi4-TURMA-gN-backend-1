package br.com.safra.confirmacao.confirmacao;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import br.com.safra.confirmacao.banco.Banco;

/** Acesso a CT17 ({@code compras_demonstrativas}) e CT18 ({@code itens_compra}) com JDBC explícito. */
class ComprasRepository {

    record Compra(UUID id, UUID carrinhoId, UUID usuarioId, String confirmacaoId, String metodoPagamento,
            BigDecimal subtotal, String cupom, BigDecimal desconto, BigDecimal total, OffsetDateTime criadaEm) {
    }

    record ItemCompra(long produtoId, int quantidade, BigDecimal precoUnitario) {
    }

    private static final String COLUNAS = "id, carrinho_id, usuario_id, confirmacao_id, metodo_pagamento, subtotal, cupom_codigo, "
            + "desconto, total, criada_em";

    private static final Banco.Linha<Compra> COMPRA = rs -> new Compra(
            rs.getObject("id", UUID.class), rs.getObject("carrinho_id", UUID.class), rs.getObject("usuario_id", UUID.class),
            rs.getString("confirmacao_id"), rs.getString("metodo_pagamento"), rs.getBigDecimal("subtotal"),
            rs.getString("cupom_codigo"), rs.getBigDecimal("desconto"), rs.getBigDecimal("total"),
            rs.getObject("criada_em", OffsetDateTime.class));

    private final Banco banco;

    ComprasRepository(Banco banco) {
        this.banco = banco;
    }

    /**
     * Serializa as confirmações da mesma conta até o fim da transação. Assim a regra "primeira compra"
     * de um cupom é reavaliada depois que qualquer confirmação concorrente da mesma conta terminou.
     */
    void bloquearUsuario(UUID usuarioId) {
        banco.extrair("SELECT pg_advisory_xact_lock(20261116, hashtext(?))", rs -> null, usuarioId.toString());
    }

    Optional<Compra> porChave(String chave) {
        return banco.primeiro("SELECT " + COLUNAS + " FROM compras_demonstrativas WHERE chave_idempotencia = ?", COMPRA, chave);
    }

    Optional<Compra> porCarrinho(UUID carrinhoId) {
        return banco.primeiro("SELECT " + COLUNAS + " FROM compras_demonstrativas WHERE carrinho_id = ?", COMPRA, carrinhoId);
    }

    List<ItemCompra> itens(UUID compraId) {
        return banco.lista("SELECT produto_id, quantidade, preco_unitario FROM itens_compra WHERE compra_id = ? ORDER BY produto_id",
                rs -> new ItemCompra(rs.getLong("produto_id"), rs.getInt("quantidade"), rs.getBigDecimal("preco_unitario")),
                compraId);
    }

    Compra inserir(UUID id, UUID carrinhoId, UUID usuarioId, String chave, String confirmacaoId, String metodoPagamento,
            BigDecimal subtotal, String cupom, BigDecimal desconto, BigDecimal total) {
        return banco.primeiro("""
                INSERT INTO compras_demonstrativas(id, carrinho_id, usuario_id, chave_idempotencia, confirmacao_id,
                  metodo_pagamento, subtotal, cupom_codigo, desconto, total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING """ + " " + COLUNAS, COMPRA, id, carrinhoId, usuarioId,
                chave, confirmacaoId, metodoPagamento, subtotal, cupom, desconto, total).orElseThrow();
    }

    void inserirItens(UUID compraId, List<ConfirmacaoService.ItemValidado> itens) {
        banco.lote("""
                INSERT INTO itens_compra(compra_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)""", itens, (ps, item) -> {
            ps.setObject(1, compraId);
            ps.setLong(2, item.produtoId());
            ps.setString(3, item.nome());
            ps.setInt(4, item.quantidade());
            ps.setBigDecimal(5, item.precoUnitario());
            ps.setBigDecimal(6, item.subtotal());
        });
    }
}
