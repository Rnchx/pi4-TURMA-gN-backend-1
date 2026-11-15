# Substituir HTTP interno por TCP com JSON por linha

## Status

Aceito

## Decisão

O aplicativo continua usando HTTP com Node.js. Internamente, Node usa `node:net` como cliente e o Java usa `ServerSocket` como servidor. As mensagens são JSON UTF-8 delimitadas por LF, com identificador, operação, dados e resultado estruturado.

Spring Boot permanece para injeção, JDBC, transações e healthcheck, não como transporte das operações de negócio. A porta TCP não é publicada pelo Compose.

## Consequências

A arquitetura corresponde ao modelo cliente-servidor estudado e continua interoperável entre linguagens. Em contrapartida, enquadramento, timeout, concorrência, limites e desconexões passam a ser responsabilidades explícitas do projeto.
