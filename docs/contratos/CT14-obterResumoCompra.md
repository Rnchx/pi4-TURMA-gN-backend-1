# CT14: obterResumoCompra

- **Atende:** E8
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `GET /carrinhos/{carrinhoId}/resumo`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID em parâmetro de rota. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | Carrinho resumido. |
| itens | lista de objeto | sim | `[{"produtoId":31,"quantidade":2,"subtotal":11.00}]` | Mesmo conteúdo lógico de CT11. |
| itens[].produtoId | inteiro | sim | `31` | Produto do carrinho. |
| itens[].nome | texto | sim | `Pão de forma` | Nome exibido. |
| itens[].quantidade | inteiro | sim | `2` | Quantidade atual. |
| itens[].precoUnitario | decimal | sim | `5.50` | Preço do carrinho. |
| itens[].subtotal | decimal | sim | `11.00` | Quantidade vezes preço. |
| total | decimal | sim | `14.00` | Soma dos subtotais. |
| podeConfirmar | booleano | sim | `true` | `false` quando o carrinho está vazio ou fechado. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | UUID inválido. | `{"codigo":"carrinhoIdInvalido","mensagem":"Informe um carrinho válido."}` |
| 404 | Carrinho não existe. | `{"codigo":"carrinhoNaoEncontrado","mensagem":"Carrinho não encontrado."}` |
| 500 | Falha ao gerar o resumo. | `{"codigo":"erroInterno","mensagem":"Não foi possível gerar o resumo."}` |
