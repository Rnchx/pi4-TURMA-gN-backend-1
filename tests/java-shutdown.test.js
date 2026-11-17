import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requestJavaShutdown } from '../src/services/java-shutdown.js';
import { tcpClient } from '../src/services/tcp-client.js';

// Servidor TCP falso que imita o Java: lê uma linha JSON e reage conforme o cenário.
function fakeJava(onLine) {
  const received = [];
  const server = net.createServer(socket => {
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', chunk => {
      buffer += chunk;
      let lf;
      while ((lf = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, lf);
        buffer = buffer.slice(lf + 1);
        received.push(JSON.parse(line));
        onLine(socket, JSON.parse(line));
      }
    });
    socket.on('error', () => {});
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, received })));
}

const notice = requestId => `${JSON.stringify({ tipo: 'comunicadoDeDesligamento', mensagem: 'O servidor será desligado.',
  requestId, emitidoEm: '2026-11-17T12:00:00Z' })}\n`;

test('cliente administrativo envia pedidoParaSair como string JSON + LF e interpreta o ComunicadoDeDesligamento', async () => {
  const { server, port, received } = await fakeJava((socket, message) => {
    // Comunicado chega fragmentado, como pode acontecer no TCP.
    const text = notice(message.requestId);
    socket.write(text.slice(0, 15));
    setTimeout(() => socket.end(text.slice(15)), 20);
  });
  try {
    const result = await requestJavaShutdown({ host: '127.0.0.1', port, timeoutMs: 2000 });
    assert.equal(received.length, 1);
    assert.equal(received[0].operacao, 'pedidoParaSair');
    assert.deepEqual(received[0].dados, {});
    assert.match(received[0].requestId, /^[0-9a-f-]{36}$/);
    assert.equal(result.comunicado.tipo, 'comunicadoDeDesligamento');
    assert.equal(result.comunicado.requestId, received[0].requestId);
  } finally { server.close(); }
});

test('cliente administrativo trata timeout, servidor indisponível e conexão encerrada sem comunicado', async () => {
  const silent = await fakeJava(() => {});
  try {
    await assert.rejects(requestJavaShutdown({ host: '127.0.0.1', port: silent.port, timeoutMs: 150 }), { code: 'timeout' });
  } finally { silent.server.close(); }

  const closing = await fakeJava(socket => socket.end());
  try {
    await assert.rejects(requestJavaShutdown({ host: '127.0.0.1', port: closing.port, timeoutMs: 1000 }), { code: 'conexaoEncerrada' });
  } finally { closing.server.close(); }

  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const freePort = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  await assert.rejects(requestJavaShutdown({ host: '127.0.0.1', port: freePort, timeoutMs: 1000 }), { code: 'servidorIndisponivel' });
});

test('comando npm run java:shutdown retorna 0 com comunicado e código diferente de zero sem servidor', async () => {
  const script = fileURLToPath(new URL('../scripts/shutdown-java.js', import.meta.url));
  const run = env => new Promise(resolve => {
    const child = spawn(process.execPath, [script], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', d => { output += d; });
    child.stderr.on('data', d => { output += d; });
    child.once('exit', code => resolve({ code, output }));
  });
  const { server, port } = await fakeJava((socket, message) => socket.end(notice(message.requestId)));
  try {
    const ok = await run({ JAVA_TCP_HOST: '127.0.0.1', JAVA_TCP_PORT: String(port) });
    assert.equal(ok.code, 0);
    assert.match(ok.output, /ComunicadoDeDesligamento recebido/);
  } finally { server.close(); }
  const fail = await run({ JAVA_TCP_HOST: '127.0.0.1', JAVA_TCP_PORT: String(port), JAVA_SHUTDOWN_TIMEOUT_MS: '500' });
  assert.notEqual(fail.code, 0);
  assert.match(fail.output, /Falha ao desligar o servidor Java/);
});

test('cliente TCP da API trata o ComunicadoDeDesligamento como serviço indisponível (503)', async () => {
  const { server, port } = await fakeJava(socket => socket.write(notice(null)));
  try {
    const call = tcpClient({ host: '127.0.0.1', port, timeoutMs: 1000 });
    await assert.rejects(call('health', {}), { status: 503, codigo: 'servicoValidacaoIndisponivel' });
  } finally { server.close(); }
});
