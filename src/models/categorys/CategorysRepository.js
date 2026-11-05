export default class CategorysRepository {
  constructor(db) { this.db = db; }

  getCategorys() {
    return this.db.manyOrNone('SELECT * FROM categorias WHERE ativo ORDER BY id');
  }

  getSubcategories() {
    return this.db.manyOrNone(`SELECT s.* FROM subcategorias s JOIN categorias c ON c.id=s.categoria_id
      WHERE s.ativo AND c.ativo ORDER BY s.id`);
  }

  getCategoryById(id) {
    return this.db.oneOrNone('SELECT * FROM categorias WHERE id = $1 AND ativo', [id]);
  }

  getSubcategoryById(id) {
    return this.db.oneOrNone('SELECT * FROM subcategorias WHERE id = $1 AND ativo', [id]);
  }

  createCategory(category) {
    return this.db.one('INSERT INTO categorias(nome) VALUES($1) RETURNING *', [category.nome]);
  }

  updateCategory(id, category) {
    return this.db.oneOrNone('UPDATE categorias SET nome = $1 WHERE id = $2 AND ativo RETURNING *', [category.nome, id]);
  }

  deleteCategory(id) {
    return this.db.oneOrNone('DELETE FROM categorias WHERE id = $1 AND ativo RETURNING id', [id]);
  }
}
