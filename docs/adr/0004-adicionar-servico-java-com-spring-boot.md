# Adicionar serviço Java com Spring Boot ao backend

## Status
Aceito

## Contexto
O projeto Safra 2.0 possui um backend principal desenvolvido em Node.js com Express.js e utiliza PostgreSQL como banco de dados. Durante o desenvolvimento, foi estabelecido pelo professor o requisito de implementar um componente em Java utilizando Docker, permitindo que as demais partes do projeto utilizem tecnologias diferentes.

A migração completa do backend para Java aumentaria o esforço de desenvolvimento e exigiria reimplementar ou adaptar funcionalidades já existentes. Por isso, é necessário encontrar uma solução que atenda ao requisito acadêmico sem descartar o trabalho realizado.

## Decisão
Adicionar um serviço independente desenvolvido em Java com Spring Boot, executado em um contêiner Docker, mantendo o backend principal em Node.js com Express.js.

A comunicação entre os serviços será realizada por meio de uma API HTTP/REST, utilizando JSON para troca de dados. O backend Node.js poderá encaminhar requisições ao serviço Java quando precisar utilizar as funcionalidades disponibilizadas por ele.

O PostgreSQL será mantido como banco de dados do projeto. O acesso direto ao banco pelo serviço Java deverá ser definido conforme a responsabilidade atribuída a esse serviço, evitando duplicação de regras de negócio e inconsistências nos dados.

## Alternativas consideradas
- **Adicionar um serviço Java com Spring Boot:** permite atender ao requisito acadêmico e preservar o backend existente, estabelecendo uma comunicação entre os serviços.
- **Migrar todo o backend para Java:** unificaria a linguagem do backend, mas exigiria reimplementar ou adaptar as funcionalidades existentes, aumentando o esforço de desenvolvimento.
- **Manter exclusivamente Node.js com Express.js:** preservaria integralmente a arquitetura atual, mas não atenderia ao requisito de implementar um componente em Java.

## Consequências

### Positivas
- Atendimento ao requisito acadêmico de utilizar Java no projeto.
- Utilização do Docker para executar e isolar o serviço Java.
- Reaproveitamento do backend Node.js e das funcionalidades existentes.
- Manutenção do PostgreSQL como banco de dados.
- Separação das responsabilidades entre os serviços, permitindo evolução e testes independentes.

### Negativas
- Aumento da complexidade da arquitetura devido à manutenção de dois serviços.
- Necessidade de configurar e documentar a comunicação HTTP/REST entre Node.js e Java.
- Necessidade de tratar falhas de comunicação, tempos limite e indisponibilidade do serviço Java.
- Necessidade de manter configurações, dependências e procedimentos de execução para os dois ambientes tecnológicos.