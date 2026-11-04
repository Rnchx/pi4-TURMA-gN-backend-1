package br.com.safra.confirmacao;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/** Cliente HTTP mínimo para os testes, como o cliente Node.js chamará o serviço. */
final class Http {

    private static final HttpClient CLIENTE = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();

    private Http() {
    }

    static HttpResponse<String> get(int porta, String caminho) throws Exception {
        return enviar(HttpRequest.newBuilder(uri(porta, caminho)).GET());
    }

    static HttpResponse<String> post(int porta, String caminho, String json) throws Exception {
        return enviar(HttpRequest.newBuilder(uri(porta, caminho))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json)));
    }

    private static URI uri(int porta, String caminho) {
        return URI.create("http://127.0.0.1:" + porta + caminho);
    }

    private static HttpResponse<String> enviar(HttpRequest.Builder builder) throws Exception {
        return CLIENTE.send(builder.timeout(Duration.ofSeconds(10)).build(),
                HttpResponse.BodyHandlers.ofString());
    }
}
