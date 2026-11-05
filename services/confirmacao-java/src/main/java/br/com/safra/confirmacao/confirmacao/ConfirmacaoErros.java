package br.com.safra.confirmacao.confirmacao;

import br.com.safra.confirmacao.erro.ErroResposta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Erros de CT16 com os códigos e mensagens do contrato, sem SQL, stack trace ou dados de conexão. */
@RestControllerAdvice(assignableTypes = ConfirmacaoController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class ConfirmacaoErros {

    private static final Logger log = LoggerFactory.getLogger(ConfirmacaoErros.class);

    @ExceptionHandler(ConfirmacaoException.class)
    ResponseEntity<ErroResposta> confirmacao(ConfirmacaoException erro) {
        return ResponseEntity.status(erro.status()).body(new ErroResposta(erro.codigo(), erro.getMessage()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, HttpMediaTypeNotSupportedException.class})
    ResponseEntity<ErroResposta> entradaInvalida() {
        return confirmacao(ConfirmacaoException.entradaInvalida());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErroResposta> erroInterno(Exception erro) {
        log.error("Falha não tratada na confirmação", erro);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErroResposta("erroInterno", "A confirmação não pôde ser gerada."));
    }
}
