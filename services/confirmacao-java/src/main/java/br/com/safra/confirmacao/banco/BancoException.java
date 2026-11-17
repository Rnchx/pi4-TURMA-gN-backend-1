package br.com.safra.confirmacao.banco;

import java.sql.SQLException;
import java.sql.SQLTransientConnectionException;
import org.postgresql.util.PSQLException;
import org.postgresql.util.ServerErrorMessage;

/**
 * Falha de acesso ao PostgreSQL, classificada pelo SQLState. Nunca carrega SQL ou credenciais para o protocolo.
 * Subclasses: {@link ViolacaoDeIntegridade}, {@link ViolacaoDeUnicidade} e {@link Indisponivel}.
 */
public class BancoException extends RuntimeException {

    private final String sqlState;
    private final String restricao;

    BancoException(String sqlState, String restricao, Throwable causa) {
        super("Falha de acesso ao banco (SQLState " + sqlState + ").", causa);
        this.sqlState = sqlState;
        this.restricao = restricao;
    }

    public String sqlState() {
        return sqlState;
    }

    /** Nome da constraint violada, quando o PostgreSQL o informa (por exemplo, um índice único). */
    public String restricao() {
        return restricao;
    }

    /** Violação de chave estrangeira, CHECK, NOT NULL ou unicidade (classe 23). */
    public static class ViolacaoDeIntegridade extends BancoException {
        ViolacaoDeIntegridade(String sqlState, String restricao, Throwable causa) {
            super(sqlState, restricao, causa);
        }
    }

    /** unique_violation (23505). */
    public static final class ViolacaoDeUnicidade extends ViolacaoDeIntegridade {
        ViolacaoDeUnicidade(String sqlState, String restricao, Throwable causa) {
            super(sqlState, restricao, causa);
        }
    }

    /** Banco inacessível, conexão perdida, pool esgotado ou conflito transitório (deadlock/serialização). */
    public static final class Indisponivel extends BancoException {
        Indisponivel(String sqlState, Throwable causa) {
            super(sqlState, null, causa);
        }
    }

    static BancoException de(SQLException e) {
        String estado = e.getSQLState() == null ? "" : e.getSQLState();
        String restricao = null;
        if (e instanceof PSQLException psql) {
            ServerErrorMessage mensagem = psql.getServerErrorMessage();
            restricao = mensagem == null ? null : mensagem.getConstraint();
        }
        if (e instanceof SQLTransientConnectionException || estado.startsWith("08") || estado.startsWith("53")
                || estado.startsWith("57P") || estado.equals("40001") || estado.equals("40P01")) {
            return new Indisponivel(estado, e);
        }
        if (estado.equals("23505")) {
            return new ViolacaoDeUnicidade(estado, restricao, e);
        }
        if (estado.startsWith("23")) {
            return new ViolacaoDeIntegridade(estado, restricao, e);
        }
        return new BancoException(estado, restricao, e);
    }
}
