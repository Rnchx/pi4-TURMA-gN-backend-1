package br.com.safra.confirmacao.confirmacao;

/** Erros de CT16 com o código e a mensagem definidos no contrato (o status equivalente consta no contrato). */
public class ConfirmacaoException extends RuntimeException {

    private final int status;
    private final String codigo;

    ConfirmacaoException(int status, String codigo, String mensagem) {
        super(mensagem);
        this.status = status;
        this.codigo = codigo;
    }

    static ConfirmacaoException entradaInvalida() {
        return new ConfirmacaoException(400, "entradaInvalida", "Dados da confirmação inválidos.");
    }

    static ConfirmacaoException idempotenciaConflitante() {
        return new ConfirmacaoException(409, "idempotenciaConflitante", "A referência já foi utilizada.");
    }

    static ConfirmacaoException bancoIndisponivel() {
        return new ConfirmacaoException(503, "bancoIndisponivel", "A confirmação não pôde ser persistida.");
    }

    static ConfirmacaoException erroInterno() {
        return new ConfirmacaoException(500, "erroInterno", "A confirmação não pôde ser gerada.");
    }

    public int status() {
        return status;
    }

    public String codigo() {
        return codigo;
    }
}
