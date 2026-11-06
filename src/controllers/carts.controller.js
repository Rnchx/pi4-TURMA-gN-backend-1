import { endpoint } from '../http/errors.js';
import { cartItemBody, quantityBody, uuid, positiveId, confirmationBody } from '../http/validation.js';

export function cartsController(cart) {
  const cartId = req => uuid(req.params.carrinhoId, 'carrinhoIdInvalido', 'Informe um carrinho válido.');
  return {
    add: endpoint(async (req, res) => {
      res.json(await cart.add(cartItemBody(req.body)));
    }, 'Não foi possível adicionar o produto.'),
    get: endpoint(async (req, res) => {
      res.json(await cart.get(cartId(req)));
    }, 'Não foi possível consultar o carrinho.'),
    updateQuantity: endpoint(async (req, res) => {
      res.json(await cart.updateQuantity(quantityBody(req.params, req.body)));
    }, 'Não foi possível alterar a quantidade.'),
    removeItem: endpoint(async (req, res) => {
      const message = 'Informe carrinho e produto válidos.';
      res.json(await cart.removeItem(uuid(req.params.carrinhoId, 'entradaInvalida', message),
        positiveId(req.params.produtoId, 'entradaInvalida', message)));
    }, 'Não foi possível remover o item.'),
    summary: endpoint(async (req, res) => {
      res.json(await cart.summary(cartId(req)));
    }, 'Não foi possível gerar o resumo.'),
    confirm: endpoint(async (req, res) => {
      const { criada, body } = await cart.confirm(confirmationBody(req.params, req.body));
      res.status(criada ? 201 : 200).json(body);
    }, 'Não foi possível concluir a compra demonstrativa.'),
  };
}
