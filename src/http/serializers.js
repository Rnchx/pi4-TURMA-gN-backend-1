export function product(row, details = false) {
  const result = {
    produtoId: row.id,
    nome: row.nome,
    imagemUrl: row.imagem_url,
    preco: Number(row.preco),
    emOferta: row.em_oferta,
    ...(row.em_oferta ? { precoAnterior: Number(row.preco_anterior) } : {}),
  };
  return details ? { ...result, descricao: row.descricao, categoriaId: row.categoria_id, subcategoriaId: row.subcategoria_id } : result;
}

export function legacyProduct(row) {
  return {
    id: row.id, name: row.nome, price: Number(row.preco).toFixed(2),
    description: row.descricao, photo: row.imagem_url, type: row.tipo,
    validity: row.validade, idcategory: row.categoria_id,
  };
}

export const legacyCategory = row => ({ id: row.id, name: row.nome });
