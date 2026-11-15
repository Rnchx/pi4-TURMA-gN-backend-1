package br.com.safra.confirmacao;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Serviço de Confirmação do SAFRA Online (ADR 0004 e 0005).
 *
 * <p>Papel de servidor no modelo cliente-servidor: inicia antes do cliente (API Node.js),
 * aguarda mensagens TCP/JSON delimitadas por quebra de linha e atende conexões concorrentes.
 * O HTTP embutido existe apenas para os healthchecks internos do contêiner.
 */
@SpringBootApplication
public class ConfirmacaoApplication {

    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }

    public static void main(String[] args) {
        SpringApplication.run(ConfirmacaoApplication.class, args);
    }
}
