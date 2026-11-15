package br.com.safra.confirmacao.usuario;

/** Erro de negócio seguro para atravessar o protocolo TCP. */
public class OperacaoException extends RuntimeException {
    private final String codigo;

    public OperacaoException(String codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }

    public String codigo() {
        return codigo;
    }
}
