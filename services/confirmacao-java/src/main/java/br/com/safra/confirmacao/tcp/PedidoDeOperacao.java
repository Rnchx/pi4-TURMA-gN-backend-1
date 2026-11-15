package br.com.safra.confirmacao.tcp;

import tools.jackson.databind.JsonNode;

public record PedidoDeOperacao(String requestId, String operacao, JsonNode dados) implements Comunicado {}
