package br.com.safra.confirmacao.tcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.PrintWriter;
import java.lang.reflect.Field;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Comunicação textual do Parceiro: BufferedReader/PrintWriter, JSON por linha, limites e erros. */
class ParceiroTest {

    private ServerSocket server;
    private Socket cliente;
    private Socket aceito;

    @BeforeEach
    void conectar() throws Exception {
        server = new ServerSocket(0);
        cliente = new Socket("127.0.0.1", server.getLocalPort());
        aceito = server.accept();
    }

    @AfterEach
    void fechar() throws Exception {
        cliente.close();
        aceito.close();
        server.close();
    }

    private Parceiro parceiro(int limite, int timeoutMs) throws Exception {
        return new Parceiro(aceito, Json.criar(), limite, timeoutMs);
    }

    private void escrever(String texto) throws Exception {
        cliente.getOutputStream().write(texto.getBytes(StandardCharsets.UTF_8));
        cliente.getOutputStream().flush();
    }

    @Test
    void socketAssociadoABufferedReaderEPrintWriter() throws Exception {
        assertThat(Arrays.stream(Parceiro.class.getDeclaredFields()).map(Field::getType))
                .contains(BufferedReader.class, PrintWriter.class)
                .noneMatch(tipo -> tipo.getName().startsWith("java.io.Object") || tipo.getName().startsWith("java.io.Data"));
        try (Parceiro parceiro = parceiro(1024, 1000)) {
            Field entrada = Parceiro.class.getDeclaredField("entrada");
            Field saida = Parceiro.class.getDeclaredField("saida");
            entrada.setAccessible(true);
            saida.setAccessible(true);
            assertThat(entrada.get(parceiro)).isInstanceOf(BufferedReader.class);
            assertThat(saida.get(parceiro)).isInstanceOf(PrintWriter.class);
        }
    }

    @Test
    void recebeUmaMensagemJsonPorLinha() throws Exception {
        try (Parceiro parceiro = parceiro(1024, 1000)) {
            escrever("{\"requestId\":\"a1\",\"operacao\":\"health\",\"dados\":{\"x\":\"ção\"}}\n");
            PedidoDeOperacao pedido = parceiro.receber();
            assertThat(pedido.requestId()).isEqualTo("a1");
            assertThat(pedido.operacao()).isEqualTo("health");
            assertThat(pedido.dados().path("x").asText()).isEqualTo("ção");
        }
    }

    @Test
    void respostaEUmaLinhaJsonTerminadaEmLf() throws Exception {
        try (Parceiro parceiro = parceiro(1024, 1000)) {
            parceiro.enviar(PedidoDeResultado.sucesso("a1", java.util.Map.of("servico", "disponível")));
            InputStream entrada = cliente.getInputStream();
            cliente.setSoTimeout(1000);
            StringBuilder recebido = new StringBuilder();
            int b;
            byte[] bytes = new byte[4096];
            int total = 0;
            while ((b = entrada.read()) != '\n') {
                bytes[total++] = (byte) b;
            }
            recebido.append(new String(bytes, 0, total, StandardCharsets.UTF_8));
            assertThat(recebido.toString()).startsWith("{").endsWith("}")
                    .contains("\"requestId\":\"a1\"", "\"sucesso\":true", "disponível");
        }
    }

    @Test
    void remontaFragmentosESeparaMensagensAgrupadas() throws Exception {
        try (Parceiro parceiro = parceiro(1024, 2000)) {
            String a = "{\"requestId\":\"a\",\"operacao\":\"health\",\"dados\":{}}\n";
            String b = "{\"requestId\":\"b\",\"operacao\":\"health\",\"dados\":{}}\n";
            escrever(a.substring(0, 10));
            CompletableFuture.runAsync(() -> {
                try {
                    Thread.sleep(50);
                    escrever(a.substring(10) + b);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
            assertThat(parceiro.receber().requestId()).isEqualTo("a");
            assertThat(parceiro.receber().requestId()).isEqualTo("b");
        }
    }

    @Test
    void jsonInvalidoEMensagemVaziaSaoRecusadosSemDerrubarAConexao() throws Exception {
        try (Parceiro parceiro = parceiro(1024, 1000)) {
            escrever("{isto não é json\n\n[1,2]\n{\"requestId\":\"ok\",\"operacao\":\"health\",\"dados\":{}}\n");
            assertThatThrownBy(parceiro::receber).isInstanceOf(Parceiro.MensagemInvalidaException.class);
            assertThatThrownBy(parceiro::receber).isInstanceOf(Parceiro.MensagemInvalidaException.class);
            assertThatThrownBy(parceiro::receber).isInstanceOf(Parceiro.MensagemInvalidaException.class);
            assertThat(parceiro.receber().requestId()).isEqualTo("ok");
        }
    }

    @Test
    void mensagemAcimaDoLimiteEhRecusadaAntesDoLf() throws Exception {
        try (Parceiro parceiro = parceiro(64, 1000)) {
            escrever("{\"requestId\":\"" + "x".repeat(200));
            assertThatThrownBy(parceiro::receber).isInstanceOf(Parceiro.MensagemMuitoGrandeException.class);
        }
    }

    @Test
    void limiteContaBytesUtf8() throws Exception {
        try (Parceiro parceiro = parceiro(20, 1000)) {
            escrever("ççççççççççç\n"); // 11 caracteres, 22 bytes
            assertThatThrownBy(parceiro::receberLinha).isInstanceOf(Parceiro.MensagemMuitoGrandeException.class);
        }
    }

    @Test
    void timeoutEncerraALeitura() throws Exception {
        try (Parceiro parceiro = parceiro(1024, 150)) {
            assertThatThrownBy(parceiro::receber).isInstanceOf(SocketTimeoutException.class);
        }
    }

    @Test
    void desconexaoDoClienteDevolveNullELiberaOSocket() throws Exception {
        Parceiro parceiro = parceiro(1024, 1000);
        cliente.close();
        assertThat(parceiro.receber()).isNull();
        parceiro.close();
        assertThat(parceiro.fechado()).isTrue();
    }

    @Test
    void escritaEmConexaoFechadaEhDetectadaPorCheckError() throws Exception {
        Parceiro parceiro = parceiro(1024, 1000);
        parceiro.close();
        assertThatThrownBy(() -> parceiro.enviar(PedidoDeResultado.sucesso("x", null))).isInstanceOf(java.io.IOException.class);
    }
}
