package br.com.safra.confirmacao.historico;

import br.com.safra.confirmacao.usuario.OperacaoException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Histórico de compras (CT24) e consulta de uma compra para "Adicionar novamente ao carrinho" (CT25).
 * O usuário vem sempre da sessão validada pela API; as consultas filtram por {@code usuario_id}, então
 * uma compra de outra conta é indistinguível de uma compra inexistente.
 */
@Service
public class HistoricoService {

    public static final int LIMITE_MAXIMO = 3;

    public record Listagem(String usuarioId, Integer limite) {
    }

    public record Consulta(String usuarioId, String compraId) {
    }

    public record Item(long produtoId, String nome, int quantidade, BigDecimal precoUnitario, BigDecimal subtotal) {
    }

    public record Compra(String compraId, String confirmacaoId, OffsetDateTime criadaEm, String metodoPagamento,
            BigDecimal subtotal, String cupom, BigDecimal desconto, BigDecimal total, int quantidadeItens, List<Item> itens) {
    }

    public record Historico(List<Compra> compras) {
    }

    private record Cabecalho(UUID id, String confirmacaoId, OffsetDateTime criadaEm, String metodoPagamento,
            BigDecimal subtotal, String cupom, BigDecimal desconto, BigDecimal total) {
    }

    private static final String COLUNAS = """
            SELECT id, confirmacao_id, criada_em, metodo_pagamento, subtotal, cupom_codigo, desconto, total
            FROM compras_demonstrativas""";

    private final JdbcTemplate jdbc;

    public HistoricoService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Historico listar(Listagem pedido) {
        UUID usuarioId = usuario(pedido == null ? null : pedido.usuarioId());
        int limite = pedido.limite() == null ? LIMITE_MAXIMO : pedido.limite();
        if (limite < 1 || limite > LIMITE_MAXIMO) {
            throw new OperacaoException("entradaInvalida", "Limite do histórico inválido.");
        }
        List<Cabecalho> cabecalhos = jdbc.query(COLUNAS + " WHERE usuario_id = ? ORDER BY criada_em DESC, id DESC LIMIT ?",
                (rs, n) -> cabecalho(rs), usuarioId, limite);
        return new Historico(comItens(cabecalhos));
    }

    public Compra consultar(Consulta pedido) {
        UUID usuarioId = usuario(pedido == null ? null : pedido.usuarioId());
        UUID compraId;
        try {
            compraId = UUID.fromString(pedido.compraId());
        } catch (RuntimeException e) {
            throw naoEncontrada();
        }
        List<Cabecalho> cabecalhos = jdbc.query(COLUNAS + " WHERE id = ? AND usuario_id = ?", (rs, n) -> cabecalho(rs),
                compraId, usuarioId);
        if (cabecalhos.isEmpty()) {
            throw naoEncontrada();
        }
        return comItens(cabecalhos).get(0);
    }

    private List<Compra> comItens(List<Cabecalho> cabecalhos) {
        if (cabecalhos.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<Item>> itens = new LinkedHashMap<>();
        cabecalhos.forEach(c -> itens.put(c.id(), new ArrayList<>()));
        String marcadores = String.join(",", cabecalhos.stream().map(c -> "?").toList());
        jdbc.query("SELECT compra_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal FROM itens_compra WHERE compra_id IN ("
                + marcadores + ") ORDER BY id", rs -> {
                    itens.get(rs.getObject("compra_id", UUID.class)).add(new Item(rs.getLong("produto_id"),
                            rs.getString("nome_produto"), rs.getInt("quantidade"), rs.getBigDecimal("preco_unitario"),
                            rs.getBigDecimal("subtotal")));
                }, cabecalhos.stream().map(Cabecalho::id).toArray());
        return cabecalhos.stream().map(c -> {
            List<Item> lista = List.copyOf(itens.get(c.id()));
            int unidades = lista.stream().mapToInt(Item::quantidade).sum();
            return new Compra(c.id().toString(), c.confirmacaoId(), c.criadaEm(), c.metodoPagamento(), c.subtotal(),
                    c.cupom(), c.desconto(), c.total(), unidades, lista);
        }).toList();
    }

    private static Cabecalho cabecalho(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Cabecalho(rs.getObject("id", UUID.class), rs.getString("confirmacao_id"),
                rs.getObject("criada_em", OffsetDateTime.class), rs.getString("metodo_pagamento"), rs.getBigDecimal("subtotal"),
                rs.getString("cupom_codigo"), rs.getBigDecimal("desconto"), rs.getBigDecimal("total"));
    }

    private static UUID usuario(String valor) {
        try {
            if (valor != null && valor.length() == 36) {
                return UUID.fromString(valor);
            }
        } catch (IllegalArgumentException ignorado) {
            // Mensagem pública abaixo.
        }
        throw new OperacaoException("naoAutorizado", "Faça login para continuar.");
    }

    private static OperacaoException naoEncontrada() {
        return new OperacaoException("compraNaoEncontrada", "Compra não encontrada.");
    }
}
