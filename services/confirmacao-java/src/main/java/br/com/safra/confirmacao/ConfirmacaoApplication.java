package br.com.safra.confirmacao;

import br.com.safra.confirmacao.banco.Banco;
import br.com.safra.confirmacao.config.Configuracao;
import br.com.safra.confirmacao.confirmacao.ConfirmacaoService;
import br.com.safra.confirmacao.cupom.CupomService;
import br.com.safra.confirmacao.historico.HistoricoService;
import br.com.safra.confirmacao.tcp.Json;
import br.com.safra.confirmacao.tcp.ProcessadorDeOperacoes;
import br.com.safra.confirmacao.tcp.Servidor;
import br.com.safra.confirmacao.usuario.RestricaoEtariaService;
import br.com.safra.confirmacao.usuario.UsuarioService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.time.Clock;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.ObjectMapper;

/**
 * Servidor TCP do SAFRA Online — aplicação Java Maven convencional, sem Spring.
 *
 * <p>Papel de servidor no modelo cliente-servidor: inicia antes do cliente (API Node.js), abre o
 * {@link java.net.ServerSocket}, recebe strings JSON delimitadas por quebra de linha e atende conexões concorrentes.
 * As dependências são criadas aqui, manualmente, por construtores explícitos.
 *
 * <p>Encerramento: por {@code pedidoParaSair} (cliente administrativo {@code npm run java:shutdown}) ou por
 * SIGTERM/Ctrl+C (shutdown hook). Nos dois casos o servidor avisa os clientes com {@code ComunicadoDeDesligamento},
 * fecha sockets, threads, executores e o pool do banco, e a JVM termina sem threads pendentes.
 */
public final class ConfirmacaoApplication {

    private static final Logger log = LoggerFactory.getLogger(ConfirmacaoApplication.class);

    private ConfirmacaoApplication() {
    }

    public static void main(String[] args) throws Exception {
        Configuracao configuracao;
        try {
            configuracao = Configuracao.doAmbiente(System.getenv());
        } catch (IllegalArgumentException e) {
            log.error(e.getMessage());
            System.exit(2);
            return;
        }

        HikariDataSource dataSource = criarDataSource(configuracao.banco());
        Banco banco = new Banco(dataSource);
        Clock relogio = Clock.systemDefaultZone();
        ObjectMapper json = Json.criar();

        RestricaoEtariaService restricoes = new RestricaoEtariaService(banco, relogio);
        CupomService cupons = new CupomService(banco);
        ProcessadorDeOperacoes processador = new ProcessadorDeOperacoes(json, new UsuarioService(banco, relogio), restricoes,
                new ConfirmacaoService(banco, restricoes, cupons), cupons, new HistoricoService(banco), banco);

        Servidor servidor = new Servidor(configuracao.tcp(), json, processador, List.of(dataSource));
        Runtime.getRuntime().addShutdownHook(Thread.ofPlatform().name("safra-shutdown-hook").unstarted(
                () -> servidor.desligar("sinal do sistema operacional")));
        try {
            servidor.iniciar();
        } catch (Exception e) {
            log.error("Não foi possível abrir o ServerSocket em {}:{}: {}", configuracao.tcp().enderecoBind(),
                    configuracao.tcp().porta(), e.getClass().getSimpleName());
            dataSource.close();
            System.exit(1);
            return;
        }
        servidor.aguardarEncerramento();
        log.info("Processo Java finalizado.");
    }

    static HikariDataSource criarDataSource(Configuracao.Banco banco) {
        HikariConfig config = new HikariConfig();
        config.setPoolName("safra-confirmacao");
        config.setJdbcUrl(banco.url());
        config.setUsername(banco.usuario());
        config.setPassword(banco.senha());
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(2000);
        config.setValidationTimeout(1500);
        // Não falha a inicialização sem banco: as operações respondem bancoIndisponivel até ele voltar.
        config.setInitializationFailTimeout(-1);
        return new HikariDataSource(config);
    }
}
