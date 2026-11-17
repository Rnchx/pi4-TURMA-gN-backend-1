package br.com.safra.confirmacao.banco;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import javax.sql.DataSource;

/**
 * Acesso JDBC explícito com PreparedStatement e transações manuais.
 *
 * <p>Toda consulta usa {@link PreparedStatement} com parâmetros posicionais e try-with-resources.
 * {@link #emTransacao} associa uma conexão à thread atual: as consultas feitas dentro dela participam da
 * mesma transação, com commit no fim e rollback em qualquer falha. Erros SQL são convertidos em
 * {@link BancoException} conforme o SQLState, sem expor SQL ou credenciais.
 */
public class Banco {

    @FunctionalInterface
    public interface Linha<T> {
        T mapear(ResultSet rs) throws SQLException;
    }

    @FunctionalInterface
    public interface Extrator<T> {
        T extrair(ResultSet rs) throws SQLException;
    }

    @FunctionalInterface
    public interface Preenchedor<T> {
        void preencher(PreparedStatement ps, T item) throws SQLException;
    }

    private final DataSource dataSource;
    private final ThreadLocal<Connection> transacaoAtual = new ThreadLocal<>();

    public Banco(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /** Lista de linhas mapeadas. */
    public <T> List<T> lista(String sql, Linha<T> linha, Object... parametros) {
        return extrair(sql, rs -> {
            List<T> resultado = new ArrayList<>();
            while (rs.next()) {
                resultado.add(linha.mapear(rs));
            }
            return resultado;
        }, parametros);
    }

    public <T> Optional<T> primeiro(String sql, Linha<T> linha, Object... parametros) {
        return lista(sql, linha, parametros).stream().findFirst();
    }

    /** Valor da primeira coluna da primeira linha (equivalente a queryForObject com tipo simples). */
    public <T> T valor(String sql, Class<T> tipo, Object... parametros) {
        return extrair(sql, rs -> rs.next() ? converter(rs.getObject(1), tipo) : null, parametros);
    }

    /** Converte números entre tipos (ex.: count(*) é bigint, lido como Integer), como esperam os serviços. */
    private static <T> T converter(Object valor, Class<T> tipo) {
        if (valor == null || tipo.isInstance(valor)) {
            return tipo.cast(valor);
        }
        if (valor instanceof Number numero) {
            if (tipo == Integer.class) {
                return tipo.cast(Math.toIntExact(numero.longValue()));
            }
            if (tipo == Long.class) {
                return tipo.cast(numero.longValue());
            }
            if (tipo == java.math.BigDecimal.class) {
                return tipo.cast(new java.math.BigDecimal(numero.toString()));
            }
        }
        throw new IllegalArgumentException("Conversão não suportada para " + tipo.getSimpleName() + ".");
    }

    public <T> T extrair(String sql, Extrator<T> extrator, Object... parametros) {
        return comConexao(conexao -> {
            try (PreparedStatement ps = conexao.prepareStatement(sql)) {
                vincular(ps, parametros);
                try (ResultSet rs = ps.executeQuery()) {
                    return extrator.extrair(rs);
                }
            }
        });
    }

    /** INSERT/UPDATE/DELETE; devolve a quantidade de linhas afetadas. */
    public int atualizar(String sql, Object... parametros) {
        return comConexao(conexao -> {
            try (PreparedStatement ps = conexao.prepareStatement(sql)) {
                vincular(ps, parametros);
                return ps.executeUpdate();
            }
        });
    }

    public <T> void lote(String sql, List<T> itens, Preenchedor<T> preenchedor) {
        comConexao(conexao -> {
            try (PreparedStatement ps = conexao.prepareStatement(sql)) {
                for (T item : itens) {
                    preenchedor.preencher(ps, item);
                    ps.addBatch();
                }
                ps.executeBatch();
                return null;
            }
        });
    }

    /**
     * Executa o trabalho em uma transação. Se já houver uma transação na thread, participa dela.
     * Qualquer exceção provoca rollback e é propagada.
     */
    public <T> T emTransacao(Supplier<T> trabalho) {
        if (transacaoAtual.get() != null) {
            return trabalho.get();
        }
        Connection conexao;
        try {
            conexao = dataSource.getConnection();
        } catch (SQLException e) {
            throw BancoException.de(e);
        }
        try (conexao) {
            conexao.setAutoCommit(false);
            transacaoAtual.set(conexao);
            T resultado;
            try {
                resultado = trabalho.get();
            } catch (RuntimeException | Error falha) {
                desfazer(conexao, falha);
                throw falha;
            }
            conexao.commit();
            return resultado;
        } catch (SQLException e) {
            throw BancoException.de(e);
        } finally {
            transacaoAtual.remove();
        }
    }

    private static void desfazer(Connection conexao, Throwable causa) {
        try {
            conexao.rollback();
        } catch (SQLException rollback) {
            causa.addSuppressed(rollback);
        }
    }

    @FunctionalInterface
    private interface Trabalho<T> {
        T executar(Connection conexao) throws SQLException;
    }

    private <T> T comConexao(Trabalho<T> trabalho) {
        Connection transacao = transacaoAtual.get();
        try {
            if (transacao != null) {
                return trabalho.executar(transacao);
            }
            try (Connection conexao = dataSource.getConnection()) {
                return trabalho.executar(conexao);
            }
        } catch (SQLException e) {
            throw BancoException.de(e);
        }
    }

    private static void vincular(PreparedStatement ps, Object[] parametros) throws SQLException {
        for (int i = 0; i < parametros.length; i++) {
            ps.setObject(i + 1, parametros[i]);
        }
    }
}
