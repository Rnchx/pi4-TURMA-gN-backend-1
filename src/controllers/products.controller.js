import Product from '../models/products/Product.js';
import { ApiError, endpoint } from '../http/errors.js';
import { positiveId, productBody, text } from '../http/validation.js';
import { product } from '../http/serializers.js';

export const AVISO_OFERTAS = 'Ofertas demonstrativas; preços sem atualização em tempo real.';

export function productsController(catalog) {
  const id = req => positiveId(req.params.id, 'produtoIdInvalido', 'Informe um produto válido.');
  return {
    list: endpoint(async (req, res) => {
      const rows = await catalog.products.getProducts();
      res.json({ totalProdutos: rows.length, produtos: rows.map(row => product(row)) });
    }, 'Não foi possível carregar o catálogo.'),
    // CT22 listarOfertasDemonstrativas: o aviso acompanha sempre a lista.
    offers: endpoint(async (req, res) => {
      const rows = await catalog.products.getOffers();
      res.json({ aviso: AVISO_OFERTAS, ofertas: rows.map(row => product(row)) });
    }, 'Não foi possível carregar as ofertas.'),
    detail: endpoint(async (req, res) => {
      res.json(product(await catalog.product(id(req)), true));
    }, 'Não foi possível consultar o produto.'),
    byType: endpoint(async (req, res) => {
      const rows = await catalog.products.getProductByType(text(req.params.type, 100, 'o tipo'));
      res.json({ produtos: rows.map(row => product(row)) });
    }, 'Não foi possível filtrar os produtos.'),
    byCategory: endpoint(async (req, res) => {
      const categoryId = positiveId(req.params.category);
      const rows = await catalog.byCategory(categoryId);
      res.json({ categoriaId: categoryId, produtos: rows.map(row => product(row)) });
    }, 'Não foi possível filtrar os produtos.'),
    create: endpoint(async (req, res) => {
      const row = await catalog.saveProduct(new Product(productBody(req.body)));
      res.status(201).json(product(row, true));
    }, 'Não foi possível cadastrar o produto.'),
    update: endpoint(async (req, res) => {
      const productId = id(req);
      const row = await catalog.saveProduct(new Product(productBody(req.body)), productId);
      if (!row) throw new ApiError(404, 'produtoNaoEncontrado', 'Produto não encontrado.');
      res.json(product(row, true));
    }, 'Não foi possível atualizar o produto.'),
    remove: endpoint(async (req, res) => {
      const row = await catalog.products.deleteProduct(id(req));
      if (!row) throw new ApiError(404, 'produtoNaoEncontrado', 'Produto não encontrado.');
      res.status(204).end();
    }, 'Não foi possível remover o produto.'),
  };
}
