import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { temporaryPostgres } from './helpers/postgres.js';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { migrate } from '../src/database/migrate.js';
import { seed } from '../src/database/seed.js';

// Serviço de Confirmação simulado (CT16): registra as chamadas e responde conforme o cenário.
let java, javaUrl, calls, respond, postgres, api, pao, leite;

before(async () => {
  java = createServer((req, res) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', async () => {
      const body = JSON.parse(raw);
      calls.push({ method: req.method, url: req.url, body });
      const [status, payload, delay] = await respond(body);
      setTimeout(() => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      }, delay ?? 0);
    });
  });
  await new Promise(resolve => java.listen(0, '127.0.0.1', resolve));
  javaUrl = `http://127.0.0.1:${java.address().port}`;
  postgres = await temporaryPostgres();
  api = request(createApp({ db: postgres.db, origins: [], confirmacaoUrl: javaUrl, confirmacaoTimeoutMs: 800 }));
  await migrate(postgres.db);
  await seed(postgres.db);
  const sub = await postgres.db.one("SELECT s.* FROM subcategorias s JOIN categorias c ON c.id=s.categoria_id WHERE c.nome='Padaria' ORDER BY s.id LIMIT 1");
  const make = (nome, preco) => api.post('/produtos').send({ nome, preco, descricao: 'Cenário', imagemUrl: 'https://example.com/p.png',
    categoriaId: sub.categoria_id, subcategoriaId: sub.id }).expect(201).then(r => r.body);
  pao = await make('Pão do checkout', '5.50');
  leite = await make('Leite do checkout', '3.00');
}, { timeout: 60000 });

after(async () => {
  await postgres?.cleanup();
  await new Promise(resolve => java?.close(resolve));
});

const compras = new Map();
beforeEach(() => {
  calls = [];
  // Comportamento padrão, como o serviço real (CT16/CT17): mesma referência e mesmo carrinho devolvem a
  // compra original; carrinho já confirmado com outra referência, ou referência de outro carrinho, é conflito.
  respond = body => {
    const conflict = [409, { codigo: 'idempotenciaConflitante', mensagem: 'A referência já foi utilizada.' }];
    const existing = compras.get(body.referencia);
    if (existing) return existing.carrinhoId === body.carrinhoId ? [200, existing.compra] : conflict;
    if ([...compras.values()].some(c => c.carrinhoId === body.carrinhoId)) return conflict;
    const compraId = randomUUID();
    const created = { confirmacaoId: `SAFRA-DEMO-${compraId.slice(0, 8).toUpperCase()}`, compraId,
      mensagem: 'Compra demonstrativa concluída.', geradaEm: '2026-11-05T12:00:00Z' };
    compras.set(body.referencia, { carrinhoId: body.carrinhoId, compra: created });
    return [201, created];
  };
});

async function cartE7() {
  const { carrinhoId } = (await api.post('/carrinhos/itens').send({ produtoId: pao.produtoId, quantidade: 2 }).expect(200)).body;
  await api.post('/carrinhos/itens').send({ carrinhoId, produtoId: leite.produtoId, quantidade: 1 }).expect(200);
  return carrinhoId;
}

const confirm = (carrinhoId, chaveIdempotencia, status) => api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`)
  .send({ chaveIdempotencia }).expect(status).then(r => r.body);

test('CT15 (OP#600/OP#603): confirma, envia ao Java os valores do resumo e fecha o carrinho', async () => {
  const carrinhoId = await cartE7();
  const summary = (await api.get(`/carrinhos/${carrinhoId}/resumo`)).body;
  const key = `confirmacao-${randomUUID()}`;
  const body = await confirm(carrinhoId, key, 201);
  assert.deepEqual(calls.map(c => [c.method, c.url]), [['POST', '/confirmacoes-demonstrativas']]);
  assert.deepEqual(calls[0].body, { referencia: key, carrinhoId, quantidadeItens: 3, total: 14, itens: summary.itens });
  assert.equal(body.status, 'concluida_demonstrativa');
  assert.match(body.confirmacaoId, /^SAFRA-DEMO-[0-9A-F]{8}$/);
  assert.deepEqual(body.itens, summary.itens);
  assert.equal(body.total, summary.total);
  assert.equal(body.mensagem, 'Compra demonstrativa concluída. Nenhuma cobrança foi realizada.');
  assert.equal(body.criadaEm, '2026-11-05T12:00:00Z');
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.status, 'confirmado');
  assert.equal((await api.get(`/carrinhos/${carrinhoId}/resumo`)).body.podeConfirmar, false);
  await api.post('/carrinhos/itens').send({ carrinhoId, produtoId: pao.produtoId, quantidade: 1 }).expect(409);
});

test('CT15: nova tentativa com a mesma chave devolve a mesma compra, sem duplicar', async () => {
  const carrinhoId = await cartE7();
  const key = `confirmacao-${randomUUID()}`;
  const first = await confirm(carrinhoId, key, 201);
  const second = await confirm(carrinhoId, key, 200);
  assert.equal(second.compraId, first.compraId);
  assert.equal(second.confirmacaoId, first.confirmacaoId);
  assert.deepEqual(second.itens, first.itens);
});

test('CT15: carrinho já confirmado com outra chave é recusado (409) sem criar outra compra', async () => {
  const carrinhoId = await cartE7();
  const first = await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 201);
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 409),
    { codigo: 'confirmacaoNaoPermitida', mensagem: 'O carrinho não pode ser confirmado.' });
  assert.equal([...compras.values()].filter(c => c.carrinhoId === carrinhoId).length, 1);
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.status, 'confirmado');
  assert.ok(first.compraId);
});

test('CT15: tentativas simultâneas com a mesma chave resultam em uma única compra', async () => {
  const carrinhoId = await cartE7();
  const key = `confirmacao-${randomUUID()}`;
  const results = await Promise.all([1, 2, 3].map(() => api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`).send({ chaveIdempotencia: key })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 200, 201]);
  assert.equal(new Set(results.map(r => r.body.compraId)).size, 1);
});

test('CT15: carrinho vazio ou com produto indisponível não é enviado ao Java (409)', async () => {
  const { carrinhoId } = (await api.post('/carrinhos/itens').send({ produtoId: pao.produtoId, quantidade: 1 })).body;
  await api.delete(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).expect(200);
  const refused = { codigo: 'confirmacaoNaoPermitida', mensagem: 'O carrinho não pode ser confirmado.' };
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 409), refused);
  const temp = (await api.post('/produtos').send({ nome: 'Sai de linha', preco: '1.00', descricao: 'Cenário',
    imagemUrl: 'https://example.com/p.png', categoriaId: pao.categoriaId, subcategoriaId: pao.subcategoriaId }).expect(201)).body;
  await api.post('/carrinhos/itens').send({ carrinhoId, produtoId: temp.produtoId, quantidade: 1 }).expect(200);
  await api.delete(`/produtos/${temp.produtoId}`).expect(204);
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 409), refused);
  assert.equal(calls.length, 0);
});

test('CT15: entradas inválidas e carrinho inexistente', async () => {
  const carrinhoId = await cartE7();
  const invalid = { codigo: 'entradaInvalida', mensagem: 'Revise os dados da confirmação.' };
  for (const body of [{}, { chaveIdempotencia: 'curta' }, { chaveIdempotencia: 12345678 }, { chaveIdempotencia: 'tem espaço aqui' },
    { chaveIdempotencia: `confirmacao-${randomUUID()}`, extra: 1 }]) {
    assert.deepEqual((await api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`).send(body).expect(400)).body, invalid);
  }
  assert.deepEqual(await confirm('abc', `confirmacao-${randomUUID()}`, 400), invalid);
  assert.deepEqual(await confirm(randomUUID(), `confirmacao-${randomUUID()}`, 404),
    { codigo: 'carrinhoNaoEncontrado', mensagem: 'Carrinho não encontrado.' });
  assert.equal(calls.length, 0);
});

test('CT15: Java recusa (409) e o carrinho continua aberto', async () => {
  const carrinhoId = await cartE7();
  respond = () => [409, { codigo: 'idempotenciaConflitante', mensagem: 'A referência já foi utilizada.' }];
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 409),
    { codigo: 'confirmacaoNaoPermitida', mensagem: 'O carrinho não pode ser confirmado.' });
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.status, 'aberto');
});

test('CT15: Java indisponível, lento ou sem banco responde 503; erro interno do Java responde 500', async () => {
  const carrinhoId = await cartE7();
  const unavailable = { codigo: 'confirmacaoIndisponivel', mensagem: 'Tente novamente mais tarde.' };
  respond = () => [503, { codigo: 'bancoIndisponivel', mensagem: 'A confirmação não pôde ser persistida.' }];
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 503), unavailable);
  respond = () => [201, {}, 1500];
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 503), unavailable);
  respond = () => [500, { codigo: 'erroInterno', mensagem: 'A confirmação não pôde ser gerada.' }];
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 500),
    { codigo: 'erroInterno', mensagem: 'Não foi possível concluir a compra demonstrativa.' });
  const offline = request(createApp({ db: postgres.db, confirmacaoUrl: 'http://127.0.0.1:1', confirmacaoTimeoutMs: 800 }));
  assert.deepEqual((await offline.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`)
    .send({ chaveIdempotencia: `confirmacao-${randomUUID()}` }).expect(503)).body, unavailable);
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.status, 'aberto');
});

test('CONFIRMACAO_URL inválida é recusada na configuração', () => {
  for (const value of ['ftp://java', 'nao-e-url', 'http://user:senha@java:8080']) {
    assert.throws(() => readConfig({ CONFIRMACAO_URL: value }), /CONFIRMACAO_URL/);
  }
  assert.equal(readConfig({ CONFIRMACAO_URL: 'http://confirmacao-java:8080/' }).confirmacaoUrl, 'http://confirmacao-java:8080');
});
