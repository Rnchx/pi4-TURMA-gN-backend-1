package br.com.safra.confirmacao.tcp;

import java.time.OffsetDateTime;

/**
 * Pedido administrativo de desligamento ordenado do servidor. Chega como a string JSON
 * {@code {"requestId":"...","operacao":"pedidoParaSair","dados":{}}} e é criado pela {@link SupervisoraDeConexao},
 * que o entrega ao {@link Servidor}. Não existe rota HTTP para ele: é emitido somente pelo cliente
 * administrativo interno ({@code npm run java:shutdown}).
 */
public record PedidoParaSair(String requestId, String origem, OffsetDateTime recebidoEm) implements Comunicado {

    public static final String OPERACAO = "pedidoParaSair";

    public static boolean reconhece(PedidoDeOperacao pedido) {
        return pedido != null && OPERACAO.equals(pedido.operacao());
    }
}
