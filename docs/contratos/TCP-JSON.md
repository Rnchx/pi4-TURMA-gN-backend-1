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

## Responsabilidades das classes

- `Servidor`: abre/fecha o `ServerSocket` com o ciclo de vida do Spring.
- `AceitadoraDeConexao`: aceita sockets e os entrega ao pool limitado.
- `SupervisoraDeConexao`: controla timeout, leitura, processamento, resposta e encerramento de uma conexão.
- `Parceiro`: implementa enquadramento por LF, UTF-8 e limite de bytes.
- `PedidoDeOperacao`, `PedidoDeResultado`, `Resultado` e `Comunicado`: representam o protocolo.
- `ProcessadorDeOperacoes`: identifica a operação e chama a regra de domínio.
