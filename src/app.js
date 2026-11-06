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
import { confirmationClient } from './services/confirmation-client.js';

export function createApp({ db, origins = [], confirmacaoUrl = 'http://localhost:8080', confirmacaoTimeoutMs = 5000 }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      callback(new ApiError(403, 'origemNaoPermitida', 'Origem não autorizada.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
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
  const cart = new Cart(db, new CartsRepository(db), confirmationClient(confirmacaoUrl, confirmacaoTimeoutMs));
  app.use(createRouter(catalog, cart));
  app.use((req, res) => res.status(404).json({ codigo: 'rotaNaoEncontrada', mensagem: 'Rota não encontrada.' }));
  app.use(errorHandler);
  return app;
}
