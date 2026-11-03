import { ApiError } from '../http/errors.js';

export default class Catalog {
  constructor(products, categories) {
    this.products = products;
    this.categories = categories;
  }

  async category(id) {
    const row = await this.categories.getCategoryById(id);
    if (!row) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
    return row;
  }

  async classification(categoryId, subcategoryId) {
    await this.category(categoryId);
    const row = await this.categories.getSubcategoryById(subcategoryId);
    if (!row) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
    if (row.categoria_id !== categoryId) {
      throw new ApiError(400, 'classificacaoInvalida', 'Informe categoria e subcategoria compatíveis.');
    }
    return row;
  }

  async product(id) {
    const row = await this.products.getProductById(id);
    if (!row) throw new ApiError(404, 'produtoNaoEncontrado', 'Produto não encontrado.');
    return row;
  }

  async byCategory(id) {
    await this.category(id);
    return this.products.getProductByidCategory(id);
  }

  async byCategoryName(name) {
    const category = await this.categories.getCategoryByName(name);
    if (!category) throw new ApiError(404, 'classificacaoNaoEncontrada', 'Categoria ou subcategoria não encontrada.');
    return this.byCategory(category.id);
  }

  async saveProduct(product, id) {
    if (id !== undefined) await this.product(id);
    await this.category(product.categoriaId);
    if (product.subcategoriaId !== undefined) await this.classification(product.categoriaId, product.subcategoriaId);
    return id === undefined ? this.products.createProduct(product) : this.products.updateProduct(id, product);
  }
}
