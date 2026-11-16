# Validação reproduzível

## O que cada componente demonstra

Docker cria o ambiente e a rede; não valida dados por conta própria. O Node.js expõe REST ao aplicativo e atua como cliente TCP. O Java usa `ServerSocket`, valida cadastro/login/checkout e grava no PostgreSQL. O PostgreSQL aplica unicidade, chaves estrangeiras e idempotência.

## Ambiente normal

1. Copie `.env.example` para `.env` e defina `DB_USER` e `DB_PASSWORD`.
2. Execute `docker compose config --quiet`.
3. Execute `docker compose up -d --build`.
4. Carregue o catálogo com `docker compose exec api node src/database/cli.js seed`.
5. Verifique `docker compose ps` e `curl http://localhost:4000/health/ready`.

O seed atual contém 237 produtos únicos em 10 setores e pode ser executado novamente sem duplicação. Ele preserva as 191 URLs do INSERT original; a curadoria v1.4 (`src/database/catalog-curation.js`, aplicada também pela migration 007 em bancos existentes) deu nome, descrição e foto direta a 45 produtos da expansão, seguindo a ordem da lista em cada setor, e atualizou a foto da Laranja Pera. O vinho tinto recebeu nome, foto e preço próprios (Don Laurindo Gran Reserva, R$ 795,00) pela migration 008; nenhum produto segue sem imagem. O Desinfetante Cif ficou sem registro pendente correspondente. Execute `npm run verify:images` (ou `node scripts/verify-catalog-images.js --online` para também conferir o Content-Type de cada URL).

Para validar o volume de fotos no ambiente normal, execute `npm run verify:photo-persistence`. O roteiro cria uma conta temporária, envia um PNG, reinicia somente o contêiner `api`, compara o arquivo devolvido e remove foto e conta ao terminar. O volume do banco e o volume de fotos não são apagados.

O healthcheck Java consulta o Actuator dentro do contêiner. A readiness somente fica `UP` se o indicador `validacaoTcp` conseguir abrir uma conexão local, enviar `health`, interpretar a resposta e consultar o banco.

## Suíte isolada Docker

O arquivo `compose.test.yaml` usa projeto, volume e rede próprios. Ele não aponta para o volume normal.

```bash
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from validation
docker compose -f compose.test.yaml down -v
```

O runner cobre nomes/CPF/e-mails/senhas/datas inválidos, provedores diversos, ano bissexto, duplicidade, login, perfil, campos imutáveis, foto, usuários de 17 e 18 anos, bloqueio de bebida na adição e confirmação, PIX/crédito/débito/boleto, cupons (`PRIMEIRA40` na primeira compra, recusa após a primeira compra, duas confirmações concorrentes com `PRIMEIRA40`, `QUERO100` válido, `quero100` recusado, desconto limitado ao subtotal, total nunca negativo, idempotência com cupom, total forjado recusado), histórico (máximo de três, ordem decrescente, detalhes, isolamento entre contas), "Adicionar novamente ao carrinho" (outra conta recusada, preço atual), troca de senha, invalidação de sessão e exclusão permanente.

Os CPFs do runner são fixos: execute `down -v` entre duas execuções para começar de um volume limpo.

## Suítes por camada

```bash
npm test
cd services/confirmacao-java
./mvnw -B test
```

No Windows, use `mvnw.cmd`. Os testes Node de catálogo usam PostgreSQL temporário. Em caminhos contendo caracteres não ASCII, o binário PostgreSQL embutido para Windows pode falhar no `initdb`; execute a suíte a partir de um junction com caminho ASCII ou utilize a suíte Docker.

Além dos contratos anteriores, a suíte confere os 10 setores, o mínimo de 6 produtos ativos por setor, a idempotência do seed e a coerência entre `alcoolico` e `idade_minima = 18`. `tests/catalog-curation.test.js` cobre a curadoria (preços preservados, URLs diretas, mapeamento por `demo_chave`), o filtro +18 com uma única subcategoria canônica `alcoólicas`, a ausência de "demonstrativo" nos produtos, a migration 007 sobre dados antigos e sobre um banco atualizado desde a 006, e as restrições de cupom no banco. `tests/purchases.test.js` cobre histórico e repetição de compra na API.

## Falhas e logs

```bash
docker compose logs -f api confirmacao-java postgres
docker compose stop confirmacao-java
curl http://localhost:4000/health/live
docker compose start confirmacao-java
```

Com o Java parado, a API continua viva; operações dependentes dele retornam 503. Logs mostram serviço iniciado, conexão, operação, `requestId`, validação aceita/rejeitada e confirmação registrada, sem credenciais ou documentos completos.

Não use `docker compose down -v` no ambiente normal sem backup: `-v` remove os volumes indicados. No arquivo de teste, a remoção é intencional e afeta apenas `safra-test-pgdata` e `safra-test-profile-photos`.
