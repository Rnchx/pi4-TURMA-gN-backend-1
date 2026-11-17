package br.com.safra.confirmacao.tcp;

import br.com.safra.confirmacao.confirmacao.ConfirmacaoException;
import br.com.safra.confirmacao.confirmacao.ConfirmacaoRequest;
import br.com.safra.confirmacao.confirmacao.ConfirmacaoService;
import br.com.safra.confirmacao.cupom.CupomService;
import br.com.safra.confirmacao.historico.HistoricoService;
import br.com.safra.confirmacao.usuario.OperacaoException;
import br.com.safra.confirmacao.usuario.RestricaoEtariaService;
import br.com.safra.confirmacao.usuario.UsuarioService;
import br.com.safra.confirmacao.banco.Banco;
import br.com.safra.confirmacao.banco.BancoException;
import tools.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Identifica a operação e delega validação/persistência às regras de domínio. */
public class ProcessadorDeOperacoes implements TratadorDePedidos {
    private static final Pattern REQUEST_ID = Pattern.compile("[A-Za-z0-9._:-]{1,100}");
    private static final Logger LOG = LoggerFactory.getLogger(ProcessadorDeOperacoes.class);
    private final ObjectMapper json;
    private final UsuarioService usuarios;
    private final RestricaoEtariaService restricoes;
    private final ConfirmacaoService confirmacoes;
    private final CupomService cupons;
    private final HistoricoService historico;
    private final Banco banco;

    public ProcessadorDeOperacoes(ObjectMapper json, UsuarioService usuarios, RestricaoEtariaService restricoes,
            ConfirmacaoService confirmacoes, CupomService cupons, HistoricoService historico, Banco banco) {
        this.json = json;
        this.usuarios = usuarios;
        this.restricoes = restricoes;
        this.confirmacoes = confirmacoes;
        this.cupons = cupons;
        this.historico = historico;
        this.banco = banco;
    }

    static boolean requestIdValido(String id) {
        return id != null && REQUEST_ID.matcher(id).matches();
    }

    @Override
    public PedidoDeResultado processar(PedidoDeOperacao pedido) {
        String id = pedido == null || pedido.requestId() == null ? "desconhecido" : pedido.requestId();
        if (pedido == null || !requestIdValido(id) || pedido.operacao() == null || pedido.dados() == null) {
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
                    var resposta = resultado.resposta();
                    // LinkedHashMap: o cupom pode ser null (Map.of não aceita valores nulos).
                    Map<String, Object> saida = new LinkedHashMap<>();
                    saida.put("confirmacaoId", resposta.confirmacaoId());
                    saida.put("compraId", resposta.compraId());
                    saida.put("metodoPagamento", resposta.metodoPagamento());
                    saida.put("mensagem", resposta.mensagem());
                    saida.put("geradaEm", resposta.geradaEm());
                    saida.put("subtotal", resposta.subtotal());
                    saida.put("cupom", resposta.cupom());
                    saida.put("desconto", resposta.desconto());
                    saida.put("total", resposta.total());
                    saida.put("criada", resultado.criada());
                    yield saida;
                }
                case "validarCupom" -> cupons.validar(converter(pedido, CupomService.Validacao.class));
                case "listarHistoricoCompras" -> historico.listar(converter(pedido, HistoricoService.Listagem.class));
                case "consultarCompra" -> historico.consultar(converter(pedido, HistoricoService.Consulta.class));
                default -> throw new OperacaoException("operacaoInvalida", "Operação não suportada.");
            };
            return PedidoDeResultado.sucesso(id, dados);
        } catch (OperacaoException e) {
            return PedidoDeResultado.erro(id, e.codigo(), e.getMessage());
        } catch (ConfirmacaoException e) {
            return PedidoDeResultado.erro(id, e.codigo(), e.getMessage());
        } catch (BancoException e) {
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
        banco.valor("SELECT 1", Integer.class);
        return Map.of("servico", "disponivel", "banco", "disponivel");
    }
}
