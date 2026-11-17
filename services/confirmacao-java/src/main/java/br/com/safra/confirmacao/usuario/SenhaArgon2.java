package br.com.safra.confirmacao.usuario;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import org.bouncycastle.crypto.generators.Argon2BytesGenerator;
import org.bouncycastle.crypto.params.Argon2Parameters;

/**
 * Hash de senha Argon2id com BouncyCastle, no mesmo formato PHC já gravado no banco:
 * {@code $argon2id$v=19$m=16384,t=3,p=1$<sal>$<hash>} (Base64 sem preenchimento).
 * Parâmetros idênticos aos usados até a v1.4: sal de 16 bytes, hash de 32 bytes, 1 via, 16 MiB e 3 iterações.
 * Contas existentes continuam autenticando sem regravar a senha.
 */
public final class SenhaArgon2 {

    private static final int SAL_BYTES = 16;
    private static final int HASH_BYTES = 32;
    private static final int PARALELISMO = 1;
    private static final int MEMORIA_KB = 16384;
    private static final int ITERACOES = 3;

    private static final Base64.Encoder CODIFICADOR = Base64.getEncoder().withoutPadding();
    private static final Base64.Decoder DECODIFICADOR = Base64.getDecoder();

    private final SecureRandom aleatorio = new SecureRandom();

    public String codificar(CharSequence senha) {
        byte[] sal = new byte[SAL_BYTES];
        aleatorio.nextBytes(sal);
        Argon2Parameters parametros = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
                .withVersion(Argon2Parameters.ARGON2_VERSION_13)
                .withSalt(sal).withParallelism(PARALELISMO).withMemoryAsKB(MEMORIA_KB).withIterations(ITERACOES).build();
        byte[] hash = gerar(senha, parametros, HASH_BYTES);
        return "$argon2id$v=" + parametros.getVersion() + "$m=" + MEMORIA_KB + ",t=" + ITERACOES + ",p=" + PARALELISMO
                + "$" + CODIFICADOR.encodeToString(sal) + "$" + CODIFICADOR.encodeToString(hash);
    }

    /** Compara em tempo constante. Hash malformado ou de outro algoritmo nunca confere. */
    public boolean confere(CharSequence senha, String codificado) {
        if (senha == null || codificado == null) {
            return false;
        }
        try {
            String[] partes = codificado.split("\\$");
            // ["", "argon2id", "v=19", "m=..,t=..,p=..", sal, hash]
            if (partes.length != 6 || !partes[0].isEmpty() || !partes[1].equals("argon2id") || !partes[2].startsWith("v=")) {
                return false;
            }
            int versao = Integer.parseInt(partes[2].substring(2));
            int memoria = 0;
            int iteracoes = 0;
            int paralelismo = 0;
            for (String item : partes[3].split(",")) {
                String[] chaveValor = item.split("=", 2);
                int numero = Integer.parseInt(chaveValor[1]);
                switch (chaveValor[0]) {
                    case "m" -> memoria = numero;
                    case "t" -> iteracoes = numero;
                    case "p" -> paralelismo = numero;
                    default -> {
                        return false;
                    }
                }
            }
            byte[] sal = DECODIFICADOR.decode(partes[4]);
            byte[] esperado = DECODIFICADOR.decode(partes[5]);
            if (memoria <= 0 || iteracoes <= 0 || paralelismo <= 0 || esperado.length == 0) {
                return false;
            }
            Argon2Parameters parametros = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id).withVersion(versao)
                    .withSalt(sal).withParallelism(paralelismo).withMemoryAsKB(memoria).withIterations(iteracoes).build();
            return MessageDigest.isEqual(esperado, gerar(senha, parametros, esperado.length));
        } catch (RuntimeException formatoInvalido) {
            return false;
        }
    }

    private static byte[] gerar(CharSequence senha, Argon2Parameters parametros, int tamanho) {
        Argon2BytesGenerator gerador = new Argon2BytesGenerator();
        gerador.init(parametros);
        byte[] hash = new byte[tamanho];
        gerador.generateBytes(senha.toString().getBytes(StandardCharsets.UTF_8), hash);
        return hash;
    }
}
