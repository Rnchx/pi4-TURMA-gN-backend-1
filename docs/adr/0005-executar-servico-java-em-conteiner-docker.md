# Executar o serviço Java em contêiner Docker

## Status
Aceito

## Contexto
O professor exige que um componente do backend seja desenvolvido em Java e executado com Docker. Como o backend principal do Safra 2.0 utiliza Node.js com Express.js, a equipe decidiu adicionar um serviço Java independente, evitando a migração completa da aplicação.

## Decisão
Criar uma imagem Docker para o serviço Java desenvolvido com Spring Boot e executar a aplicação em um contêiner.

A configuração deverá definir as portas necessárias, as variáveis de ambiente e a conectividade com os demais serviços. Quando necessário, Docker Compose poderá ser utilizado para facilitar a execução conjunta do backend Node.js, do serviço Java e do PostgreSQL.

A comunicação entre Node.js e Java será realizada por HTTP/REST. O Docker será responsável por empacotar e executar o serviço Java, não sendo utilizado como substituto da linguagem ou do framework da aplicação.

## Alternativas consideradas
- **Executar o serviço Java em Docker:** atende ao requisito acadêmico e permite reproduzir o ambiente de execução.
- **Executar Java diretamente na máquina, sem Docker:** não atende à exigência de utilizar contêineres.
- **Migrar todo o backend para Java e contêinerizar a aplicação:** também seria possível, mas aumentaria o escopo da mudança sem ser necessário para o requisito informado.

## Consequências

### Positivas
- Atendimento à exigência de utilizar Docker com o componente Java.
- Maior consistência do ambiente de execução entre os integrantes da equipe.
- Facilidade para iniciar e configurar os serviços em conjunto com Docker Compose, caso adotado.

### Negativas
- Necessidade de criar e manter um Dockerfile e as configurações de execução.
- Necessidade de configurar corretamente portas, rede e variáveis de ambiente.
- A depuração poderá exigir a análise dos logs da aplicação e do contêiner.