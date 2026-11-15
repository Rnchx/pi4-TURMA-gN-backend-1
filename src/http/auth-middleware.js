import { ApiError } from './errors.js';

export function bearer(req) {
  const value = req.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]{32,200})$/.exec(value);
  if (!match) throw new ApiError(401, 'naoAutorizado', 'Faça login para continuar.');
  return match[1];
}

export const requireAuth = auth => async (req, res, next) => {
  try {
    req.authToken = bearer(req);
    req.auth = await auth.session(req.authToken);
    next();
  } catch (error) { next(error); }
};

export const optionalAuth = auth => async (req, res, next) => {
  if (!req.get('authorization')) return next();
  try {
    req.authToken = bearer(req);
    req.auth = await auth.session(req.authToken);
    next();
  } catch (error) { next(error); }
};
