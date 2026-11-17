# Substituir HTTP interno por TCP com JSON por linha

## Status

Aceito

## Decisão

O aplicativo continua usando HTTP com Node.js. Internamente, Node usa `node:net` como cliente e o Java usa `ServerSocket` como servidor. As mensagens são JSON UTF-8 delimitadas por LF, com identificador, operação, dados e resultado estruturado.

A porta TCP não é publicada pelo Compose. (Atualização: a ADR 0007 removeu o Spring Boot. Injeção, JDBC, transações e healthcheck passaram a ser código Java explícito.)

## Consequências

A arquitetura corresponde ao modelo cliente-servidor estudado e continua interoperável entre linguagens. Em contrapartida, enquadramento, timeout, concorrência, limites e desconexões passam a ser responsabilidades explícitas do projeto.
