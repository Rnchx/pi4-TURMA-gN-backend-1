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
  let image = null;
  if (body.imagemUrl !== undefined && body.imagemUrl !== null) {
    image = text(body.imagemUrl, 2048, 'a URL da imagem');
    let url;
    try { url = new URL(image); } catch { /* Mensagem pública abaixo. */ }
    if (!url || url.protocol !== 'https:' || url.username || url.password) {
      throw new ApiError(400, 'dadosInvalidos', 'Informe uma URL HTTPS de imagem sem credenciais.');
    }
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

// Formato do código de cupom. A existência, as regras e a diferença entre maiúsculas e minúsculas
// são decididas pelo serviço Java; aqui só se recusa entrada malformada.
const COUPON = /^[A-Za-z0-9]{1,30}$/;

// CT15: chave de idempotência gerada pelo aplicativo e reutilizada nas novas tentativas; cupom opcional.
// Subtotal, desconto e total nunca são aceitos do aplicativo (campos extras são recusados).
export function confirmationBody(params, body) {
  const invalid = () => new ApiError(400, 'entradaInvalida', 'Revise os dados da confirmação.');
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !['chaveIdempotencia', 'metodoPagamento', 'cupom'].includes(key))) throw invalid();
  const key = body.chaveIdempotencia;
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,100}$/.test(key)) throw invalid();
  if (!['pix', 'credito', 'debito', 'boleto'].includes(body.metodoPagamento)) throw invalid();
  const cupom = body.cupom ?? null;
  if (cupom !== null && (typeof cupom !== 'string' || !COUPON.test(cupom))) throw invalid();
  return { carrinhoId: uuid(params.carrinhoId, 'entradaInvalida', 'Revise os dados da confirmação.'),
    chaveIdempotencia: key, metodoPagamento: body.metodoPagamento, cupom };
}

// CT26: { codigo }. Espaços nas pontas são ignorados; o restante segue exatamente como digitado.
export function couponBody(params, body) {
  const invalid = () => new ApiError(400, 'cupomInvalido', 'Cupom inválido.');
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'codigo')) throw invalid();
  const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : '';
  if (!COUPON.test(codigo)) throw invalid();
  return { carrinhoId: uuid(params.carrinhoId, 'carrinhoIdInvalido', 'Informe um carrinho válido.'), codigo };
}

// CT25: carrinhoId opcional (o carrinho aberto atual); a compra vem da rota.
export function repeatBody(params, body) {
  const invalid = () => new ApiError(400, 'entradaInvalida', 'Revise os dados da solicitação.');
  const data = body ?? {};
  if (typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => key !== 'carrinhoId')) throw invalid();
  const carrinhoId = data.carrinhoId ?? null;
  if (carrinhoId !== null && (typeof carrinhoId !== 'string' || !UUID.test(carrinhoId))) throw invalid();
  return {
    compraId: uuid(params.compraId, 'compraNaoEncontrada', 'Compra não encontrada.'),
    carrinhoId: carrinhoId ? carrinhoId.toLowerCase() : null,
  };
}
