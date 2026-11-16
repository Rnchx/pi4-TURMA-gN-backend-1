import express from 'express';
import cors from 'cors';
import { createRouter } from './routes/index.routes.js';
import { ApiError, errorHandler } from './http/errors.js';
import { checkDatabase } from './database/index.js';
import ProductsRepository from './models/products/ProductsRepository.js';
import CategorysRepository from './models/categorys/CategorysRepository.js';
import Catalog from './services/catalog.js';
import CartsRepository from './models/carts/CartsRepository.js';
import Cart from './services/cart.js';
import { tcpClient } from './services/tcp-client.js';
import Auth from './services/auth.js';
import ProfilePhoto from './services/profile-photo.js';

export function createApp({ db, origins = [], java = { host: 'localhost', port: 3000, timeoutMs: 5000, maxMessageBytes: 32768 },
  sessionTtlHours = 168, profilePhotoDir = './uploads/profile', profilePhotoMaxBytes = 10485760, javaClient }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      callback(new ApiError(403, 'origemNaoPermitida', 'Origem não autorizada.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.get('/health/live', (req, res) => res.json({ http: 'ok' }));
  const readiness = async (req, res) => {
    try {
      await checkDatabase(db);
      res.json({ http: 'ok', banco: 'disponivel' });
    } catch {
      res.status(503).json({ http: 'ok', banco: 'indisponivel', codigo: 'bancoIndisponivel', mensagem: 'Banco de dados indisponível.' });
    }
  };
  app.get('/health', readiness);
  app.get('/health/ready', readiness);
  app.use(express.json({ limit: '32kb' }));
  const catalog = new Catalog(new ProductsRepository(db), new CategorysRepository(db));
  const validator = javaClient || tcpClient(java);
  const auth = new Auth(db, validator, sessionTtlHours);
  const photos = new ProfilePhoto(db, validator, profilePhotoDir, profilePhotoMaxBytes);
  const cart = new Cart(db, new CartsRepository(db), payload => validator('confirmarCompra', payload),
    payload => validator('validarRestricaoEtaria', payload));
  app.use(createRouter(catalog, cart, auth, photos));
  app.use((req, res) => res.status(404).json({ codigo: 'rotaNaoEncontrada', mensagem: 'Rota não encontrada.' }));
  app.use(errorHandler);
  return app;
}
