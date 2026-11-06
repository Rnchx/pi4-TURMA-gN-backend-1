package br.com.safra.confirmacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;

/** CT16 sem PostgreSQL: a validação acontece antes do banco e a indisponibilidade vira 503 do contrato. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:1/safra",
        "spring.datasource.username=teste",
        "spring.datasource.password=senha-de-teste-nao-deve-vazar"
})
class ConfirmacaoSemBancoTest {

    static final String INVALIDA = "{\"codigo\":\"entradaInvalida\",\"mensagem\":\"Dados da confirmação inválidos.\"}";

    @Value("${local.server.port}")
    int porta;

    static String pedido(String referencia, String carrinho, String quantidadeItens, String total, String itens) {
        return "{\"referencia\":" + referencia + ",\"carrinhoId\":" + carrinho + ",\"quantidadeItens\":" + quantidadeItens
                + ",\"total\":" + total + ",\"itens\":" + itens + "}";
    }

    static final String REF = "\"confirmacao-9f3819dd-8e95-4fd5-a735-6ca8b80de8ad\"";
    static final String CARRINHO = "\"0c9d92c6-6939-4a33-9132-2dd75fe512ad\"";
    static final String ITENS = "[{\"produtoId\":31,\"nome\":\"Pão de forma\",\"quantidade\":2,\"precoUnitario\":5.50,\"subtotal\":11.00},"
            + "{\"produtoId\":32,\"nome\":\"Leite\",\"quantidade\":1,\"precoUnitario\":3.00,\"subtotal\":3.00}]";

    @Test
    void recusaEntradasInvalidasComMensagemDoContrato() throws Exception {
        List<String> invalidos = List.of(
                "{",
                "[]",
                "{}",
                pedido("null", CARRINHO, "3", "14.00", ITENS),
                pedido("\"curta\"", CARRINHO, "3", "14.00", ITENS),
                pedido("\"tem espaço e acento ç\"", CARRINHO, "3", "14.00", ITENS),
                pedido(REF, "\"nao-e-uuid\"", "3", "14.00", ITENS),
                pedido(REF, CARRINHO, "4", "14.00", ITENS),
                pedido(REF, CARRINHO, "3", "14.01", ITENS),
                pedido(REF, CARRINHO, "3", "-14.00", ITENS),
                pedido(REF, CARRINHO, "0", "0", "[]"),
                pedido(REF, CARRINHO, "2.5", "14.00", ITENS),
                pedido(REF, CARRINHO, "3", "14.00",
                        "[{\"produtoId\":31,\"nome\":\"Pão\",\"quantidade\":2,\"precoUnitario\":5.50,\"subtotal\":11.01},"
                                + "{\"produtoId\":32,\"nome\":\"Leite\",\"quantidade\":1,\"precoUnitario\":3.00,\"subtotal\":3.00}]"),
                pedido(REF, CARRINHO, "100", "100",
                        "[{\"produtoId\":31,\"nome\":\"Pão\",\"quantidade\":100,\"precoUnitario\":1,\"subtotal\":100}]"),
                pedido(REF, CARRINHO, "2", "2",
                        "[{\"produtoId\":31,\"nome\":\"Pão\",\"quantidade\":1,\"precoUnitario\":1,\"subtotal\":1},"
                                + "{\"produtoId\":31,\"nome\":\"Pão\",\"quantidade\":1,\"precoUnitario\":1,\"subtotal\":1}]"),
                pedido(REF, CARRINHO, "1", "1.001",
                        "[{\"produtoId\":31,\"nome\":\"Pão\",\"quantidade\":1,\"precoUnitario\":1.001,\"subtotal\":1.001}]"),
                pedido(REF, CARRINHO, "1", "1",
                        "[{\"produtoId\":31,\"nome\":\"  \",\"quantidade\":1,\"precoUnitario\":1,\"subtotal\":1}]"),
                pedido(REF, CARRINHO, "1", "1",
                        "[{\"produtoId\":1.5,\"nome\":\"Pão\",\"quantidade\":1,\"precoUnitario\":1,\"subtotal\":1}]"));
        for (String corpo : invalidos) {
            HttpResponse<String> resposta = Http.post(porta, "/confirmacoes-demonstrativas", corpo);
            assertThat(resposta.statusCode()).as(corpo).isEqualTo(400);
            assertThat(resposta.body()).as(corpo).isEqualTo(INVALIDA);
        }
    }

    @Test
    void bancoIndisponivelRetorna503DoContratoSemDetalhes() throws Exception {
        HttpResponse<String> resposta = Http.post(porta, "/confirmacoes-demonstrativas", pedido(REF, CARRINHO, "3", "14.00", ITENS));
        assertThat(resposta.statusCode()).isEqualTo(503);
        assertThat(resposta.body())
                .isEqualTo("{\"codigo\":\"bancoIndisponivel\",\"mensagem\":\"A confirmação não pôde ser persistida.\"}");
    }

    @Test
    void somentePostEhAceito() throws Exception {
        HttpResponse<String> resposta = Http.get(porta, "/confirmacoes-demonstrativas");
        assertThat(resposta.statusCode()).isEqualTo(405);
        assertThat(resposta.body()).contains("\"codigo\":\"metodoNaoPermitido\"");
    }
}
