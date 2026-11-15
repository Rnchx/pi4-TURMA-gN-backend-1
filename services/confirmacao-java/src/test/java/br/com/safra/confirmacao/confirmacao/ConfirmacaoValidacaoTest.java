package br.com.safra.confirmacao.confirmacao;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ConfirmacaoValidacaoTest {
    private ConfirmacaoRequest valido(String metodo) {
        return new ConfirmacaoRequest("confirmacao-12345678", UUID.randomUUID().toString(), UUID.randomUUID().toString(), metodo,
                new BigDecimal("2"), new BigDecimal("11.00"), List.of(
                new ConfirmacaoRequest.Item(new BigDecimal("1"), "Pão", new BigDecimal("2"),
                        new BigDecimal("5.50"), new BigDecimal("11.00"))));
    }

    @Test void aceitaOsQuatroMetodosDemonstrativos() {
        for (String metodo : List.of("pix", "credito", "debito", "boleto")) ConfirmacaoService.validar(valido(metodo));
    }

    @Test void recusaMetodoAusenteOuInvalido() {
        for (String metodo : List.of("", "dinheiro", "cartao_real")) {
            assertThatThrownBy(() -> ConfirmacaoService.validar(valido(metodo))).isInstanceOf(ConfirmacaoException.class);
        }
    }

    @Test void recusaTotalOuQuantidadeDivergente() {
        ConfirmacaoRequest base = valido("pix");
        var total = new ConfirmacaoRequest(base.referencia(), base.carrinhoId(), base.usuarioId(), base.metodoPagamento(),
                base.quantidadeItens(), new BigDecimal("10.99"), base.itens());
        assertThatThrownBy(() -> ConfirmacaoService.validar(total)).isInstanceOf(ConfirmacaoException.class);
    }
}
