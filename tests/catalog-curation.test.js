import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { temporaryPostgres } from './helpers/postgres.js';
import { createApp } from '../src/app.js';
import { migrate } from '../src/database/migrate.js';
import { seed } from '../src/database/seed.js';
import { demoProducts } from '../src/database/demo-products.js';
import { catalogCuration, pendingCurationDecisions, unusedCurationItems } from '../src/database/catalog-curation.js';
import { catalogProblems, ALCOHOLIC_SUBCATEGORY, DEMO_LABEL } from '../src/database/catalog-rules.js';

const MIGRATIONS = new URL('../src/database/migrations/', import.meta.url);
const migration007 = () => readFile(new URL('007-curadoria-cupons-historico.sql', MIGRATIONS), 'utf8');
const migration008 = () => readFile(new URL('008-vinho-don-laurindo.sql', MIGRATIONS), 'utf8');

// Preços vigentes antes da curadoria (v1.3.0). A curadoria não altera nenhum deles, exceto o vinho,
// cujo novo preço (R$ 795,00) foi definido explicitamente pela equipe.
const PRICES = {
  'ciclo4-alcool-1': 6.99, 'setores-bebida-agua-gas': 3.29, 'setores-bebida-cola': 9.99, 'setores-bebida-guarana': 8.99,
  'setores-bebida-suco': 10.9, 'setores-bebida-energetico': 8.49, 'setores-peixe-tilapia': 39.9, 'setores-peixe-salmao': 69.9,
  'setores-peixe-camarao': 54.9, 'ciclo2-3-8': 4.99, 'setores-horti-alface': 3.99, 'setores-limpeza-detergente': 2.89,
  'setores-limpeza-sabao': 18.9, 'setores-mercearia-arroz': 27.9, 'setores-mercearia-feijao': 8.49, 'setores-mercearia-acucar': 4.99,
  'setores-mercearia-oleo': 7.99, 'setores-mercearia-cafe': 18.9, 'setores-mercearia-macarrao': 5.49, 'setores-mercearia-molho': 3.49,
  'setores-mercearia-farinha': 6.79, 'setores-congelado-pizza': 19.9, 'setores-congelado-lasanha': 16.9,
  'setores-congelado-hamburguer': 18.9, 'setores-congelado-acai': 21.9, 'setores-congelado-fritas': 15.9,
  'setores-congelado-nuggets': 17.9, 'setores-congelado-frutas': 24.9, 'setores-congelado-sorvete': 22.9, 'setores-bazar-pote': 12.9,
  'setores-bazar-copo': 24.9, 'setores-bazar-prato': 13.9, 'setores-bazar-talheres': 29.9, 'setores-bazar-pano': 6.99,
  'setores-bazar-esponja': 3.49, 'setores-bazar-balde': 17.9, 'setores-bazar-vassoura': 19.9, 'setores-pet-racao-cao': 54.9,
  'setores-pet-racao-gato': 46.9, 'setores-pet-petisco-cao': 12.9, 'setores-pet-petisco-gato': 10.9, 'setores-pet-areia': 18.9,
  'setores-pet-shampoo': 16.9, 'setores-pet-brinquedo': 14.9, 'setores-pet-comedouro': 15.9, 'setores-bebida-vinho': 795,
  'setores-limpeza-desinfetante': 7.99,
};
// Soma, em centavos, dos 237 preços: catálogo v1.3.0 (483631) com o vinho de 34,90 para 795,00.
const TOTAL_CENTS = 559641;

let postgres, api;

before(async () => {
  postgres = await temporaryPostgres();
  await migrate(postgres.db);
  await seed(postgres.db);
  api = request(createApp({ db: postgres.db, origins: [] }));
}, { timeout: 60000 });

after(async () => { await postgres?.cleanup(); });

const snapshot = () => postgres.db.one(`SELECT
    (SELECT count(*)::int FROM produtos) AS produtos,
    (SELECT count(*)::int FROM categorias) AS categorias,
    (SELECT count(*)::int FROM subcategorias) AS subcategorias,
    (SELECT sum(round(preco * 100))::int FROM produtos WHERE demo_chave IS NOT NULL) AS centavos,
    (SELECT string_agg(demo_chave || ':' || preco || ':' || coalesce(preco_anterior::text, '-'), ',' ORDER BY demo_chave)
       FROM produtos WHERE demo_chave IS NOT NULL) AS precos`);

test('regras do catálogo: chaves únicas, URLs diretas, sem rótulo demonstrativo e +18 coerente', () => {
  assert.deepEqual(catalogProblems(demoProducts, catalogCuration), []);
  assert.equal(new Set(demoProducts.map(p => p.chave)).size, demoProducts.length);
  assert.equal(catalogCuration.length, 47);
  for (const { imagem } of catalogCuration) assert.match(imagem, /^https:\/\/i\.imgur\.com\/[A-Za-z0-9]+\.(jpeg|png)$/);
  assert.equal(new Set(catalogCuration.map(c => c.imagem)).size, catalogCuration.length);
  assert.ok(demoProducts.every(p => !DEMO_LABEL.test(p.nome) && !DEMO_LABEL.test(p.descricao)));
});

test('curadoria preserva preço, oferta, validade, idade e marcador alcoólico', () => {
  const byKey = new Map(demoProducts.map(p => [p.chave, p]));
  for (const [chave, preco] of Object.entries(PRICES)) assert.equal(byKey.get(chave).preco, preco, chave);
  assert.equal(demoProducts.length, 237);
  assert.equal(demoProducts.reduce((sum, p) => sum + Math.round(p.preco * 100), 0), TOTAL_CENTS);
  assert.equal(byKey.get('ciclo4-alcool-1').alcoolico, true);
  assert.equal(byKey.get('ciclo4-alcool-1').idadeMinima, 18);
  assert.equal(byKey.get('setores-bebida-energetico').alcoolico, undefined);
});

test('mapeamento imagem ↔ produto segue a demo_chave, sem deslocamento', () => {
  const byKey = new Map(demoProducts.map(p => [p.chave, p]));
  const expect = (chave, nome, imagem) => {
    assert.equal(byKey.get(chave).nome, nome);
    assert.equal(byKey.get(chave).imagem, imagem);
  };
  expect('ciclo4-alcool-1', 'Cerveja Pilsen 960ml', 'https://i.imgur.com/E5wbQIo.jpeg');
  expect('setores-bebida-energetico', 'Monster Energy', 'https://i.imgur.com/3kVUioS.jpeg');
  expect('ciclo2-3-8', 'Laranja Pera', 'https://i.imgur.com/cxlcTjH.jpeg');
  expect('setores-horti-alface', 'Alface crespa', 'https://i.imgur.com/2L3e2ZH.jpeg');
  expect('setores-limpeza-detergente', 'Detergente Líquido Neutro Ypê', 'https://i.imgur.com/83O9vnv.jpeg');
  expect('setores-limpeza-sabao', 'Sabão em pó OMO Puro Cuidado', 'https://i.imgur.com/HCqRzMH.jpeg');
  expect('setores-pet-comedouro', 'Comedouro para Pets Formato Infinito', 'https://i.imgur.com/kiK8qI2.jpeg');
  // Pela ordem da lista, o único desinfetante pendente recebe o primeiro desinfetante; o vinho fica sem foto.
  expect('setores-limpeza-desinfetante', 'Desinfetante Floral', 'https://i.imgur.com/T206ysc.jpeg');
  expect('setores-bebida-vinho', 'Vinho Tinto Don Laurindo Gran Reserva 750ml', 'https://i.imgur.com/1ivZIET.jpeg');
  assert.equal(byKey.get('setores-bebida-vinho').preco, 795);
  assert.ok(byKey.get('setores-bebida-vinho').alcoolico && byKey.get('setores-bebida-vinho').idadeMinima === 18);
  assert.deepEqual(pendingCurationDecisions, []);
  assert.equal(demoProducts.filter(p => p.imagem === null).length, 0);
  assert.deepEqual(unusedCurationItems.map(i => i.album), ['Xch122w']);
  assert.equal(demoProducts.filter(p => /laranja pera/i.test(p.nome)).length, 1);
  assert.equal(demoProducts.filter(p => /desinfetante/i.test(p.nome)).length, 1);
});

test('seed executado duas vezes não duplica nem altera preços', async () => {
  const first = await snapshot();
  await seed(postgres.db);
  await seed(postgres.db);
  const second = await snapshot();
  assert.deepEqual(second, first);
  assert.equal(first.centavos, TOTAL_CENTS);
  assert.equal(Number((await postgres.db.one('SELECT count(DISTINCT demo_chave) FROM produtos')).count), demoProducts.length);
});

test('filtro +18 de Bebidas contém todos os alcoólicos e nenhum não alcoólico', async () => {
  const categorias = (await api.get('/categorias').expect(200)).body.categorias;
  const bebidas = categorias.find(c => c.nome === 'Bebidas');
  const alcoholSubs = bebidas.subcategorias.filter(s => s.nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().includes('alcool'));
  assert.deepEqual(alcoholSubs.map(s => s.nome), [ALCOHOLIC_SUBCATEGORY]);
  const filtered = (await api.get(`/categorias/${bebidas.categoriaId}/subcategorias/${alcoholSubs[0].subcategoriaId}/produtos`)
    .expect(200)).body.produtos;
  const all = (await api.get(`/categorias/${bebidas.categoriaId}/produtos`).expect(200)).body.produtos;
  const alcoholic = all.filter(p => p.alcoolico);
  assert.deepEqual(filtered.map(p => p.produtoId).sort((a, b) => a - b), alcoholic.map(p => p.produtoId).sort((a, b) => a - b));
  assert.ok(filtered.every(p => p.alcoolico && p.idadeMinima === 18));
  for (const nome of ['Cerveja Pilsen 960ml', 'Cerveja Heineken', 'Vodka Smirnoff Red', 'Ice Smirnoff', 'Licor Ballena Tequila',
    'Whisky Americano Jack Daniels', 'Vinho Tinto Don Laurindo Gran Reserva 750ml', 'Vinho Nacional Tinto Suave Faroni Lopez']) {
    assert.ok(filtered.some(p => p.nome === nome), `${nome} deveria estar no filtro +18`);
  }
  assert.ok(!filtered.some(p => /monster|red bull|energ/i.test(p.nome)));
  assert.ok(all.filter(p => /monster|red bull/i.test(p.nome)).every(p => !p.alcoolico && p.idadeMinima === 0));
});

test('nomes e descrições servidos pela API não contêm "demonstrativo" nem "venda simulada"', async () => {
  const produtos = (await api.get('/produtos').expect(200)).body.produtos;
  assert.ok(produtos.length >= 237);
  for (const p of produtos) {
    assert.ok(!DEMO_LABEL.test(p.nome), p.nome);
    assert.ok(!DEMO_LABEL.test(p.descricao), p.descricao);
  }
});

test('migrations 007/008 corrigem dados antigos (variante "alcoolicas", rótulo demonstrativo) e é idempotente', async () => {
  const bebidas = await postgres.db.one("SELECT id FROM categorias WHERE nome = 'Bebidas'");
  const variant = await postgres.db.one("INSERT INTO subcategorias(categoria_id, nome) VALUES($1, 'Alcoolicas') RETURNING id", [bebidas.id]);
  await postgres.db.none(`UPDATE produtos SET subcategoria_id = $1, nome = 'Cerveja Pilsen Demonstrativa',
      descricao = '350ml - venda simulada para maiores de 18 anos', imagem_url = NULL WHERE demo_chave = 'ciclo4-alcool-1'`, [variant.id]);
  await postgres.db.none(`UPDATE produtos SET nome = 'Vinho Tinto Demonstrativo',
      descricao = '750ml - venda simulada para maiores de 18 anos' WHERE demo_chave = 'setores-bebida-vinho'`);
  const before = await snapshot();
  const sql = (await migration007()) + '\n' + (await migration008());
  await postgres.db.tx(t => t.any(sql));
  await postgres.db.tx(t => t.any(sql));
  const beer = await postgres.db.one(`SELECT p.*, s.nome AS sub FROM produtos p JOIN subcategorias s ON s.id = p.subcategoria_id
    WHERE demo_chave = 'ciclo4-alcool-1'`);
  assert.deepEqual([beer.nome, beer.descricao, beer.imagem_url, beer.sub, beer.preco, beer.idade_minima, beer.alcoolico],
    ['Cerveja Pilsen 960ml', 'La Casa Uruguay', 'https://i.imgur.com/E5wbQIo.jpeg', ALCOHOLIC_SUBCATEGORY, '6.99', 18, true]);
  const wine = await postgres.db.one("SELECT nome, descricao, preco FROM produtos WHERE demo_chave = 'setores-bebida-vinho'");
  assert.deepEqual([wine.nome, wine.descricao, wine.preco], ['Vinho Tinto Don Laurindo Gran Reserva 750ml', '750ml', '795.00']);
  assert.equal(await postgres.db.oneOrNone('SELECT id FROM subcategorias WHERE id = $1', [variant.id]), null);
  const after = await snapshot();
  assert.equal(after.precos, before.precos);
  assert.equal(after.produtos, before.produtos);
  assert.equal(after.subcategorias, before.subcategorias - 1);
});

test('banco: cupons cadastrados, valores não negativos e PRIMEIRA40 único por conta', async () => {
  const cupons = await postgres.db.any('SELECT codigo, valor_desconto, somente_primeira_compra FROM cupons ORDER BY codigo');
  assert.deepEqual(cupons.map(c => [c.codigo, c.valor_desconto, c.somente_primeira_compra]),
    [['PRIMEIRA40', '40.00', true], ['QUERO100', '100.00', false]]);
  const usuario = randomUUID();
  await postgres.db.none(`INSERT INTO usuarios(id,nome,cpf,email,senha_hash) VALUES($1,'Ana Souza','39053344705',$2,'$argon2id$x')`,
    [usuario, `ana.${usuario}@gmail.com`]);
  const compra = async (cupom, subtotal, desconto, total) => {
    const carrinho = randomUUID();
    await postgres.db.none('INSERT INTO carrinhos(id, usuario_id) VALUES($1, $2)', [carrinho, usuario]);
    const id = randomUUID();
    return postgres.db.none(`INSERT INTO compras_demonstrativas(id, carrinho_id, usuario_id, chave_idempotencia, confirmacao_id,
        metodo_pagamento, subtotal, cupom_codigo, desconto, total) VALUES($1,$2,$3,$4,$5,'pix',$6,$7,$8,$9)`,
    [id, carrinho, usuario, `ref-${id}`, `SAFRA-${id.slice(0, 8)}`, subtotal, cupom, desconto, total]);
  };
  await assert.rejects(compra('QUERO100', '50.00', '100.00', '-50.00'));
  await assert.rejects(compra('QUERO100', '50.00', '60.00', '0.00'));
  await assert.rejects(compra(null, '50.00', '10.00', '40.00'));
  await assert.rejects(compra('quero100', '50.00', '50.00', '0.00'));
  await compra('PRIMEIRA40', '30.00', '30.00', '0.00');
  await assert.rejects(compra('PRIMEIRA40', '90.00', '40.00', '50.00'), /compras_primeira40_por_usuario/);
  await compra('QUERO100', '150.00', '100.00', '50.00');
  await compra('QUERO100', '20.00', '20.00', '0.00');
});

test('migrations em banco atualizado: compras antigas recebem subtotal = total, desconto zero e cupom nulo', { timeout: 60000 }, async () => {
  const legacy = await temporaryPostgres();
  try {
    await legacy.db.none('CREATE TABLE schema_migrations (nome TEXT PRIMARY KEY, aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now())');
    const files = (await readdir(MIGRATIONS)).filter(name => name.endsWith('.sql') && name < '007').sort();
    for (const name of files) {
      await legacy.db.tx(async t => {
        await t.any(await readFile(new URL(name, MIGRATIONS), 'utf8'));
        await t.none('INSERT INTO schema_migrations(nome) VALUES($1)', [name]);
      });
    }
    const carrinho = randomUUID();
    const compra = randomUUID();
    await legacy.db.none('INSERT INTO carrinhos(id) VALUES($1)', [carrinho]);
    await legacy.db.none(`INSERT INTO compras_demonstrativas(id, carrinho_id, chave_idempotencia, confirmacao_id, total, metodo_pagamento)
      VALUES($1, $2, 'referencia-antiga-01', 'SAFRA-DEMO-ANTIGA01', 87.40, 'pix')`, [compra, carrinho]);
    await migrate(legacy.db);
    await migrate(legacy.db);
    const row = await legacy.db.one('SELECT subtotal, desconto, cupom_codigo, total FROM compras_demonstrativas WHERE id = $1', [compra]);
    assert.deepEqual(row, { subtotal: '87.40', desconto: '0.00', cupom_codigo: null, total: '87.40' });
    await seed(legacy.db);
    await seed(legacy.db);
    assert.equal(Number((await legacy.db.one('SELECT count(*) FROM produtos')).count), demoProducts.length);
  } finally {
    await legacy.cleanup();
  }
});
