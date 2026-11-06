import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { temporaryPostgres } from './helpers/postgres.js';
import { createApp } from '../src/app.js';
import { migrate } from '../src/database/migrate.js';
import { seed } from '../src/database/seed.js';

let postgres, api, pao, leite, decimo;
const missingCart = '0c9d92c6-6939-4a33-9132-2dd75fe512ad';

async function product(nome, preco) {
  const sub = await postgres.db.one("SELECT s.* FROM subcategorias s JOIN categorias c ON c.id=s.categoria_id WHERE c.nome='Padaria' ORDER BY s.id LIMIT 1");
  return (await api.post('/produtos').send({ nome, preco, descricao: 'Produto do cenário', imagemUrl: 'https://example.com/p.png',
    categoriaId: sub.categoria_id, subcategoriaId: sub.id }).expect(201)).body;
}

const add = (body, status = 200) => api.post('/carrinhos/itens').send(body).expect(status).then(r => r.body);

before(async () => {
  postgres = await temporaryPostgres();
  api = request(createApp({ db: postgres.db, origins: ['http://localhost:8081'] }));
  await migrate(postgres.db);
  await seed(postgres.db);
  pao = await product('Pão do cenário E7', '5.50');
  leite = await product('Leite do cenário E7', '3.00');
  decimo = await product('Bala de dez centavos', '0.10');
}, { timeout: 60000 });

after(async () => { await postgres?.cleanup(); });

test('CT8 (OP#588): cria carrinho de visitante e devolve item, subtotal e total', async () => {
  const body = await add({ produtoId: pao.produtoId, quantidade: 1 });
  assert.match(body.carrinhoId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(body, { carrinhoId: body.carrinhoId, mensagem: 'Produto adicionado ao carrinho.',
    item: { produtoId: pao.produtoId, quantidade: 1, precoUnitario: 5.5, subtotal: 5.5 }, total: 5.5 });
  const row = await postgres.db.one('SELECT * FROM carrinhos WHERE id=$1', [body.carrinhoId]);
  assert.equal(row.status, 'aberto');
});

test('CT8/CT10 (OP#591): produto repetido aumenta a quantidade sem duplicar a linha', async () => {
  const { carrinhoId } = await add({ produtoId: pao.produtoId, quantidade: 2 });
  const again = await add({ carrinhoId, produtoId: pao.produtoId, quantidade: 3 });
  assert.equal(again.item.quantidade, 5);
  assert.equal(again.total, 27.5);
  const count = await postgres.db.one('SELECT count(*)::int AS n FROM itens_carrinho WHERE carrinho_id=$1', [carrinhoId]);
  assert.equal(count.n, 1);
  await add({ carrinhoId, produtoId: pao.produtoId, quantidade: 95 }, 400);
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.itens[0].quantidade, 5);
});

test('CT8: adições simultâneas do mesmo produto somam sem perder unidades', async () => {
  const { carrinhoId } = await add({ produtoId: leite.produtoId, quantidade: 1 });
  await Promise.all(Array.from({ length: 9 }, () => add({ carrinhoId, produtoId: leite.produtoId, quantidade: 1 })));
  const cart = (await api.get(`/carrinhos/${carrinhoId}`).expect(200)).body;
  assert.equal(cart.itens.length, 1);
  assert.equal(cart.itens[0].quantidade, 10);
  assert.equal(cart.total, 30);
});

test('CT8: entradas inválidas, carrinho e produto inexistentes seguem o contrato', async () => {
  for (const body of [{}, { produtoId: pao.produtoId }, { produtoId: pao.produtoId, quantidade: 0 },
    { produtoId: pao.produtoId, quantidade: 100 }, { produtoId: pao.produtoId, quantidade: 1.5 },
    { produtoId: pao.produtoId, quantidade: '1' }, { produtoId: 'x', quantidade: 1 }, { produtoId: -1, quantidade: 1 },
    { carrinhoId: 'abc', produtoId: pao.produtoId, quantidade: 1 }, { produtoId: pao.produtoId, quantidade: 1, extra: true }]) {
    assert.deepEqual(await add(body, 400), { codigo: 'entradaInvalida', mensagem: 'Revise o produto e a quantidade.' });
  }
  const notFound = { codigo: 'recursoNaoEncontrado', mensagem: 'Carrinho ou produto não encontrado.' };
  assert.deepEqual(await add({ carrinhoId: missingCart, produtoId: pao.produtoId, quantidade: 1 }, 404), notFound);
  assert.deepEqual(await add({ produtoId: 2147483647, quantidade: 1 }, 404), notFound);
  const inactive = await product('Produto desativado', '1.00');
  await api.delete(`/produtos/${inactive.produtoId}`).expect(204);
  assert.deepEqual(await add({ produtoId: inactive.produtoId, quantidade: 1 }, 404), notFound);
});

test('E7 (OP#594/OP#597): 2 x 5,50 + 1 x 3,00 = 14,00; retirando uma unidade, 8,50', async () => {
  const { carrinhoId } = await add({ produtoId: pao.produtoId, quantidade: 2 });
  await add({ carrinhoId, produtoId: leite.produtoId, quantidade: 1 });
  const cart = (await api.get(`/carrinhos/${carrinhoId}`).expect(200)).body;
  assert.deepEqual(cart, { carrinhoId, status: 'aberto', carrinhoVazio: false, total: 14, itens: [
    { produtoId: pao.produtoId, nome: 'Pão do cenário E7', quantidade: 2, precoUnitario: 5.5, subtotal: 11 },
    { produtoId: leite.produtoId, nome: 'Leite do cenário E7', quantidade: 1, precoUnitario: 3, subtotal: 3 },
  ] });
  const changed = (await api.patch(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).send({ quantidade: 1 }).expect(200)).body;
  assert.deepEqual(changed, { carrinhoId, produtoId: pao.produtoId, quantidade: 1, precoUnitario: 5.5, subtotal: 5.5, total: 8.5 });
});

test('totais em decimal: 3 x 0,10 = 0,30 sem erro de centavos', async () => {
  const { total, item } = await add({ produtoId: decimo.produtoId, quantidade: 3 });
  assert.equal(item.subtotal, 0.3);
  assert.equal(total, 0.3);
});

test('CT10/CT12: preço persistido no carrinho não muda quando o catálogo muda', async () => {
  const item = await product('Produto com preço alterado', '2.00');
  const { carrinhoId } = await add({ produtoId: item.produtoId, quantidade: 2 });
  const sub = await postgres.db.one('SELECT categoria_id, subcategoria_id FROM produtos WHERE id=$1', [item.produtoId]);
  await api.put(`/produtos/${item.produtoId}`).send({ nome: item.nome, preco: '9.99', descricao: 'Novo preço',
    imagemUrl: 'https://example.com/p.png', categoriaId: sub.categoria_id, subcategoriaId: sub.subcategoria_id }).expect(200);
  const changed = (await api.patch(`/carrinhos/${carrinhoId}/itens/${item.produtoId}`).send({ quantidade: 3 }).expect(200)).body;
  assert.equal(changed.precoUnitario, 2);
  assert.equal(changed.total, 6);
});

test('CT11 (OP#589): identificador inválido e carrinho inexistente', async () => {
  for (const id of ['abc', '123', `${missingCart}x`]) {
    assert.deepEqual((await api.get(`/carrinhos/${id}`).expect(400)).body,
      { codigo: 'carrinhoIdInvalido', mensagem: 'Informe um carrinho válido.' });
  }
  assert.deepEqual((await api.get(`/carrinhos/${missingCart}`).expect(404)).body,
    { codigo: 'carrinhoNaoEncontrado', mensagem: 'Carrinho não encontrado.' });
});

test('CT12 (OP#592/OP#593): quantidade fora de 1..99, item inexistente', async () => {
  const { carrinhoId } = await add({ produtoId: pao.produtoId, quantidade: 1 });
  const invalid = { codigo: 'quantidadeInvalida', mensagem: 'A quantidade deve estar entre 1 e 99.' };
  for (const quantidade of [0, -1, 100, 1.5, '2', null]) {
    assert.deepEqual((await api.patch(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).send({ quantidade }).expect(400)).body, invalid);
  }
  assert.deepEqual((await api.patch(`/carrinhos/abc/itens/${pao.produtoId}`).send({ quantidade: 1 }).expect(400)).body, invalid);
  assert.deepEqual((await api.patch(`/carrinhos/${carrinhoId}/itens/0`).send({ quantidade: 1 }).expect(400)).body, invalid);
  const missing = { codigo: 'itemNaoEncontrado', mensagem: 'Item do carrinho não encontrado.' };
  assert.deepEqual((await api.patch(`/carrinhos/${carrinhoId}/itens/${leite.produtoId}`).send({ quantidade: 2 }).expect(404)).body, missing);
  assert.deepEqual((await api.patch(`/carrinhos/${missingCart}/itens/${pao.produtoId}`).send({ quantidade: 2 }).expect(404)).body, missing);
  assert.equal((await api.patch(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).send({ quantidade: 99 }).expect(200)).body.quantidade, 99);
});

test('CT13 (OP#595/OP#596): remove item, devolve o restante e sinaliza carrinho vazio', async () => {
  const { carrinhoId } = await add({ produtoId: pao.produtoId, quantidade: 2 });
  await add({ carrinhoId, produtoId: leite.produtoId, quantidade: 1 });
  const first = (await api.delete(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).expect(200)).body;
  assert.equal(first.removido, true);
  assert.equal(first.carrinhoVazio, false);
  assert.deepEqual(first.itens.map(i => i.produtoId), [leite.produtoId]);
  assert.equal(first.total, 3);
  const last = (await api.delete(`/carrinhos/${carrinhoId}/itens/${leite.produtoId}`).expect(200)).body;
  assert.deepEqual(last, { carrinhoId, removido: true, itens: [], total: 0, carrinhoVazio: true });
  assert.deepEqual((await api.get(`/carrinhos/${carrinhoId}`)).body, { carrinhoId, status: 'aberto', itens: [], total: 0, carrinhoVazio: true });
  assert.equal((await api.delete(`/carrinhos/${carrinhoId}/itens/${leite.produtoId}`).expect(404)).body.codigo, 'itemNaoEncontrado');
  for (const path of [`/carrinhos/abc/itens/${pao.produtoId}`, `/carrinhos/${carrinhoId}/itens/x`]) {
    assert.deepEqual((await api.delete(path).expect(400)).body, { codigo: 'entradaInvalida', mensagem: 'Informe carrinho e produto válidos.' });
  }
});

test('CT14 (OP#598): resumo igual ao carrinho; podeConfirmar falso quando vazio ou com produto indisponível', async () => {
  const { carrinhoId } = await add({ produtoId: pao.produtoId, quantidade: 2 });
  await add({ carrinhoId, produtoId: leite.produtoId, quantidade: 1 });
  const cart = (await api.get(`/carrinhos/${carrinhoId}`)).body;
  const summary = (await api.get(`/carrinhos/${carrinhoId}/resumo`).expect(200)).body;
  assert.deepEqual(summary, { carrinhoId, itens: cart.itens, total: cart.total, podeConfirmar: true });
  const temp = await product('Produto que sai de linha', '4.00');
  await add({ carrinhoId, produtoId: temp.produtoId, quantidade: 1 });
  await api.delete(`/produtos/${temp.produtoId}`).expect(204);
  assert.equal((await api.get(`/carrinhos/${carrinhoId}/resumo`)).body.podeConfirmar, false);
  const empty = await add({ produtoId: pao.produtoId, quantidade: 1 });
  await api.delete(`/carrinhos/${empty.carrinhoId}/itens/${pao.produtoId}`).expect(200);
  assert.deepEqual((await api.get(`/carrinhos/${empty.carrinhoId}/resumo`)).body,
    { carrinhoId: empty.carrinhoId, itens: [], total: 0, podeConfirmar: false });
  assert.equal((await api.get('/carrinhos/abc/resumo').expect(400)).body.codigo, 'carrinhoIdInvalido');
  assert.equal((await api.get(`/carrinhos/${missingCart}/resumo`).expect(404)).body.codigo, 'carrinhoNaoEncontrado');
});

test('carrinho confirmado não pode ser alterado (409 carrinhoFechado)', async () => {
  const { carrinhoId } = await add({ produtoId: pao.produtoId, quantidade: 1 });
  await postgres.db.none("UPDATE carrinhos SET status='confirmado' WHERE id=$1", [carrinhoId]);
  const closed = { codigo: 'carrinhoFechado', mensagem: 'O carrinho não pode ser alterado.' };
  assert.deepEqual(await add({ carrinhoId, produtoId: pao.produtoId, quantidade: 1 }, 409), closed);
  assert.deepEqual((await api.patch(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).send({ quantidade: 2 }).expect(409)).body, closed);
  assert.deepEqual((await api.delete(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).expect(409)).body, closed);
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.status, 'confirmado');
  assert.equal((await api.get(`/carrinhos/${carrinhoId}/resumo`)).body.podeConfirmar, false);
});

test('CORS permite PATCH do Expo Web no preflight', async () => {
  const res = await api.options(`/carrinhos/${missingCart}/itens/1`)
    .set('Origin', 'http://localhost:8081').set('Access-Control-Request-Method', 'PATCH').expect(204);
  assert.match(res.headers['access-control-allow-methods'], /PATCH/);
});

test('banco desligado: rotas do carrinho respondem 500 com mensagem do contrato, sem detalhes internos', async () => {
  const { carrinhoId } = await add({ produtoId: pao.produtoId, quantidade: 1 });
  await postgres.stop();
  try {
    const cases = [
      [() => api.post('/carrinhos/itens').send({ produtoId: pao.produtoId, quantidade: 1 }), 'Não foi possível adicionar o produto.'],
      [() => api.get(`/carrinhos/${carrinhoId}`), 'Não foi possível consultar o carrinho.'],
      [() => api.patch(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`).send({ quantidade: 2 }), 'Não foi possível alterar a quantidade.'],
      [() => api.delete(`/carrinhos/${carrinhoId}/itens/${pao.produtoId}`), 'Não foi possível remover o item.'],
      [() => api.get(`/carrinhos/${carrinhoId}/resumo`), 'Não foi possível gerar o resumo.'],
    ];
    for (const [call, mensagem] of cases) {
      const { body } = await call().expect(500);
      assert.deepEqual(body, { codigo: 'erroInterno', mensagem });
    }
  } finally { await postgres.postgres.start(); }
  await api.get(`/carrinhos/${carrinhoId}`).expect(200);
});
