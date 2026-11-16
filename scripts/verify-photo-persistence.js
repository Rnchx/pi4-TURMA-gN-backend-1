import { spawnSync } from "node:child_process";

const baseUrl = process.env.API_URL || "http://localhost:4000";
const unique = Date.now().toString(36);
const password = "FotoTeste9!";
let token;

function cpf(base9) {
  let value = base9;
  for (let digit = 9; digit < 11; digit += 1) {
    let sum = 0;
    for (let index = 0; index < digit; index += 1) sum += Number(value[index]) * (digit + 1 - index);
    const candidate = 11 - (sum % 11);
    value += candidate >= 10 ? "0" : String(candidate);
  }
  return value;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return response;
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await request("/health/ready");
      if (response.ok) return;
    } catch {
      // O contêiner fica brevemente indisponível durante o reinício.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("A API não ficou pronta após o reinício do contêiner.");
}

async function main() {
  const baseCpf = String(Date.now()).slice(-9).replace(/^(\d)\1{8}$/, "123456789");
  const account = {
    nome: "Teste Persistência",
    cpf: cpf(baseCpf),
    email: `foto.persistencia.${unique}@example.com`,
    senha: password,
    confirmacaoSenha: password,
    dataNascimento: "01/01/1990",
  };
  let response = await request("/auth/cadastro", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(account),
  });
  ensure(response.status === 201, `Cadastro de teste falhou (${response.status}).`);

  response = await request("/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, senha: password }),
  });
  const login = await response.json();
  ensure(response.ok && login.token, `Login de teste falhou (${response.status}).`);
  token = login.token;

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  response = await request("/auth/perfil/foto", {
    method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" }, body: png,
  });
  ensure(response.ok, `Upload de teste falhou (${response.status}).`);

  const restart = spawnSync("docker", ["compose", "restart", "api"], { cwd: process.cwd(), stdio: "inherit" });
  ensure(restart.status === 0, "Não foi possível reiniciar o contêiner da API.");
  await waitUntilReady();

  response = await request("/auth/perfil/foto", { headers: { Authorization: `Bearer ${token}` } });
  const persisted = Buffer.from(await response.arrayBuffer());
  ensure(response.ok && response.headers.get("content-type")?.startsWith("image/png"), "A foto não foi devolvida após o reinício.");
  ensure(persisted.equals(png), "A foto devolvida após o reinício difere do arquivo enviado.");

  response = await request("/auth/perfil/foto", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  ensure(response.ok, "A remoção da foto de teste falhou.");
  response = await request("/auth/conta", {
    method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ senhaAtual: password }),
  });
  ensure(response.status === 204, "A remoção da conta de teste falhou.");
  token = undefined;
  console.log("Foto persistiu no volume Docker após reiniciar a API; dados de teste removidos.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
