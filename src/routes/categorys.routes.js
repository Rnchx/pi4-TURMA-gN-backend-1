import { Router } from 'express';
import { categoriesController } from '../controllers/categorys.controller.js';
import { productsController } from '../controllers/products.controller.js';

export default function categoriesRouter(catalog, legacy = false) {
  const router = Router();
  const ctrl = categoriesController(catalog, legacy);
  router.get('/', ctrl.list);
  if (legacy) {
    router.get('/name/:name', ctrl.byName);
    router.get('/filter/:category', ctrl.byNameProducts);
  } else {
    router.get('/:categoryId/subcategorias/:subcategoryId/produtos', ctrl.classification);
    router.get('/:category/produtos', productsController(catalog).byCategory);
  }
  router.get('/:id', ctrl.detail);
  router.post('/', ctrl.create);
  router.put('/:id', ctrl.update);
  router.delete('/:id', ctrl.remove);
  return router;
}
