package br.com.safra.confirmacao.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import br.com.safra.confirmacao.banco.Banco;

class UsuarioServiceValidacaoTest {
    private static final Clock RELOGIO = Clock.fixed(Instant.parse("2026-11-15T12:00:00Z"), ZoneOffset.UTC);
    private final UsuarioService service = new UsuarioService(new Banco(null), RELOGIO);

    private static UsuarioService.Cadastro cadastro(String nome, String cpf, String email, String senha, String confirmacao,
            String nascimento) {
        return new UsuarioService.Cadastro(nome, cpf, email, senha, confirmacao, nascimento);
    }

    private void invalido(UsuarioService.Cadastro cadastro, String trecho) {
        assertThatThrownBy(() -> service.cadastrar(cadastro)).isInstanceOf(OperacaoException.class).hasMessageContaining(trecho);
    }

    @Test void recusaNomesInvalidos() {
        for (String nome : List.of("", "Maria", "Maria 123", "   ", "João @ Silva")) {
            invalido(cadastro(nome, "52998224725", "maria@example.com", "Senha1xY", "Senha1xY", "15/11/2000"), "nome");
        }
    }

    @Test void recusaCpfInvalidoESequencias() {
        for (String cpf : List.of("123", "111.111.111-11", "529.982.247-24")) {
            invalido(cadastro("Maria da Silva", cpf, "maria@example.com", "Senha1xY", "Senha1xY", "15/11/2000"), "CPF");
        }
    }

    @Test void aceitaProvedoresDiversosERecusaEstruturasInvalidas() {
        for (String email : List.of("maria@gmail.com", "maria@hotmail.com", "maria@outlook.com", "maria@yahoo.com",
                "maria@icloud.com", "maria@empresa.com.br")) {
            assertThat(UsuarioService.normalizarEmail("  " + email.toUpperCase() + "  ", true)).isEqualTo(email);
        }
        for (String email : List.of("maria", "@dominio.com", "maria @dominio.com", ".maria@dominio.com",
                "maria.@dominio.com", "maria..silva@dominio.com", "maria@localhost", "maria@-dominio.com")) {
            assertThatThrownBy(() -> UsuarioService.normalizarEmail(email, true)).isInstanceOf(OperacaoException.class);
        }
    }

    @Test void senhaAceitaMaisDeOitoCaracteresEEspeciais() {
        UsuarioService.validarSenha("SenhaMuitoLonga1!", "SenhaMuitoLonga1!");
        for (String senha : List.of("Senha1", "senha1234", "SENHA1234", "Abcdefgh", "12345678")) {
            assertThatThrownBy(() -> UsuarioService.validarSenha(senha, senha)).isInstanceOf(OperacaoException.class)
                    .hasMessageContaining("mínimo 8");
        }
        assertThatThrownBy(() -> UsuarioService.validarSenha("Senha1xY", "Outra1xY"))
                .isInstanceOf(OperacaoException.class).hasMessageContaining("coincidem");
    }

    @Test void validaDataRealFuturoEBissexto() {
        assertThat(UsuarioService.validarDataNascimento("29/02/2024", RELOGIO)).isEqualTo(LocalDate.of(2024, 2, 29));
        for (String data : List.of("31/02/2005", "29/02/2023", "16/11/2026", "2020-01-01")) {
            assertThatThrownBy(() -> UsuarioService.validarDataNascimento(data, RELOGIO)).isInstanceOf(OperacaoException.class);
        }
    }

    @Test void calculaIdadeAntesNoDiaEDepoisDoAniversario() {
        LocalDate hoje = LocalDate.of(2026, 11, 15);
        assertThat(UsuarioService.calcularIdade(LocalDate.of(2008, 11, 16), hoje)).isEqualTo(17);
        assertThat(UsuarioService.calcularIdade(LocalDate.of(2008, 11, 15), hoje)).isEqualTo(18);
        assertThat(UsuarioService.calcularIdade(LocalDate.of(1980, 1, 1), hoje)).isEqualTo(46);
    }

    @Test void cadastroValidoPersisteSomenteHashArgon2idEData() {
        class BancoFalso extends Banco {
            Object[] gravado;
            BancoFalso() { super(null); }
            @Override public <T> T valor(String sql, Class<T> tipo, Object... argumentos) {
                return tipo.cast(Boolean.FALSE);
            }
            @Override public int atualizar(String sql, Object... argumentos) { gravado = argumentos; return 1; }
        }
        BancoFalso banco = new BancoFalso();
        var resposta = new UsuarioService(banco, RELOGIO).cadastrar(cadastro(
                "  Maria   da Silva ", "529.982.247-25", " MARIA@EXAMPLE.COM ", "SenhaLonga1!", "SenhaLonga1!", "29/02/2000"));
        assertThat(resposta.usuario().nome()).isEqualTo("Maria da Silva");
        assertThat(resposta.usuario().email()).isEqualTo("maria@example.com");
        assertThat(resposta.usuario().dataNascimento()).isEqualTo("29/02/2000");
        assertThat(banco.gravado[4].toString()).startsWith("$argon2id$").doesNotContain("SenhaLonga1!");
        assertThat(banco.gravado[5]).isEqualTo(LocalDate.of(2000, 2, 29));
    }
}
