package br.com.safra.confirmacao.config;

import java.util.Map;

/**
 * Configuração explícita lida das variáveis de ambiente (substitui o antigo application.yml).
 * Mensagens de erro citam somente o nome da variável, nunca o valor, para não expor senhas.
 */
public record Configuracao(Tcp tcp, Banco banco) {

    /** Parâmetros do servidor TCP acadêmico. */
    public record Tcp(String enderecoBind, int porta, int timeoutMs, int limiteBytes, int maxConexoes, int esperaDesligamentoMs) {
    }

    /** Parâmetros de conexão com o PostgreSQL. A senha nunca aparece em toString. */
    public record Banco(String host, int porta, String nome, String usuario, String senha) {
        public String url() {
            return "jdbc:postgresql://" + host + ":" + porta + "/" + nome;
        }

        @Override
        public String toString() {
            return "Banco[host=" + host + ", porta=" + porta + ", nome=" + nome + "]";
        }
    }

    public static Configuracao doAmbiente(Map<String, String> ambiente) {
        Tcp tcp = new Tcp(
                texto(ambiente, "TCP_BIND_ADDRESS", "127.0.0.1"),
                inteiro(ambiente, "TCP_PORT", 3000, 0, 65535),
                inteiro(ambiente, "TCP_TIMEOUT_MS", 10000, 100, 600000),
                inteiro(ambiente, "TCP_MAX_MESSAGE_BYTES", 32768, 1024, 10485760),
                inteiro(ambiente, "TCP_MAX_CONNECTIONS", 50, 1, 1000),
                inteiro(ambiente, "TCP_SHUTDOWN_GRACE_MS", 300, 0, 10000));
        Banco banco = new Banco(
                texto(ambiente, "DB_HOST", "localhost"),
                inteiro(ambiente, "DB_PORT", 5432, 1, 65535),
                texto(ambiente, "DB_NAME", "safra"),
                obrigatorio(ambiente, "DB_USER"),
                obrigatorio(ambiente, "DB_PASSWORD"));
        return new Configuracao(tcp, banco);
    }

    static int inteiro(Map<String, String> ambiente, String nome, int padrao, int minimo, int maximo) {
        String valor = ambiente.get(nome);
        if (valor == null || valor.isBlank()) {
            return padrao;
        }
        try {
            int numero = Integer.parseInt(valor.trim());
            if (numero >= minimo && numero <= maximo) {
                return numero;
            }
        } catch (NumberFormatException ignorado) {
            // Mensagem pública abaixo.
        }
        throw new IllegalArgumentException("Configuração inválida: " + nome + " deve ser um inteiro entre " + minimo + " e " + maximo + ".");
    }

    static String texto(Map<String, String> ambiente, String nome, String padrao) {
        String valor = ambiente.get(nome);
        return valor == null || valor.isBlank() ? padrao : valor.trim();
    }

    static String obrigatorio(Map<String, String> ambiente, String nome) {
        String valor = ambiente.get(nome);
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException("Configuração ausente: defina a variável de ambiente " + nome + ".");
        }
        return valor;
    }
}
