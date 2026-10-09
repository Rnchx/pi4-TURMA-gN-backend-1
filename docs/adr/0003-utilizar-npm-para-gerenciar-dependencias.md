# ADR 0003: Utilizar npm para gerenciar dependências do backend

**Status:** aceito

**Contexto:**

O backend do Safra 2.0 será desenvolvido com Node.js e Express.js e precisará utilizar bibliotecas externas para implementar e executar suas funcionalidades. O grupo definiu npm como gerenciador de pacotes do backend. É necessário manter as dependências declaradas no projeto para facilitar a instalação e a execução em diferentes ambientes de desenvolvimento.

**Decisão:**

Utilizar npm para gerenciar as dependências e os scripts de execução do backend, mantendo as configurações correspondentes versionadas no repositório.

**Alternativas consideradas:**

- Yarn: não foi escolhido porque o grupo definiu npm para o projeto.
- pnpm: não foi escolhido porque o grupo definiu npm para o projeto.
- Instalar dependências manualmente sem um gerenciador de pacotes: não foi escolhido porque dificultaria a reprodução do ambiente e o controle das dependências.

**Consequências:**

- Positivas:
  - Centraliza a declaração de dependências no arquivo `package.json`.
  - Permite padronizar scripts para executar tarefas comuns do backend.
  - O arquivo de lock do npm ajuda a reproduzir versões de dependências entre ambientes.

- Negativas:
  - A equipe precisará revisar e atualizar dependências, considerando compatibilidade e segurança.
  - Instalações podem exigir resolução de conflitos entre versões de pacotes.
  - O projeto precisará manter o arquivo de lock versionado e usar procedimentos consistentes de instalação.
