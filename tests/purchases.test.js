import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { temporaryPostgres } from './helpers/postgres.js';
import { createApp } from '../src/app.js';
import { migrate } from '../src/database/migrate.js';
import { seed } from '../src/database/seed.js';
import { ApiError } from '../src/http/errors.js';

// Serviço Java simulado para CT24/CT25: filtra as compras pelo usuarioId recebido, como o serviço real.
// As regras de propriedade do Java são exercitadas de ponta a ponta em tests/docker-validation.js.
let postgres, api, calls, adult, minor, pao, leite, beer, compras;

async function account(nome, cpf) {
  const id = randomUUID();
  const token = `teste_${randomUUID()}_${randomUUID()}`;
  await postgres.db.none(`INSERT INTO usuarios(id,nome,cpf,email,senha_hash) VALUES($1,$2,$3,$4,'$argon2id$teste')`,
    [id, nome, cpf, `${id}@gmail.com`]);
  await postgres.db.none(`INSERT INTO sessoes(id,usuario_id,token_hash,expira_em) VALUES($1,$2,$3,now()+interval '1 hour')`,
    [randomUUID(), id, createHash('sha256').update(token).digest('hex')]);
  return { id, token };
}

const purchase = (usuarioId, criadaEm, itens, extra = {}) => ({
  compraId: randomUUID(), usuarioId, confirmacaoId: `SAFRA-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`, criadaEm,
  metodoPagamento: 'pix', subtotal: 10, cupom: null, desconto: 0, total: 10,
  quantidadeItens: itens.reduce((sum, item) => sum + item.quantidade, 0), itens, ...extra,
});

before(async () => {
  postgres = await temporaryPostgres();
  await migrate(postgres.db);
  await seed(postgres.db);
  const java = async (operacao, dados) => {
    calls.push({ operacao, dados });
    const own = compras.filter(c => c.usuarioId === dados.usuarioId);
    if (operacao === 'listarHistoricoCompras') {
      return { compras: own.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)).slice(0, dados.limite) };
    }
    if (operacao === 'consultarCompra') {
      const found = own.find(c => c.compraId === dados.compraId);
      if (!found) throw new ApiError(404, 'compraNaoEncontrada', 'Compra não encontrada.');
      return found;
    }
    if (operacao === 'validarRestricaoEtaria') {
      if (dados.usuarioId === minor.id) throw new ApiError(403, 'restricaoEtaria', 'Este produto é permitido somente para maiores.');
      return { permitido: true };
    }
    throw new Error(`operação inesperada ${operacao}`);
  };
  api = request(createApp({ db: postgres.db, origins: [], javaClient: java }));
  adult = await account('Carlos Pereira', '52998224725');
  minor = await account('Bruna Lima', '11144477735');
  const sub = await postgres.db.one("SELECT s.* FROM subcategorias s JOIN categorias c ON c.id=s.categoria_id WHERE c.nome='Padaria e Confeitaria' ORDER BY s.id LIMIT 1");
  const make = (nome, preco) => api.post('/produtos').send({ nome, preco, descricao: 'Cenário', imagemUrl: 'https://example.com/p.png',
    categoriaId: sub.categoria_id, subcategoriaId: sub.id }).expect(201).then(r => r.body);
  pao = await make('Pão da repetição', '5.50');
  leite = await make('Leite da repetição', '3.00');
  beer = await postgres.db.one("SELECT id AS \"produtoId\", nome, preco FROM produtos WHERE demo_chave = 'legado-original-132'");
}, { timeout: 60000 });

after(async () => { await postgres?.cleanup(); });

beforeEach(() => { calls = []; compras = []; });

const auth = who => ({ Authorization: `Bearer ${who.token}` });
const item = (product, quantidade, precoUnitario) => ({ produtoId: product.produtoId, nome: product.nome, quantidade,
  precoUnitario, subtotal: precoUnitario * quantidade });

test('CT24: histórico exige sessão, consulta somente o usuário autenticado e limita a três compras', async () => {
  await api.get('/compras/historico').expect(401);
  compras = [
    purchase(adult.id, '2026-11-01T10:00:00Z', [item(pao, 1, 5.5)]),
    purchase(adult.id, '2026-11-04T10:00:00Z', [item(pao, 2, 5.5), item(leite, 1, 3)],
      { subtotal: 50, cupom: 'PRIMEIRA40', desconto: 40, total: 10, metodoPagamento: 'credito' }),
    purchase(adult.id, '2026-11-03T10:00:00Z', [item(leite, 1, 3)]),
    purchase(adult.id, '2026-11-02T10:00:00Z', [item(leite, 2, 3)]),
    purchase(minor.id, '2026-11-05T10:00:00Z', [item(leite, 9, 3)]),
  ];
  const body = (await api.get('/compras/historico').set(auth(adult)).expect(200)).body;
  assert.deepEqual(calls, [{ operacao: 'listarHistoricoCompras', dados: { usuarioId: adult.id, limite: 3 } }]);
  assert.equal(body.limite, 3);
  assert.equal(body.compras.length, 3);
  assert.deepEqual(body.compras.map(c => c.criadaEm), ['2026-11-04T10:00:00Z', '2026-11-03T10:00:00Z', '2026-11-02T10:00:00Z']);
  const [latest] = body.compras;
  assert.deepEqual([latest.metodoPagamento, latest.subtotal, latest.cupom, latest.desconto, latest.total, latest.quantidadeItens],
    ['credito', 50, 'PRIMEIRA40', 40, 10, 3]);
  assert.deepEqual(latest.itens[0], { produtoId: pao.produtoId, nome: pao.nome, quantidade: 2, precoUnitario: 5.5, subtotal: 11 });
  assert.ok(body.compras.every(c => c.compraId && c.confirmacaoId));
});

test('CT25: compra de outra conta é recusada (404) e nada é adicionado', async () => {
  const other = purchase(minor.id, '2026-11-05T10:00:00Z', [item(leite, 1, 3)]);
  compras = [other];
  await api.post(`/compras/${other.compraId}/repetir`).send({}).expect(401);
  const body = (await api.post(`/compras/${other.compraId}/repetir`).set(auth(adult)).send({}).expect(404)).body;
  assert.equal(body.codigo, 'compraNaoEncontrada');
  assert.deepEqual(calls, [{ operacao: 'consultarCompra', dados: { usuarioId: adult.id, compraId: other.compraId } }]);
  await api.post('/compras/nao-e-uuid/repetir').set(auth(adult)).send({}).expect(400);
  await api.post(`/compras/${other.compraId}/repetir`).set(auth(adult)).send({ usuarioId: minor.id }).expect(400);
});

test('CT25: repete com preços atuais, ignora inativos, soma ao carrinho e respeita o limite de 99', async () => {
  const temp = (await api.post('/produtos').send({ nome: 'Sai de linha', preco: '1.00', descricao: 'Cenário',
    imagemUrl: 'https://example.com/p.png', categoriaId: pao.categoriaId, subcategoriaId: pao.subcategoriaId }).expect(201)).body;
  await api.delete(`/produtos/${temp.produtoId}`).expect(204);
  const old = purchase(adult.id, '2026-10-01T10:00:00Z', [item(pao, 2, 1.0), item(leite, 50, 0.5), item(temp, 1, 1.0)]);
  compras = [old];
  const { carrinhoId } = (await api.post('/carrinhos/itens').send({ produtoId: leite.produtoId, quantidade: 60 }).expect(200)).body;
  const body = (await api.post(`/compras/${old.compraId}/repetir`).set(auth(adult)).send({ carrinhoId }).expect(200)).body;
  assert.equal(body.carrinhoId, carrinhoId);
  assert.deepEqual(body.adicionados.map(a => [a.produtoId, a.quantidade, a.precoUnitario, a.ajustado]),
    [[pao.produtoId, 2, 5.5, false], [leite.produtoId, 39, 3, true]]);
  assert.deepEqual(body.naoAdicionados, [{ produtoId: temp.produtoId, nome: 'Sai de linha', motivo: 'indisponivel' }]);
  const cart = (await api.get(`/carrinhos/${carrinhoId}`).expect(200)).body;
  assert.deepEqual(cart.itens.map(i => [i.produtoId, i.quantidade, i.precoUnitario]), [[leite.produtoId, 99, 3], [pao.produtoId, 2, 5.5]]);
  assert.equal(cart.total, 308);
  assert.equal(body.total, 308);
  // Repetir de novo: o leite já está no limite e é informado; nenhuma compra é criada (nenhum confirmarCompra).
  const again = (await api.post(`/compras/${old.compraId}/repetir`).set(auth(adult)).send({ carrinhoId }).expect(200)).body;
  assert.ok(again.naoAdicionados.some(n => n.produtoId === leite.produtoId && n.motivo === 'limiteQuantidade'));
  assert.ok(calls.every(c => c.operacao !== 'confirmarCompra'));
  assert.equal(Number((await postgres.db.one('SELECT count(*) FROM compras_demonstrativas')).count), 0);
});

test('CT25: carrinho confirmado não é reaberto; um novo carrinho é criado', async () => {
  const old = purchase(adult.id, '2026-10-02T10:00:00Z', [item(pao, 1, 5.5)]);
  compras = [old];
  const { carrinhoId } = (await api.post('/carrinhos/itens').send({ produtoId: pao.produtoId, quantidade: 1 }).expect(200)).body;
  await postgres.db.none("UPDATE carrinhos SET status = 'confirmado' WHERE id = $1", [carrinhoId]);
  const body = (await api.post(`/compras/${old.compraId}/repetir`).set(auth(adult)).send({ carrinhoId }).expect(200)).body;
  assert.notEqual(body.carrinhoId, carrinhoId);
  assert.equal((await api.get(`/carrinhos/${carrinhoId}`)).body.status, 'confirmado');
  assert.equal((await api.get(`/carrinhos/${body.carrinhoId}`)).body.status, 'aberto');
  const owner = await postgres.db.one('SELECT usuario_id FROM carrinhos WHERE id = $1', [body.carrinhoId]);
  assert.equal(owner.usuario_id, adult.id);
});

test('CT25: restrição +18 continua valendo na repetição', async () => {
  const adultPurchase = purchase(adult.id, '2026-10-03T10:00:00Z', [item(beer, 2, 1), item(pao, 1, 5.5)]);
  const minorPurchase = purchase(minor.id, '2026-10-03T10:00:00Z', [item(beer, 1, 1), item(pao, 1, 5.5)]);
  compras = [adultPurchase, minorPurchase];
  const ok = (await api.post(`/compras/${adultPurchase.compraId}/repetir`).set(auth(adult)).send({}).expect(200)).body;
  assert.deepEqual(ok.adicionados.map(a => a.produtoId), [beer.produtoId, pao.produtoId]);
  const blocked = (await api.post(`/compras/${minorPurchase.compraId}/repetir`).set(auth(minor)).send({}).expect(200)).body;
  assert.deepEqual(blocked.adicionados.map(a => a.produtoId), [pao.produtoId]);
  assert.deepEqual(blocked.naoAdicionados, [{ produtoId: beer.produtoId, nome: beer.nome, motivo: 'restricaoEtaria' }]);
});
