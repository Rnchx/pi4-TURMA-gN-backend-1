package br.com.safra.confirmacao.tcp;

public record PedidoDeResultado(String requestId, boolean sucesso, Object dados, String codigo, String mensagem)
        implements Comunicado {
    public static PedidoDeResultado sucesso(String id, Object dados) {
        return new PedidoDeResultado(id, true, dados, null, null);
    }

    public static PedidoDeResultado erro(String id, String codigo, String mensagem) {
        return new PedidoDeResultado(id, false, null, codigo, mensagem);
    }
}
