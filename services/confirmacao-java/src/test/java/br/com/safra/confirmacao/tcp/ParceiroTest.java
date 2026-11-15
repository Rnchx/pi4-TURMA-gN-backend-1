package br.com.safra.confirmacao.tcp;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class ParceiroTest {
    @Test void remontaFragmentosESeparaMensagensAgrupadas() throws Exception {
        try (ServerSocket server = new ServerSocket(0); Socket client = new Socket("127.0.0.1", server.getLocalPort());
                Socket accepted = server.accept(); Parceiro parceiro = new Parceiro(accepted, JsonMapper.builder().build(), 1024, 1000)) {
            String a = "{\"requestId\":\"a\",\"operacao\":\"health\",\"dados\":{}}\n";
            String b = "{\"requestId\":\"b\",\"operacao\":\"health\",\"dados\":{}}\n";
            byte[] primeira = a.substring(0, 10).getBytes(StandardCharsets.UTF_8);
            client.getOutputStream().write(primeira);
            CompletableFuture.runAsync(() -> {
                try { client.getOutputStream().write((a.substring(10) + b).getBytes(StandardCharsets.UTF_8)); client.getOutputStream().flush(); }
                catch (Exception e) { throw new RuntimeException(e); }
            });
            assertThat(parceiro.receber().requestId()).isEqualTo("a");
            assertThat(parceiro.receber().requestId()).isEqualTo("b");
        }
    }
}
