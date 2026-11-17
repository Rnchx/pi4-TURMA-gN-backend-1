package br.com.safra.confirmacao.tcp;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Conversor JSON do protocolo. Jackson apenas transforma objetos Java em strings JSON (e vice-versa);
 * o que atravessa o socket é sempre texto UTF-8. Não há serialização nativa Java.
 */
public final class Json {

    private Json() {
    }

    public static ObjectMapper criar() {
        return JsonMapper.builder()
                // Valores monetários chegam como texto decimal exato, sem passar por double.
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                // Mesmo comportamento do mapper anterior: campos desconhecidos são ignorados.
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
    }
}
