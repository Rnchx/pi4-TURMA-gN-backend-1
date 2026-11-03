import Product from '../models/products/Product.js';
import { ApiError, endpoint } from '../http/errors.js';
import { positiveId, productBody, text } from '../http/validation.js';
import { product, legacyProduct } from '../http/serializers.js';

export function productsController(catalog, legacy = false) {
  const serialize = row => legacy ? legacyProduct(row) : product(row, true);
  const id = req => positiveId(req.params.id, 'produtoIdInvalido', 'Informe um produto válido.');
  return {
    list: endpoint(async (req, res) => {
      const rows = await catalog.products.getProducts();
      res.json(legacy ? { totalProducts: rows.length, products: rows.map(legacyProduct) }
        : { totalProdutos: rows.length, produtos: rows.map(row => product(row)) });
    }, 'Não foi possível carregar o catálogo.'),
    detail: endpoint(async (req, res) => {
      const row = await catalog.product(id(req));
      res.json(legacy ? { product: serialize(row) } : serialize(row));
    }, 'Não foi possível consultar o produto.'),
    byName: endpoint(async (req, res) => {
      const row = await catalog.products.getProductByName(text(req.params.name, 255, 'o nome'));
      if (!row) throw new ApiError(404, 'produtoNaoEncontrado', 'Produto não encontrado.');
      res.json({ product: legacyProduct(row) });
    }, 'Não foi possível consultar o produto.'),
    byType: endpoint(async (req, res) => {
      const rows = await catalog.products.getProductByType(text(req.params.type, 100, 'o tipo'));
      res.json(legacy ? { product: rows.map(legacyProduct) } : { produtos: rows.map(row => product(row)) });
    }, 'Não foi possível filtrar os produtos.'),
    byCategory: endpoint(async (req, res) => {
      const categoryId = positiveId(req.params.category);
      const rows = await catalog.byCategory(categoryId);
      res.json(legacy ? { product: rows.map(legacyProduct) }
        : { categoriaId: categoryId, produtos: rows.map(row => product(row)) });
    }, 'Não foi possível filtrar os produtos.'),
    create: endpoint(async (req, res) => {
      const row = await catalog.saveProduct(new Product(productBody(req.body, legacy)));
      res.status(201).json(legacy ? { product: serialize(row) } : serialize(row));
    }, 'Não foi possível cadastrar o produto.'),
    update: endpoint(async (req, res) => {
      const productId = id(req);
      const row = await catalog.saveProduct(new Product(productBody(req.body, legacy)), productId);
      if (!row) throw new ApiError(404, 'produtoNaoEncontrado', 'Produto não encontrado.');
      res.json(legacy ? { updatedProduct: serialize(row) } : serialize(row));
    }, 'Não foi possível atualizar o produto.'),
    remove: endpoint(async (req, res) => {
      const row = await catalog.products.deleteProduct(id(req));
      if (!row) throw new ApiError(404, 'produtoNaoEncontrado', 'Produto não encontrado.');
      res.status(204).end();
    }, 'Não foi possível remover o produto.'),
  };
}
