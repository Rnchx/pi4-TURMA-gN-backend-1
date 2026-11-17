package br.com.safra.confirmacao.usuario;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import br.com.safra.confirmacao.banco.Banco;

/** Consulta a data de nascimento autenticada e aplica a idade mínima cadastrada nos produtos. */
public class RestricaoEtariaService {
    public record Validacao(String usuarioId, List<Long> produtoIds) {}
    public record Resposta(boolean permitido, int idade, int idadeMinima) {}

    private final Banco banco;
    private final Clock clock;

    public RestricaoEtariaService(Banco banco, Clock clock) {
        this.banco = banco;
        this.clock = clock;
    }

    public Resposta validar(Validacao pedido) {
        UUID usuarioId = uuid(pedido == null ? null : pedido.usuarioId());
        List<Long> produtos = pedido == null || pedido.produtoIds() == null ? List.of()
                : List.copyOf(new LinkedHashSet<>(pedido.produtoIds()));
        if (produtos.isEmpty() || produtos.size() > 500 || produtos.stream().anyMatch(id -> id == null || id < 1)) {
            throw new OperacaoException("dadosInvalidos", "Informe os produtos que serão validados.");
        }
        LocalDate nascimento = banco.extrair("SELECT data_nascimento FROM usuarios WHERE id = ? AND ativo",
                rs -> rs.next() ? rs.getObject(1, LocalDate.class) : null, usuarioId);
        if (nascimento == null) {
            throw new OperacaoException("dataNascimentoAusente",
                    "Sua conta não possui data de nascimento. Não é possível comprar produtos com restrição etária.");
        }
        String marcadores = produtos.stream().map(id -> "?").collect(Collectors.joining(","));
        // Somente marcadores "?" são concatenados; os IDs seguem como parâmetros do PreparedStatement.
        Integer idadeMinima = banco.valor("SELECT COALESCE(max(idade_minima), 0) FROM produtos WHERE ativo AND id IN ("
                + marcadores + ")", Integer.class, produtos.toArray());
        int idade = UsuarioService.calcularIdade(nascimento, LocalDate.now(clock));
        int minima = idadeMinima == null ? 0 : idadeMinima;
        if (minima > 0 && idade < minima) {
            throw new OperacaoException("restricaoEtaria",
                    "Este produto é permitido somente para consumidores com 18 anos ou mais.");
        }
        return new Resposta(true, idade, minima);
    }

    private static UUID uuid(String valor) {
        try { return UUID.fromString(valor); }
        catch (Exception e) { throw new OperacaoException("naoAutorizado", "Faça login para continuar."); }
    }
}
