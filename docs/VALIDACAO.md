# Validação reproduzível

## O que cada componente demonstra

Docker cria o ambiente e a rede; não valida dados por conta própria. O Node.js expõe REST ao aplicativo e atua como cliente TCP. O Java usa `ServerSocket`, valida cadastro/login/checkout e grava no PostgreSQL. O PostgreSQL aplica unicidade, chaves estrangeiras e idempotência.

## Ambiente normal

1. Copie `.env.example` para `.env` e defina `DB_USER` e `DB_PASSWORD`.
2. Execute `docker compose config --quiet`.
3. Execute `docker compose up -d --build`.
4. Carregue o catálogo com `docker compose exec api node src/database/cli.js seed`.
5. Verifique `docker compose ps` e `curl http://localhost:4000/health/ready`.

O seed atual contém 237 produtos únicos em 10 setores e pode ser executado novamente sem duplicação. Ele preserva as 191 URLs do INSERT original e deixa 46 produtos da expansão com imagem pendente. Para conferir essa consolidação antes de carregar os dados, execute `npm run verify:images`.

Para validar o volume de fotos no ambiente normal, execute `npm run verify:photo-persistence`. O roteiro cria uma conta temporária, envia um PNG, reinicia somente o contêiner `api`, compara o arquivo devolvido e remove foto e conta ao terminar. O volume do banco e o volume de fotos não são apagados.

O healthcheck Java consulta o Actuator dentro do contêiner. A readiness somente fica `UP` se o indicador `validacaoTcp` conseguir abrir uma conexão local, enviar `health`, interpretar a resposta e consultar o banco.

## Suíte isolada Docker

O arquivo `compose.test.yaml` usa projeto, volume e rede próprios. Ele não aponta para o volume normal.

```bash
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from validation
docker compose -f compose.test.yaml down -v
```

O runner cobre nomes/CPF/e-mails/senhas/datas inválidos, provedores diversos, ano bissexto, duplicidade, login, perfil, campos imutáveis, foto, usuários de 17 e 18 anos, bloqueio de bebida na adição e confirmação, PIX/crédito/débito/boleto, troca de senha, invalidação de sessão e exclusão permanente.

## Suítes por camada

```bash
npm test
cd services/confirmacao-java
./mvnw -B test
```

No Windows, use `mvnw.cmd`. Os testes Node de catálogo usam PostgreSQL temporário. Em caminhos contendo caracteres não ASCII, o binário PostgreSQL embutido para Windows pode falhar no `initdb`; execute a suíte a partir de um junction com caminho ASCII ou utilize a suíte Docker.

Além dos contratos anteriores, a suíte confere os 10 setores, o mínimo de 6 produtos ativos por setor, a idempotência do seed e a coerência entre `alcoolico` e `idade_minima = 18`.

## Falhas e logs

```bash
docker compose logs -f api confirmacao-java postgres
docker compose stop confirmacao-java
curl http://localhost:4000/health/live
docker compose start confirmacao-java
```

Com o Java parado, a API continua viva; operações dependentes dele retornam 503. Logs mostram serviço iniciado, conexão, operação, `requestId`, validação aceita/rejeitada e confirmação registrada, sem credenciais ou documentos completos.

Não use `docker compose down -v` no ambiente normal sem backup: `-v` remove os volumes indicados. No arquivo de teste, a remoção é intencional e afeta apenas `safra-test-pgdata` e `safra-test-profile-photos`.
