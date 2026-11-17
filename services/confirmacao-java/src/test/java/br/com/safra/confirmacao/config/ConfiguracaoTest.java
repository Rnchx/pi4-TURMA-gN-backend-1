package br.com.safra.confirmacao.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ConfiguracaoTest {

    private static Map<String, String> minimo() {
        Map<String, String> ambiente = new HashMap<>();
        ambiente.put("DB_USER", "safra");
        ambiente.put("DB_PASSWORD", "segredo-super-secreto");
        return ambiente;
    }

    @Test
    void usaPadroesLocaisSeguros() {
        Configuracao configuracao = Configuracao.doAmbiente(minimo());
        assertThat(configuracao.tcp().enderecoBind()).isEqualTo("127.0.0.1");
        assertThat(configuracao.tcp().porta()).isEqualTo(3000);
        assertThat(configuracao.tcp().timeoutMs()).isEqualTo(10000);
        assertThat(configuracao.tcp().limiteBytes()).isEqualTo(32768);
        assertThat(configuracao.tcp().maxConexoes()).isEqualTo(50);
        assertThat(configuracao.banco().url()).isEqualTo("jdbc:postgresql://localhost:5432/safra");
        assertThat(configuracao.banco().toString()).doesNotContain("segredo");
    }

    @Test
    void leVariaveisDoDocker() {
        Map<String, String> ambiente = minimo();
        ambiente.putAll(Map.of("TCP_BIND_ADDRESS", "0.0.0.0", "TCP_PORT", "3100", "DB_HOST", "postgres", "DB_NAME", "safra_test"));
        Configuracao configuracao = Configuracao.doAmbiente(ambiente);
        assertThat(configuracao.tcp().enderecoBind()).isEqualTo("0.0.0.0");
        assertThat(configuracao.tcp().porta()).isEqualTo(3100);
        assertThat(configuracao.banco().url()).isEqualTo("jdbc:postgresql://postgres:5432/safra_test");
    }

    @Test
    void recusaValoresInvalidosSemExporSegredos() {
        Map<String, String> semSenha = minimo();
        semSenha.remove("DB_PASSWORD");
        assertThatThrownBy(() -> Configuracao.doAmbiente(semSenha)).hasMessageContaining("DB_PASSWORD");
        Map<String, String> porta = minimo();
        porta.put("TCP_PORT", "70000");
        assertThatThrownBy(() -> Configuracao.doAmbiente(porta)).hasMessageContaining("TCP_PORT").hasMessageNotContaining("70000");
    }
}
