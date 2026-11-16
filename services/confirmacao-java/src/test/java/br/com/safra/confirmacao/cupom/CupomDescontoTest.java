package br.com.safra.confirmacao.cupom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class CupomDescontoTest {
    private static BigDecimal v(String valor) {
        return new BigDecimal(valor);
    }

    @Test void descontoIntegralQuandoSubtotalCobre() {
        assertThat(CupomService.calcularDesconto(v("40.00"), v("120.50"))).isEqualByComparingTo("40.00");
        assertThat(CupomService.calcularDesconto(v("100.00"), v("100.00"))).isEqualByComparingTo("100.00");
    }

    @Test void descontoLimitadoAoSubtotalETotalNuncaNegativo() {
        BigDecimal subtotal = v("35.90");
        BigDecimal desconto = CupomService.calcularDesconto(v("100.00"), subtotal);
        assertThat(desconto).isEqualByComparingTo("35.90");
        assertThat(subtotal.subtract(desconto)).isEqualByComparingTo("0.00");
        assertThat(desconto.scale()).isEqualTo(2);
    }

    @Test void semArredondamentoDePontoFlutuante() {
        // 0.1 + 0.2 em double seria 0.30000000000000004; em BigDecimal o resultado é exato.
        BigDecimal subtotal = v("0.10").add(v("0.20"));
        assertThat(CupomService.calcularDesconto(v("40.00"), subtotal)).isEqualByComparingTo("0.30");
    }

    @Test void recusaValoresNegativos() {
        assertThatThrownBy(() -> CupomService.calcularDesconto(v("-1.00"), v("10.00"))).isInstanceOf(IllegalArgumentException.class);
    }
}
