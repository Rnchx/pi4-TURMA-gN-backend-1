# CT13: removerItemDoCarrinho

- **Atende:** E6
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `DELETE /carrinhos/{carrinhoId}/itens/{produtoId}`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID em parâmetro de rota. |
| produtoId | inteiro | sim | `31` | Item existente no carrinho. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | Carrinho alterado. |
| removido | booleano | sim | `true` | Confirma a remoção. |
| itens | lista de objeto | sim | `[]` | Estado restante do carrinho. |
| total | decimal | sim | `0.00` | Total após remoção. |
| carrinhoVazio | booleano | sim | `true` | Controla a mensagem e o retorno ao catálogo. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | Identificador inválido. | `{"codigo":"entradaInvalida","mensagem":"Informe carrinho e produto válidos."}` |
| 404 | Carrinho ou item não existe. | `{"codigo":"itemNaoEncontrado","mensagem":"Item do carrinho não encontrado."}` |
| 409 | Carrinho já foi confirmado. | `{"codigo":"carrinhoFechado","mensagem":"O carrinho não pode ser alterado."}` |
| 500 | Falha na remoção. | `{"codigo":"erroInterno","mensagem":"Não foi possível remover o item."}` |
