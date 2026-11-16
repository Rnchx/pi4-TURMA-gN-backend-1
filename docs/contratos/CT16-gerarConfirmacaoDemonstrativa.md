# CT16: gerarConfirmacaoDemonstrativa

- **Atende:** E9 e E10
- **Fronteira:** API SAFRA em Node.js -> Serviço Java, TCP interno com JSON delimitado por `LF`
- **Operação:** `confirmarCompra`
- **Quem define:** Serviço de Confirmação em Java

O envelope, a correlação por `requestId`, os limites e os códigos de transporte estão definidos em [TCP-JSON.md](TCP-JSON.md). A porta TCP não é publicada no host.

Antes de gravar a compra, o Java relê do PostgreSQL a data de nascimento do usuário autenticado e a idade mínima dos produtos. A idade nunca é recebida do frontend.

Dentro da transação o Java: (1) adquire `pg_advisory_xact_lock` por usuário, serializando confirmações concorrentes da mesma conta; (2) aplica a idempotência — a mesma referência com os mesmos dados (inclusive o cupom) devolve a compra original sem revalidar o cupom; (3) revalida o cupom (CT26) e calcula `desconto = min(cupom, subtotal)` com `BigDecimal`; (4) grava `subtotal`, `cupom_codigo`, `desconto` e `total`. O índice único parcial `compras_primeira40_por_usuario` é a última barreira contra o uso duplo de `PRIMEIRA40`.

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| referencia | texto | sim | `confirmacao-9f3819dd-8e95-4fd5-a735-6ca8b80de8ad` | Chave de idempotência recebida em CT15. |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID do carrinho validado pela API. |
| usuarioId | texto | sim | `4be6b563-a11e-42ce-aa10-2c5a7a488f41` | UUID do usuário da sessão autenticada. |
| metodoPagamento | um de: pix, credito, debito, boleto | sim | `pix` | Método demonstrativo escolhido em CT15. |
| quantidadeItens | inteiro | sim | `3` | Maior que zero. |
| subtotal | decimal | sim | `14.00` | Soma dos itens calculada pela API SAFRA no banco; conferida com os itens. |
| cupom | texto ou nulo | não | `QUERO100` | Código a revalidar. Desconto e total final nunca são recebidos. |
| itens | lista de objeto | sim | `[{"produtoId":31,"nome":"Pão de forma","quantidade":2,"precoUnitario":5.50,"subtotal":11.00}]` | Lista não vazia e coerente com `quantidadeItens` e `subtotal`. |
| itens[].produtoId | inteiro | sim | `31` | Produto revalidado pela API SAFRA. |
| itens[].nome | texto | sim | `Pão de forma` | Nome apresentado na confirmação. |
| itens[].quantidade | inteiro | sim | `2` | Entre 1 e 99. |
| itens[].precoUnitario | decimal | sim | `5.50` | Preço revalidado em CT2. |
| itens[].subtotal | decimal | sim | `11.00` | `quantidade * precoUnitario`. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| confirmacaoId | texto | sim | `SAFRA-DEMO-6278CDDD` | Identificador demonstrativo estável para a referência. |
| compraId | texto | sim | `6278cddd-9295-4e04-88f7-966b02bef9ab` | UUID persistido em CT17. |
| metodoPagamento | texto | sim | `pix` | Método demonstrativo persistido com a compra. |
| mensagem | texto | sim | `Compra demonstrativa concluída.` | Não menciona pagamento aprovado. |
| geradaEm | data-hora | sim | `2026-10-12T19:00:00Z` | Momento da geração. |
| subtotal | decimal | sim | `14.00` | Valor original gravado. |
| cupom | texto ou nulo | sim | `QUERO100` | Cupom gravado. |
| desconto | decimal | sim | `14.00` | Desconto aplicado. |
| total | decimal | sim | `0.00` | Total final gravado. |
| criada | booleano | sim | `true` | `false` quando a mesma referência idempotente retorna a compra já existente. |

## Erros

| Código | Quando acontece | Resposta à API SAFRA |
| --- | --- | --- |
| 400 | Referência, carrinho, itens, quantidade ou total inválido. | `{"codigo":"entradaInvalida","mensagem":"Dados da confirmação inválidos."}` |
| 409 | Referência já usada com dados diferentes, ou carrinho já confirmado com outra referência. | `{"codigo":"idempotenciaConflitante","mensagem":"A referência já foi utilizada."}` |
| 400 | Cupom inexistente/inativo ou com caixa diferente. | `{"codigo":"cupomInvalido","mensagem":"Cupom inválido."}` |
| 409 | Cupom de primeira compra em conta com compras. | `{"codigo":"cupomIndisponivel",...}` |
| 409 | `PRIMEIRA40` já usado pela conta. | `{"codigo":"cupomJaUtilizado",...}` |
| 500 | Falha interna do serviço Java. | `{"codigo":"erroInterno","mensagem":"A confirmação não pôde ser gerada."}` |
| 503 | Banco SAFRA indisponível durante a transação. | `{"codigo":"bancoIndisponivel","mensagem":"A confirmação não pôde ser persistida."}` |
