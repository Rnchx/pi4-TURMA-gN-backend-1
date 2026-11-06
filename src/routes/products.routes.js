import { Router } from 'express';
import { productsController } from '../controllers/products.controller.js';

export default function productsRouter(catalog) {
  const router = Router();
  const ctrl = productsController(catalog);
  router.get('/', ctrl.list);
  router.get('/tipo/:type', ctrl.byType);
  router.get('/:id', ctrl.detail);
  router.post('/', ctrl.create);
  router.put('/:id', ctrl.update);
  router.delete('/:id', ctrl.remove);
  return router;
}
