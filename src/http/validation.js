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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuid(value, codigo, mensagem) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new ApiError(400, codigo, mensagem);
  return value.toLowerCase();
}

const isQuantity = value => Number.isInteger(value) && value >= 1 && value <= 99;

// CT8: carrinhoId opcional (ausente cria carrinho de visitante), produtoId e quantidade obrigatórios.
export function cartItemBody(body) {
  const invalid = () => new ApiError(400, 'entradaInvalida', 'Revise o produto e a quantidade.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid();
  if (Object.keys(body).some(key => !['carrinhoId', 'produtoId', 'quantidade'].includes(key))) throw invalid();
  const { carrinhoId, produtoId, quantidade } = body;
  if (carrinhoId !== undefined && carrinhoId !== null && (typeof carrinhoId !== 'string' || !UUID.test(carrinhoId))) throw invalid();
  if (!Number.isInteger(produtoId) || produtoId < 1 || produtoId > 2147483647 || !isQuantity(quantidade)) throw invalid();
  return { carrinhoId: carrinhoId ? carrinhoId.toLowerCase() : null, produtoId, quantidade };
}

// CT12: quantidade entre 1 e 99; identificadores inválidos usam o mesmo código do contrato.
export function quantityBody(params, body) {
  const invalid = () => new ApiError(400, 'quantidadeInvalida', 'A quantidade deve estar entre 1 e 99.');
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'quantidade')) throw invalid();
  if (!isQuantity(body.quantidade)) throw invalid();
  return {
    carrinhoId: uuid(params.carrinhoId, 'quantidadeInvalida', 'A quantidade deve estar entre 1 e 99.'),
    produtoId: positiveId(params.produtoId, 'quantidadeInvalida', 'A quantidade deve estar entre 1 e 99.'),
    quantidade: body.quantidade,
  };
}

// CT15: chave de idempotência gerada pelo aplicativo e reutilizada nas novas tentativas.
export function confirmationBody(params, body) {
  const invalid = () => new ApiError(400, 'entradaInvalida', 'Revise os dados da confirmação.');
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'chaveIdempotencia')) throw invalid();
  const key = body.chaveIdempotencia;
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,100}$/.test(key)) throw invalid();
  return { carrinhoId: uuid(params.carrinhoId, 'entradaInvalida', 'Revise os dados da confirmação.'), chaveIdempotencia: key };
}
