# CT15: confirmarCompraDemonstrativa

- **Atende:** E9 e E10
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `POST /carrinhos/{carrinhoId}/confirmacao-demonstrativa`
- **Autenticação:** `Authorization: Bearer <token-de-sessão>`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID em parâmetro de rota. |
| chaveIdempotencia | texto | sim | `confirmacao-9f3819dd-8e95-4fd5-a735-6ca8b80de8ad` | Única por tentativa lógica. Reenviar a mesma chave para o mesmo carrinho devolve a compra original (200), sem criar outra; a primeira confirmação responde 201. |
| metodoPagamento | um de: pix, credito, debito, boleto | sim | `pix` | Método apenas demonstrativo; dados financeiros nunca são recebidos. |
| cupom | texto ou nulo | não | `PRIMEIRA40` | Código digitado (1–30 letras/números). Revalidado pelo Java dentro da transação (CT16). `subtotal`, `desconto` e `total` enviados pelo aplicativo são recusados (400). |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| compraId | texto | sim | `6278cddd-9295-4e04-88f7-966b02bef9ab` | UUID da compra demonstrativa. |
| confirmacaoId | texto | sim | `SAFRA-DEMO-6278CDDD` | Identificador gerado por CT16. |
| status | um de: concluida_demonstrativa | sim | `concluida_demonstrativa` | Não representa pagamento ou pedido real. |
| itens | lista de objeto | sim | `[{"produtoId":31,"quantidade":2,"subtotal":11.00}]` | Cópia imutável do resumo confirmado. |
| subtotal | decimal | sim | `14.00` | Soma dos itens, antes do desconto. |
| cupom | texto ou nulo | sim | `QUERO100` | Cupom aplicado ou `null`. |
| desconto | decimal | sim | `14.00` | Calculado pelo Java; limitado ao subtotal. |
| total | decimal | sim | `0.00` | Total final gravado (`subtotal - desconto`), nunca negativo. |
| metodoPagamento | texto | sim | `pix` | Método fictício escolhido pelo usuário. |
| usuario | objeto | sim | `{"id":"...","nome":"Ana Souza","email":"ana@gmail.com"}` | Identidade da sessão autenticada que confirmou a compra. |
| mensagem | texto | sim | `Compra demonstrativa concluída. Nenhuma cobrança foi realizada.` | Sempre informa o caráter demonstrativo. |
| criadaEm | data-hora | sim | `2026-10-12T19:00:00Z` | Momento da confirmação. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | UUID ou chave inválida. | `{"codigo":"entradaInvalida","mensagem":"Revise os dados da confirmação."}` |
| 401 | Token ausente, inválido, revogado ou expirado. | `{"codigo":"naoAutorizado","mensagem":"Faça login para continuar."}` |
| 403 | Usuário menor de 18 anos ou conta legada sem nascimento tenta confirmar produto restrito. | `{"codigo":"restricaoEtaria","mensagem":"Este produto é permitido somente para consumidores com 18 anos ou mais."}` |
| 404 | Carrinho não existe. | `{"codigo":"carrinhoNaoEncontrado","mensagem":"Carrinho não encontrado."}` |
| 409 | Carrinho vazio, fechado por outra confirmação ou chave reaproveitada com dados diferentes. | `{"codigo":"confirmacaoNaoPermitida","mensagem":"O carrinho não pode ser confirmado."}` |
| 400 | Cupom inexistente ou com maiúsculas/minúsculas diferentes. | `{"codigo":"cupomInvalido","mensagem":"Cupom inválido."}` |
| 409 | `PRIMEIRA40` após a primeira compra, ou consumido por confirmação concorrente da mesma conta. O carrinho continua aberto. | `{"codigo":"cupomJaUtilizado"}` ou `{"codigo":"cupomIndisponivel"}` |
| 503 | Serviço de Confirmação indisponível. | `{"codigo":"confirmacaoIndisponivel","mensagem":"Tente novamente mais tarde."}` |
| 500 | Falha ao registrar. | `{"codigo":"erroInterno","mensagem":"Não foi possível concluir a compra demonstrativa."}` |
