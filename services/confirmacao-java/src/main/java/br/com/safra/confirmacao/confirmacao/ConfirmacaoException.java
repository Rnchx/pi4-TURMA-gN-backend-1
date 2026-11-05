package br.com.safra.confirmacao.confirmacao;

import org.springframework.http.HttpStatus;

/** Erros de CT16 com o código e a mensagem definidos no contrato. */
public class ConfirmacaoException extends RuntimeException {

    private final HttpStatus status;
    private final String codigo;

    ConfirmacaoException(HttpStatus status, String codigo, String mensagem) {
        super(mensagem);
        this.status = status;
        this.codigo = codigo;
    }

    static ConfirmacaoException entradaInvalida() {
        return new ConfirmacaoException(HttpStatus.BAD_REQUEST, "entradaInvalida", "Dados da confirmação inválidos.");
    }

    static ConfirmacaoException idempotenciaConflitante() {
        return new ConfirmacaoException(HttpStatus.CONFLICT, "idempotenciaConflitante", "A referência já foi utilizada.");
    }

    static ConfirmacaoException bancoIndisponivel() {
        return new ConfirmacaoException(HttpStatus.SERVICE_UNAVAILABLE, "bancoIndisponivel", "A confirmação não pôde ser persistida.");
    }

    static ConfirmacaoException erroInterno() {
        return new ConfirmacaoException(HttpStatus.INTERNAL_SERVER_ERROR, "erroInterno", "A confirmação não pôde ser gerada.");
    }

    public HttpStatus status() {
        return status;
    }

    public String codigo() {
        return codigo;
    }
}
