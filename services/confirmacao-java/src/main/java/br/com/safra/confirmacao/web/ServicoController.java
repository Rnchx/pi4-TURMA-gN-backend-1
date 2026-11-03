package br.com.safra.confirmacao.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Identifica o serviço. A saúde fica em /actuator/health/liveness e /actuator/health/readiness. */
@RestController
public class ServicoController {

    public record Servico(String servico, String mensagem) {
    }

    @GetMapping("/")
    public Servico servico() {
        return new Servico("safra-confirmacao", "Serviço de Confirmação SAFRA.");
    }
}
