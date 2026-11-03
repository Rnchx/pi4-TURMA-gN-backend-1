export class ApiError extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

export const endpoint = (handler, mensagem) => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res)).catch(error => {
    if (!(error instanceof ApiError)) error.publicMessage = mensagem;
    next(error);
  });
};

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ApiError) {
    return res.status(error.status).json({ codigo: error.codigo, mensagem: error.message });
  }
  if (error.type === 'entity.parse.failed' || error instanceof URIError) {
    return res.status(400).json({ codigo: 'requisicaoInvalida', mensagem: 'Envie uma requisição JSON válida.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ codigo: 'corpoMuitoGrande', mensagem: 'A requisição excede o tamanho permitido.' });
  }
  if (error.code === '23505') {
    return res.status(409).json({ codigo: 'registroDuplicado', mensagem: 'Já existe um cadastro com esses dados.' });
  }
  if (error.code === '23503') {
    return res.status(409).json({ codigo: 'registroVinculado', mensagem: 'A operação conflita com registros vinculados.' });
  }
  if (['23514', '23502', '22001', '22P02'].includes(error.code)) {
    return res.status(400).json({ codigo: 'dadosInvalidos', mensagem: 'Os dados não atendem às regras do cadastro.' });
  }
  return res.status(500).json({ codigo: 'erroInterno', mensagem: error.publicMessage || 'Não foi possível concluir a operação.' });
}
