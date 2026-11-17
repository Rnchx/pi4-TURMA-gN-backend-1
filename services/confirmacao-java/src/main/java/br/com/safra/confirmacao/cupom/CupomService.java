package br.com.safra.confirmacao.cupom;

import br.com.safra.confirmacao.usuario.OperacaoException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import java.util.regex.Pattern;
import br.com.safra.confirmacao.banco.Banco;

/**
 * Regras de cupom. Toda decisão (existência, primeira compra, uso único, valor do desconto) é tomada aqui,
 * consultando o PostgreSQL; a API Node.js e o aplicativo apenas exibem o resultado.
 *
 * <ul>
 * <li>O código é comparado exatamente, com maiúsculas e minúsculas ({@code quero100} não é {@code QUERO100}).</li>
 * <li>Um cupom por compra; o desconto é limitado ao subtotal, então o total nunca fica negativo.</li>
 * <li>Cupons "somente primeira compra" exigem que a conta não tenha nenhuma compra concluída.</li>
 * </ul>
 */
public class CupomService {

    /** Validação pedida pelo resumo da compra: o subtotal é lido do carrinho no banco, nunca recebido. */
    public record Validacao(String usuarioId, String carrinhoId, String codigo) {
    }

    public record Avaliacao(String codigo, BigDecimal subtotal, BigDecimal desconto, BigDecimal total, String mensagem) {
    }

    private record Cupom(String codigo, BigDecimal valor, boolean somentePrimeiraCompra, boolean ativo) {
    }

    private static final Pattern FORMATO = Pattern.compile("[A-Za-z0-9]{1,30}");

    private final Banco banco;

    public CupomService(Banco banco) {
        this.banco = banco;
    }

    public Avaliacao validar(Validacao pedido) {
        UUID usuarioId = uuid(pedido == null ? null : pedido.usuarioId(), "naoAutorizado", "Faça login para continuar.");
        UUID carrinhoId = uuid(pedido.carrinhoId(), "entradaInvalida", "Informe um carrinho válido.");
        Boolean aberto = banco.extrair("""
                SELECT status = 'aberto' AND (usuario_id IS NULL OR usuario_id = ?) FROM carrinhos WHERE id = ?""",
                rs -> rs.next() ? rs.getBoolean(1) : null, usuarioId, carrinhoId);
        if (aberto == null) {
            throw new OperacaoException("carrinhoNaoEncontrado", "Carrinho não encontrado.");
        }
        if (!aberto) {
            throw new OperacaoException("confirmacaoNaoPermitida", "O carrinho não pode receber cupom.");
        }
        BigDecimal subtotal = banco.valor("""
                SELECT COALESCE(sum(quantidade * preco_unitario), 0)::numeric(12,2) FROM itens_carrinho WHERE carrinho_id = ?""",
                BigDecimal.class, carrinhoId);
        if (subtotal == null || subtotal.signum() == 0) {
            throw new OperacaoException("confirmacaoNaoPermitida", "Adicione produtos antes de aplicar um cupom.");
        }
        return avaliar(usuarioId, pedido.codigo(), subtotal);
    }

    /**
     * Avalia o cupom para a conta e o subtotal informados. Na confirmação é chamada dentro da transação,
     * depois do bloqueio por usuário, para que a primeira compra seja revalidada sem corrida.
     */
    public Avaliacao avaliar(UUID usuarioId, String codigo, BigDecimal subtotal) {
        if (codigo == null || !FORMATO.matcher(codigo).matches()) {
            throw invalido();
        }
        Cupom cupom = banco.extrair("""
                SELECT codigo, valor_desconto, somente_primeira_compra, ativo FROM cupons WHERE codigo = ?""",
                rs -> rs.next() ? new Cupom(rs.getString(1), rs.getBigDecimal(2), rs.getBoolean(3), rs.getBoolean(4)) : null,
                codigo);
        // Comparação exata também no Java (defesa extra caso a coluna mude de collation).
        if (cupom == null || !cupom.codigo().equals(codigo) || !cupom.ativo()) {
            throw invalido();
        }
        if (cupom.somentePrimeiraCompra()) {
            Integer usosDoCupom = banco.valor("""
                    SELECT count(*) FROM compras_demonstrativas WHERE usuario_id = ? AND cupom_codigo = ?""",
                    Integer.class, usuarioId, cupom.codigo());
            if (usosDoCupom != null && usosDoCupom > 0) {
                throw new OperacaoException("cupomJaUtilizado", "Este cupom já foi utilizado nesta conta.");
            }
            Integer compras = banco.valor("SELECT count(*) FROM compras_demonstrativas WHERE usuario_id = ?",
                    Integer.class, usuarioId);
            if (compras != null && compras > 0) {
                throw new OperacaoException("cupomIndisponivel", "Este cupom é válido somente na primeira compra da conta.");
            }
        }
        BigDecimal base = subtotal.setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal desconto = calcularDesconto(cupom.valor(), base);
        return new Avaliacao(cupom.codigo(), base, desconto, base.subtract(desconto), "Cupom aplicado.");
    }

    /** Desconto limitado ao subtotal: o total final nunca é negativo. */
    public static BigDecimal calcularDesconto(BigDecimal valorCupom, BigDecimal subtotal) {
        if (valorCupom == null || subtotal == null || valorCupom.signum() < 0 || subtotal.signum() < 0) {
            throw new IllegalArgumentException("Valores do cupom inválidos.");
        }
        return valorCupom.min(subtotal).setScale(2, RoundingMode.UNNECESSARY);
    }

    private static OperacaoException invalido() {
        return new OperacaoException("cupomInvalido", "Cupom inválido.");
    }

    private static UUID uuid(String valor, String codigo, String mensagem) {
        try {
            if (valor != null && valor.length() == 36) {
                return UUID.fromString(valor);
            }
        } catch (IllegalArgumentException ignorado) {
            // Mensagem pública abaixo.
        }
        throw new OperacaoException(codigo, mensagem);
    }
}
