package br.com.safra.confirmacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;

/** O serviço sobe e responde mesmo sem PostgreSQL; apenas a readiness fica indisponível. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:1/safra",
        "spring.datasource.username=teste",
        "spring.datasource.password=senha-de-teste-nao-deve-vazar"
})
class SaudeSemBancoTest {

    @Value("${local.server.port}")
    int porta;

    @Test
    void contextoIniciaSemBancoEIdentificaOServico() throws Exception {
        HttpResponse<String> resposta = Http.get(porta, "/");
        assertThat(resposta.statusCode()).isEqualTo(200);
        assertThat(resposta.body()).contains("\"servico\":\"safra-confirmacao\"");
    }

    @Test
    void livenessIndicaProcessoAtivo() throws Exception {
        HttpResponse<String> resposta = Http.get(porta, "/actuator/health/liveness");
        assertThat(resposta.statusCode()).isEqualTo(200);
        assertThat(resposta.body()).contains("\"status\":\"UP\"");
    }

    @Test
    void readinessRefleteBancoIndisponivelSemDetalhes() throws Exception {
        HttpResponse<String> resposta = Http.get(porta, "/actuator/health/readiness");
        assertThat(resposta.statusCode()).isEqualTo(503);
        assertThat(resposta.body()).contains("\"status\":\"DOWN\"").contains("\"db\"");
        assertThat(resposta.body()).doesNotContainIgnoringCase("jdbc")
                .doesNotContain("senha-de-teste-nao-deve-vazar")
                .doesNotContain("details");
    }

    @Test
    void actuatorExpoeSomenteHealth() throws Exception {
        for (String caminho : new String[] {"/actuator/env", "/actuator/beans", "/actuator/configprops"}) {
            HttpResponse<String> resposta = Http.get(porta, caminho);
            assertThat(resposta.statusCode()).as(caminho).isEqualTo(404);
            assertThat(resposta.body()).doesNotContain("senha-de-teste-nao-deve-vazar");
        }
    }

    @Test
    void rotaInexistenteRetornaErroJsonPadronizado() throws Exception {
        HttpResponse<String> resposta = Http.get(porta, "/confirmacoes-demonstrativas");
        assertThat(resposta.statusCode()).isEqualTo(404);
        assertThat(resposta.headers().firstValue("Content-Type")).hasValueSatisfying(
                tipo -> assertThat(tipo).startsWith("application/json"));
        assertThat(resposta.body())
                .isEqualTo("{\"codigo\":\"rotaNaoEncontrada\",\"mensagem\":\"Rota não encontrada.\"}");
    }

    @Test
    void metodoNaoPermitidoRetornaErroJsonPadronizado() throws Exception {
        HttpResponse<String> resposta = Http.post(porta, "/", "{}");
        assertThat(resposta.statusCode()).isEqualTo(405);
        assertThat(resposta.body()).contains("\"codigo\":\"metodoNaoPermitido\"")
                .doesNotContain("trace").doesNotContain("Exception");
    }
}
