# Servidor Java Maven convencional, sem Spring, com desligamento ordenado

## Status

Aceito. Substitui a parte das ADRs 0004 e 0006 que mantinha Spring Boot no serviço Java.

## Contexto

Orientações confirmadas com o professor:

- O servidor de socket deve ser desenvolvido em Java, e o cliente TCP pode ficar embutido no Node.js.
- As mensagens podem ser strings JSON; serialização nativa (`Serializable`, Object Streams) não é obrigatória.
- O socket deve estar associado a `BufferedReader` e `PrintWriter`.
- O desligamento deve ser ordenado, com `PedidoParaSair` e `ComunicadoDeDesligamento`, avisando os clientes conectados.
- Spring Boot não é necessário; o projeto deve ser Java Maven convencional. Docker é opcional e não é o servidor.

## Decisão

- Remover Spring Boot e Spring Framework do módulo `services/confirmacao-java`.
  - A classe principal cria as dependências manualmente, por construtores explícitos.
  - O acesso ao banco passa a ser JDBC explícito (`PreparedStatement`, try-with-resources, transações com rollback) com pool HikariCP.
  - As senhas continuam em Argon2id, com BouncyCastle, no mesmo formato já gravado.
- Gerar um JAR executável com Maven (`target/confirmacao-java.jar`).
- Associar cada socket a `BufferedReader`/`PrintWriter` em UTF-8 e trocar strings JSON delimitadas por LF. Jackson apenas converte objetos em texto.
- Manter `AceitadoraDeConexao` e `SupervisoraDeConexao` como `Runnable` em `ExecutorService`.
- Implementar o desligamento:
  1. o `PedidoParaSair` é tratado em uma thread dedicada;
  2. o `ServerSocket` é fechado;
  3. o `ComunicadoDeDesligamento` vai a todos os parceiros ativos, registrados em uma coleção concorrente;
  4. sockets, executores e o pool são fechados.
  O mesmo fluxo atende SIGTERM, pelo shutdown hook.
- O pedido de desligamento é emitido somente pelo cliente administrativo interno `npm run java:shutdown`, sem rota HTTP.
- Trocar o healthcheck HTTP (Actuator) por `VerificadorDeSaude`, que usa o próprio protocolo TCP. No Compose, o Java usa `restart: on-failure`, para continuar parado após um desligamento ordenado.

Nesta etapa a persistência e as regras de negócio continuam no Java. A redistribuição entre Java e Node fica para uma etapa posterior.

## Consequências

- O servidor corresponde ao modelo ensinado: `ServerSocket` manual, Parceiro com Reader/Writer, threads supervisoras e protocolo de saída.
- Desaparecem o servidor HTTP interno, o Actuator e a dependência de um container de injeção.
- Em contrapartida, ciclo de vida, transações e conversão de erros SQL passam a ser código explícito do projeto, coberto por testes.
