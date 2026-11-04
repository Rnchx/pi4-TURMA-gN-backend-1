package br.com.safra.confirmacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Conexão real com o PostgreSQL do Compose. Executado somente com SAFRA_TESTE_COM_BANCO=1 e
 * DB_HOST, DB_USER e DB_PASSWORD definidos (veja "Testes do serviço Java" no README);
 * fora disso é ignorado, como no build da imagem.
 */
@EnabledIfEnvironmentVariable(named = "SAFRA_TESTE_COM_BANCO", matches = "1")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class SaudeComBancoTest {

    @Value("${local.server.port}")
    int porta;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void conectaAoPostgresqlDoCompose() {
        assertThat(jdbc.queryForObject("SELECT 1", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SHOW server_version_num", Integer.class)).isGreaterThanOrEqualTo(170000);
    }

    @Test
    void readinessDisponivelComBanco() throws Exception {
        HttpResponse<String> resposta = Http.get(porta, "/actuator/health/readiness");
        assertThat(resposta.statusCode()).isEqualTo(200);
        assertThat(resposta.body()).contains("\"status\":\"UP\"");
    }
}
