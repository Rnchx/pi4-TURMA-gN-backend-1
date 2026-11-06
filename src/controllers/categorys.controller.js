import Category from '../models/categorys/Category.js';
import { ApiError, endpoint } from '../http/errors.js';
import { positiveId, categoryBody } from '../http/validation.js';
import { product } from '../http/serializers.js';

export function categoriesController(catalog) {
  const serialize = row => ({ categoriaId: row.id, nome: row.nome });
  return {
    list: endpoint(async (req, res) => {
      const rows = await catalog.categories.getCategorys();
      const subs = await catalog.categories.getSubcategories();
      res.json({ categorias: rows.map(row => ({ ...serialize(row), subcategorias: subs
        .filter(sub => sub.categoria_id === row.id)
        .map(sub => ({ subcategoriaId: sub.id, nome: sub.nome })) })) });
    }, 'Não foi possível carregar categorias e subcategorias.'),
    detail: endpoint(async (req, res) => {
      res.json(serialize(await catalog.category(positiveId(req.params.id))));
    }, 'Não foi possível consultar a categoria.'),
    classification: endpoint(async (req, res) => {
      const parse = value => positiveId(value, 'classificacaoInvalida', 'Informe categoria e subcategoria compatíveis.');
      const categoryId = parse(req.params.categoryId);
      const subcategoryId = parse(req.params.subcategoryId);
      await catalog.classification(categoryId, subcategoryId);
      const rows = await catalog.products.getByClassification(categoryId, subcategoryId);
      res.json({ categoriaId: categoryId, subcategoriaId: subcategoryId, produtos: rows.map(row => product(row)) });
    }, 'Não foi possível filtrar os produtos.'),
    create: endpoint(async (req, res) => {
      const row = await catalog.categories.createCategory(new Category(categoryBody(req.body).nome));
      res.status(201).json(serialize(row));
    }, 'Não foi possível cadastrar a categoria.'),
    update: endpoint(async (req, res) => {
      const categoryId = positiveId(req.params.id);
      const row = await catalog.categories.updateCategory(categoryId, new Category(categoryBody(req.body).nome));
      if (!row) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
      res.json(serialize(row));
    }, 'Não foi possível atualizar a categoria.'),
    remove: endpoint(async (req, res) => {
      const row = await catalog.categories.deleteCategory(positiveId(req.params.id));
      if (!row) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
      res.status(204).end();
    }, 'Não foi possível remover a categoria.'),
  };
}
