import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { temporaryPostgres } from './helpers/postgres.js';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { createDatabase } from '../src/database/index.js';
import { migrate } from '../src/database/migrate.js';
import { seed } from '../src/database/seed.js';

let postgres, app, api, category, subcategory, sample;
const valid = () => ({ nome: 'Produto do teste', preco: 12.34, descricao: 'Pacote de teste',
  imagemUrl: 'https://example.com/produto.png', categoriaId: category.id, subcategoriaId: subcategory.id });

before(async () => {
  postgres = await temporaryPostgres();
  app = createApp({ db: postgres.db, origins: ['http://localhost:8081'] });
  api = request(app);
  assert.equal(await postgres.db.oneOrNone("SELECT to_regclass('produtos') AS tabela").then(r => r.tabela), null);
  await migrate(postgres.db);
  await seed(postgres.db);
  category = await postgres.db.one("SELECT * FROM categorias WHERE nome = 'Padaria'");
  subcategory = await postgres.db.one('SELECT * FROM subcategorias WHERE categoria_id=$1 ORDER BY id LIMIT 1', [category.id]);
  sample = await postgres.db.one('SELECT * FROM produtos WHERE categoria_id=$1 ORDER BY id LIMIT 1', [category.id]);
}, { timeout: 60000 });

after(async () => { await postgres?.cleanup(); });

test('saúde distingue processo HTTP de conectividade com PostgreSQL', async () => {
  assert.deepEqual((await api.get('/health/live').expect(200)).body, { http: 'ok' });
  assert.deepEqual((await api.get('/health/ready').expect(200)).body, { http: 'ok', banco: 'disponivel' });
  assert.equal((await api.get('/health').expect(200)).body.banco, 'disponivel');
});

test('CT1: catálogo tem ao menos 20 produtos ativos, preços numéricos e imagens HTTPS', async () => {
  const { body } = await api.get('/produtos').expect(200);
  assert.ok(body.totalProdutos >= 20);
  assert.equal(body.produtos.length, body.totalProdutos);
  for (const row of body.produtos) {
    assert.ok(row.produtoId > 0);
    assert.ok(row.nome);
    assert.ok(row.imagemUrl.startsWith('https://'));
    assert.equal(typeof row.preco, 'number');
    assert.ok(row.preco >= 0);
    assert.equal(row.emOferta, false);
    assert.equal(row.precoAnterior, undefined);
  }
});

test('CT3: classificação contém categorias e subcategorias pertencentes à categoria', async () => {
  const { body } = await api.get('/categorias').expect(200);
  assert.ok(body.categorias.length >= 4);
  for (const row of body.categorias) {
    assert.ok(row.categoriaId > 0);
    assert.ok(row.subcategorias.length > 0);
    for (const sub of row.subcategorias) {
      const stored = await postgres.db.one('SELECT * FROM subcategorias WHERE id=$1', [sub.subcategoriaId]);
      assert.equal(stored.categoria_id, row.categoriaId);
      assert.equal(stored.nome, sub.nome);
    }
  }
});

test('CT6: filtra a subcategoria e mantém o mesmo produto/preço do catálogo', async () => {
  const { body } = await api.get(`/categorias/${category.id}/subcategorias/${subcategory.id}/produtos`).expect(200);
  assert.equal(body.categoriaId, category.id);
  assert.equal(body.subcategoriaId, subcategory.id);
  assert.ok(body.produtos.length);
  for (const row of body.produtos) {
    const stored = await postgres.db.one('SELECT * FROM produtos WHERE id=$1', [row.produtoId]);
    assert.equal(stored.subcategoria_id, subcategory.id);
    assert.equal(row.preco, Number(stored.preco));
  }
});

test('CT6: distingue identificador inválido, relação incompatível e classificação inexistente', async () => {
  const other = await postgres.db.one('SELECT id FROM categorias WHERE id<>$1 ORDER BY id LIMIT 1', [category.id]);
  for (const [path, status, code] of [
    [`/categorias/x/subcategorias/${subcategory.id}/produtos`, 400, 'classificacaoInvalida'],
    [`/categorias/${other.id}/subcategorias/${subcategory.id}/produtos`, 400, 'classificacaoInvalida'],
    [`/categorias/2147483647/subcategorias/${subcategory.id}/produtos`, 404, 'classificacaoNaoEncontrada'],
    [`/categorias/${category.id}/subcategorias/2147483647/produtos`, 404, 'classificacaoNaoEncontrada'],
  ]) assert.equal((await api.get(path).expect(status)).body.codigo, code);
});

test('CT7: consulta produto existente com descrição e classificação', async () => {
  const { body } = await api.get(`/produtos/${sample.id}`).expect(200);
  assert.equal(body.produtoId, sample.id);
  assert.equal(body.categoriaId, sample.categoria_id);
  assert.equal(body.subcategoriaId, sample.subcategoria_id);
  assert.equal(body.descricao, sample.descricao);
});

test('CT7: produto inexistente e IDs inválidos têm códigos e mensagens oficiais', async () => {
  assert.deepEqual((await api.get('/produtos/2147483647').expect(404)).body,
    { codigo: 'produtoNaoEncontrado', mensagem: 'Produto não encontrado.' });
  for (const id of ['0', '-1', 'abc', '1.5', '2147483648', '1%20OR%201=1']) {
    assert.deepEqual((await api.get(`/produtos/${id}`).expect(400)).body,
      { codigo: 'produtoIdInvalido', mensagem: 'Informe um produto válido.' });
  }
});

test('aliases das telas usam os mesmos registros das rotas oficiais', async () => {
  const catalog = (await api.get('/produtos')).body;
  const legacy = await api.get('/products').expect(200);
  assert.equal(legacy.headers.deprecation, 'true');
  assert.deepEqual(legacy.body.products.map(p => p.id), catalog.produtos.map(p => p.produtoId));
  const categories = (await api.get('/categorys').expect(200)).body.categorys;
  assert.ok(categories.some(c => c.name === 'Padaria'));
  const products = (await api.get('/categorys/filter/Padaria').expect(200)).body.products;
  assert.ok(products.length > 0);
  assert.ok(products.every(p => p.idcategory === category.id));
  assert.deepEqual((await api.get(`/products/idcategory/${category.id}`).expect(200)).body.product, products);
  assert.equal((await api.get(`/categorys/${category.id}`).expect(200)).body.category.name, 'Padaria');
  const detail = (await api.get(`/products/${sample.id}`).expect(200)).body.product;
  assert.equal(detail.name, sample.nome);
  assert.equal(detail.idcategory, sample.categoria_id);
});

test('filtro por tipo funciona nos dois formatos, com texto escapado e sem injeção SQL', async () => {
  const type = encodeURIComponent(subcategory.nome);
  const official = (await api.get(`/produtos/tipo/${type}`).expect(200)).body.produtos;
  const legacy = (await api.get(`/products/type/${type}`).expect(200)).body.product;
  assert.ok(legacy.length);
  assert.ok(legacy.every(p => p.type === subcategory.nome));
  assert.deepEqual(official.map(p => p.produtoId), legacy.map(p => p.id));
  assert.deepEqual((await api.get('/products/type/%27%20OR%201=1--').expect(200)).body.product, []);
});

test('cria e atualiza produto oficial com persistência dos IDs e timestamp', async () => {
  const created = (await api.post('/produtos').send(valid()).expect(201)).body;
  assert.ok(created.produtoId > 0);
  const before = await postgres.db.one('SELECT atualizado_em FROM produtos WHERE id=$1', [created.produtoId]);
  const updated = (await api.put(`/produtos/${created.produtoId}`).send({ ...valid(), nome: 'Produto atualizado', preco: 0 }).expect(200)).body;
  assert.equal(updated.nome, 'Produto atualizado');
  assert.equal(updated.preco, 0);
  const row = await postgres.db.one('SELECT * FROM produtos WHERE id=$1', [created.produtoId]);
  assert.equal(row.categoria_id, category.id);
  assert.equal(row.subcategoria_id, subcategory.id);
  assert.ok(row.atualizado_em >= before.atualizado_em);
});

test('cria/atualiza produto legado, corrigindo idCategory/idcategory sem duplicar regra', async () => {
  const body = { name: 'Produto legado teste', price: '7.90', description: 'Pacote', photo: 'https://example.com/test.png',
    type: 'Tipo novo de teste', validity: 'Demonstrativo', idCategory: category.id };
  const created = (await api.post('/products').send(body).expect(201)).body.product;
  assert.equal(created.idcategory, category.id);
  const updated = (await api.put(`/products/${created.id}`).send({ ...body, name: 'Legado atualizado' }).expect(200)).body.updatedProduct;
  assert.equal(updated.name, 'Legado atualizado');
  assert.equal((await api.get(`/produtos/${created.id}`)).body.nome, updated.name);
  const count = await postgres.db.one('SELECT count(*) FROM subcategorias WHERE nome=$1 AND categoria_id=$2', [body.type, category.id]);
  assert.equal(Number(count.count), 1);
});

test('criação/atualização de categoria escreve categorias, sem alterar produtos', async () => {
  const before = (await api.get(`/produtos/${sample.id}`)).body;
  const row = (await api.post('/categorias').send({ nome: 'Categoria teste' }).expect(201)).body;
  assert.ok(row.categoriaId > 0);
  assert.equal((await api.put(`/categorias/${row.categoriaId}`).send({ nome: 'Categoria renomeada' }).expect(200)).body.nome, 'Categoria renomeada');
  const legacy = (await api.post('/categorys').send({ name: 'Categoria legado teste' }).expect(201)).body.category;
  assert.equal((await api.put(`/categorys/${legacy.id}`).send({ name: 'Categoria legado atualizada' }).expect(200)).body.updatedCategory.name, 'Categoria legado atualizada');
  assert.deepEqual((await api.get(`/produtos/${sample.id}`)).body, before);
  await api.post('/categorias').send({ nome: 'Categoria renomeada' }).expect(409);
  await api.put('/categorias/2147483647').send({ nome: 'Não existe' }).expect(404);
});

test('validação rejeita campos ausentes, tipos incorretos, preço inválido e imagens inseguras', async () => {
  for (const change of [
    { nome: '' }, { nome: 12 }, { nome: 'a'.repeat(256) }, { preco: -1 }, { preco: '1.234' }, { preco: true },
    { preco: null }, { descricao: null }, { descricao: 'a'.repeat(501) }, { categoriaId: 0 }, { subcategoriaId: 'x' },
    { imagemUrl: 'http://example.com/a.png' }, { imagemUrl: 'javascript:alert(1)' }, { imagemUrl: 'https://user:secret@example.com/a' },
    { campoExtra: 'ignorado?' },
  ]) {
    const { body } = await api.post('/produtos').send({ ...valid(), ...change }).expect(400);
    assert.ok(body.codigo && body.mensagem);
  }
  await api.post('/produtos').send({}).expect(400);
  await api.put(`/produtos/${sample.id}`).send({ nome: 'Incompleto' }).expect(400);
  for (const body of [{}, { nome: '  ' }, { nome: false }, [], { nome: 'a'.repeat(151) }]) {
    await api.post('/categorias').send(body).expect(400);
  }
  await api.post('/products').send({ photo: 12 }).expect(400);
});

test('valida referências de categoria e subcategoria antes de gravar', async () => {
  await api.post('/produtos').send({ ...valid(), categoriaId: 2147483647 }).expect(404);
  const other = await postgres.db.one('SELECT id FROM categorias WHERE id<>$1 ORDER BY id LIMIT 1', [category.id]);
  assert.equal((await api.post('/produtos').send({ ...valid(), categoriaId: other.id }).expect(400)).body.codigo, 'classificacaoInvalida');
});

test('categorias, subcategorias e produtos inativos ficam fora das consultas públicas', async () => {
  const id = (await api.post('/produtos').send(valid()).expect(201)).body.produtoId;
  await api.delete(`/produtos/${id}`).expect(204);
  await api.get(`/produtos/${id}`).expect(404);
  assert.ok(!(await api.get('/produtos')).body.produtos.some(p => p.produtoId === id));
  await postgres.db.none('UPDATE subcategorias SET ativo=false WHERE id=$1', [subcategory.id]);
  try {
    await api.get(`/produtos/${sample.id}`).expect(404);
    assert.ok(!(await api.get('/categorias')).body.categorias.find(c => c.categoriaId === category.id).subcategorias.some(s => s.subcategoriaId === subcategory.id));
  } finally { await postgres.db.none('UPDATE subcategorias SET ativo=true WHERE id=$1', [subcategory.id]); }
  await postgres.db.none('UPDATE categorias SET ativo=false WHERE id=$1', [category.id]);
  try {
    assert.ok(!(await api.get('/categorias')).body.categorias.some(c => c.categoriaId === category.id));
    await api.get(`/produtos/${sample.id}`).expect(404);
  } finally { await postgres.db.none('UPDATE categorias SET ativo=true WHERE id=$1', [category.id]); }
});

test('remoção de categoria vinculada retorna conflito sem vazamento', async () => {
  const { body } = await api.delete(`/categorias/${category.id}`).expect(409);
  assert.deepEqual(Object.keys(body).sort(), ['codigo', 'mensagem']);
  await api.delete('/categorias/abc').expect(400);
  await api.delete('/categorias/2147483647').expect(404);
});

test('migrate e seed repetíveis: IDs preservados, sem duplicação ou perda de cadastro manual', async () => {
  const before = await postgres.db.any('SELECT id, demo_chave FROM produtos ORDER BY id');
  const categoriesBefore = await postgres.db.any('SELECT id, nome FROM categorias ORDER BY id');
  await migrate(postgres.db);
  await seed(postgres.db);
  await seed(postgres.db);
  assert.deepEqual(await postgres.db.any('SELECT id, demo_chave FROM produtos ORDER BY id'), before);
  assert.deepEqual(await postgres.db.any('SELECT id, nome FROM categorias ORDER BY id'), categoriesBefore);
  assert.equal(Number((await postgres.db.one('SELECT count(*) FROM schema_migrations')).count), 1);
});

test('migração importa banco legado sem apagar originais nem perder chaves', async () => {
  await postgres.db.none('CREATE DATABASE safra_legacy_test');
  const old = createDatabase({ ...postgres.options, database: 'safra_legacy_test' });
  try {
    await old.db.none(`CREATE TABLE categorys(id SERIAL PRIMARY KEY, name TEXT);
      CREATE TABLE products(id SERIAL PRIMARY KEY, name TEXT, price NUMERIC(10,2), description TEXT,
        type TEXT, validity TEXT, photo TEXT, idcategory INTEGER REFERENCES categorys(id));
      INSERT INTO categorys(id,name) VALUES(42,'Legado');
      INSERT INTO products(id,name,price,description,type,validity,photo,idcategory)
        VALUES(85,'Produto preservado',3.50,'Pacote','Tipo legado','Demonstração','https://example.com/a.png',42);`);
    await migrate(old.db);
    await migrate(old.db);
    const row = await old.db.one('SELECT * FROM produtos WHERE id=85');
    assert.equal(row.categoria_id, 42);
    assert.equal(row.nome, 'Produto preservado');
    assert.equal((await old.db.one('SELECT name FROM products WHERE id=85')).name, row.nome);
    assert.ok((await old.db.one("INSERT INTO categorias(nome) VALUES('Nova') RETURNING id")).id > 42);
    assert.ok((await old.db.one(`INSERT INTO produtos(nome,descricao,preco,imagem_url,categoria_id,subcategoria_id)
      VALUES('Novo','Pacote',1,'https://example.com/a.png',42,$1) RETURNING id`, [row.subcategoria_id])).id > 85);
  } finally { await old.close(); }
});

test('CORS aceita Expo Web e preflight, bloqueia origem estranha e não usa curinga', async () => {
  const allowed = await api.get('/produtos').set('Origin', 'http://localhost:8081').expect(200);
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:8081');
  const preflight = await api.options('/produtos').set('Origin', 'http://localhost:8081')
    .set('Access-Control-Request-Method', 'POST').expect(204);
  assert.equal(preflight.headers['access-control-allow-origin'], 'http://localhost:8081');
  assert.equal((await api.get('/produtos').set('Origin', 'https://outra.example').expect(403)).headers['access-control-allow-origin'], undefined);
  assert.deepEqual(readConfig({ NODE_ENV: 'production' }).origins, []);
  assert.throws(() => readConfig({ CORS_ORIGINS: '*' }));
  assert.throws(() => readConfig({ PORT: 'zero' }));
  assert.throws(() => readConfig({ DB_PORT: '70000' }));
});

test('erros HTTP são JSON seguros para JSON malformado, tamanho e rota desconhecida', async () => {
  await api.post('/produtos').set('Content-Type', 'application/json').send('{invalido').expect(400);
  await api.post('/produtos').send({ nome: 'a'.repeat(40000) }).expect(413);
  const { body } = await api.get('/nao-existe').expect(404);
  assert.deepEqual(Object.keys(body).sort(), ['codigo', 'mensagem']);
});

test('banco realmente desligado: HTTP vivo, readiness 503 e consultas 500 sanitizadas; recuperação automática', async () => {
  await postgres.stop();
  try {
    await api.get('/health/live').expect(200);
    const health = (await api.get('/health/ready').expect(503)).body;
    assert.equal(health.http, 'ok');
    assert.equal(health.banco, 'indisponivel');
    for (const path of ['/produtos', '/categorias', `/produtos/${sample.id}`, '/products', '/categorys/filter/Padaria', `/products/idcategory/${category.id}`]) {
      const { body } = await api.get(path).expect(500);
      assert.equal(body.codigo, 'erroInterno');
      assert.deepEqual(Object.keys(body).sort(), ['codigo', 'mensagem']);
      assert.ok(!/SELECT|password|ECONN|stack|postgresql:/i.test(JSON.stringify(body)));
    }
  } finally { await postgres.postgres.start(); }
  await api.get('/health/ready').expect(200);
  await api.get('/produtos').expect(200);
});

test('configuração inválida encerra inicialização com erro controlado, sem stack trace', async () => {
  const child = spawn(process.execPath, ['--unhandled-rejections=strict', 'src/server.js'], {
    env: { ...process.env, PORT: '0', DB_HOST: '127.0.0.1', DB_PORT: '1' },
    windowsHide: true,
  });
  // Configuração inválida também precisa falhar de forma limpa, sem stack trace.
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
  assert.match(output, /Falha ao iniciar/);
  assert.ok(!/Unhandled| at file:|password/i.test(output));
});

test('servidor inicia com banco desligado, mantém HTTP vivo e trata a rejeição da conexão', async () => {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['--unhandled-rejections=strict', 'src/server.js'], {
    env: { ...process.env, PORT: String(port), DB_HOST: '127.0.0.1', DB_PORT: '1' }, windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  try {
    let result;
    const deadline = Date.now() + 6000;
    while (!result && Date.now() < deadline) {
      result = await fetch(`http://127.0.0.1:${port}/health/ready`).catch(() => undefined);
      if (!result) await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(result?.status, 503);
    assert.equal((await result.json()).http, 'ok');
    assert.equal((await fetch(`http://127.0.0.1:${port}/health/live`)).status, 200);
    assert.equal(child.exitCode, null);
    assert.ok(!/Unhandled| at file:|password/i.test(output));
  } finally {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
});
