# CT12: alterarQuantidadeItem

- **Atende:** E5 e E7
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `PATCH /carrinhos/{carrinhoId}/itens/{produtoId}`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID em parâmetro de rota. |
| produtoId | inteiro | sim | `31` | Item existente no carrinho. |
| quantidade | inteiro | sim | `1` | Entre 1 e 99; nunca negativa ou zero. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | Carrinho alterado. |
| produtoId | inteiro | sim | `31` | Produto alterado. |
| quantidade | inteiro | sim | `1` | Nova quantidade. |
| precoUnitario | decimal | sim | `5.50` | Preço persistido no carrinho. |
| subtotal | decimal | sim | `5.50` | `quantidade * precoUnitario`. |
| total | decimal | sim | `8.50` | Total completo recalculado. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | Quantidade menor que 1, maior que 99 ou identificador inválido. | `{"codigo":"quantidadeInvalida","mensagem":"A quantidade deve estar entre 1 e 99."}` |
| 404 | Carrinho ou item não existe. | `{"codigo":"itemNaoEncontrado","mensagem":"Item do carrinho não encontrado."}` |
| 409 | Carrinho já foi confirmado. | `{"codigo":"carrinhoFechado","mensagem":"O carrinho não pode ser alterado."}` |
| 500 | Falha ao atualizar ou calcular. | `{"codigo":"erroInterno","mensagem":"Não foi possível alterar a quantidade."}` |
