package br.com.safra.confirmacao.erro;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Substitui a página de erro padrão para falhas fora dos controllers (filtros, servlet). */
@RestController
public class ErroController implements ErrorController {

    @RequestMapping("${server.error.path:/error}")
    ResponseEntity<ErroResposta> erro(HttpServletRequest request) {
        Object atributo = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = atributo instanceof Integer codigo ? codigo : 500;
        return ResponseEntity.status(status).body(ErroResposta.paraStatus(status));
    }
}
