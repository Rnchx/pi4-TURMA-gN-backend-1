import Category from '../models/categorys/Category.js';
import { ApiError, endpoint } from '../http/errors.js';
import { positiveId, text, categoryBody } from '../http/validation.js';
import { product, legacyProduct, legacyCategory } from '../http/serializers.js';

export function categoriesController(catalog, legacy = false) {
  const serialize = row => legacy ? legacyCategory(row) : { categoriaId: row.id, nome: row.nome };
  return {
    list: endpoint(async (req, res) => {
      const rows = await catalog.categories.getCategorys();
      if (legacy) return res.json({ totalCategorys: rows.length, categorys: rows.map(legacyCategory) });
      const subs = await catalog.categories.getSubcategories();
      res.json({ categorias: rows.map(row => ({ ...serialize(row), subcategorias: subs
        .filter(sub => sub.categoria_id === row.id)
        .map(sub => ({ subcategoriaId: sub.id, nome: sub.nome })) })) });
    }, 'Não foi possível carregar categorias e subcategorias.'),
    detail: endpoint(async (req, res) => {
      const row = await catalog.category(positiveId(req.params.id));
      res.json(legacy ? { category: serialize(row) } : serialize(row));
    }, 'Não foi possível consultar a categoria.'),
    byName: endpoint(async (req, res) => {
      const row = await catalog.categories.getCategoryByName(text(req.params.name, 150, 'o nome'));
      if (!row) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
      res.json({ category: [legacyCategory(row)] });
    }, 'Não foi possível consultar a categoria.'),
    byNameProducts: endpoint(async (req, res) => {
      const rows = await catalog.byCategoryName(text(req.params.category, 150, 'a categoria'));
      res.json({ products: rows.map(legacyProduct) });
    }, 'Não foi possível filtrar os produtos.'),
    classification: endpoint(async (req, res) => {
      const parse = value => positiveId(value, 'classificacaoInvalida', 'Informe categoria e subcategoria compatíveis.');
      const categoryId = parse(req.params.categoryId);
      const subcategoryId = parse(req.params.subcategoryId);
      await catalog.classification(categoryId, subcategoryId);
      const rows = await catalog.products.getByClassification(categoryId, subcategoryId);
      res.json({ categoriaId: categoryId, subcategoriaId: subcategoryId, produtos: rows.map(row => product(row)) });
    }, 'Não foi possível filtrar os produtos.'),
    create: endpoint(async (req, res) => {
      const body = categoryBody(req.body, legacy);
      const row = await catalog.categories.createCategory(new Category(body.nome));
      res.status(201).json(legacy ? { category: serialize(row) } : serialize(row));
    }, 'Não foi possível cadastrar a categoria.'),
    update: endpoint(async (req, res) => {
      const categoryId = positiveId(req.params.id);
      const body = categoryBody(req.body, legacy);
      const row = await catalog.categories.updateCategory(categoryId, new Category(body.nome));
      if (!row) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
      res.json(legacy ? { updatedCategory: serialize(row) } : serialize(row));
    }, 'Não foi possível atualizar a categoria.'),
    remove: endpoint(async (req, res) => {
      const row = await catalog.categories.deleteCategory(positiveId(req.params.id));
      if (!row) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
      res.status(204).end();
    }, 'Não foi possível remover a categoria.'),
  };
}
