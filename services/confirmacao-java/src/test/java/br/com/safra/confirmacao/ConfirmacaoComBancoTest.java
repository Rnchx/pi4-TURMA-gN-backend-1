package br.com.safra.confirmacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * CT16/CT17/CT18 contra o PostgreSQL do Compose, com o esquema criado pelas migrations da API.
 * Executado somente com SAFRA_TESTE_COM_BANCO=1; cria um carrinho próprio e remove os registros no final.
 */
@EnabledIfEnvironmentVariable(named = "SAFRA_TESTE_COM_BANCO", matches = "1")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class ConfirmacaoComBancoTest {

    @Value("${local.server.port}")
    int porta;

    @Autowired
    JdbcTemplate jdbc;

    UUID carrinho;
    long produtoA;
    long produtoB;

    @BeforeEach
    void criarCarrinho() {
        carrinho = UUID.randomUUID();
        jdbc.update("INSERT INTO carrinhos(id) VALUES (?)", carrinho);
        var ids = jdbc.queryForList("SELECT id FROM produtos WHERE ativo ORDER BY id LIMIT 2", Long.class);
        produtoA = ids.get(0);
        produtoB = ids.get(1);
    }

    @AfterEach
    void limpar() {
        jdbc.update("DELETE FROM itens_compra WHERE compra_id IN (SELECT id FROM compras_demonstrativas WHERE carrinho_id = ?)", carrinho);
        jdbc.update("DELETE FROM compras_demonstrativas WHERE carrinho_id = ?", carrinho);
        jdbc.update("DELETE FROM carrinhos WHERE id = ?", carrinho);
    }

    String pedido(String referencia, int quantidadeA, String total) {
        String subtotalA = new java.math.BigDecimal("5.50").multiply(java.math.BigDecimal.valueOf(quantidadeA)).toPlainString();
        return "{\"referencia\":\"" + referencia + "\",\"carrinhoId\":\"" + carrinho + "\",\"quantidadeItens\":" + (quantidadeA + 1)
                + ",\"total\":" + total + ",\"itens\":["
                + "{\"produtoId\":" + produtoA + ",\"nome\":\"Produto A\",\"quantidade\":" + quantidadeA
                + ",\"precoUnitario\":5.50,\"subtotal\":" + subtotalA + "},"
                + "{\"produtoId\":" + produtoB + ",\"nome\":\"Produto B\",\"quantidade\":1,\"precoUnitario\":3.00,\"subtotal\":3.00}]}";
    }

    static String campo(String json, String nome) {
        var m = java.util.regex.Pattern.compile("\"" + nome + "\":\"([^\"]+)\"").matcher(json);
        return m.find() ? m.group(1) : null;
    }

    @Test
    void gravaCompraEItensEmUmaTransacaoESemDuplicar() throws Exception {
        String referencia = "confirmacao-" + UUID.randomUUID();
        HttpResponse<String> primeira = Http.post(porta, "/confirmacoes-demonstrativas", pedido(referencia, 2, "14.00"));
        assertThat(primeira.statusCode()).isEqualTo(201);
        String compraId = campo(primeira.body(), "compraId");
        assertThat(campo(primeira.body(), "confirmacaoId")).isEqualTo("SAFRA-DEMO-" + compraId.substring(0, 8).toUpperCase());
        assertThat(campo(primeira.body(), "mensagem")).isEqualTo("Compra demonstrativa concluída.");
        assertThat(primeira.body()).contains("\"geradaEm\":");

        Map<String, Object> compra = jdbc.queryForMap("SELECT * FROM compras_demonstrativas WHERE carrinho_id = ?", carrinho);
        assertThat(compra.get("status")).isEqualTo("concluida_demonstrativa");
        assertThat(compra.get("chave_idempotencia")).isEqualTo(referencia);
        assertThat(((java.math.BigDecimal) compra.get("total")).compareTo(new java.math.BigDecimal("14.00"))).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM itens_compra WHERE compra_id = ?::uuid", Integer.class, compraId)).isEqualTo(2);

        // Mesma referência e mesmos dados: devolve a compra original, sem nova linha.
        HttpResponse<String> repetida = Http.post(porta, "/confirmacoes-demonstrativas", pedido(referencia, 2, "14.00"));
        assertThat(repetida.statusCode()).isEqualTo(200);
        assertThat(campo(repetida.body(), "compraId")).isEqualTo(compraId);

        // Nova referência para o mesmo carrinho já confirmado: a chave gravada é diferente, então é conflito
        // (CT17), e a API responde 409 "carrinho fechado" (CT15). Nenhuma compra nova é criada.
        HttpResponse<String> outraChave = Http.post(porta, "/confirmacoes-demonstrativas", pedido("confirmacao-" + UUID.randomUUID(), 2, "14.00"));
        assertThat(outraChave.statusCode()).isEqualTo(409);
        assertThat(outraChave.body()).isEqualTo("{\"codigo\":\"idempotenciaConflitante\",\"mensagem\":\"A referência já foi utilizada.\"}");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM compras_demonstrativas WHERE carrinho_id = ?", Integer.class, carrinho)).isEqualTo(1);
    }

    @Test
    void referenciaReaproveitadaComDadosDiferentesRetorna409() throws Exception {
        String referencia = "confirmacao-" + UUID.randomUUID();
        assertThat(Http.post(porta, "/confirmacoes-demonstrativas", pedido(referencia, 2, "14.00")).statusCode()).isEqualTo(201);
        String conflito = "{\"codigo\":\"idempotenciaConflitante\",\"mensagem\":\"A referência já foi utilizada.\"}";
        HttpResponse<String> mesmaChave = Http.post(porta, "/confirmacoes-demonstrativas", pedido(referencia, 3, "19.50"));
        assertThat(mesmaChave.statusCode()).isEqualTo(409);
        assertThat(mesmaChave.body()).isEqualTo(conflito);
        HttpResponse<String> mesmoCarrinho = Http.post(porta, "/confirmacoes-demonstrativas", pedido("confirmacao-" + UUID.randomUUID(), 3, "19.50"));
        assertThat(mesmoCarrinho.statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM compras_demonstrativas WHERE carrinho_id = ?", Integer.class, carrinho)).isEqualTo(1);
    }

    @Test
    void carrinhoInexistenteReverteATransacao() throws Exception {
        String referencia = "confirmacao-" + UUID.randomUUID();
        String corpo = pedido(referencia, 1, "8.50").replace(carrinho.toString(), UUID.randomUUID().toString());
        HttpResponse<String> resposta = Http.post(porta, "/confirmacoes-demonstrativas", corpo);
        assertThat(resposta.statusCode()).isEqualTo(400);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM compras_demonstrativas WHERE chave_idempotencia = ?", Integer.class, referencia)).isZero();
    }
}
