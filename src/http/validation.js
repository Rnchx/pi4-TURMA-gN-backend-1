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

export function categoryBody(body) {
  allowed(body, ['nome']);
  return { nome: text(body.nome, 150, 'o nome') };
}

export function productBody(body) {
  allowed(body, ['nome', 'preco', 'descricao', 'imagemUrl', 'categoriaId', 'subcategoriaId']);
  if (!['number', 'string'].includes(typeof body.preco) || !/^\d{1,8}(\.\d{1,2})?$/.test(String(body.preco))) {
    throw new ApiError(400, 'dadosInvalidos', 'Informe um preço não negativo com até duas casas decimais.');
  }
  const image = text(body.imagemUrl, 2048, 'a URL da imagem');
  let url;
  try { url = new URL(image); } catch { /* Mensagem pública abaixo. */ }
  if (!url || url.protocol !== 'https:' || url.username || url.password) {
    throw new ApiError(400, 'dadosInvalidos', 'Informe uma URL HTTPS de imagem sem credenciais.');
  }
  return {
    nome: text(body.nome, 255, 'o nome'),
    preco: Number(body.preco),
    descricao: text(body.descricao, 500, 'a descrição'),
    imagemUrl: image,
    categoriaId: positiveId(body.categoriaId),
    subcategoriaId: positiveId(body.subcategoriaId),
    validade: '',
  };
}
