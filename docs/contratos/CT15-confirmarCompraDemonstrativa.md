# CT15: confirmarCompraDemonstrativa

- **Atende:** E9 e E10
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `POST /carrinhos/{carrinhoId}/confirmacao-demonstrativa`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID em parâmetro de rota. |
| chaveIdempotencia | texto | sim | `confirmacao-9f3819dd-8e95-4fd5-a735-6ca8b80de8ad` | Única por tentativa lógica. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| compraId | texto | sim | `6278cddd-9295-4e04-88f7-966b02bef9ab` | UUID da compra demonstrativa. |
| confirmacaoId | texto | sim | `SAFRA-DEMO-6278CDDD` | Identificador gerado por CT16. |
| status | um de: concluida_demonstrativa | sim | `concluida_demonstrativa` | Não representa pagamento ou pedido real. |
| itens | lista de objeto | sim | `[{"produtoId":31,"quantidade":2,"subtotal":11.00}]` | Cópia imutável do resumo confirmado. |
| total | decimal | sim | `14.00` | Total confirmado. |
| mensagem | texto | sim | `Compra demonstrativa concluída. Nenhuma cobrança foi realizada.` | Sempre informa o caráter demonstrativo. |
| criadaEm | data-hora | sim | `2026-10-12T19:00:00Z` | Momento da confirmação. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | UUID ou chave inválida. | `{"codigo":"entradaInvalida","mensagem":"Revise os dados da confirmação."}` |
| 404 | Carrinho não existe. | `{"codigo":"carrinhoNaoEncontrado","mensagem":"Carrinho não encontrado."}` |
| 409 | Carrinho vazio, fechado ou chave reaproveitada com dados diferentes. | `{"codigo":"confirmacaoNaoPermitida","mensagem":"O carrinho não pode ser confirmado."}` |
| 503 | Serviço de Confirmação indisponível. | `{"codigo":"confirmacaoIndisponivel","mensagem":"Tente novamente mais tarde."}` |
| 500 | Falha ao registrar. | `{"codigo":"erroInterno","mensagem":"Não foi possível concluir a compra demonstrativa."}` |
