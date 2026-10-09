# ADR 0002: Utilizar PostgreSQL como banco de dados

**Status:** aceito

**Contexto:**

O Safra 2.0 precisa persistir informações necessárias ao funcionamento do supermercado, incluindo produtos, categorias e dados relacionados às compras. O grupo definiu PostgreSQL como sistema gerenciador de banco de dados para o projeto. O modelo de dados e as regras de integridade deverão ser detalhados durante o desenvolvimento.

**Decisão:**

Utilizar PostgreSQL para armazenar e consultar os dados persistentes do Safra 2.0.

**Alternativas consideradas:**

- MongoDB: não foi escolhido porque o grupo definiu PostgreSQL para o projeto.
- MySQL: não foi escolhido porque o grupo definiu PostgreSQL como banco de dados.
- Armazenar os dados apenas em memória ou em arquivos locais: não foi escolhido porque essa abordagem não atende adequadamente à persistência centralizada esperada para o sistema.

**Consequências:**

- Positivas:
  - Oferece um banco de dados relacional para representar entidades e relacionamentos do domínio, como produtos, categorias e compras.
  - Permite utilizar restrições e transações para apoiar a integridade dos dados.
  - Oferece suporte a consultas SQL para recuperar e relacionar informações.

- Negativas:
  - A equipe precisará modelar o esquema, gerenciar alterações e manter as configurações de conexão.
  - O backend precisará tratar consultas, erros e transações de banco de dados adequadamente.
  - A execução e a entrega do projeto dependerão da disponibilidade e configuração do serviço PostgreSQL nos ambientes utilizados.
