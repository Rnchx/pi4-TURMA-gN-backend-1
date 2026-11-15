package br.com.safra.confirmacao.tcp;

import tools.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.IOException;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/** Encapsula leitura/escrita UTF-8 por linha e trata fragmentação ou agrupamento do TCP. */
public final class Parceiro implements Closeable {
    private final Socket socket;
    private final ObjectMapper json;
    private final int limite;

    public Parceiro(Socket socket, ObjectMapper json, int limite, int timeoutMs) throws IOException {
        this.socket = socket;
        this.json = json;
        this.limite = limite;
        socket.setSoTimeout(timeoutMs);
        socket.setTcpNoDelay(true);
    }

    public PedidoDeOperacao receber() throws IOException {
        ByteArrayOutputStream mensagem = new ByteArrayOutputStream();
        while (true) {
            int byteLido = socket.getInputStream().read();
            if (byteLido < 0) return mensagem.size() == 0 ? null : converter(mensagem);
            if (byteLido == '\n') return converter(mensagem);
            if (byteLido != '\r') mensagem.write(byteLido);
            if (mensagem.size() > limite) throw new MensagemMuitoGrandeException();
        }
    }

    private PedidoDeOperacao converter(ByteArrayOutputStream mensagem) throws IOException {
        if (mensagem.size() == 0) throw new IOException("Mensagem vazia");
        return json.readValue(mensagem.toString(StandardCharsets.UTF_8), PedidoDeOperacao.class);
    }

    public synchronized void enviar(PedidoDeResultado resposta) throws IOException {
        byte[] bytes = json.writeValueAsBytes(resposta);
        if (bytes.length > limite) throw new MensagemMuitoGrandeException();
        socket.getOutputStream().write(bytes);
        socket.getOutputStream().write('\n');
        socket.getOutputStream().flush();
    }

    @Override public void close() throws IOException { socket.close(); }

    public static final class MensagemMuitoGrandeException extends IOException {}
}
