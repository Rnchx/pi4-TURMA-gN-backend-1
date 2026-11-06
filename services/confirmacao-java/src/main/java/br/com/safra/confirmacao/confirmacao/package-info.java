/**
 * CT16 ({@code POST /confirmacoes-demonstrativas}): gera a confirmação demonstrativa e grava, em uma
 * única transação, a compra (CT17 {@code compras_demonstrativas}) e seus itens (CT18 {@code itens_compra}).
 *
 * <p>Idempotência: a mesma referência com os mesmos dados devolve a compra original; o mesmo carrinho
 * com os mesmos dados também devolve a compra original (CT17, unique_violation). Dados diferentes
 * para uma referência ou carrinho já registrados resultam em 409 {@code idempotenciaConflitante}.
 * As tabelas são criadas pelas migrations da API SAFRA (Node.js).
 */
package br.com.safra.confirmacao.confirmacao;
