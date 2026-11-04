package br.com.safra.confirmacao.erro;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Converte exceções em JSON padronizado, sem stack trace, SQL ou dados de conexão. */
@RestControllerAdvice
public class TratadorDeErros {

    private static final Logger log = LoggerFactory.getLogger(TratadorDeErros.class);

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ErroResposta> rotaNaoEncontrada() {
        return responder(HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErroResposta> metodoNaoPermitido() {
        return responder(HttpStatus.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ErroResposta> tipoNaoSuportado() {
        return responder(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErroResposta> entradaInvalida() {
        return responder(HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataAccessResourceFailureException.class)
    ResponseEntity<ErroResposta> bancoIndisponivel(DataAccessResourceFailureException e) {
        log.warn("PostgreSQL indisponível: {}", e.getClass().getSimpleName());
        return responder(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErroResposta> erroInterno(Exception e) {
        log.error("Falha não tratada", e);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private static ResponseEntity<ErroResposta> responder(HttpStatus status) {
        return ResponseEntity.status(status).body(ErroResposta.paraStatus(status.value()));
    }
}
