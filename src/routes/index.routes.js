import { Router } from 'express';
import productsRouter from './products.routes.js';
import categoriesRouter from './categorys.routes.js';
import cartsRouter from './carts.routes.js';
import authRouter from './auth.routes.js';
import purchasesRouter from './purchases.routes.js';

export function createRouter(catalog, cart, auth, photos, purchases) {
  const router = Router();
  router.get('/', (req, res) => res.json({ mensagem: 'API SAFRA Online.' }));
  router.use('/produtos', productsRouter(catalog));
  router.use('/categorias', categoriesRouter(catalog));
  router.use('/auth', authRouter(auth, photos));
  router.use('/carrinhos', cartsRouter(cart, auth));
  router.use('/compras', purchasesRouter(purchases, auth));
  return router;
}
