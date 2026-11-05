package br.com.safra.confirmacao.confirmacao;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/** Acesso a CT17 ({@code compras_demonstrativas}) e CT18 ({@code itens_compra}). */
@Repository
class ComprasRepository {

    record Compra(UUID id, UUID carrinhoId, String confirmacaoId, BigDecimal total, OffsetDateTime criadaEm) {
    }

    record ItemCompra(long produtoId, int quantidade, BigDecimal precoUnitario) {
    }

    private static final String COLUNAS = "id, carrinho_id, confirmacao_id, total, criada_em";

    private static final RowMapper<Compra> COMPRA = (rs, n) -> new Compra(
            rs.getObject("id", UUID.class), rs.getObject("carrinho_id", UUID.class), rs.getString("confirmacao_id"),
            rs.getBigDecimal("total"), rs.getObject("criada_em", OffsetDateTime.class));

    private final JdbcTemplate jdbc;

    ComprasRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    Optional<Compra> porChave(String chave) {
        return jdbc.query("SELECT " + COLUNAS + " FROM compras_demonstrativas WHERE chave_idempotencia = ?", COMPRA, chave)
                .stream().findFirst();
    }

    Optional<Compra> porCarrinho(UUID carrinhoId) {
        return jdbc.query("SELECT " + COLUNAS + " FROM compras_demonstrativas WHERE carrinho_id = ?", COMPRA, carrinhoId)
                .stream().findFirst();
    }

    List<ItemCompra> itens(UUID compraId) {
        return jdbc.query("SELECT produto_id, quantidade, preco_unitario FROM itens_compra WHERE compra_id = ? ORDER BY produto_id",
                (rs, n) -> new ItemCompra(rs.getLong("produto_id"), rs.getInt("quantidade"), rs.getBigDecimal("preco_unitario")),
                compraId);
    }

    Compra inserir(UUID id, UUID carrinhoId, String chave, String confirmacaoId, BigDecimal total) {
        return jdbc.queryForObject("""
                INSERT INTO compras_demonstrativas(id, carrinho_id, chave_idempotencia, confirmacao_id, total)
                VALUES (?, ?, ?, ?, ?) RETURNING """ + " " + COLUNAS, COMPRA, id, carrinhoId, chave, confirmacaoId, total);
    }

    void inserirItens(UUID compraId, List<ConfirmacaoService.ItemValidado> itens) {
        jdbc.batchUpdate("""
                INSERT INTO itens_compra(compra_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)""", itens, itens.size(), (ps, item) -> {
            ps.setObject(1, compraId);
            ps.setLong(2, item.produtoId());
            ps.setString(3, item.nome());
            ps.setInt(4, item.quantidade());
            ps.setBigDecimal(5, item.precoUnitario());
            ps.setBigDecimal(6, item.subtotal());
        });
    }
}
