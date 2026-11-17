package br.com.safra.confirmacao.tcp;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Healthcheck pelo próprio protocolo TCP (substitui o Actuator HTTP). Conecta ao servidor, envia a operação
 * {@code health} como string JSON, lê a resposta e encerra com código 0 somente se {@code sucesso} for true
 * (a operação também consulta o PostgreSQL). Uso no contêiner:
 * {@code java -cp /app/app.jar br.com.safra.confirmacao.tcp.VerificadorDeSaude}.
 */
public final class VerificadorDeSaude {

    private VerificadorDeSaude() {
    }

    public static void main(String[] args) {
        String host = System.getenv().getOrDefault("TCP_HEALTH_HOST", "127.0.0.1");
        int porta = Integer.parseInt(System.getenv().getOrDefault("TCP_PORT", "3000"));
        System.exit(verificar(host, porta, 3000) ? 0 : 1);
    }

    public static boolean verificar(String host, int porta, int timeoutMs) {
        ObjectMapper json = Json.criar();
        String requestId = UUID.randomUUID().toString();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, porta), timeoutMs);
            socket.setSoTimeout(timeoutMs);
            PrintWriter saida = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);
            BufferedReader entrada = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            saida.print(json.writeValueAsString(new PedidoDeOperacao(requestId, "health", json.createObjectNode())));
            saida.print('\n');
            saida.flush();
            if (saida.checkError()) {
                return false;
            }
            String linha = entrada.readLine();
            if (linha == null) {
                return false;
            }
            JsonNode resposta = json.readTree(linha);
            return resposta.path("sucesso").asBoolean(false) && requestId.equals(resposta.path("requestId").asText());
        } catch (Exception indisponivel) {
            return false;
        }
    }
}
