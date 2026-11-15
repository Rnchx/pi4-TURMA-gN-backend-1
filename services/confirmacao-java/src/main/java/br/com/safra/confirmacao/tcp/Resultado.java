package br.com.safra.confirmacao.tcp;

/** Resultado interno antes de ser serializado como PedidoDeResultado. */
public record Resultado(boolean sucesso, Object dados, String codigo, String mensagem) {}
