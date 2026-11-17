import net from 'node:net';
import { randomUUID } from 'node:crypto';

export const SHUTDOWN_NOTICE = 'comunicadoDeDesligamento';

export class ShutdownError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Cliente administrativo TCP: envia {"requestId","operacao":"pedidoParaSair","dados":{}} + LF ao servidor Java e
 * aguarda o ComunicadoDeDesligamento (uma linha JSON com "tipo":"comunicadoDeDesligamento").
 * Não existe rota HTTP para isso: o comando roda só na máquina/contêiner da API (npm run java:shutdown).
 */
export function requestJavaShutdown({ host, port, timeoutMs = 10000, maxMessageBytes = 32768 }) {
  return new Promise((resolve, reject) => {
    const requestId = randomUUID();
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      error ? reject(error) : resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.write(`${JSON.stringify({ requestId, operacao: 'pedidoParaSair', dados: {} })}\n`, 'utf8');
    });
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > maxMessageBytes) {
        return finish(new ShutdownError('respostaInvalida', 'O servidor Java enviou uma resposta acima do limite.'));
      }
      let lf;
      while ((lf = buffer.indexOf(10)) >= 0) {
        const line = buffer.subarray(0, lf).toString('utf8').trim();
        buffer = buffer.subarray(lf + 1);
        if (!line) continue;
        let message;
        try { message = JSON.parse(line); } catch {
          return finish(new ShutdownError('respostaInvalida', 'O servidor Java enviou uma linha que não é JSON.'));
        }
        if (message?.tipo === SHUTDOWN_NOTICE) return finish(null, { requestId, comunicado: message });
        if (message?.sucesso === false) {
          return finish(new ShutdownError('pedidoRecusado', `O servidor Java recusou o pedido (${message.codigo || 'erro'}).`));
        }
      }
    });
    socket.once('timeout', () => finish(new ShutdownError('timeout',
      `O servidor Java não enviou o ComunicadoDeDesligamento em ${timeoutMs} ms.`)));
    socket.once('error', error => finish(new ShutdownError('servidorIndisponivel',
      `Servidor Java indisponível em ${host}:${port} (${error.code || 'erro de conexão'}).`)));
    socket.once('end', () => finish(new ShutdownError('conexaoEncerrada',
      'A conexão foi encerrada antes do ComunicadoDeDesligamento.')));
  });
}
