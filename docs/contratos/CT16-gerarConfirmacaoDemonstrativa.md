# CT16: gerarConfirmacaoDemonstrativa

- **Atende:** E9 e E10
- **Fronteira:** API SAFRA em Node.js -> Serviço de Confirmação em Java/Spring Boot, HTTP/JSON interno
- **Operação:** `POST /confirmacoes-demonstrativas`
- **Quem define:** Serviço de Confirmação em Java

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| referencia | texto | sim | `confirmacao-9f3819dd-8e95-4fd5-a735-6ca8b80de8ad` | Chave de idempotência recebida em CT15. |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID do carrinho validado pela API. |
| quantidadeItens | inteiro | sim | `3` | Maior que zero. |
| total | decimal | sim | `14.00` | Total calculado pela API SAFRA. |
| itens | lista de objeto | sim | `[{"produtoId":31,"nome":"Pão de forma","quantidade":2,"precoUnitario":5.50,"subtotal":11.00}]` | Lista não vazia e coerente com `quantidadeItens` e `total`. |
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
| mensagem | texto | sim | `Compra demonstrativa concluída.` | Não menciona pagamento aprovado. |
| geradaEm | data-hora | sim | `2026-10-12T19:00:00Z` | Momento da geração. |

## Erros

| Código | Quando acontece | Resposta à API SAFRA |
| --- | --- | --- |
| 400 | Referência, carrinho, itens, quantidade ou total inválido. | `{"codigo":"entradaInvalida","mensagem":"Dados da confirmação inválidos."}` |
| 409 | Referência já usada com dados diferentes. | `{"codigo":"idempotenciaConflitante","mensagem":"A referência já foi utilizada."}` |
| 500 | Falha interna do serviço Java. | `{"codigo":"erroInterno","mensagem":"A confirmação não pôde ser gerada."}` |
| 503 | Banco SAFRA indisponível durante a transação. | `{"codigo":"bancoIndisponivel","mensagem":"A confirmação não pôde ser persistida."}` |
