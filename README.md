# Safra Online — Backend

![Banner do Safra 2.0 Backend](CAMINHO_DO_SEU_BANNER)

API responsável pelas regras de negócio, pelo gerenciamento de dados e pela integração dos serviços do Safra Online v2.0, um aplicativo de supermercado digital desenvolvido para fins acadêmicos.

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
- **Checkout acadêmico:** suporte ao fluxo de finalização com métodos de pagamento simulados, como PIX e cartão.
- **Persistência de dados:** armazenamento das informações utilizando PostgreSQL.
- **Integração com Java:** comunicação com um serviço complementar desenvolvido com Spring Boot.
- **Tratamento de erros:** respostas padronizadas para facilitar a comunicação com o frontend.

> Esta lista descreve o escopo previsto do projeto. A disponibilidade de cada endpoint e funcionalidade depende do estágio atual da implementação.

## Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução do backend principal |
| Express.js | Criação e organização da API HTTP |
| Java | Desenvolvimento do serviço complementar |
| Spring Boot | Estruturação da aplicação Java |
| Docker | Empacotamento e execução do serviço Java em contêiner |
| PostgreSQL | Banco de dados relacional |
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
        |----------------------|
        |                      |
        v                      v
PostgreSQL             Serviço Java
                       Spring Boot
                       Docker
```

O frontend realiza as requisições ao backend Node.js, que centraliza o acesso às regras de negócio e à persistência de dados. Quando necessário, o backend poderá encaminhar operações ao serviço Java por meio de HTTP/REST, utilizando comunicação estruturada em JSON.

O PostgreSQL será utilizado para persistir os dados da aplicação, de acordo com as responsabilidades definidas para cada serviço.

A separação permite incorporar Java e Docker ao projeto sem reescrever toda a aplicação backend.

## Repositório do frontend

O frontend correspondente ao projeto está disponível em:

[pi4-TURMA-gN-frontend](https://github.com/Rnchx/pi4-TURMA-gN-frontend)

## Pré-requisitos

Antes de executar o projeto, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/)
- npm, normalmente instalado com o Node.js
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/) ou um ambiente de banco de dados acessível
- [Docker](https://www.docker.com/) para executar o serviço Java quando sua configuração estiver disponível
- JDK compatível com a versão do projeto, caso precise executar ou desenvolver o serviço Java fora do contêiner

## Como executar o backend Node.js

### 1. Clonar o repositório

```bash
git clone https://github.com/Rnchx/pi4-TURMA-gN-backend-1.git
```

Entre na pasta do projeto:

```bash
cd pi4-TURMA-gN-backend-1
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto, de acordo com as variáveis utilizadas pela aplicação.

Exemplo ilustrativo:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=safra
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

JAVA_SERVICE_URL=http://localhost:8080
```

**Importante:** os nomes acima são exemplos de configuração. Confirme no código do projeto quais variáveis são realmente utilizadas e quais são obrigatórias. Não envie o arquivo `.env` com credenciais para o Git.

### 4. Iniciar o servidor

Utilize o script configurado no `package.json`. Por exemplo, se houver um script `start`:

```bash
npm start
```

Se o projeto utilizar um script de desenvolvimento, como `dev`, execute:

```bash
npm run dev
```

A URL e a porta de execução dependerão das configurações da aplicação.

## Banco de dados

O PostgreSQL será utilizado como banco de dados relacional para armazenar as informações do sistema, de acordo com o modelo de dados definido durante o desenvolvimento.

Entre as informações que poderão ser persistidas estão:

- Produtos e categorias.
- Pedidos e respectivos itens.
- Quantidades e valores registrados nos pedidos.
- Método de pagamento selecionado e seu status simulado.
- Outras entidades necessárias às funcionalidades da aplicação.

O modelo definitivo, as tabelas e os relacionamentos devem acompanhar a implementação real do banco de dados.

### Boas práticas

- Manter credenciais fora do código-fonte.
- Validar os dados recebidos pela API.
- Calcular os valores dos pedidos no backend, utilizando os preços oficiais dos produtos.
- Garantir que os valores persistidos correspondam aos dados validados.
- Utilizar migrations ou outro mecanismo de versionamento do esquema, caso adotado pelo projeto.

## Serviço Java com Spring Boot e Docker

O projeto prevê um serviço complementar desenvolvido em Java com Spring Boot e executado em um contêiner Docker.

Esse serviço será independente do backend Node.js e se comunicará com ele por meio de requisições HTTP/REST, com troca de dados em JSON.

A integração deverá definir:

- A responsabilidade específica do serviço Java.
- Os endpoints disponibilizados.
- O formato das requisições e respostas.
- O endereço de comunicação entre os serviços.
- O tratamento de falhas e indisponibilidade.

A configuração de execução dependerá dos arquivos de build Java e Docker definidos pela equipe. Os comandos definitivos serão documentados quando essa estrutura estiver estabelecida.

## API e comunicação com o frontend

O backend disponibiliza a camada de comunicação utilizada pelo frontend do Safra 2.0.

As rotas deverão ser organizadas de acordo com os recursos da aplicação, mantendo separação entre endpoints, regras de negócio, acesso a dados e tratamento de erros, conforme a arquitetura adotada.

As operações de checkout deverão validar os dados no servidor, recalcular o valor total dos produtos e registrar o pedido de acordo com as regras definidas.

Os métodos de pagamento serão utilizados em caráter acadêmico. O sistema não deverá processar pagamentos reais nem solicitar dados financeiros verdadeiros.

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
