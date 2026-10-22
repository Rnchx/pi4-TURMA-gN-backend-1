import { ApiError } from './errors.js';

export function positiveId(value, codigo = 'identificadorInvalido', mensagem = 'Informe um identificador válido.') {
  if (!/^\d+$/.test(String(value)) || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 2147483647) {
    throw new ApiError(400, codigo, mensagem);
  }
  return Number(value);
}

export function text(value, max, field) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, 'dadosInvalidos', `Informe ${field} com até ${max} caracteres.`);
  }
  return value.trim();
}

function object(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'dadosInvalidos', 'Envie os campos do cadastro em um objeto JSON.');
  }
}

function allowed(body, fields) {
  object(body);
  if (Object.keys(body).some(key => !fields.includes(key))) {
    throw new ApiError(400, 'dadosInvalidos', 'O cadastro contém campos não suportados.');
  }
}

export function categoryBody(body, legacy) {
  allowed(body, legacy ? ['name'] : ['nome']);
  return { nome: text(legacy ? body.name : body.nome, 150, 'o nome') };
}

export function productBody(body, legacy) {
  allowed(body, legacy
    ? ['name', 'price', 'description', 'type', 'validity', 'photo', 'idcategory', 'idCategory']
    : ['nome', 'preco', 'descricao', 'imagemUrl', 'categoriaId', 'subcategoriaId']);
  const price = legacy ? body.price : body.preco;
  if (!['number', 'string'].includes(typeof price) || !/^\d{1,8}(\.\d{1,2})?$/.test(String(price))) {
    throw new ApiError(400, 'dadosInvalidos', 'Informe um preço não negativo com até duas casas decimais.');
  }
  const image = text(legacy ? body.photo : body.imagemUrl, 2048, 'a URL da imagem');
  let url;
  try { url = new URL(image); } catch { /* Mensagem pública abaixo. */ }
  if (!url || url.protocol !== 'https:' || url.username || url.password) {
    throw new ApiError(400, 'dadosInvalidos', 'Informe uma URL HTTPS de imagem sem credenciais.');
  }
  if (legacy && body.idcategory !== undefined && body.idCategory !== undefined && body.idcategory !== body.idCategory) {
    throw new ApiError(400, 'dadosInvalidos', 'Informe uma única categoria.');
  }
  return {
    nome: text(legacy ? body.name : body.nome, 255, 'o nome'),
    preco: Number(price),
    descricao: text(legacy ? body.description : body.descricao, 500, 'a descrição'),
    imagemUrl: image,
    categoriaId: positiveId(legacy ? body.idcategory ?? body.idCategory : body.categoriaId),
    ...(legacy ? {
      tipo: text(body.type, 100, 'o tipo'),
      validade: text(body.validity, 50, 'a validade'),
    } : { subcategoriaId: positiveId(body.subcategoriaId), validade: '' }),
  };
}
