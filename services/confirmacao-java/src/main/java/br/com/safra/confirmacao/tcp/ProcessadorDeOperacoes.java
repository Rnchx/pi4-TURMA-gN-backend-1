package br.com.safra.confirmacao.tcp;

import br.com.safra.confirmacao.confirmacao.ConfirmacaoException;
import br.com.safra.confirmacao.confirmacao.ConfirmacaoRequest;
import br.com.safra.confirmacao.confirmacao.ConfirmacaoService;
import br.com.safra.confirmacao.usuario.OperacaoException;
import br.com.safra.confirmacao.usuario.RestricaoEtariaService;
import br.com.safra.confirmacao.usuario.UsuarioService;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Identifica a operação e delega validação/persistência às regras de domínio. */
@Component
public class ProcessadorDeOperacoes {
    private static final Logger LOG = LoggerFactory.getLogger(ProcessadorDeOperacoes.class);
    private final ObjectMapper json;
    private final UsuarioService usuarios;
    private final RestricaoEtariaService restricoes;
    private final ConfirmacaoService confirmacoes;
    private final JdbcTemplate jdbc;

    public ProcessadorDeOperacoes(ObjectMapper json, UsuarioService usuarios, RestricaoEtariaService restricoes,
            ConfirmacaoService confirmacoes, JdbcTemplate jdbc) {
        this.json = json;
        this.usuarios = usuarios;
        this.restricoes = restricoes;
        this.confirmacoes = confirmacoes;
        this.jdbc = jdbc;
    }

    public PedidoDeResultado processar(PedidoDeOperacao pedido) {
        String id = pedido == null || pedido.requestId() == null ? "desconhecido" : pedido.requestId();
        if (pedido == null || !id.matches("[A-Za-z0-9._:-]{1,100}") || pedido.operacao() == null || pedido.dados() == null) {
            return PedidoDeResultado.erro(id, "entradaInvalida", "Mensagem TCP inválida.");
        }
        try {
            Object dados = switch (pedido.operacao()) {
                case "health" -> health();
                case "cadastrarUsuario" -> usuarios.cadastrar(converter(pedido, UsuarioService.Cadastro.class));
                case "autenticarUsuario" -> usuarios.autenticar(converter(pedido, UsuarioService.Login.class));
                case "obterPerfil" -> usuarios.obterPerfil(converter(pedido, UsuarioService.Identificacao.class));
                case "atualizarPerfil" -> usuarios.atualizarPerfil(converter(pedido, UsuarioService.AtualizacaoPerfil.class));
                case "alterarSenha" -> usuarios.alterarSenha(converter(pedido, UsuarioService.AlteracaoSenha.class));
                case "alterarFotoPerfil" -> usuarios.alterarFoto(converter(pedido, UsuarioService.AlteracaoFoto.class));
                case "excluirConta" -> usuarios.excluir(converter(pedido, UsuarioService.Exclusao.class));
                case "validarRestricaoEtaria" -> restricoes.validar(converter(pedido, RestricaoEtariaService.Validacao.class));
                case "confirmarCompra" -> {
                    var resultado = confirmacoes.confirmar(converter(pedido, ConfirmacaoRequest.class));
                    yield Map.of("confirmacaoId", resultado.resposta().confirmacaoId(),
                            "compraId", resultado.resposta().compraId(), "metodoPagamento", resultado.resposta().metodoPagamento(),
                            "mensagem", resultado.resposta().mensagem(), "geradaEm", resultado.resposta().geradaEm(),
                            "criada", resultado.criada());
                }
                default -> throw new OperacaoException("operacaoInvalida", "Operação não suportada.");
            };
            return PedidoDeResultado.sucesso(id, dados);
        } catch (OperacaoException e) {
            return PedidoDeResultado.erro(id, e.codigo(), e.getMessage());
        } catch (ConfirmacaoException e) {
            return PedidoDeResultado.erro(id, e.codigo(), e.getMessage());
        } catch (DataAccessException e) {
            return PedidoDeResultado.erro(id, "bancoIndisponivel", "Banco de dados indisponível.");
        } catch (Exception e) {
            LOG.error("Falha interna na operação TCP requestId={} operacao={} tipo={}", id, pedido.operacao(), e.getClass().getSimpleName());
            return PedidoDeResultado.erro(id, "erroInterno", "Não foi possível processar a operação.");
        }
    }

    private <T> T converter(PedidoDeOperacao pedido, Class<T> tipo) {
        try {
            return json.treeToValue(pedido.dados(), tipo);
        } catch (Exception e) {
            throw new OperacaoException("entradaInvalida", "Dados da operação inválidos.");
        }
    }

    private Map<String, String> health() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        return Map.of("servico", "disponivel", "banco", "disponivel");
    }
}
