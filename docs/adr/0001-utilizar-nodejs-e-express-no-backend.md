# ADR 0001: Utilizar Node.js e Express.js no backend

**Status:** aceito

**Contexto:**

O Safra 2.0 precisa de um backend para disponibilizar os dados e as operações utilizadas pelo aplicativo, como consulta de categorias e produtos e gerenciamento das operações relacionadas ao carrinho e à compra. O grupo definiu Node.js como ambiente de execução e Express.js como framework para construir o servidor. A organização das rotas, validações e regras de negócio deverá acompanhar a evolução dos requisitos.

**Decisão:**

Desenvolver o backend do Safra 2.0 utilizando Node.js e Express.js.

**Alternativas consideradas:**

- Implementar o backend em outra linguagem e framework, como Java com Spring Boot: não foi escolhido porque o grupo definiu Node.js para este projeto.
- Utilizar Node.js com outro framework web: não foi escolhido porque o grupo definiu Express.js como framework do servidor.
- Implementar toda a lógica de negócio diretamente no aplicativo móvel: não foi escolhido porque separar o backend permite centralizar regras e operações fora do frontend.

**Consequências:**

- Positivas:
  - Permite implementar endpoints HTTP para atender às necessidades do aplicativo.
  - Favorece o uso de JavaScript no backend, linguagem que também faz parte do ecossistema do frontend.
  - Mantém as regras de negócio e o acesso aos dados no servidor, em vez de depender exclusivamente do aplicativo móvel.

- Negativas:
  - A equipe precisará definir e manter padrões para rotas, validação de entradas, tratamento de erros e organização do código.
  - A aplicação dependerá de configuração e manutenção do ambiente Node.js e das dependências npm.
  - Segurança, autenticação, autorização e proteção dos endpoints precisarão ser planejadas e implementadas conforme os requisitos.
