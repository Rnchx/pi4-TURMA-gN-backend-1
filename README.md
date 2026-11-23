# Safra Online — Backend

<picture>
  <source
    media="(prefers-color-scheme: light)"
    srcset="assets/design/images/banner-safra-backend-dark.png"
  />
  <source
    media="(prefers-color-scheme: dark)"
    srcset="assets/design/images/banner-safra-backend-light.png"
  />
  <img
    src="assets/design/images/banner-safra-backend-light.png"
    alt="Safra Online 2.0 — Backend"
    width="100%"
  />
</picture>

API responsável pelas regras de negócio, pelo gerenciamento de dados e pela integração dos serviços do Safra Online v2.0, um aplicativo de supermercado digital desenvolvido para fins acadêmicos.

## Entrega final — como rodar

O **SAFRA Online** é um supermercado digital acadêmico com aplicativo React Native e Expo, API Node.js, servidor Java 21 por socket TCP e PostgreSQL. A pessoa cria uma conta, consulta produtos, monta o carrinho e conclui uma compra demonstrativa sem cobrança.

### Integrantes e papéis

| Integrante | RA | Responsabilidade principal |
|---|---:|---|
| Alex Hideki Nakamura Novaes | 25007991 | Servidor Java, socket TCP, Docker e backend |
| Felipe Gabriel Freire Parra | 25003341 | API Node.js, PostgreSQL e Docker |
| João Pedro Rocha | 25003959 | Aplicativo React Native e design |
| João Vitor Peres Peternella | 25004637 | Documentação, diagramas e apoio ao frontend |
| Marcelo Muller Del Mondo | 25000638 | Aplicativo React Native e design |

### Repositórios

- Backend principal, banco, Docker e servidor Java: <https://github.com/Rnchx/pi4-TURMA-gN-backend-1>
- Aplicativo React Native e Expo: <https://github.com/Rnchx/pi4-TURMA-gN-frontend>

### Pré-requisitos

- Git;
- Docker Desktop com Docker Compose v2;
- Node.js 22 ou superior e npm para executar o aplicativo;
- Expo Go compatível com SDK 58 para testar em celular.

Java 21 e Maven Wrapper são necessários somente para executar o servidor Java fora do Docker.

### Como subir

1. Clone o backend e entre na pasta:

   ```powershell
   git clone https://github.com/Rnchx/pi4-TURMA-gN-backend-1.git
   cd pi4-TURMA-gN-backend-1
   ```

2. Crie o arquivo de ambiente e defina `DB_USER` e `DB_PASSWORD`:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Valide e suba o ambiente:

   ```powershell
   docker compose config --quiet
   docker compose up -d --build
   docker compose exec api node src/database/cli.js seed
   docker compose ps
   Invoke-RestMethod http://localhost:4000/health/ready
   ```

4. Em outra pasta, clone e prepare o aplicativo:

   ```powershell
   git clone https://github.com/Rnchx/pi4-TURMA-gN-frontend.git
   cd pi4-TURMA-gN-frontend
   npm ci
   Copy-Item .env.example .env.local
   ```

5. Em `.env.local`, use `EXPO_PUBLIC_API_URL=http://localhost:4000` para navegador. Para celular na mesma rede, substitua `localhost` pelo IP do computador.

6. Inicie o aplicativo:

   ```powershell
   npx expo start --lan --clear
   ```

   Pressione `w` para abrir no navegador ou escaneie o QR Code no Expo Go.

### Como usar

1. Crie uma conta na tela de cadastro e entre; não existe usuário fixo de teste.
2. Escolha um setor ou uma oferta e abra os detalhes de um produto.
3. Adicione produtos ao carrinho e altere quantidades se necessário.
4. No resumo, teste `PRIMEIRA40` na primeira compra ou `QUERO100`.
5. Escolha um método de pagamento fictício e confirme a compra demonstrativa.
6. Consulte as três compras recentes em **Carrinho → Histórico** ou repita uma compra.
7. Use **Meu perfil** para nome, foto, senha, saída ou exclusão e **Configurações** para alternar o tema.

### Documentação da entrega

O documento de projeto em Markdown está em [`docs/documento-de-projeto.md`](docs/documento-de-projeto.md). Os contratos ficam em [`docs/contratos`](docs/contratos), as decisões em [`docs/adr`](docs/adr) e o roteiro de testes em [`docs/VALIDACAO.md`](docs/VALIDACAO.md).

> Esta seção corresponde ao capítulo 9 do documento de projeto e foi escrita para permitir que uma pessoa suba o sistema do zero seguindo apenas o README.

## Sobre o projeto

O **Safra Online** é uma evolução do projeto Safra Online v1.0, criado com o objetivo de modernizar a experiência de compras em um supermercado digital.

A aplicação permite explorar produtos e categorias, gerenciar um carrinho de compras e evoluir por um fluxo estruturado de finalização de pedidos.

Este repositório contém o **backend da aplicação**, responsável por disponibilizar endpoints para o frontend, aplicar regras de negócio, validar informações e gerenciar a persistência dos dados.

A arquitetura também prevê a integração com um serviço complementar desenvolvido em Java e executado em um contêiner Docker, atendendo aos requisitos acadêmicos do projeto sem exigir a migração completa do backend principal.

## Funcionalidades

As funcionalidades previstas para o backend incluem:

- **API REST:** disponibilização de endpoints para comunicação com o frontend.
- **Gerenciamento de produtos:** consulta e organização das informações dos produtos.
- **Categorias e subcategorias:** disponibilização dos dados necessários à navegação pelo catálogo.
- **Carrinho de compras:** suporte às operações relacionadas aos itens selecionados.
- **Processamento de pedidos:** validação dos itens, cálculo dos valores e registro das compras.
- **Compra demonstrativa:** finalização acadêmica sem cobrança e sem coleta de dados financeiros.
- **Conta do consumidor:** cadastro, autenticação, perfil com foto, troca de senha e exclusão permanente.
- **Restrição etária acadêmica:** nascimento persistido como `DATE` e idade calculada pelo Java na adição e no checkout de produtos 18+.
- **Persistência de dados:** armazenamento das informações utilizando PostgreSQL.
- **Integração com Java:** o Node é cliente TCP de um servidor Java (ServerSocket, strings JSON por linha).
- **Assistente com IA:** interpretação opcional de pedidos por texto ou áudio pela API da OpenAI, com validação no catálogo local.
- **Ofertas demonstrativas:** produtos promocionais cadastrados no próprio banco, sem consulta a mercados externos.
- **Tratamento de erros:** respostas padronizadas para facilitar a comunicação com o frontend.

> Esta lista descreve o escopo previsto do projeto. A disponibilidade de cada endpoint e funcionalidade depende do estágio atual da implementação.

## Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução do backend principal |
| Express.js | Criação e organização da API HTTP |
| Java | Desenvolvimento do serviço complementar |
| Maven | Dependências e build do servidor Java (sem Spring) |
| Docker | Ferramenta opcional de empacotamento e execução (não é o servidor) |
| PostgreSQL | Banco de dados relacional |
| OpenAI API | Interpretação estruturada de pedidos e transcrição opcional de áudio |
| npm | Gerenciamento de dependências do backend Node.js |
| Git | Controle de versão |

## Arquitetura

A aplicação utiliza uma arquitetura híbrida, mantendo o Node.js como backend principal e adicionando um serviço independente em Java.

### Visão geral

```text
Frontend
React Native + Expo
        |
        | HTTP / REST
        v
Backend principal
Node.js + Express.js
        |
        |----------------------|----------------------|
        |                      |                      |
        v                      v                      v
PostgreSQL             Serviço Java           API OpenAI
                       Java 21 + Maven         serviço externo
                       ServerSocket TCP
                            |
                            v
                       PostgreSQL
```

O frontend realiza requisições HTTP/REST ao Node.js. Para cadastro, login e confirmação, o Node atua como cliente TCP e envia JSON delimitado por quebra de linha ao `ServerSocket` Java na rede interna do Docker.

O PostgreSQL será utilizado para persistir os dados da aplicação, de acordo com as responsabilidades definidas para cada serviço.

A separação permite incorporar Java e Docker ao projeto sem reescrever toda a aplicação backend.

## Repositório do frontend

O frontend correspondente ao projeto está disponível em:

[pi4-TURMA-gN-frontend](https://github.com/Rnchx/pi4-TURMA-gN-frontend)

## Especificação dos fluxos e contratos

A visão geral e os fluxos ficam em [docs/fluxos do frontend](https://github.com/Rnchx/pi4-TURMA-gN-frontend/tree/main/docs/fluxos). As interfaces definidas por este backend e pelo serviço Java ficam em [`docs/contratos`](docs/contratos).

## Execução do catálogo — Ciclo 2

Requer **Node.js 22 ou superior** e **PostgreSQL 14 ou superior**. O PostgreSQL pode ser o do Docker Compose (veja [Ambiente Docker](#ambiente-docker-postgresql-api-e-serviço-java)) ou uma instalação local. Não é necessária chave OpenAI. A implementação atual atende catálogo, classificação, detalhes, carrinho, resumo, confirmação demonstrativa (E1–E10) e ofertas demonstrativas (E12); o assistente de IA (E11) continua previsto.

1. Instale com `npm ci`.
2. Copie `.env.example` para `.env` e configure o banco: o do Docker Compose (criado com as credenciais do próprio `.env`) ou um banco **já criado**, com um usuário autorizado a criar tabelas. Nenhuma credencial real acompanha o repositório.
3. Execute `npm run db:check`, `npm run db:migrate` e, para dados demonstrativos, `npm run db:seed`.
4. Inicie com `npm start` ou `npm run dev` (reinício ao editar arquivos).

| Variável | Uso |
|---|---|
| PORT | Porta HTTP; padrão 4000. |
| DB_HOST / DB_PORT | Host e porta PostgreSQL; padrões localhost e 5432. |
| DB_NAME | Banco existente; padrão safra. |
| DB_USER / DB_PASSWORD | Credenciais locais; senha passada em objeto de conexão, sem concatenar URI. |
| NODE_ENV | development ou production. |
| CORS_ORIGINS | Origens exatas separadas por vírgula, sem barra final, caminhos ou curingas. |

Em desenvolvimento, o padrão CORS permite `http://localhost:8081`, `http://127.0.0.1:8081` e `http://localhost:19006`. Se usar outra porta ou IP de rede no Expo Web, inclua sua origem exata. Em produção, configure somente as origens publicadas; sem configuração, nenhuma origem de navegador é autorizada. Chamadas sem cabeçalho Origin, como as de apps nativos e ferramentas HTTP, continuam aceitas. CORS controla navegadores e não substitui autenticação.

No frontend, crie seu `.env` local a partir do exemplo e configure `EXPO_PUBLIC_API_URL=http://localhost:4000` para Expo Web neste computador; reinicie o Expo. Para dispositivo físico, use o IP acessível do computador; no Android Emulator, normalmente `http://10.0.2.2:4000`. Não publique credenciais em variáveis EXPO_PUBLIC_.

### Banco e ciclo de vida

- `src/database/index.js` apenas cria/configura o pool; importar módulos não consulta nem cria tabelas.
- `db:check` verifica conexão. `db:migrate` aplica arquivos versionados em transação, com registro em `schema_migrations` e trava contra execução concorrente.
- A primeira migration cria `categorias`, `subcategorias` e `produtos`, alinhadas a CT2/CT4/CT5. Se `categorys` e `products` legadas existirem, importa os registros preservando IDs e cria subcategorias a partir de `type`. As tabelas originais são preservadas como histórico, sem receber novas escritas da API. Faça backup antes de migrar um banco existente.
- Duplicidade de categorias, referências inválidas ou dados incompatíveis com as restrições interrompem e revertem a migration; nenhum dado é apagado ou ajustado silenciosamente. Corrija os dados com revisão antes de tentar novamente.
- `db:seed` é explícito e repetível: 237 produtos únicos distribuídos em 10 setores e suas subcategorias, com ofertas demonstrativas (`em_oferta` e `preco_anterior` maior que o preço atual). Os 191 itens do INSERT original preservam suas URLs; os 46 itens da expansão aguardam imagem manual com `imagem_url = NULL`. O seed usa chave demonstrativa fixa e atualiza os mesmos registros sem duplicá-los nem apagar cadastros manuais. A consolidação pode ser verificada com `npm run verify:images`.
- A migration `005-catalogo-setores-alcool.sql` acrescenta o marcador explícito `alcoolico`. O banco exige que todo item alcoólico também possua `idade_minima = 18`; a validação da idade autenticada continua sendo executada pelo serviço Java na adição e na confirmação. A migration `006-imagem-produto-opcional.sql` permite `imagem_url` nula para itens ainda sem foto curada, mantendo a exigência HTTPS quando houver URL.
- Com o Compose normal saudável, `npm run verify:photo-persistence` cria uma conta descartável, envia uma imagem, reinicia somente a API, confere o mesmo arquivo no volume persistente e remove os dados de teste.
- `npm start` abre HTTP e verifica a conexão, capturando a falha. Não migra nem popula o banco. Consultas possuem limite de tempo; a API volta a atender quando o PostgreSQL retorna.
- SIGINT/SIGTERM encerram HTTP e o pool. `db:check`, `db:migrate` e `db:seed` retornam código 1 em caso de falha, sem imprimir credenciais ou consultas.

### Saúde

| Rota | Banco ativo | Banco desligado |
|---|---|---|
| GET /health/live | 200, http=ok | 200, http=ok |
| GET /health ou /health/ready | 200, http=ok, banco=disponivel | 503, http=ok, banco=indisponivel, codigo e mensagem |

Readiness verifica conectividade; migrations precisam ser aplicadas separadamente. Erros nas consultas do catálogo seguem os contratos: HTTP 500 com `codigo=erroInterno` e mensagem compreensível, sem detalhes SQL, stack trace ou credenciais.

### Rotas oficiais e complementares deste ciclo

| Método e rota | Resposta / finalidade |
|---|---|
| GET /produtos | CT1: totalProdutos e produtos ativos. |
| GET /categorias | CT3: categorias ativas com subcategorias ativas. |
| GET /categorias/:categoriaId/subcategorias/:subcategoriaId/produtos | CT6: valida existência e vínculo da classificação. |
| GET /produtos/:produtoId | CT7: detalhes, preço e classificação do produto ativo. |
| GET /produtos/ofertas | CT22: `aviso` fixo e `ofertas` ativas (preço atual, `precoAnterior` e `emOferta`), da maior para a menor economia. |
| GET /categorias/:categoriaId/produtos | Complemento: produtos ativos da categoria (relacionados). |
| GET /produtos/tipo/:tipo | Complemento: produtos pelo nome do tipo/subcategoria. |
| GET /categorias/:categoriaId | Complemento: categoria por ID. |
| POST /produtos; PUT /produtos/:produtoId | Cadastro e substituição integral dos campos nome, preco, descricao, imagemUrl, categoriaId e subcategoriaId. |
| POST /categorias; PUT /categorias/:categoriaId | Cadastro/alteração de nome (campo nome). |
| DELETE /produtos/:produtoId | Desativa o produto; retorna 204 ou 404. |
| DELETE /categorias/:categoriaId | Remove categoria sem vínculos; 409 se houver dependências. |

As escritas exigem os campos de texto e classificação, limites de tamanho e preço não negativo com até duas casas. `imagemUrl` é opcional; quando informada, deve ser HTTPS e não conter credenciais. IDs são inteiros positivos de 32 bits; categoria e subcategoria devem existir e ser compatíveis. Os campos de oferta (`emOferta` e, quando verdadeiro, `precoAnterior`) aparecem nas leituras conforme os contratos; as ofertas vêm da carga demonstrativa, e não há cadastro de ofertas pela API. Listas vazias retornam 200 com array vazio. Erros JSON têm `codigo` e `mensagem`; validação retorna 400, ausência retorna 404, conflito retorna 409. Os cadastros não têm autenticação neste ciclo; não exponha esta API demonstrativa publicamente.

### Rotas legadas removidas (OP#1335)

Os aliases `/products` e `/categorys` (formato `name/price/photo/idcategory`) foram removidos depois que o frontend passou a usar somente as rotas oficiais. Chamadas a eles retornam 404 `rotaNaoEncontrada`. O arquivo histórico `create-tables.sql` também foi removido; a importação de bancos antigos (`categorys`/`products`) continua na migration 001.

### Carrinho e compra demonstrativa (CT8–CT15)

| Método e rota | Contrato | Resposta |
|---|---|---|
| POST /carrinhos/itens | CT8 | `carrinhoId`, `mensagem`, `item` (quantidade acumulada, preço, subtotal) e `total`. Sem `carrinhoId`, cria carrinho de visitante. |
| GET /carrinhos/:carrinhoId | CT11 | `status`, `itens` (nome, quantidade, precoUnitario, subtotal), `total`, `carrinhoVazio`. |
| PATCH /carrinhos/:carrinhoId/itens/:produtoId | CT12 | Nova quantidade (1 a 99), subtotal e total recalculados. |
| DELETE /carrinhos/:carrinhoId/itens/:produtoId | CT13 | `removido`, itens restantes, `total`, `carrinhoVazio`. |
| GET /carrinhos/:carrinhoId/resumo | CT14 | Mesmos itens e total de CT11 e `podeConfirmar`. |
| POST /carrinhos/:carrinhoId/confirmacao-demonstrativa | CT15 | `compraId`, `confirmacaoId`, `status`, `itens`, `total`, `mensagem` e `criadaEm`; 201 na primeira confirmação, 200 ao repetir a mesma chave. |

- Subtotais e totais são calculados em `NUMERIC` pelo PostgreSQL (fluxo E7: 2 × 5,50 + 1 × 3,00 = 14,00). O preço fica gravado no item ao ser adicionado (CT10) e não muda se o catálogo mudar.
- Produto repetido soma a quantidade na mesma linha. Quantidades acima de 99 são recusadas sem alterar o carrinho. Toda alteração trava o carrinho, evitando perda de unidades em requisições simultâneas.
- A confirmação relê o carrinho travado, recusa carrinho vazio ou com produto indisponível (409) e envia ao Serviço de Confirmação (CT16) os mesmos valores do resumo; só então o carrinho passa a `confirmado`. Carrinho confirmado não aceita alterações (409 `carrinhoFechado`).
- O aplicativo gera a `chaveIdempotencia` e a reutiliza nas novas tentativas. Repetir a mesma chave devolve a compra original, sem duplicá-la. Java indisponível ou acima de 5 s: 503 `servicoValidacaoIndisponivel`, com o carrinho ainda aberto.
- **Idempotência (CT15, CT16 e CT17):** reenviar a mesma `chaveIdempotencia` para o mesmo carrinho devolve a compra original com 200, mesmo depois de o carrinho estar confirmado. Assim, uma resposta perdida na rede pode ser repetida sem gerar outra compra. Carrinho já confirmado com **outra** chave, ou chave reaproveitada com dados diferentes, recebe 409 `confirmacaoNaoPermitida`, e nenhuma compra nova é criada.

### Testes

`npm test` executa testes HTTP com Supertest e **PostgreSQL real temporário**, instalado como dependência de desenvolvimento. Não utiliza o DB_* do ambiente, não exige banco externo e não modifica bases existentes. O cluster usa porta livre, autenticação SCRAM, senha aleatória e bind em 127.0.0.1; seus arquivos são removidos após os testes. Instale dependências opcionais e permita o postinstall do pacote de binários `@embedded-postgres/<plataforma>`, caso o gerenciador solicite. Em Linux, rode como usuário sem privilégios de root; o teste não cria usuários do sistema. `npm ci --omit=dev` instala apenas as dependências necessárias ao servidor.

A suíte cobre CT1/CT3/CT6/CT7, carrinho CT8–CT14 (cenário E7, produto repetido, limites de quantidade, concorrência, preço persistido, carrinho fechado), confirmação CT15 com Serviço de Confirmação simulado (idempotência, tentativas simultâneas, indisponibilidade e tempo limite), remoção das rotas legadas, filtros, criação/atualização, entradas inválidas, conflitos, registros inativos, migration do legado, repetição da carga, CORS, saúde, inicialização sem banco e desligamento/recuperação real do PostgreSQL. O teste visual integrado depende do frontend Expo em execução e é documentado no relatório do ciclo.

## Servidor Java (TCP acadêmico, Maven, sem Spring)

O servidor Java ([`services/confirmacao-java`](services/confirmacao-java)) é uma aplicação **Java 21 + Maven convencional**. Ele abre e controla manualmente um `ServerSocket`, e o Node.js é o seu cliente TCP. As mensagens são **strings JSON UTF-8, uma por linha (LF)**.

```text
Aplicativo Expo ──HTTP/JSON──▶ API Node.js (cliente TCP) ──TCP: strings JSON + LF──▶ Servidor Java (ServerSocket) ──JDBC──▶ PostgreSQL
```

O `ServerSocket` atende cadastro, autenticação, perfil, senha, foto, exclusão, restrição etária, cupons, confirmação, histórico e `health`. Não há servidor HTTP no Java.

- Valida referência, carrinho, quantidades (1 a 99), preços e subtotais em `BigDecimal`, sem arredondamento implícito.
- Gera o identificador `SAFRA-DEMO-XXXXXXXX` e responde 201 para uma nova compra.
- Idempotência da confirmação:
  - mesma referência, mesmo carrinho e mesmos dados devolvem a compra original (200);
  - referência reaproveitada com dados diferentes, ou carrinho já confirmado com outra referência, resulta em 409 `idempotenciaConflitante`.
- Erros: 400 `entradaInvalida`, 409 `idempotenciaConflitante`, 500 `erroInterno`, 503 `bancoIndisponivel`, com as mensagens dos contratos.
- As tabelas são criadas pelas migrations da API, que mantêm o único histórico de esquema do projeto.

### Tecnologias e decisões

| Item | Escolha |
|---|---|
| Linguagem e build | Java 21 (Eclipse Temurin) e Maven via wrapper (`mvnw`/`mvnw.cmd`); JAR executável único (`maven-shade-plugin`) |
| Socket | `ServerSocket` e `Socket`, cada um associado a um `BufferedReader` (entrada) e a um `PrintWriter` (saída) em UTF-8 |
| Concorrência | `AceitadoraDeConexao` e `SupervisoraDeConexao` implementam `Runnable` e rodam em `ExecutorService` (pool limitado por `TCP_MAX_CONNECTIONS`) |
| Formato | String JSON por linha; Jackson apenas converte objetos em texto JSON e vice-versa |
| Banco | JDBC explícito (`PreparedStatement`, try-with-resources, transações com rollback) e pool HikariCP |
| Senhas | Argon2id (BouncyCastle), no mesmo formato já gravado no banco |
| Logs | SLF4J com `slf4j-simple`, em stdout |

- **Sem serialização nativa Java:** não usamos `Serializable`, `ObjectInputStream`/`ObjectOutputStream` nem `Data*Stream`. O cliente é Node.js, que não lê objetos Java serializados; strings JSON são interoperáveis.
- **Sem Spring Boot nem Spring Framework.** Não eram necessários para o escopo acadêmico. As dependências são criadas manualmente em `ConfirmacaoApplication`, por construtores explícitos, e o Maven gerencia dependências e build.
- **Docker é ferramenta, não servidor.** Ele apenas empacota e executa; o servidor é a aplicação Java que abre o `ServerSocket`. Dá para rodar tudo sem Docker.

### Protocolo

| Mensagem | Formato (uma linha JSON) |
|---|---|
| Pedido comum | `{"requestId":"uuid","operacao":"nomeDaOperacao","dados":{}}` |
| Resposta de sucesso | `{"requestId":"uuid","sucesso":true,"dados":{...},"codigo":null,"mensagem":null}` |
| Resposta de erro | `{"requestId":"uuid","sucesso":false,"dados":null,"codigo":"codigoDoErro","mensagem":"Mensagem segura"}` |
| `PedidoParaSair` | `{"requestId":"uuid","operacao":"pedidoParaSair","dados":{}}` |
| `ComunicadoDeDesligamento` | `{"tipo":"comunicadoDeDesligamento","mensagem":"O servidor será desligado.","requestId":"uuid do pedido ou null","emitidoEm":"2026-11-17T12:00:00Z"}` |

Proteções preservadas:
- timeout por conexão (`TCP_TIMEOUT_MS`);
- limite de bytes por linha (`TCP_MAX_MESSAGE_BYTES`), verificado antes do LF;
- linha vazia ou JSON inválido respondem `entradaInvalida`, sem derrubar a conexão;
- fragmentação TCP e várias mensagens na mesma conexão;
- flush e `checkError()` após cada escrita;
- escrita sincronizada, porque a resposta e o aviso de desligamento podem disputar o mesmo cliente.

### Desligamento ordenado (`PedidoParaSair` → `ComunicadoDeDesligamento`)

1. O cliente administrativo envia `pedidoParaSair`. A `SupervisoraDeConexao` cria um `PedidoParaSair` e o entrega ao `Servidor`.
2. O desligamento roda em uma thread dedicada (`safra-desligamento`), fora do pool de conexões. Assim ele pode aguardar o próprio pool terminar sem deadlock. A sequência acontece uma única vez, mesmo com pedidos simultâneos.
3. O `ServerSocket` é fechado e novas conexões deixam de ser aceitas.
4. Um `ComunicadoDeDesligamento` é enviado a **todos os clientes ativos, inclusive ao solicitante**. O registro de parceiros usa `ConcurrentHashMap.newKeySet()`.
5. O servidor envia FIN, aguarda `TCP_SHUTDOWN_GRACE_MS` para os clientes lerem o aviso e fecha os sockets.
6. Encerra a aceitadora e as supervisoras, aguarda os `ExecutorService` e fecha o pool do banco.
7. A JVM termina sem threads pendentes.

SIGTERM ou Ctrl+C executam a mesma sequência, pelo shutdown hook.

### Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `TCP_BIND_ADDRESS` | `127.0.0.1` | Interface do `ServerSocket` (o Compose usa `0.0.0.0` dentro da rede interna) |
| `TCP_PORT` | `3000` | Porta TCP |
| `TCP_TIMEOUT_MS` | `10000` | Inatividade máxima por conexão |
| `TCP_MAX_MESSAGE_BYTES` | `32768` | Tamanho máximo de uma linha |
| `TCP_MAX_CONNECTIONS` | `50` | Threads do pool de supervisoras |
| `TCP_SHUTDOWN_GRACE_MS` | `300` | Espera entre o comunicado e o fechamento dos sockets |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | `localhost`, `5432`, `safra` | PostgreSQL |
| `DB_USER`, `DB_PASSWORD` | obrigatórias | Credenciais, somente por ambiente; nunca aparecem em logs |

### Compilar, iniciar e desligar

Compilar e testar (Windows: `.\mvnw.cmd`; Linux/macOS: `./mvnw`):

```bash
cd services/confirmacao-java
./mvnw clean test
./mvnw clean package
```

**Sem Docker**, com o PostgreSQL acessível e as variáveis definidas. No PowerShell:

```powershell
$env:DB_USER="seu_usuario"; $env:DB_PASSWORD="sua_senha"
java -jar target\confirmacao-java.jar
```

Em outro terminal, na raiz do backend (com `JAVA_TCP_HOST=localhost` no `.env`), inicie a API com `npm start`. Para desligar o Java:

```bash
npm run java:shutdown
```

**Com Docker**, o Java sobe junto com o restante: `docker compose up -d --build`. A porta Java não é publicada, então o comando de desligamento roda dentro do contêiner da API:

```bash
docker compose exec api npm run java:shutdown
```

O comando imprime o `ComunicadoDeDesligamento` e sai com código 0. Em timeout, servidor indisponível ou resposta inesperada, sai com código diferente de zero. Não existe rota HTTP para desligar.

No Compose o Java usa `restart: on-failure`: depois de um desligamento ordenado (código 0), ele não é religado sozinho. Para reiniciar:

```bash
docker compose up -d confirmacao-java
```

Enquanto o Java está parado, a API continua no ar e as operações que dependem dele respondem 503 `servicoValidacaoIndisponivel`.

**Healthcheck:** o contêiner executa `VerificadorDeSaude`, um cliente Java que envia a operação `health` pelo próprio protocolo TCP e exige `sucesso: true`. Essa operação também consulta o PostgreSQL. Não há Actuator nem HTTP.

### Relação com o exemplo cliente-servidor ("Fazedor de Continhas")

| Conceito do exemplo | Adaptação no SAFRA |
|---|---|
| Servidor iniciado antes do cliente | Compose sobe o Java depois do PostgreSQL saudável; o Node é iniciado depois |
| Servidor aguardando solicitações | `Servidor` abre um `ServerSocket` em `TCP_PORT` |
| Host e porta por argumento | `JAVA_TCP_HOST` e `JAVA_TCP_PORT` no Node |
| `Parceiro` com entrada e saída | `BufferedReader` + `PrintWriter` sobre o socket, com strings JSON por linha |
| Threads por cliente | `AceitadoraDeConexao` entrega cada socket a uma `SupervisoraDeConexao` (`Runnable`) em pool limitado |
| `PedidoParaSair` / `ComunicadoDeDesligamento` | Desligamento ordenado com aviso a todos os clientes ativos |
| Tratamento de indisponibilidade | Timeout/desconexão viram 503 sem derrubar a API; healthcheck percorre protocolo e PostgreSQL |

## Ambiente Docker: PostgreSQL, API e serviço Java

```mermaid
flowchart LR
  app["Aplicativo Expo<br/>(navegador ou celular)"]
  subgraph docker["Docker Compose · rede safra-net"]
    api["api<br/>Node.js + Express<br/>porta 4000"]
    java["confirmacao-java<br/>Java 21 · ServerSocket"]
    pg[("postgres<br/>PostgreSQL 17.11")]
    vol[["volume safra-pgdata"]]
  end
  app -- "HTTP/JSON<br/>EXPO_PUBLIC_API_URL" --> api
  api -- "TCP/JSON por linha<br/>confirmacao-java:3000" --> java
  api -- "SQL<br/>postgres:5432" --> pg
  java -- "JDBC<br/>postgres:5432" --> pg
  pg --- vol
```

- `docker compose up -d` sobe **PostgreSQL, API SAFRA e Serviço de Confirmação**. A API aplica as migrations ao iniciar; elas são idempotentes e não apagam dados. O seed continua explícito.
- **Dentro da rede `safra-net`**, a API usa `postgres:5432` e `confirmacao-java:3000`. `localhost` dentro de um contêiner é o próprio contêiner.
- **Na máquina**, somente API e PostgreSQL têm portas publicadas. As portas do Java permanecem exclusivamente internas.
- **Aparelho físico (Expo Go):** só durante o teste, publique a API na rede local. PostgreSQL e Java continuam sem exposição à rede local; o Java permanece acessível apenas pela rede interna do Compose.
  1. No `.env` do backend (não versionado), defina `API_BIND_ADDRESS=0.0.0.0` e recrie só a API: `docker compose up -d --no-deps api`.
  2. Confira pelo navegador do celular, na mesma rede Wi-Fi: `http://<IP-do-computador>:4000/health/ready`.
  3. No `.env.local` do frontend (não versionado), aponte para o IP do computador. Por exemplo: `EXPO_PUBLIC_API_URL=http://192.168.0.64:4000`.
  4. Depois do teste, volte para `API_BIND_ADDRESS=127.0.0.1` e recrie a API. Mesmo com autenticação de usuário, não exponha o ambiente de desenvolvimento em redes públicas.
- Para executar o Node fora do Compose, seria necessário publicar temporariamente a porta TCP Java; o fluxo reproduzível e recomendado é executar os três serviços pelo Compose.

| Serviço | Imagem | Porta na máquina | Healthcheck |
|---|---|---|---|
| `postgres` | `postgres:17.11-alpine3.24` (oficial) | `127.0.0.1:${DB_PORT:-5432}` | `pg_isready` |
| `api` | `safra/api:1.2.0` (build local, `node:24.19.0-alpine3.24`, usuário `node`) | `${API_BIND_ADDRESS:-127.0.0.1}:${API_PORT:-4000}` | `/health/ready` |
| `confirmacao-java` | `safra/confirmacao-java:0.2.0` (build local) | nenhuma | `VerificadorDeSaude`: operação `health` pelo TCP + PostgreSQL |

Volume nomeado `safra-pgdata` (dados do PostgreSQL), rede `safra-net` e política `restart: unless-stopped` (o Java usa `on-failure`, para continuar parado depois de um desligamento ordenado).

### Comandos

Verificar o Docker:

```bash
docker version
docker compose version
```

Criar o `.env` (ignorado pelo Git) a partir do exemplo e trocar `DB_USER`/`DB_PASSWORD` por valores próprios. O Compose cria o banco com eles na primeira inicialização do volume:

```bash
cp .env.example .env
```

Validar a configuração, construir e iniciar (o build executa os testes Java):

```bash
docker compose config --quiet
docker compose build
docker compose up -d
```

Estado, healthchecks e logs:

```bash
docker compose ps
docker inspect --format "{{.State.Health.Status}}" safra-postgres-1 safra-api-1 safra-confirmacao-java-1
curl http://localhost:4000/health
docker compose logs -f api
docker compose logs confirmacao-java
```

Carga demonstrativa (237 produtos em 10 setores, repetível, sem duplicar):

```bash
docker compose exec api node src/database/cli.js seed
```

Reconstruir a API após alterar o código:

```bash
docker compose up -d --build api
```

Parar **sem apagar dados** (o volume `safra-pgdata` é mantido) e retomar:

```bash
docker compose stop
docker compose start
docker compose down
```

Reconstruir somente o serviço Java após alterar o código:

```bash
docker compose up -d --build confirmacao-java
```

Remover o ambiente **e apagar o banco** (irreversível, use somente de forma intencional):

```bash
docker compose down -v
```

Se o volume já existir, alterar `DB_USER`/`DB_PASSWORD` no `.env` não muda o usuário do banco: o PostgreSQL só usa essas variáveis ao inicializar um volume vazio.

### Testes e validação

Consulte [`docs/VALIDACAO.md`](docs/VALIDACAO.md) para os testes Node, Java, protocolo TCP, autenticação, checkout, logs e falhas controladas. O contrato de mensagens está em [`docs/contratos/TCP-JSON.md`](docs/contratos/TCP-JSON.md).

## API e comunicação com o frontend

O backend disponibiliza a camada de comunicação utilizada pelo frontend do Safra 2.0.

As rotas deverão ser organizadas de acordo com os recursos da aplicação, mantendo separação entre endpoints, regras de negócio, acesso a dados e tratamento de erros, conforme a arquitetura adotada.

As operações de checkout deverão validar os dados no servidor, recalcular o valor total dos produtos e registrar o pedido de acordo com as regras definidas.

O sistema não processa pagamentos reais, não simula PIX ou cartão e não solicita dados financeiros. A finalização apenas registra e exibe uma confirmação demonstrativa.

## Decisões de arquitetura

As principais decisões técnicas do projeto são documentadas por meio de Architecture Decision Records (ADRs).

Os documentos ficam organizados no diretório:

```text
docs/adr/
```

Cada ADR descreve o contexto de uma decisão, a solução escolhida, as alternativas consideradas e suas consequências.

Essa documentação ajuda a manter as decisões arquiteturais explícitas e facilita a compreensão da evolução do sistema pela equipe.

## Desenvolvimento acadêmico

**Projeto Integrador IV**

O Safra 2.0 é desenvolvido em equipe para fins acadêmicos, com o objetivo de aplicar conhecimentos de desenvolvimento backend, APIs REST, bancos de dados relacionais, integração entre serviços, conteinerização e arquitetura de software.

## Licença

Projeto desenvolvido para fins acadêmicos. As condições de distribuição e reutilização deverão seguir as definições estabelecidas pela equipe e pela instituição de ensino.
