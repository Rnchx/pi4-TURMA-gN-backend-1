package br.com.safra.confirmacao.confirmacao;

import br.com.safra.confirmacao.cupom.CupomService;
import br.com.safra.confirmacao.usuario.OperacaoException;
import br.com.safra.confirmacao.usuario.RestricaoEtariaService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import br.com.safra.confirmacao.banco.Banco;
import br.com.safra.confirmacao.banco.BancoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * CT16: valida, aplica a idempotência e grava CT17 e CT18 em uma única transação. O cupom é revalidado
 * dentro dessa transação, depois de um bloqueio por usuário, e o desconto/total final são calculados aqui.
 */
public class ConfirmacaoService {

    private static final Logger log = LoggerFactory.getLogger(ConfirmacaoService.class);
    private static final Pattern REFERENCIA = Pattern.compile("[A-Za-z0-9._:-]{8,100}");

    record ItemValidado(long produtoId, String nome, int quantidade, BigDecimal precoUnitario, BigDecimal subtotal) {
    }

    record Validado(String referencia, UUID carrinhoId, UUID usuarioId, String metodoPagamento,
            BigDecimal subtotal, String cupom, List<ItemValidado> itens) {
    }

    public record Resultado(ConfirmacaoResponse resposta, boolean criada) {
    }

    private final ComprasRepository compras;
    private final Banco banco;
    private final RestricaoEtariaService restricoes;
    private final CupomService cupons;

    public ConfirmacaoService(Banco banco, RestricaoEtariaService restricoes, CupomService cupons) {
        this.compras = new ComprasRepository(banco);
        this.banco = banco;
        this.restricoes = restricoes;
        this.cupons = cupons;
    }

    public Resultado confirmar(ConfirmacaoRequest pedido) {
        Validado dados = validar(pedido);
        restricoes.validar(new RestricaoEtariaService.Validacao(dados.usuarioId().toString(),
                dados.itens().stream().map(ItemValidado::produtoId).toList()));
        try {
            return banco.emTransacao(() -> {
                compras.bloquearUsuario(dados.usuarioId());
                return existente(dados).orElseGet(() -> registrar(dados));
            });
        } catch (BancoException.ViolacaoDeUnicidade corrida) {
            if ("compras_primeira40_por_usuario".equals(corrida.restricao())) {
                // Última barreira do banco: o índice único parcial impede o segundo uso de PRIMEIRA40.
                throw new OperacaoException("cupomJaUtilizado", "Este cupom já foi utilizado nesta conta.");
            }
            // Outra tentativa gravou a mesma referência ou o mesmo carrinho ao mesmo tempo: relê e aplica a regra.
            try {
                return banco.emTransacao(() -> existente(dados).orElseThrow(ConfirmacaoException::idempotenciaConflitante));
            } catch (RuntimeException erro) {
                throw traduzir(erro);
            }
        } catch (RuntimeException erro) {
            throw traduzir(erro);
        }
    }

    // CT17 (unique_violation): devolve a compra original somente quando os dados gravados são iguais,
    // incluindo a chave de idempotência. Mesma referência com carrinho, itens ou total diferentes, ou o
    // mesmo carrinho já confirmado com outra referência, é conflito (CT16 409; CT15 409 "carrinho fechado").
    private Optional<Resultado> existente(Validado dados) {
        Optional<ComprasRepository.Compra> porChave = compras.porChave(dados.referencia());
        if (porChave.isPresent()) {
            if (!mesmosDados(porChave.get(), dados)) {
                throw ConfirmacaoException.idempotenciaConflitante();
            }
            return Optional.of(new Resultado(resposta(porChave.get()), false));
        }
        if (compras.porCarrinho(dados.carrinhoId()).isPresent()) {
            throw ConfirmacaoException.idempotenciaConflitante();
        }
        return Optional.empty();
    }

    private Resultado registrar(Validado dados) {
        UUID id = UUID.randomUUID();
        String confirmacaoId = "SAFRA-DEMO-" + id.toString().substring(0, 8).toUpperCase(Locale.ROOT);
        BigDecimal desconto = BigDecimal.ZERO.setScale(2);
        String cupom = null;
        if (dados.cupom() != null) {
            CupomService.Avaliacao avaliacao = cupons.avaliar(dados.usuarioId(), dados.cupom(), dados.subtotal());
            desconto = avaliacao.desconto();
            cupom = avaliacao.codigo();
        }
        ComprasRepository.Compra compra = compras.inserir(id, dados.carrinhoId(), dados.usuarioId(), dados.referencia(),
                confirmacaoId, dados.metodoPagamento(), dados.subtotal(), cupom, desconto, dados.subtotal().subtract(desconto));
        compras.inserirItens(id, dados.itens());
        log.info("Compra demonstrativa {} registrada com {} itens.", confirmacaoId, dados.itens().size());
        return new Resultado(resposta(compra), true);
    }

    private boolean mesmosDados(ComprasRepository.Compra compra, Validado dados) {
        if (!compra.carrinhoId().equals(dados.carrinhoId()) || !compra.usuarioId().equals(dados.usuarioId())
                || !compra.metodoPagamento().equals(dados.metodoPagamento()) || compra.subtotal().compareTo(dados.subtotal()) != 0
                || !java.util.Objects.equals(compra.cupom(), dados.cupom())) {
            return false;
        }
        List<ComprasRepository.ItemCompra> gravados = compras.itens(compra.id());
        List<ItemValidado> enviados = dados.itens().stream().sorted(Comparator.comparingLong(ItemValidado::produtoId)).toList();
        if (gravados.size() != enviados.size()) {
            return false;
        }
        for (int i = 0; i < gravados.size(); i++) {
            ComprasRepository.ItemCompra a = gravados.get(i);
            ItemValidado b = enviados.get(i);
            if (a.produtoId() != b.produtoId() || a.quantidade() != b.quantidade()
                    || a.precoUnitario().compareTo(b.precoUnitario()) != 0) {
                return false;
            }
        }
        return true;
    }

    private static ConfirmacaoResponse resposta(ComprasRepository.Compra compra) {
        return new ConfirmacaoResponse(compra.confirmacaoId(), compra.id().toString(), compra.metodoPagamento(),
                ConfirmacaoResponse.MENSAGEM, compra.criadaEm(), compra.subtotal(), compra.cupom(), compra.desconto(), compra.total());
    }

    private static RuntimeException traduzir(RuntimeException erro) {
        if (erro instanceof ConfirmacaoException || erro instanceof OperacaoException) {
            return erro;
        }
        if (erro instanceof BancoException.Indisponivel) {
            log.warn("PostgreSQL indisponível durante a confirmação: {}", erro.getClass().getSimpleName());
            return ConfirmacaoException.bancoIndisponivel();
        }
        if (erro instanceof BancoException.ViolacaoDeIntegridade) {
            // Carrinho ou produto inexistente, ou valor fora das restrições: a transação foi revertida.
            log.warn("Confirmação recusada pelas restrições do banco: {}", erro.getClass().getSimpleName());
            return ConfirmacaoException.entradaInvalida();
        }
        if (erro instanceof BancoException) {
            log.error("Falha ao gravar a confirmação", erro);
            return ConfirmacaoException.erroInterno();
        }
        return erro;
    }

    static Validado validar(ConfirmacaoRequest pedido) {
        if (pedido == null || pedido.referencia() == null || !REFERENCIA.matcher(pedido.referencia()).matches()
                || pedido.itens() == null || pedido.itens().isEmpty() || pedido.itens().size() > 500) {
            throw ConfirmacaoException.entradaInvalida();
        }
        UUID carrinhoId = uuid(pedido.carrinhoId());
        UUID usuarioId = uuid(pedido.usuarioId());
        String metodoPagamento = pedido.metodoPagamento();
        if (!List.of("pix", "credito", "debito", "boleto").contains(metodoPagamento)) {
            throw ConfirmacaoException.entradaInvalida();
        }
        int quantidadeItens = inteiro(pedido.quantidadeItens(), 1, Integer.MAX_VALUE);
        BigDecimal total = dinheiro(pedido.subtotal());
        String cupom = pedido.cupom();
        if (cupom != null && (cupom.isEmpty() || cupom.length() > 30)) {
            throw ConfirmacaoException.entradaInvalida();
        }
        List<ItemValidado> itens = new ArrayList<>();
        HashSet<Long> produtos = new HashSet<>();
        int unidades = 0;
        BigDecimal soma = BigDecimal.ZERO;
        for (ConfirmacaoRequest.Item item : pedido.itens()) {
            if (item == null || item.nome() == null || item.nome().isBlank() || item.nome().length() > 255) {
                throw ConfirmacaoException.entradaInvalida();
            }
            long produtoId = inteiro(item.produtoId(), 1, Integer.MAX_VALUE);
            int quantidade = inteiro(item.quantidade(), 1, 99);
            BigDecimal preco = dinheiro(item.precoUnitario());
            BigDecimal subtotal = dinheiro(item.subtotal());
            if (!produtos.add(produtoId) || subtotal.compareTo(preco.multiply(BigDecimal.valueOf(quantidade))) != 0) {
                throw ConfirmacaoException.entradaInvalida();
            }
            unidades += quantidade;
            soma = soma.add(subtotal);
            itens.add(new ItemValidado(produtoId, item.nome().trim(), quantidade, preco, subtotal));
        }
        if (unidades != quantidadeItens || soma.compareTo(total) != 0) {
            throw ConfirmacaoException.entradaInvalida();
        }
        return new Validado(pedido.referencia(), carrinhoId, usuarioId, metodoPagamento, total, cupom, List.copyOf(itens));
    }

    private static UUID uuid(String valor) {
        try {
            if (valor != null && valor.length() == 36) {
                return UUID.fromString(valor);
            }
        } catch (IllegalArgumentException ignorado) {
            // Mensagem pública abaixo.
        }
        throw ConfirmacaoException.entradaInvalida();
    }

    private static int inteiro(BigDecimal valor, int minimo, int maximo) {
        if (valor == null || valor.stripTrailingZeros().scale() > 0
                || valor.compareTo(BigDecimal.valueOf(minimo)) < 0 || valor.compareTo(BigDecimal.valueOf(maximo)) > 0) {
            throw ConfirmacaoException.entradaInvalida();
        }
        return valor.intValueExact();
    }

    private static BigDecimal dinheiro(BigDecimal valor) {
        if (valor == null || valor.signum() < 0 || valor.stripTrailingZeros().scale() > 2
                || valor.compareTo(new BigDecimal("9999999999.99")) > 0) {
            throw ConfirmacaoException.entradaInvalida();
        }
        return valor.setScale(2);
    }
}
