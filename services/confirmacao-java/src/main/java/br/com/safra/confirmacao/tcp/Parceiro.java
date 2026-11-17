package br.com.safra.confirmacao.tcp;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * Representa o parceiro conectado ao socket. Cada {@link Socket} é associado a um {@link BufferedReader}
 * (entrada) e a um {@link PrintWriter} (saída), ambos em UTF-8. Cada comunicado é uma string JSON
 * terminada por quebra de linha (LF).
 *
 * <p>A leitura é feita caractere a caractere a partir do {@code BufferedReader} para recusar mensagens acima do
 * limite antes de encontrar o LF (um {@code readLine()} acumularia a linha inteira na memória). Fragmentos do
 * TCP são remontados naturalmente e várias mensagens na mesma conexão são lidas uma a uma.
 */
public final class Parceiro implements Closeable {

    private final Socket socket;
    private final BufferedReader entrada;
    private final PrintWriter saida;
    private final ObjectMapper json;
    private final int limiteBytes;

    public Parceiro(Socket socket, ObjectMapper json, int limiteBytes, int timeoutMs) throws IOException {
        this.socket = socket;
        this.json = json;
        this.limiteBytes = limiteBytes;
        socket.setSoTimeout(timeoutMs);
        socket.setTcpNoDelay(true);
        this.entrada = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
        this.saida = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);
    }

    /**
     * Lê a próxima linha completa. Devolve {@code null} quando o cliente encerra a conexão sem dados pendentes.
     *
     * @throws MensagemMuitoGrandeException se a linha passar do limite de bytes UTF-8 antes do LF
     * @throws java.net.SocketTimeoutException se o cliente ficar inativo além do timeout
     */
    public String receberLinha() throws IOException {
        StringBuilder linha = new StringBuilder();
        long bytes = 0;
        while (true) {
            int caractere = entrada.read();
            if (caractere < 0) {
                return linha.isEmpty() ? null : linha.toString();
            }
            if (caractere == '\n') {
                return linha.toString();
            }
            if (caractere == '\r') {
                continue;
            }
            bytes += bytesUtf8((char) caractere);
            if (bytes > limiteBytes) {
                throw new MensagemMuitoGrandeException();
            }
            linha.append((char) caractere);
        }
    }

    /**
     * Lê e converte o próximo {@link PedidoDeOperacao}.
     *
     * @return o pedido, ou {@code null} quando o cliente encerrou a conexão
     * @throws MensagemInvalidaException para linha vazia ou JSON que não representa um pedido
     */
    public PedidoDeOperacao receber() throws IOException {
        String linha = receberLinha();
        if (linha == null) {
            return null;
        }
        if (linha.isBlank()) {
            throw new MensagemInvalidaException("Mensagem vazia.");
        }
        try {
            PedidoDeOperacao pedido = json.readValue(linha, PedidoDeOperacao.class);
            if (pedido == null) {
                throw new MensagemInvalidaException("Mensagem sem conteúdo.");
            }
            return pedido;
        } catch (JacksonException e) {
            throw new MensagemInvalidaException("JSON inválido.");
        }
    }

    /**
     * Escreve um comunicado como uma linha JSON e faz flush. Sincronizado: a thread da supervisora (respostas) e
     * a thread de desligamento (aviso) podem escrever no mesmo parceiro sem intercalar bytes.
     */
    public synchronized void enviar(Comunicado comunicado) throws IOException {
        String texto = json.writeValueAsString(comunicado);
        if (texto.getBytes(StandardCharsets.UTF_8).length > limiteBytes) {
            throw new MensagemMuitoGrandeException();
        }
        saida.print(texto);
        saida.print('\n');
        saida.flush();
        // PrintWriter não propaga IOException; checkError() revela falhas de escrita (conexão encerrada).
        if (saida.checkError()) {
            throw new IOException("Falha ao escrever no socket.");
        }
    }

    /** Envia FIN depois do último comunicado, sem descartar o que já foi escrito. */
    public synchronized void encerrarEscrita() {
        try {
            if (!socket.isClosed() && !socket.isOutputShutdown()) {
                socket.shutdownOutput();
            }
        } catch (IOException ignorado) {
            // O socket será fechado logo em seguida.
        }
    }

    public String origem() {
        return String.valueOf(socket.getRemoteSocketAddress());
    }

    public boolean fechado() {
        return socket.isClosed();
    }

    @Override
    public void close() throws IOException {
        socket.close();
    }

    private static int bytesUtf8(char caractere) {
        if (caractere < 0x80) {
            return 1;
        }
        if (caractere < 0x800) {
            return 2;
        }
        // Cada metade de um par substituto conta 2 bytes (4 no total, como em UTF-8).
        return Character.isSurrogate(caractere) ? 2 : 3;
    }

    /** A linha recebida ultrapassou o limite configurado (TCP_MAX_MESSAGE_BYTES). */
    public static final class MensagemMuitoGrandeException extends IOException {
        public MensagemMuitoGrandeException() {
            super("Mensagem acima do limite.");
        }
    }

    /** Linha vazia ou JSON que não representa um pedido; a conexão continua utilizável. */
    public static final class MensagemInvalidaException extends IOException {
        public MensagemInvalidaException(String motivo) {
            super(motivo);
        }
    }
}
