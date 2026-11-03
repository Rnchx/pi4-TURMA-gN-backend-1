import { demoProducts } from './demo-products.js';

export async function seed(db) {
  await db.tx(async tx => {
    await tx.any('SELECT pg_advisory_xact_lock(20261022, 2)');
    for (const product of demoProducts) {
      const category = await tx.one(`INSERT INTO categorias(nome) VALUES($1)
        ON CONFLICT(nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [product.categoria]);
      const subcategory = await tx.one(`INSERT INTO subcategorias(categoria_id, nome) VALUES($1, $2)
        ON CONFLICT(categoria_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [category.id, product.tipo]);
      await tx.none(`INSERT INTO produtos(demo_chave, categoria_id, subcategoria_id, nome, descricao, imagem_url, preco)
        VALUES($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT(demo_chave) DO UPDATE SET categoria_id = EXCLUDED.categoria_id,
          subcategoria_id = EXCLUDED.subcategoria_id, nome = EXCLUDED.nome, descricao = EXCLUDED.descricao,
          imagem_url = EXCLUDED.imagem_url, preco = EXCLUDED.preco, atualizado_em = now()`,
      [product.chave, category.id, subcategory.id, product.nome, product.descricao, product.imagem, product.preco]);
    }
  });
}
