package br.com.safra.confirmacao.usuario;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import br.com.safra.confirmacao.banco.Banco;
import br.com.safra.confirmacao.banco.BancoException;

/** Validação definitiva, persistência de usuários e limitação de tentativas de login. */
public class UsuarioService {
    private static final Pattern NOME = Pattern.compile("^[\\p{L}]+(?:['’-][\\p{L}]+)*(?: [\\p{L}]+(?:['’-][\\p{L}]+)*)+$");
    private static final String PARTE_EMAIL = "[a-z0-9!#$%&'*+/=?^_`{|}~-]+";
    private static final Pattern EMAIL = Pattern.compile("^" + PARTE_EMAIL + "(?:\\." + PARTE_EMAIL
            + ")*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$");
    private static final Pattern FOTO = Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png|webp)$");
    private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/uuuu")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final int MAX_TENTATIVAS = 5;

    public record Cadastro(String nome, String cpf, String email, String senha, String confirmacaoSenha,
            String dataNascimento) {}
    public record Login(String email, String senha) {}
    public record Identificacao(String usuarioId) {}
    public record AtualizacaoPerfil(String usuarioId, String nome, String cpf, String email, String dataNascimento) {}
    public record AlteracaoSenha(String usuarioId, String senhaAtual, String novaSenha, String confirmacaoNovaSenha) {}
    public record AlteracaoFoto(String usuarioId, String fotoPerfilChave) {}
    public record Exclusao(String usuarioId, String senhaAtual) {}
    public record Usuario(String id, String nome, String email, String dataNascimento, Integer idade,
            boolean fotoPerfil, String criadoEm) {}
    public record RespostaUsuario(Usuario usuario) {}
    public record RespostaFoto(String fotoPerfilAnterior, boolean fotoPerfil) {}
    public record RespostaExclusao(String fotoPerfilChave) {}

    private record LinhaUsuario(UUID id, String nome, String email, String senhaHash, LocalDate dataNascimento,
            String fotoPerfilChave, String criadoEm) {}

    private final Banco banco;
    private final Clock clock;
    private final SenhaArgon2 encoder = new SenhaArgon2();

    public UsuarioService(Banco banco, Clock clock) {
        this.banco = banco;
        this.clock = clock;
    }

    public RespostaUsuario cadastrar(Cadastro pedido) {
        if (pedido == null) throw dados("Revise os dados do cadastro.");
        String nome = normalizarNome(pedido.nome());
        String cpf = validarCpf(pedido.cpf());
        String email = normalizarEmail(pedido.email(), true);
        LocalDate nascimento = validarDataNascimento(pedido.dataNascimento(), clock);
        validarSenha(pedido.senha(), pedido.confirmacaoSenha());
        if (existe("cpf", cpf)) throw new OperacaoException("cpfDuplicado", "Este CPF já está cadastrado.");
        if (existe("email", email)) throw new OperacaoException("emailDuplicado", "Este e-mail já está cadastrado.");
        UUID id = UUID.randomUUID();
        try {
            banco.atualizar("INSERT INTO usuarios(id, nome, cpf, email, senha_hash, data_nascimento) VALUES (?, ?, ?, ?, ?, ?)",
                    id, nome, cpf, email, encoder.codificar(pedido.senha()), nascimento);
        } catch (BancoException.ViolacaoDeIntegridade corrida) {
            if (existe("cpf", cpf)) throw new OperacaoException("cpfDuplicado", "Este CPF já está cadastrado.");
            if (existe("email", email)) throw new OperacaoException("emailDuplicado", "Este e-mail já está cadastrado.");
            throw corrida;
        }
        return new RespostaUsuario(new Usuario(id.toString(), nome, email, DATA_BR.format(nascimento),
                calcularIdade(nascimento, LocalDate.now(clock)), false, null));
    }

    public RespostaUsuario autenticar(Login pedido) {
        if (pedido == null || vazio(pedido.email()) || vazio(pedido.senha())) throw dados("Preencha e-mail e senha.");
        String email = normalizarEmail(pedido.email(), false);
        String identificador = sha256(email);
        if (Boolean.TRUE.equals(banco.extrair("SELECT bloqueado_ate > now() FROM tentativas_login WHERE identificador_hash = ?",
                rs -> rs.next() && rs.getBoolean(1), identificador))) {
            throw new OperacaoException("tentativasExcedidas", "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        }
        var usuario = buscarPorEmail(email);
        boolean valido = usuario != null && encoder.confere(pedido.senha(), usuario.senhaHash());
        if (!valido) {
            int tentativas = registrarFalha(identificador);
            if (tentativas >= MAX_TENTATIVAS) {
                throw new OperacaoException("tentativasExcedidas", "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
            }
            throw new OperacaoException("credenciaisInvalidas", "E-mail ou senha inválidos.");
        }
        banco.atualizar("DELETE FROM tentativas_login WHERE identificador_hash = ?", identificador);
        return new RespostaUsuario(resposta(usuario));
    }

    public RespostaUsuario obterPerfil(Identificacao pedido) {
        return new RespostaUsuario(resposta(buscarObrigatorio(uuid(pedido == null ? null : pedido.usuarioId()))));
    }

    public RespostaUsuario atualizarPerfil(AtualizacaoPerfil pedido) {
        if (pedido == null) throw dados("Revise os dados do perfil.");
        if (pedido.cpf() != null || pedido.email() != null || pedido.dataNascimento() != null) {
            throw new OperacaoException("campoNaoEditavel", "CPF, e-mail e data de nascimento não podem ser alterados.");
        }
        UUID id = uuid(pedido.usuarioId());
        String nome = normalizarNome(pedido.nome());
        if (banco.atualizar("UPDATE usuarios SET nome = ?, atualizado_em = now() WHERE id = ? AND ativo", nome, id) != 1) {
            throw naoAutorizado();
        }
        return new RespostaUsuario(resposta(buscarObrigatorio(id)));
    }

    public RespostaUsuario alterarSenha(AlteracaoSenha pedido) {
        if (pedido == null || vazio(pedido.senhaAtual())) throw dados("Informe a senha atual.");
        UUID id = uuid(pedido.usuarioId());
        // Troca da senha e invalidação das sessões na mesma transação.
        return banco.emTransacao(() -> {
            LinhaUsuario usuario = buscarObrigatorio(id);
            if (!encoder.confere(pedido.senhaAtual(), usuario.senhaHash())) {
                throw new OperacaoException("senhaAtualIncorreta", "A senha atual está incorreta.");
            }
            validarSenha(pedido.novaSenha(), pedido.confirmacaoNovaSenha());
            if (encoder.confere(pedido.novaSenha(), usuario.senhaHash())) throw dados("A nova senha deve ser diferente da senha atual.");
            banco.atualizar("UPDATE usuarios SET senha_hash = ?, atualizado_em = now() WHERE id = ?", encoder.codificar(pedido.novaSenha()), id);
            banco.atualizar("DELETE FROM sessoes WHERE usuario_id = ?", id);
            return new RespostaUsuario(resposta(buscarObrigatorio(id)));
        });
    }

    public RespostaFoto alterarFoto(AlteracaoFoto pedido) {
        if (pedido == null) throw dados("Revise a foto de perfil.");
        UUID id = uuid(pedido.usuarioId());
        String chave = pedido.fotoPerfilChave();
        if (chave != null && !FOTO.matcher(chave).matches()) throw dados("A referência da foto é inválida.");
        LinhaUsuario atual = buscarObrigatorio(id);
        banco.atualizar("UPDATE usuarios SET foto_perfil_chave = ?, atualizado_em = now() WHERE id = ?", chave, id);
        return new RespostaFoto(atual.fotoPerfilChave(), chave != null);
    }

    public RespostaExclusao excluir(Exclusao pedido) {
        if (pedido == null || vazio(pedido.senhaAtual())) throw dados("Informe sua senha para excluir a conta.");
        UUID id = uuid(pedido.usuarioId());
        return banco.emTransacao(() -> {
            LinhaUsuario usuario = buscarObrigatorio(id);
            if (!encoder.confere(pedido.senhaAtual(), usuario.senhaHash())) {
                throw new OperacaoException("senhaAtualIncorreta", "A senha atual está incorreta.");
            }
            banco.atualizar("DELETE FROM tentativas_login WHERE identificador_hash = ?", sha256(usuario.email()));
            if (banco.atualizar("DELETE FROM usuarios WHERE id = ?", id) != 1) throw naoAutorizado();
            return new RespostaExclusao(usuario.fotoPerfilChave());
        });
    }

    private LinhaUsuario buscarPorEmail(String email) {
        return banco.lista("SELECT id, nome, email, senha_hash, data_nascimento, foto_perfil_chave, criado_em FROM usuarios WHERE email = ? AND ativo",
                rs -> new LinhaUsuario(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("email"),
                        rs.getString("senha_hash"), rs.getObject("data_nascimento", LocalDate.class),
                        rs.getString("foto_perfil_chave"), rs.getObject("criado_em").toString()), email)
                .stream().findFirst().orElse(null);
    }

    private LinhaUsuario buscarObrigatorio(UUID id) {
        LinhaUsuario usuario = banco.lista("SELECT id, nome, email, senha_hash, data_nascimento, foto_perfil_chave, criado_em FROM usuarios WHERE id = ? AND ativo",
                rs -> new LinhaUsuario(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("email"),
                        rs.getString("senha_hash"), rs.getObject("data_nascimento", LocalDate.class),
                        rs.getString("foto_perfil_chave"), rs.getObject("criado_em").toString()), id)
                .stream().findFirst().orElse(null);
        if (usuario == null) throw naoAutorizado();
        return usuario;
    }

    private Usuario resposta(LinhaUsuario linha) {
        LocalDate nascimento = linha.dataNascimento();
        return new Usuario(linha.id().toString(), linha.nome(), linha.email(),
                nascimento == null ? null : DATA_BR.format(nascimento),
                nascimento == null ? null : calcularIdade(nascimento, LocalDate.now(clock)),
                linha.fotoPerfilChave() != null, linha.criadoEm());
    }

    private int registrarFalha(String hash) {
        return banco.valor("""
                INSERT INTO tentativas_login(identificador_hash, tentativas) VALUES (?, 1)
                ON CONFLICT (identificador_hash) DO UPDATE SET
                  tentativas = CASE WHEN tentativas_login.janela_iniciada_em < now() - interval '15 minutes'
                    THEN 1 ELSE tentativas_login.tentativas + 1 END,
                  janela_iniciada_em = CASE WHEN tentativas_login.janela_iniciada_em < now() - interval '15 minutes'
                    THEN now() ELSE tentativas_login.janela_iniciada_em END,
                  bloqueado_ate = CASE WHEN (CASE WHEN tentativas_login.janela_iniciada_em < now() - interval '15 minutes'
                    THEN 1 ELSE tentativas_login.tentativas + 1 END) >= ? THEN now() + interval '15 minutes'
                    ELSE tentativas_login.bloqueado_ate END
                RETURNING tentativas""", Integer.class, hash, MAX_TENTATIVAS);
    }

    private boolean existe(String coluna, String valor) {
        if (!coluna.equals("cpf") && !coluna.equals("email")) throw new IllegalArgumentException();
        return Boolean.TRUE.equals(banco.valor("SELECT EXISTS(SELECT 1 FROM usuarios WHERE " + coluna + " = ?)", Boolean.class, valor));
    }

    static String normalizarNome(String valor) {
        if (vazio(valor)) throw dados("Informe nome e sobrenome.");
        String nome = Normalizer.normalize(valor.trim().replaceAll("\\s+", " "), Normalizer.Form.NFC);
        if (nome.length() > 150 || !NOME.matcher(nome).matches()) throw dados("Informe um nome completo válido, sem números.");
        return nome;
    }

    static String validarCpf(String valor) {
        String cpf = valor == null ? "" : valor.replaceAll("\\D", "");
        if (cpf.length() != 11 || cpf.chars().distinct().count() == 1) throw dados("Informe um CPF válido.");
        for (int digito = 9; digito < 11; digito++) {
            int soma = 0;
            for (int i = 0; i < digito; i++) soma += (cpf.charAt(i) - '0') * (digito + 1 - i);
            int esperado = 11 - (soma % 11);
            if (esperado >= 10) esperado = 0;
            if (cpf.charAt(digito) - '0' != esperado) throw dados("Informe um CPF válido.");
        }
        return cpf;
    }

    static String normalizarEmail(String valor, boolean validarEstrutura) {
        String email = valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || (validarEstrutura && !EMAIL.matcher(email).matches())) throw dados("Informe um e-mail válido.");
        return email;
    }

    static void validarSenha(String senha, String confirmacao) {
        if (senha == null || senha.length() < 8 || !senha.chars().anyMatch(Character::isUpperCase)
                || !senha.chars().anyMatch(Character::isLowerCase) || !senha.chars().anyMatch(Character::isDigit)) {
            throw dados("Use no mínimo 8 caracteres, incluindo letra maiúscula, minúscula e número.");
        }
        if (!senha.equals(confirmacao)) throw dados("As senhas não coincidem.");
    }

    static LocalDate validarDataNascimento(String valor, Clock clock) {
        if (vazio(valor)) throw dados("Informe a data de nascimento.");
        try {
            LocalDate data = LocalDate.parse(valor.trim(), DATA_BR);
            if (data.isAfter(LocalDate.now(clock))) throw dados("A data de nascimento não pode estar no futuro.");
            return data;
        } catch (DateTimeParseException e) {
            throw dados("Informe uma data de nascimento válida no formato DD/MM/AAAA.");
        }
    }

    public static int calcularIdade(LocalDate nascimento, LocalDate hoje) {
        return Period.between(nascimento, hoje).getYears();
    }

    private static UUID uuid(String valor) {
        try { return UUID.fromString(valor); } catch (Exception e) { throw naoAutorizado(); }
    }

    private static String sha256(String valor) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception impossivel) { throw new IllegalStateException(impossivel); }
    }

    private static boolean vazio(String valor) { return valor == null || valor.isBlank(); }
    private static OperacaoException dados(String mensagem) { return new OperacaoException("dadosInvalidos", mensagem); }
    private static OperacaoException naoAutorizado() { return new OperacaoException("naoAutorizado", "Faça login para continuar."); }
}
