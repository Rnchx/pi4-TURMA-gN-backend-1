const base = process.env.API_URL || 'http://api:4000';
const unique = Date.now().toString(36);

async function call(path, { method = 'GET', body, token, raw, contentType } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(raw ? { 'Content-Type': contentType } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: raw || (body ? JSON.stringify(body) : undefined),
  });
  const type = response.headers.get('content-type') || '';
  const data = response.status === 204 ? null : type.startsWith('image/')
    ? Buffer.from(await response.arrayBuffer()) : await response.json();
  return { status: response.status, data, type };
}

function expect(condition, message) { if (!condition) throw new Error(message); }
function cpf(base9) {
  let value = base9;
  for (let digit = 9; digit < 11; digit++) {
    let sum = 0;
    for (let i = 0; i < digit; i++) sum += Number(value[i]) * (digit + 1 - i);
    const candidate = 11 - (sum % 11);
    value += candidate >= 10 ? '0' : String(candidate);
  }
  return value;
}
function br(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
function yearsAgo(years) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setFullYear(date.getFullYear() - years);
  return br(date);
}

const adult = {
  nome: 'Maria da Silva', cpf: cpf('123456789'), email: `safra.${unique}@outlook.com`,
  senha: 'SenhaLonga1!', confirmacaoSenha: 'SenhaLonga1!', dataNascimento: yearsAgo(18),
};
const minor = {
  nome: 'Joana dos Santos', cpf: cpf('987654321'), email: `menor.${unique}@empresa.com.br`,
  senha: 'OutraSenha2@', confirmacaoSenha: 'OutraSenha2@', dataNascimento: yearsAgo(17),
};

const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const invalidRegistrations = [
  ['nome sem sobrenome', { nome: 'Maria' }],
  ['CPF matematicamente inválido', { cpf: '11111111111' }],
  ['e-mail sem domínio válido', { email: 'maria@localhost' }],
  ['e-mail com pontos inválidos', { email: 'maria..silva@example.com' }],
  ['senha sem maiúscula', { senha: 'senhalonga1', confirmacaoSenha: 'senhalonga1' }],
  ['senha sem minúscula', { senha: 'SENHALONGA1', confirmacaoSenha: 'SENHALONGA1' }],
  ['senha sem número', { senha: 'SenhaLonga!', confirmacaoSenha: 'SenhaLonga!' }],
  ['senha curta', { senha: 'Senha1X', confirmacaoSenha: 'Senha1X' }],
  ['data inexistente', { dataNascimento: '31/02/2005' }],
  ['ano não bissexto', { dataNascimento: '29/02/2023' }],
  ['data futura', { dataNascimento: br(tomorrow) }],
];
for (const [name, changes] of invalidRegistrations) {
  expect((await call('/auth/cadastro', { method: 'POST', body: { ...adult, ...changes } })).status === 400,
    `cadastro deveria recusar ${name}`);
}
const leap = { ...adult, cpf: cpf('314159265'), email: `bissexto.${unique}@icloud.com`, dataNascimento: '29/02/2000' };
expect((await call('/auth/cadastro', { method: 'POST', body: leap })).status === 201, 'data bissexta válida falhou');
expect((await call('/auth/cadastro', { method: 'POST', body: adult })).status === 201, 'cadastro adulto válido falhou');
expect((await call('/auth/cadastro', { method: 'POST', body: minor })).status === 201, 'cadastro menor válido falhou');
expect((await call('/auth/cadastro', { method: 'POST', body: { ...adult, email: `outro.${unique}@yahoo.com` } })).status === 409,
  'CPF duplicado não foi recusado');
expect((await call('/auth/cadastro', { method: 'POST', body: { ...adult, cpf: cpf('271828182') } })).status === 409,
  'e-mail duplicado não foi recusado');

expect((await call('/auth/login', { method: 'POST', body: { email: adult.email, senha: 'Errada1X' } })).status === 401,
  'senha incorreta não foi recusada');
const adultLogin = await call('/auth/login', { method: 'POST', body: { email: `  ${adult.email.toUpperCase()}  `, senha: adult.senha } });
const minorLogin = await call('/auth/login', { method: 'POST', body: { email: minor.email, senha: minor.senha } });
expect(adultLogin.status === 200 && adultLogin.data.token, 'login adulto falhou');
expect(minorLogin.status === 200 && minorLogin.data.token, 'login menor falhou');
const adultToken = adultLogin.data.token;
const minorToken = minorLogin.data.token;

const profile = await call('/auth/perfil', { token: adultToken });
expect(profile.status === 200 && profile.data.usuario.dataNascimento === adult.dataNascimento && profile.data.usuario.idade === 18,
  'perfil não devolveu nascimento e idade calculada');
expect((await call('/auth/perfil', { method: 'PATCH', token: adultToken, body: { nome: 'Maria Atualizada', email: 'troca@example.com' } })).status === 400,
  'edição direta do e-mail foi aceita');
expect((await call('/auth/perfil', { method: 'PATCH', token: adultToken, body: { nome: 'Maria Atualizada', dataNascimento: '01/01/1990' } })).status === 400,
  'edição direta do nascimento foi aceita');
const updated = await call('/auth/perfil', { method: 'PATCH', token: adultToken, body: { nome: 'Maria Atualizada' } });
expect(updated.status === 200 && updated.data.usuario.nome === 'Maria Atualizada', 'alteração de nome falhou');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
expect((await call('/auth/perfil/foto', { method: 'PUT', token: adultToken, raw: png, contentType: 'image/png' })).status === 200,
  'upload de foto PNG falhou');
const photo = await call('/auth/perfil/foto', { token: adultToken });
expect(photo.status === 200 && photo.type.startsWith('image/png') && photo.data.length === png.length, 'foto persistida não foi devolvida');
expect((await call('/auth/perfil/foto', { method: 'PUT', token: adultToken, raw: Buffer.from('não é imagem'), contentType: 'image/png' })).status === 400,
  'arquivo com assinatura inválida foi aceito');
expect((await call('/auth/perfil/foto', { method: 'DELETE', token: adultToken })).status === 200, 'remoção de foto falhou');

const products = await call('/produtos');
expect(products.status === 200 && products.data.produtos.length, 'catálogo vazio');
const regular = products.data.produtos.find(item => item.idadeMinima === 0);
const alcohol = products.data.produtos.find(item => item.idadeMinima === 18);
expect(regular && alcohol, 'catálogo não identifica produto comum e alcoólico');
expect((await call('/carrinhos/itens', { method: 'POST', body: { produtoId: alcohol.produtoId, quantidade: 1 } })).status === 401,
  'bebida alcoólica sem autenticação foi aceita');
expect((await call('/carrinhos/itens', { method: 'POST', token: minorToken, body: { produtoId: alcohol.produtoId, quantidade: 1 } })).status === 403,
  'bebida alcoólica foi adicionada por menor');
const alcoholAdded = await call('/carrinhos/itens', { method: 'POST', token: adultToken, body: { produtoId: alcohol.produtoId, quantidade: 1 } });
expect(alcoholAdded.status === 200, 'adulto não conseguiu adicionar bebida alcoólica');
expect((await call(`/carrinhos/${alcoholAdded.data.carrinhoId}/confirmacao-demonstrativa`, { method: 'POST', token: minorToken,
  body: { chaveIdempotencia: `menor-${unique}-12345678`, metodoPagamento: 'pix' } })).status === 403,
  'menor contornou a restrição na confirmação final');

for (const method of ['pix', 'credito', 'debito', 'boleto']) {
  const added = await call('/carrinhos/itens', { method: 'POST', token: adultToken, body: { produtoId: regular.produtoId, quantidade: 1 } });
  const result = await call(`/carrinhos/${added.data.carrinhoId}/confirmacao-demonstrativa`, { method: 'POST', token: adultToken,
    body: { chaveIdempotencia: `${method}-${unique}-12345678`, metodoPagamento: method } });
  expect(result.status === 201 && result.data.metodoPagamento === method, `checkout ${method} falhou`);
}
const invalidPaymentCart = await call('/carrinhos/itens', { method: 'POST', token: adultToken, body: { produtoId: regular.produtoId, quantidade: 1 } });
expect((await call(`/carrinhos/${invalidPaymentCart.data.carrinhoId}/confirmacao-demonstrativa`, { method: 'POST', token: adultToken,
  body: { chaveIdempotencia: `dinheiro-${unique}-12345678`, metodoPagamento: 'dinheiro' } })).status === 400,
  'método dinheiro ainda foi aceito');

expect((await call('/auth/perfil/alterar-senha', { method: 'POST', token: adultToken,
  body: { senhaAtual: 'incorreta', novaSenha: 'NovaSenha3#', confirmacaoNovaSenha: 'NovaSenha3#' } })).status === 401,
  'troca com senha atual incorreta foi aceita');
expect((await call('/auth/perfil/alterar-senha', { method: 'POST', token: adultToken,
  body: { senhaAtual: adult.senha, novaSenha: 'NovaSenha3#', confirmacaoNovaSenha: 'NovaSenha3#' } })).status === 200,
  'troca de senha válida falhou');
expect((await call('/auth/perfil', { token: adultToken })).status === 401, 'sessão antiga continuou válida após troca de senha');
expect((await call('/auth/login', { method: 'POST', body: { email: adult.email, senha: adult.senha } })).status === 401,
  'senha antiga continuou autenticando');
const newLogin = await call('/auth/login', { method: 'POST', body: { email: adult.email, senha: 'NovaSenha3#' } });
expect(newLogin.status === 200, 'nova senha não autenticou');

expect((await call('/auth/conta', { method: 'DELETE', token: minorToken, body: { senhaAtual: 'incorreta' } })).status === 401,
  'exclusão com senha incorreta foi aceita');
expect((await call('/auth/conta', { method: 'DELETE', token: minorToken, body: { senhaAtual: minor.senha } })).status === 204,
  'exclusão permanente falhou');
expect((await call('/auth/perfil', { token: minorToken })).status === 401, 'sessão sobreviveu à exclusão');
expect((await call('/auth/login', { method: 'POST', body: { email: minor.email, senha: minor.senha } })).status === 401,
  'conta excluída ainda autenticou');

console.log('Validação Docker de cadastro, perfil, idade, pagamentos e exclusão concluída com sucesso.');
