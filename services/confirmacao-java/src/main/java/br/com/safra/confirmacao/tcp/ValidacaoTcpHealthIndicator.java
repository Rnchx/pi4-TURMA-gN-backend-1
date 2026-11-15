package br.com.safra.confirmacao.tcp;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

/** Readiness funcional: percorre ServerSocket, protocolo, roteamento e consulta PostgreSQL. */
@Component("validacaoTcp")
public final class ValidacaoTcpHealthIndicator implements HealthIndicator {
    private final ObjectMapper json;
    private final int porta;

    public ValidacaoTcpHealthIndicator(ObjectMapper json, @Value("${safra.tcp.port}") int porta) {
        this.json = json;
        this.porta = porta;
    }

    @Override public Health health() {
        String id = UUID.randomUUID().toString();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("127.0.0.1", porta), 1000);
            socket.setSoTimeout(2000);
            var out = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8);
            out.write("{\"requestId\":\"" + id + "\",\"operacao\":\"health\",\"dados\":{}}\n");
            out.flush();
            String line = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8)).readLine();
            JsonNode resposta = json.readTree(line);
            return resposta.path("sucesso").asBoolean() && id.equals(resposta.path("requestId").asText())
                    ? Health.up().build() : Health.down().build();
        } catch (Exception e) {
            return Health.down().withDetail("motivo", e.getClass().getSimpleName()).build();
        }
    }
}
