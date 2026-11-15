import express, { Router } from 'express';
import { endpoint } from '../http/errors.js';
import { bearer, requireAuth } from '../http/auth-middleware.js';

export default function authRouter(auth, photos) {
  const router = Router();
  router.post('/cadastro', endpoint(async (req, res) => res.status(201).json(await auth.register(req.body)), 'Não foi possível realizar o cadastro.'));
  router.post('/login', endpoint(async (req, res) => res.json(await auth.login(req.body)), 'Não foi possível entrar.'));
  router.get('/perfil', requireAuth(auth), endpoint(async (req, res) => res.json(await auth.profile(req.auth.usuario.id)), 'Não foi possível carregar o perfil.'));
  router.patch('/perfil', requireAuth(auth), endpoint(async (req, res) => res.json(await auth.updateProfile(req.auth.usuario.id, req.body)), 'Não foi possível atualizar o perfil.'));
  router.post('/perfil/alterar-senha', requireAuth(auth), endpoint(async (req, res) => res.json(await auth.changePassword(req.auth.usuario.id, req.body)), 'Não foi possível alterar a senha.'));
  router.get('/perfil/foto', requireAuth(auth), endpoint(async (req, res) => {
    const photo = await photos.read(req.auth.usuario.id);
    res.set('Cache-Control', 'private, no-store').type(photo.type).send(photo.body);
  }, 'Não foi possível carregar a foto.'));
  router.put('/perfil/foto', requireAuth(auth), express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: photos.maxBytes }), endpoint(async (req, res) => {
    res.json(await photos.upload(req.auth.usuario.id, req.get('content-type'), req.body));
  }, 'Não foi possível atualizar a foto.'));
  router.delete('/perfil/foto', requireAuth(auth), endpoint(async (req, res) => res.json(await photos.remove(req.auth.usuario.id)), 'Não foi possível remover a foto.'));
  router.delete('/conta', requireAuth(auth), endpoint(async (req, res) => {
    const result = await auth.deleteAccount(req.auth.usuario.id, req.body);
    await photos.removeFile(result.fotoPerfilChave);
    res.status(204).end();
  }, 'Não foi possível excluir a conta.'));
  router.post('/logout', endpoint(async (req, res) => {
    const token = bearer(req);
    await auth.logout(token);
    res.status(204).end();
  }, 'Não foi possível sair.'));
  return router;
}
