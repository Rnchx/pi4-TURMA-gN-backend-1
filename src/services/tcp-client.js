import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../http/errors.js';

const STATUS = {
  entradaInvalida: 400, dadosInvalidos: 400, credenciaisInvalidas: 401,
  naoAutorizado: 401, tentativasExcedidas: 429, cpfDuplicado: 409,
  emailDuplicado: 409, idempotenciaConflitante: 409, confirmacaoNaoPermitida: 409,
  campoNaoEditavel: 400, senhaAtualIncorreta: 401, restricaoEtaria: 403, dataNascimentoAusente: 403,
  bancoIndisponivel: 503, servicoIndisponivel: 503,
  cupomInvalido: 400, cupomIndisponivel: 409, cupomJaUtilizado: 409, cupomExpirado: 409,
  carrinhoNaoEncontrado: 404, compraNaoEncontrada: 404,
};

const unavailable = () => new ApiError(503, 'servicoValidacaoIndisponivel', 'O serviço de validação está indisponível. Tente novamente.');

/** Cliente TCP/JSON delimitado por LF. Uma conexão curta por operação torna timeout e falha isolados. */
export function tcpClient({ host, port, timeoutMs = 5000, maxMessageBytes = 32768 }) {
  return (operacao, dados = {}) => new Promise((resolve, reject) => {
    const requestId = randomUUID();
    const wire = `${JSON.stringify({ requestId, operacao, dados })}\n`;
    if (Buffer.byteLength(wire) > maxMessageBytes) return reject(new ApiError(413, 'mensagemMuitoGrande', 'A solicitação excede o limite permitido.'));

    const socket = net.createConnection({ host, port });
    let settled = false;
    let buffer = Buffer.alloc(0);
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      error ? reject(error) : resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => socket.write(wire, 'utf8'));
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > maxMessageBytes) return finish(unavailable());
      const lf = buffer.indexOf(10);
      if (lf < 0) return;
      let response;
      try { response = JSON.parse(buffer.subarray(0, lf).toString('utf8')); } catch { return finish(unavailable()); }
      if (response?.requestId !== requestId || typeof response.sucesso !== 'boolean') return finish(unavailable());
      if (!response.sucesso) {
        const code = response.codigo || 'erroInterno';
        return finish(new ApiError(STATUS[code] || 500, code, response.mensagem || 'Não foi possível concluir a operação.'));
      }
      finish(null, response.dados ?? {});
    });
    socket.once('timeout', () => finish(unavailable()));
    socket.once('error', () => finish(unavailable()));
    socket.once('end', () => finish(unavailable()));
  });
}
