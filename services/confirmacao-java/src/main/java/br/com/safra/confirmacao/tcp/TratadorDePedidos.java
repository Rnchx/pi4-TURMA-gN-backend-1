package br.com.safra.confirmacao.tcp;

/** Regra que transforma um pedido comum em resultado. Implementada por {@link ProcessadorDeOperacoes}. */
@FunctionalInterface
public interface TratadorDePedidos {
    PedidoDeResultado processar(PedidoDeOperacao pedido);
}
