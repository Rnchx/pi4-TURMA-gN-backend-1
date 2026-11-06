// CT9 carrinhos e CT10 itensCarrinho. Subtotais e totais são calculados em NUMERIC pelo PostgreSQL,
// sem ponto flutuante binário (fluxo E7). Os métodos recebem a conexão ou a transação em uso.
const itemsSql = `SELECT i.produto_id, p.nome, i.quantidade, i.preco_unitario,
    (i.quantidade * i.preco_unitario)::numeric(12,2) AS subtotal,
    (p.ativo AND s.ativo AND c.ativo) AS disponivel
  FROM itens_carrinho i
  JOIN produtos p ON p.id = i.produto_id
  JOIN subcategorias s ON s.id = p.subcategoria_id
  JOIN categorias c ON c.id = p.categoria_id
  WHERE i.carrinho_id = $1 ORDER BY i.id`;

const activeProductSql = `SELECT p.id, p.nome, p.preco FROM produtos p
  JOIN subcategorias s ON s.id = p.subcategoria_id AND s.categoria_id = p.categoria_id
  JOIN categorias c ON c.id = p.categoria_id
  WHERE p.id = $1 AND p.ativo AND s.ativo AND c.ativo`;

export default class CartsRepository {
  constructor(db) { this.db = db; }

  create(t, id) {
    return t.one('INSERT INTO carrinhos(id) VALUES($1) RETURNING *', [id]);
  }

  find(t, id) {
    return t.oneOrNone('SELECT * FROM carrinhos WHERE id = $1', [id]);
  }

  // Bloqueio compatível com a chave estrangeira gravada pelo Serviço de Confirmação (KEY SHARE).
  lock(t, id) {
    return t.oneOrNone('SELECT * FROM carrinhos WHERE id = $1 FOR NO KEY UPDATE', [id]);
  }

  touch(t, id) {
    return t.none('UPDATE carrinhos SET atualizado_em = now() WHERE id = $1', [id]);
  }

  confirm(t, id) {
    return t.none(`UPDATE carrinhos SET status = 'confirmado', atualizado_em = now()
      WHERE id = $1 AND status = 'aberto'`, [id]);
  }

  activeProduct(t, productId) {
    return t.oneOrNone(activeProductSql, [productId]);
  }

  // Soma à linha existente (CT10 unique_violation -> atualizar quantidade). Nada é gravado acima de 99.
  addItem(t, cartId, productId, quantity, price) {
    return t.oneOrNone(`INSERT INTO itens_carrinho(carrinho_id, produto_id, quantidade, preco_unitario)
      VALUES($1, $2, $3, $4)
      ON CONFLICT (carrinho_id, produto_id) DO UPDATE
        SET quantidade = itens_carrinho.quantidade + EXCLUDED.quantidade, preco_unitario = EXCLUDED.preco_unitario
        WHERE itens_carrinho.quantidade + EXCLUDED.quantidade <= 99
      RETURNING produto_id, quantidade, preco_unitario, (quantidade * preco_unitario)::numeric(12,2) AS subtotal`,
    [cartId, productId, quantity, price]);
  }

  setQuantity(t, cartId, productId, quantity) {
    return t.oneOrNone(`UPDATE itens_carrinho SET quantidade = $3
      WHERE carrinho_id = $1 AND produto_id = $2
      RETURNING produto_id, quantidade, preco_unitario, (quantidade * preco_unitario)::numeric(12,2) AS subtotal`,
    [cartId, productId, quantity]);
  }

  removeItem(t, cartId, productId) {
    return t.oneOrNone('DELETE FROM itens_carrinho WHERE carrinho_id = $1 AND produto_id = $2 RETURNING id', [cartId, productId]);
  }

  items(t, cartId) {
    return t.manyOrNone(itemsSql, [cartId]);
  }

  total(t, cartId) {
    return t.one(`SELECT COALESCE(sum(quantidade * preco_unitario), 0)::numeric(12,2) AS total
      FROM itens_carrinho WHERE carrinho_id = $1`, [cartId]).then(row => row.total);
  }
}
