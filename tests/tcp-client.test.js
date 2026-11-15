import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { tcpClient } from '../src/services/tcp-client.js';

let server, port, behavior;

before(async () => {
  server = net.createServer(socket => {
    let buffer = '';
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      const lf = buffer.indexOf('\n');
      if (lf < 0) return;
      behavior(socket, JSON.parse(buffer.slice(0, lf)));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

after(() => new Promise(resolve => server.close(resolve)));

test('TCP: correlaciona requestId e remonta resposta fragmentada', async () => {
  behavior = (socket, request) => {
    const line = `${JSON.stringify({ requestId: request.requestId, sucesso: true, dados: { eco: request.dados.valor } })}\n`;
    socket.write(line.slice(0, 7));
    setTimeout(() => socket.end(line.slice(7)), 10);
  };
  const call = tcpClient({ host: '127.0.0.1', port, timeoutMs: 500, maxMessageBytes: 1024 });
  assert.deepEqual(await call('health', { valor: 42 }), { eco: 42 });
});

test('TCP: traduz erro estruturado do Java', async () => {
  behavior = (socket, request) => socket.end(`${JSON.stringify({ requestId: request.requestId, sucesso: false,
    codigo: 'cpfDuplicado', mensagem: 'Este CPF já está cadastrado.' })}\n`);
  const call = tcpClient({ host: '127.0.0.1', port, timeoutMs: 500, maxMessageBytes: 1024 });
  await assert.rejects(() => call('cadastrarUsuario', {}), error => error.status === 409 && error.codigo === 'cpfDuplicado');
});

test('TCP: timeout, desconexão e resposta acima do limite viram 503 sem derrubar o processo', async () => {
  const call = tcpClient({ host: '127.0.0.1', port, timeoutMs: 30, maxMessageBytes: 128 });
  behavior = () => {};
  await assert.rejects(() => call('health', {}), error => error.status === 503);
  behavior = socket => socket.end();
  await assert.rejects(() => call('health', {}), error => error.status === 503);
  behavior = (socket, request) => socket.end(`${JSON.stringify({ requestId: request.requestId, sucesso: true, dados: { texto: 'x'.repeat(200) } })}\n`);
  await assert.rejects(() => call('health', {}), error => error.status === 503);
});
