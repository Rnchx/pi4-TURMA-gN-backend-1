import { Router } from 'express';
import { productsController } from '../controllers/products.controller.js';

export default function productsRouter(catalog, legacy = false) {
  const router = Router();
  const ctrl = productsController(catalog, legacy);
  router.get('/', ctrl.list);
  if (legacy) {
    router.get('/name/:name', ctrl.byName);
    router.get('/type/:type', ctrl.byType);
    router.get('/idcategory/:category', ctrl.byCategory);
  } else {
    router.get('/tipo/:type', ctrl.byType);
  }
  router.get('/:id', ctrl.detail);
  router.post('/', ctrl.create);
  router.put('/:id', ctrl.update);
  router.delete('/:id', ctrl.remove);
  return router;
}
