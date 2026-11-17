package br.com.safra.confirmacao.usuario;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SenhaArgon2Test {

    /** Hash gerado pela implementação anterior (Spring Security Argon2PasswordEncoder 16/32/1/16384/3). */
    private static final String HASH_LEGADO =
            "$argon2id$v=19$m=16384,t=3,p=1$dbEXr+CdTod45N6x/JNR7g$aW/3iw5FGcbvax4GfpY7X3lBlQyyM9udslfXj3EkIZY";

    private final SenhaArgon2 senhas = new SenhaArgon2();

    @Test
    void contasExistentesContinuamAutenticando() {
        assertThat(senhas.confere("SenhaLonga1!", HASH_LEGADO)).isTrue();
        assertThat(senhas.confere("SenhaLonga1?", HASH_LEGADO)).isFalse();
    }

    @Test
    void novoHashTemOMesmoFormatoEParametros() {
        String hash = senhas.codificar("NovaSenha3#");
        assertThat(hash).startsWith("$argon2id$v=19$m=16384,t=3,p=1$").doesNotContain("NovaSenha3#");
        assertThat(senhas.confere("NovaSenha3#", hash)).isTrue();
        assertThat(senhas.confere("novasenha3#", hash)).isFalse();
        assertThat(senhas.codificar("NovaSenha3#")).isNotEqualTo(hash); // sal aleatório
    }

    @Test
    void hashMalformadoNuncaConfere() {
        for (String invalido : new String[] {null, "", "texto", "$argon2i$v=19$m=1,t=1,p=1$YQ$YQ", "$argon2id$v=19$m=x$YQ$YQ"}) {
            assertThat(senhas.confere("SenhaLonga1!", invalido)).isFalse();
        }
    }
}
