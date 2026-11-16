import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { temporaryPostgres } from './helpers/postgres.js';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { migrate } from '../src/database/migrate.js';
import { seed } from '../src/database/seed.js';
import { ApiError } from '../src/http/errors.js';

// Serviço de Confirmação simulado (CT16): registra as chamadas e responde conforme o cenário.
let calls, respond, postgres, api, pao, leite, token, usuarioId;

before(async () => {
  postgres = await temporaryPostgres();
  await migrate(postgres.db);
  await seed(postgres.db);
  const javaClient = async (operacao, body) => {
    calls.push({ operacao, body });
    const [status, payload, delay] = await respond(body);
    if (delay > 800) throw new ApiError(503, 'servicoValidacaoIndisponivel', 'O serviço de validação está indisponível. Tente novamente.');
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    if ([200, 201].includes(status)) return { ...payload, criada: status === 201 };
    if (status === 409) throw new ApiError(409, 'confirmacaoNaoPermitida', 'O carrinho não pode ser confirmado.');
    if ([502, 503, 504].includes(status)) throw new ApiError(503, 'servicoValidacaoIndisponivel', 'O serviço de validação está indisponível. Tente novamente.');
    throw new Error('Falha simulada');
  };
  api = request(createApp({ db: postgres.db, origins: [], javaClient }));
  usuarioId = randomUUID();
  token = `teste_${randomUUID()}_${randomUUID()}`;
  await postgres.db.none(`INSERT INTO usuarios(id,nome,cpf,email,senha_hash) VALUES($1,'Maria da Silva','52998224725',$2,'$argon2id$teste')`, [usuarioId, `maria.${usuarioId}@gmail.com`]);
  await postgres.db.none(`INSERT INTO sessoes(id,usuario_id,token_hash,expira_em) VALUES($1,$2,$3,now()+interval '1 hour')`,
    [randomUUID(), usuarioId, createHash('sha256').update(token).digest('hex')]);
  const sub = await postgres.db.one("SELECT s.* FROM subcategorias s JOIN categorias c ON c.id=s.categoria_id WHERE c.nome='Padaria e Confeitaria' ORDER BY s.id LIMIT 1");
  const make = (nome, preco) => api.post('/produtos').send({ nome, preco, descricao: 'Cenário', imagemUrl: 'https://example.com/p.png',
    categoriaId: sub.categoria_id, subcategoriaId: sub.id }).expect(201).then(r => r.body);
  pao = await make('Pão do checkout', '5.50');
  leite = await make('Leite do checkout', '3.00');
}, { timeout: 60000 });

after(async () => {
  await postgres?.cleanup();
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
    // O Java real calcula desconto e total; aqui o simulado devolve a compra sem cupom.
    const created = { confirmacaoId: `SAFRA-DEMO-${compraId.slice(0, 8).toUpperCase()}`, compraId,
      mensagem: 'Compra demonstrativa concluída.', geradaEm: '2026-11-05T12:00:00Z',
      subtotal: body.subtotal, cupom: body.cupom, desconto: 0, total: body.subtotal };
    compras.set(body.referencia, { carrinhoId: body.carrinhoId, compra: created });
    return [201, created];
  };
});

async function cartE7() {
  const { carrinhoId } = (await api.post('/carrinhos/itens').send({ produtoId: pao.produtoId, quantidade: 2 }).expect(200)).body;
  await api.post('/carrinhos/itens').send({ carrinhoId, produtoId: leite.produtoId, quantidade: 1 }).expect(200);
  return carrinhoId;
}

const confirm = (carrinhoId, chaveIdempotencia, status, metodoPagamento = 'pix') => api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`)
  .set('Authorization', `Bearer ${token}`).send({ chaveIdempotencia, metodoPagamento }).expect(status).then(r => r.body);

test('CT15 (OP#600/OP#603): confirma, envia ao Java os valores do resumo e fecha o carrinho', async () => {
  const carrinhoId = await cartE7();
  const summary = (await api.get(`/carrinhos/${carrinhoId}/resumo`)).body;
  const key = `confirmacao-${randomUUID()}`;
  const body = await confirm(carrinhoId, key, 201);
  assert.deepEqual(calls.map(c => c.operacao), ['confirmarCompra']);
  assert.deepEqual(calls[0].body, { referencia: key, carrinhoId, usuarioId, metodoPagamento: 'pix', quantidadeItens: 3, subtotal: 14,
    cupom: null, itens: summary.itens });
  assert.equal(body.status, 'concluida_demonstrativa');
  assert.match(body.confirmacaoId, /^SAFRA-DEMO-[0-9A-F]{8}$/);
  assert.deepEqual(body.itens, summary.itens);
  assert.equal(body.total, summary.total);
  assert.equal(body.subtotal, summary.total);
  assert.equal(body.desconto, 0);
  assert.equal(body.cupom, null);
  assert.equal(body.metodoPagamento, 'pix');
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
  const results = await Promise.all([1, 2, 3].map(() => api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`)
    .set('Authorization', `Bearer ${token}`).send({ chaveIdempotencia: key, metodoPagamento: 'pix' })));
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
  for (const body of [{}, { chaveIdempotencia: 'curta', metodoPagamento: 'pix' }, { chaveIdempotencia: 12345678, metodoPagamento: 'pix' },
    { chaveIdempotencia: 'tem espaço aqui', metodoPagamento: 'pix' }, { chaveIdempotencia: `confirmacao-${randomUUID()}`, metodoPagamento: 'dinheiro' },
    { chaveIdempotencia: `confirmacao-${randomUUID()}`, metodoPagamento: 'pix', extra: 1 }]) {
    assert.deepEqual((await api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`).set('Authorization', `Bearer ${token}`).send(body).expect(400)).body, invalid);
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
  const unavailable = { codigo: 'servicoValidacaoIndisponivel', mensagem: 'O serviço de validação está indisponível. Tente novamente.' };
  respond = () => [503, { codigo: 'bancoIndisponivel', mensagem: 'A confirmação não pôde ser persistida.' }];
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 503), unavailable);
  respond = () => [201, {}, 1500];
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 503), unavailable);
  respond = () => [500, { codigo: 'erroInterno', mensagem: 'A confirmação não pôde ser gerada.' }];
  assert.deepEqual(await confirm(carrinhoId, `confirmacao-${randomUUID()}`, 500),
    { codigo: 'erroInterno', mensagem: 'Não foi possível concluir a compra demonstrativa.' });
  const offline = request(createApp({ db: postgres.db, java: { host: '127.0.0.1', port: 1, timeoutMs: 100, maxMessageBytes: 32768 } }));
  assert.deepEqual((await offline.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`)
    .set('Authorization', `Bearer ${token}`).send({ chaveIdempotencia: `confirmacao-${randomUUID()}`, metodoPagamento: 'pix' }).expect(503)).body,
    { codigo: 'servicoValidacaoIndisponivel', mensagem: 'O serviço de validação está indisponível. Tente novamente.' });
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.status, 'aberto');
});

test('CT15/CT26: cupom segue para o Java e a resposta usa subtotal, desconto e total calculados por ele', async () => {
  const carrinhoId = await cartE7();
  respond = body => [201, { confirmacaoId: 'SAFRA-DEMO-0000CAFE', compraId: randomUUID(), mensagem: 'Compra demonstrativa concluída.',
    geradaEm: '2026-11-05T12:00:00Z', subtotal: body.subtotal, cupom: body.cupom, desconto: 14, total: 0 }];
  const body = (await api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`).set('Authorization', `Bearer ${token}`)
    .send({ chaveIdempotencia: `confirmacao-${randomUUID()}`, metodoPagamento: 'pix', cupom: 'QUERO100' }).expect(201)).body;
  assert.equal(calls[0].body.cupom, 'QUERO100');
  assert.equal(calls[0].body.subtotal, 14);
  assert.deepEqual([body.subtotal, body.cupom, body.desconto, body.total], [14, 'QUERO100', 14, 0]);
});

test('CT15: o aplicativo não pode enviar subtotal, desconto ou total; cupom malformado é recusado', async () => {
  const carrinhoId = await cartE7();
  for (const extra of [{ total: 0 }, { desconto: 100 }, { subtotal: 1 }, { cupom: 'QUERO 100' }, { cupom: 123 }, { cupom: '' }]) {
    await api.post(`/carrinhos/${carrinhoId}/confirmacao-demonstrativa`).set('Authorization', `Bearer ${token}`)
      .send({ chaveIdempotencia: `confirmacao-${randomUUID()}`, metodoPagamento: 'pix', ...extra }).expect(400);
  }
  assert.equal(calls.length, 0);
});

test('CT26: validação de cupom exige sessão, confere o carrinho e repassa ao Java somente usuário, carrinho e código', async () => {
  const carrinhoId = await cartE7();
  respond = () => [200, { codigo: 'PRIMEIRA40', subtotal: 14, desconto: 14, total: 0, mensagem: 'Cupom aplicado.' }];
  await api.post(`/carrinhos/${carrinhoId}/cupom`).send({ codigo: 'PRIMEIRA40' }).expect(401);
  const body = (await api.post(`/carrinhos/${carrinhoId}/cupom`).set('Authorization', `Bearer ${token}`)
    .send({ codigo: '  PRIMEIRA40 ' }).expect(200)).body;
  assert.deepEqual(calls.map(c => c.operacao), ['validarCupom']);
  assert.deepEqual(calls[0].body, { usuarioId, carrinhoId, codigo: 'PRIMEIRA40' });
  assert.deepEqual(body, { cupom: 'PRIMEIRA40', subtotal: 14, desconto: 14, total: 0, mensagem: 'Cupom aplicado.' });
  for (const codigo of ['', 'com espaço', 'x'.repeat(31), 42]) {
    assert.equal((await api.post(`/carrinhos/${carrinhoId}/cupom`).set('Authorization', `Bearer ${token}`)
      .send({ codigo }).expect(400)).body.codigo, 'cupomInvalido');
  }
  await api.post(`/carrinhos/${randomUUID()}/cupom`).set('Authorization', `Bearer ${token}`).send({ codigo: 'QUERO100' }).expect(404);
  assert.equal(calls.length, 1);
});

test('configuração TCP valida porta, limites e duração da sessão', () => {
  for (const value of ['0', '65536', 'abc']) assert.throws(() => readConfig({ JAVA_TCP_PORT: value }), /JAVA_TCP_PORT/);
  for (const [name, value] of [['JAVA_TCP_TIMEOUT_MS', '0'], ['JAVA_TCP_MAX_MESSAGE_BYTES', '-1'], ['SESSION_TTL_HOURS', 'abc']]) {
    assert.throws(() => readConfig({ [name]: value }), new RegExp(name));
  }
  assert.equal(readConfig({ JAVA_TCP_HOST: 'confirmacao-java', JAVA_TCP_PORT: '3000' }).java.port, 3000);
});
