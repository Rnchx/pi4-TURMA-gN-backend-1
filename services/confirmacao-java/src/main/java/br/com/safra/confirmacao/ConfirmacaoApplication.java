package br.com.safra.confirmacao;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Serviço de Confirmação do SAFRA Online (ADR 0004 e 0005).
 *
 * <p>Papel de servidor no modelo cliente-servidor: inicia antes do cliente (API Node.js),
 * aguarda requisições HTTP/JSON e atende chamadas concorrentes pelo pool de threads do
 * servidor embutido. O encerramento é gracioso ao receber SIGTERM do contêiner.
 */
@SpringBootApplication
public class ConfirmacaoApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfirmacaoApplication.class, args);
    }
}
