# CT11: consultarCarrinho

- **Atende:** E4, E7 e E10
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `GET /carrinhos/{carrinhoId}`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID em parâmetro de rota. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | Carrinho consultado. |
| status | um de: aberto, confirmado | sim | `aberto` | Estado atual. |
| itens | lista de objeto | sim | `[{"produtoId":31,"quantidade":2,"subtotal":11.00}]` | Pode ser lista vazia. |
| itens[].produtoId | inteiro | sim | `31` | Mesmo identificador de CT2. |
| itens[].nome | texto | sim | `Pão de forma` | Nome atual. |
| itens[].quantidade | inteiro | sim | `2` | Entre 1 e 99. |
| itens[].precoUnitario | decimal | sim | `5.50` | Mesmo valor persistido em CT10. |
| itens[].subtotal | decimal | sim | `11.00` | Calculado sem erro de centavos. |
| total | decimal | sim | `14.00` | Soma dos subtotais; zero quando vazio. |
| carrinhoVazio | booleano | sim | `false` | `true` quando `itens` está vazio. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | UUID inválido. | `{"codigo":"carrinhoIdInvalido","mensagem":"Informe um carrinho válido."}` |
| 404 | Carrinho não existe. | `{"codigo":"carrinhoNaoEncontrado","mensagem":"Carrinho não encontrado."}` |
| 500 | Falha na consulta ou cálculo. | `{"codigo":"erroInterno","mensagem":"Não foi possível consultar o carrinho."}` |
