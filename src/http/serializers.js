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
