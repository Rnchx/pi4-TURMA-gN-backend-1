import { Router } from 'express';
import { cartsController } from '../controllers/carts.controller.js';

// CT8, CT11, CT12, CT13 e CT14.
export default function cartsRouter(cart) {
  const router = Router();
  const ctrl = cartsController(cart);
  router.post('/itens', ctrl.add);
  router.get('/:carrinhoId', ctrl.get);
  router.patch('/:carrinhoId/itens/:produtoId', ctrl.updateQuantity);
  router.delete('/:carrinhoId/itens/:produtoId', ctrl.removeItem);
  router.get('/:carrinhoId/resumo', ctrl.summary);
  return router;
}
