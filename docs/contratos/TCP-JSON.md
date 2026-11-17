# Contrato TCP JSON — Node.js ↔ Java

O Node.js é o cliente TCP e o Java é o servidor em `confirmacao-java:3000`. A porta não é publicada pelo Docker Compose.

Cada comunicado é um objeto JSON UTF-8 terminado por `\n`. O receptor acumula fragmentos até a quebra de linha e processa separadamente várias mensagens recebidas no mesmo pacote TCP. O limite padrão é 32 KiB e o timeout é configurável.

Pedido:

```json
{"requestId":"uuid-ou-id","operacao":"cadastrarUsuario","dados":{}}
```

Sucesso:

```json
{"requestId":"uuid-ou-id","sucesso":true,"dados":{}}
```

Erro:

```json
{"requestId":"uuid-ou-id","sucesso":false,"dados":null,"codigo":"dadosInvalidos","mensagem":"Mensagem pública."}
```

Operações:

- `health`: percorre o protocolo e executa `SELECT 1` no PostgreSQL.
- `cadastrarUsuario`: recebe `nome`, `cpf`, `email`, `senha`, `confirmacaoSenha` e `dataNascimento`.
- `autenticarUsuario`: recebe `email` e `senha`; falhas usam mensagem genérica.
- `obterPerfil` e `atualizarPerfil`: calculam idade e permitem alterar somente o nome.
- `alterarSenha`: confere a senha atual, aplica a política e invalida sessões.
- `alterarFotoPerfil`: grava ou limpa somente a chave persistente validada da foto.
- `validarRestricaoEtaria`: consulta nascimento e idade mínima dos produtos no PostgreSQL.
- `excluirConta`: confirma a senha e executa a exclusão permanente com integridade referencial.
- `pedidoParaSair`: pedido administrativo de desligamento ordenado (ver abaixo). Não recebe resposta comum: o solicitante e todos os demais clientes ativos recebem o `ComunicadoDeDesligamento`.
- `confirmarCompra`: recebe referência idempotente, carrinho, usuário, método, subtotal, cupom opcional e itens; revalida o cupom na transação e devolve subtotal, cupom, desconto e total final.
- `validarCupom`: recebe usuário, carrinho e código; lê o subtotal do carrinho e devolve desconto e total ([CT26](CT26-validarCupom.md)).
- `listarHistoricoCompras`: recebe usuário e limite (máx. 3); devolve as compras mais recentes com itens ([CT24](CT24-listarHistoricoCompras.md)).
- `consultarCompra`: recebe usuário e compra; devolve a compra somente se pertencer ao usuário ([CT25](CT25-repetirCompra.md)).

| Operação | Entrada `dados` | Saída `dados` | Erros de negócio |
| --- | --- | --- | --- |
| `confirmarCompra` | `referencia`, `carrinhoId`, `usuarioId`, `metodoPagamento`, `quantidadeItens`, `subtotal`, `cupom`, `itens[]` | `confirmacaoId`, `compraId`, `metodoPagamento`, `mensagem`, `geradaEm`, `subtotal`, `cupom`, `desconto`, `total`, `criada` | `entradaInvalida`, `idempotenciaConflitante`, `restricaoEtaria`, `cupomInvalido`, `cupomIndisponivel`, `cupomJaUtilizado` |
| `validarCupom` | `usuarioId`, `carrinhoId`, `codigo` | `codigo`, `subtotal`, `desconto`, `total`, `mensagem` | `cupomInvalido`, `cupomIndisponivel`, `cupomJaUtilizado`, `carrinhoNaoEncontrado`, `confirmacaoNaoPermitida` |
| `listarHistoricoCompras` | `usuarioId`, `limite` | `compras[]` | `naoAutorizado`, `entradaInvalida` |
| `consultarCompra` | `usuarioId`, `compraId` | compra com `itens[]` | `compraNaoEncontrada` |

`cupomExpirado` fica reservado para cupons com validade, ainda não usados.

`requestId` aparece nos logs, mas CPF, senha, hash, token e o corpo completo nunca são registrados.

## Leitura e escrita

- Cada `Socket` aceito é associado a um `BufferedReader` (entrada) e a um `PrintWriter` (saída), ambos UTF-8.
- O `Parceiro` lê caractere a caractere do `BufferedReader` até o LF. Assim recusa linhas acima de `TCP_MAX_MESSAGE_BYTES` antes de acumulá-las, remonta fragmentos TCP e separa várias mensagens da mesma conexão.
- Linha vazia ou JSON inválido recebem `{"requestId":"desconhecido","sucesso":false,"codigo":"entradaInvalida",...}` e a conexão continua aberta.
- Linha acima do limite recebe o código `mensagemMuitoGrande` e a conexão é fechada.
- A escrita imprime o JSON e um LF no `PrintWriter`, faz flush e verifica `checkError()`. Ela é sincronizada, porque a supervisora (respostas) e a thread de desligamento (aviso) podem escrever no mesmo cliente.
- Não há `Serializable`, `ObjectInputStream`/`ObjectOutputStream` nem `DataInputStream`/`DataOutputStream`: tudo é texto.

## Desligamento (`PedidoParaSair` e `ComunicadoDeDesligamento`)

Pedido (somente pelo cliente administrativo `npm run java:shutdown`; não existe rota HTTP):

```json
{"requestId":"uuid","operacao":"pedidoParaSair","dados":{}}
```

Comunicado enviado a todos os clientes ativos, inclusive ao solicitante:

```json
{"tipo":"comunicadoDeDesligamento","mensagem":"O servidor será desligado.","requestId":"uuid do pedido (ou null em SIGTERM)","emitidoEm":"2026-11-17T12:00:00Z"}
```

O comunicado não tem o campo `sucesso`. O cliente TCP da API o reconhece pelo `tipo` e responde 503 `servicoValidacaoIndisponivel` à operação em andamento.

Sequência, executada uma única vez na thread `safra-desligamento`:
1. fecha o `ServerSocket` e bloqueia novos registros;
2. envia o comunicado aos parceiros registrados (`ConcurrentHashMap.newKeySet()`);
3. envia FIN e aguarda `TCP_SHUTDOWN_GRACE_MS`;
4. fecha os sockets, de modo que cada supervisora remove seu parceiro no `finally`;
5. encerra a aceitadora e aguarda o pool de supervisoras;
6. fecha o pool JDBC;
7. libera o `main`, e a JVM termina.

Como a sequência não roda dentro do pool de conexões, ela pode aguardar o pool terminar sem deadlock. Pedidos simultâneos e o SIGTERM (shutdown hook) chamam o mesmo método idempotente.

## Healthcheck

`VerificadorDeSaude` (`java -cp app.jar br.com.safra.confirmacao.tcp.VerificadorDeSaude`) conecta em `127.0.0.1:TCP_PORT` e envia `health` como string JSON. Ele sai com código 0 somente se a resposta tiver `sucesso: true` e o mesmo `requestId`. A operação `health` executa `SELECT 1` no PostgreSQL.

## Responsabilidades das classes

- `ConfirmacaoApplication`: lê a configuração, cria manualmente pool, serviços, processador e servidor, e registra o shutdown hook.
- `Servidor`: abre e fecha manualmente o `ServerSocket`, mantém o registro de parceiros ativos e executa o desligamento ordenado.
- `AceitadoraDeConexao` (`Runnable`): aceita sockets enquanto o servidor está ativo e os entrega ao pool limitado.
- `SupervisoraDeConexao` (`Runnable`): registra o parceiro, controla leitura, processamento, resposta e timeout, trata `PedidoParaSair` e, no `finally`, remove o parceiro e fecha o socket.
- `Parceiro`: socket com `BufferedReader` e `PrintWriter`; enquadramento por LF, UTF-8 e limite de bytes.
- `PedidoDeOperacao`, `PedidoDeResultado`, `Resultado`, `PedidoParaSair`, `ComunicadoDeDesligamento` e `Comunicado`: representam o protocolo (records convertidos em JSON).
- `ProcessadorDeOperacoes`: identifica a operação e chama a regra de domínio.
- `VerificadorDeSaude`: cliente de healthcheck pelo próprio protocolo.
