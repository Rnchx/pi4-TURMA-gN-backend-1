const select = `SELECT p.*, s.nome AS tipo FROM produtos p
  JOIN subcategorias s ON s.id = p.subcategoria_id AND s.categoria_id = p.categoria_id
  JOIN categorias c ON c.id = p.categoria_id`;
const active = 'p.ativo AND s.ativo AND c.ativo';

export default class ProductsRepository {
  constructor(db) { this.db = db; }

  getProducts() {
    return this.db.manyOrNone(`${select} WHERE ${active} ORDER BY p.id`);
  }

  // CT22: ofertas demonstrativas ativas (em_oferta verdadeiro), da maior para a menor economia.
  getOffers() {
    return this.db.manyOrNone(`${select} WHERE ${active} AND p.em_oferta
      ORDER BY (p.preco_anterior - p.preco) DESC, p.id`);
  }

  getProductById(id) {
    return this.db.oneOrNone(`${select} WHERE ${active} AND p.id = $1`, [id]);
  }

  getProductByType(tipo) {
    return this.db.manyOrNone(`${select} WHERE ${active} AND s.nome = $1 ORDER BY p.id`, [tipo]);
  }

  getProductByidCategory(id) {
    return this.db.manyOrNone(`${select} WHERE ${active} AND p.categoria_id = $1 ORDER BY p.id`, [id]);
  }

  getByClassification(categoriaId, subcategoriaId) {
    return this.db.manyOrNone(`${select} WHERE ${active}
      AND p.categoria_id = $1 AND p.subcategoria_id = $2 ORDER BY p.id`, [categoriaId, subcategoriaId]);
  }

  async save(product, id) {
    return this.db.tx(async tx => {
      const values = [product.nome, product.preco, product.descricao, product.imagemUrl,
        product.categoriaId, product.subcategoriaId, product.validade];
      const row = id === undefined
        ? await tx.one(`INSERT INTO produtos(nome, preco, descricao, imagem_url, categoria_id, subcategoria_id, validade)
            VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, values)
        : await tx.oneOrNone(`UPDATE produtos SET nome=$1, preco=$2, descricao=$3, imagem_url=$4,
            categoria_id=$5, subcategoria_id=$6, validade=$7, atualizado_em=now() WHERE id=$8 AND ativo RETURNING id`, [...values, id]);
      if (!row) return null;
      return tx.one(`${select} WHERE p.id = $1`, [row.id]);
    });
  }

  createProduct(product) { return this.save(product); }
  updateProduct(id, product) { return this.save(product, id); }

  deleteProduct(id) {
    return this.db.oneOrNone('UPDATE produtos SET ativo = false, atualizado_em = now() WHERE id = $1 AND ativo RETURNING id', [id]);
  }
}
