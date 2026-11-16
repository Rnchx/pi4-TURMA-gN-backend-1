import { Router } from 'express';
import { endpoint } from '../http/errors.js';
import { requireAuth } from '../http/auth-middleware.js';
import { repeatBody } from '../http/validation.js';

// CT24 histórico das três últimas compras e CT25 "Adicionar novamente ao carrinho". Ambas exigem sessão.
export default function purchasesRouter(purchases, auth) {
  const router = Router();
  router.get('/historico', requireAuth(auth), endpoint(async (req, res) => {
    res.json(await purchases.history(req.auth.usuario));
  }, 'Não foi possível carregar o histórico.'));
  router.post('/:compraId/repetir', requireAuth(auth), endpoint(async (req, res) => {
    res.json(await purchases.repeat({ ...repeatBody(req.params, req.body), usuario: req.auth.usuario }));
  }, 'Não foi possível adicionar os itens novamente.'));
  return router;
}
