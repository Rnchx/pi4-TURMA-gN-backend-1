package br.com.safra.confirmacao.confirmacao;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** CT16 gerarConfirmacaoDemonstrativa: 201 para uma nova compra, 200 quando devolve a compra original. */
@RestController
public class ConfirmacaoController {

    private final ConfirmacaoService servico;

    ConfirmacaoController(ConfirmacaoService servico) {
        this.servico = servico;
    }

    @PostMapping("/confirmacoes-demonstrativas")
    ResponseEntity<ConfirmacaoResponse> confirmar(@RequestBody ConfirmacaoRequest pedido) {
        ConfirmacaoService.Resultado resultado = servico.confirmar(pedido);
        return ResponseEntity.status(resultado.criada() ? HttpStatus.CREATED : HttpStatus.OK).body(resultado.resposta());
    }
}
