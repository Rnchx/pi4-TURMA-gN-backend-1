/**
 * Reservado para CT16 ({@code POST /confirmacoes-demonstrativas}), com persistência em
 * CT17 ({@code compras_demonstrativas}) e CT18 ({@code itens_compra}).
 *
 * <p>Ainda não implementado: CT17 exige chave estrangeira para {@code carrinhos.id} (CT9),
 * e o carrinho persistido (CT8–CT15) ainda não existe na API SAFRA. Uma confirmação sem
 * carrinho real não atenderia ao contrato, por isso nenhuma rota é exposta neste ciclo.
 *
 * <p>Erros previstos pelo contrato, já disponíveis no formato de {@code ErroResposta}:
 * {@code entradaInvalida} (400), {@code idempotenciaConflitante} (409),
 * {@code erroInterno} (500) e {@code bancoIndisponivel} (503).
 */
package br.com.safra.confirmacao.confirmacao;
