# CT8: adicionarItemAoCarrinho

- **Atende:** E4 e E11
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `POST /carrinhos/itens`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | não | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID; ausência cria carrinho de visitante. |
| produtoId | inteiro | sim | `31` | Produto ativo. |
| quantidade | inteiro | sim | `1` | Entre 1 e 99. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID criado ou informado. |
| mensagem | texto | sim | `Produto adicionado ao carrinho.` | Confirmação compreensível. |
| item.produtoId | inteiro | sim | `31` | Produto adicionado. |
| item.quantidade | inteiro | sim | `1` | Quantidade acumulada, sem linha duplicada. |
| item.precoUnitario | decimal | sim | `5.50` | Preço validado em CT2. |
| item.subtotal | decimal | sim | `5.50` | `quantidade * precoUnitario`. |
| total | decimal | sim | `5.50` | Soma do carrinho. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | Identificador ou quantidade inválida. | `{"codigo":"entradaInvalida","mensagem":"Revise o produto e a quantidade."}` |
| 404 | Carrinho ou produto não existe. | `{"codigo":"recursoNaoEncontrado","mensagem":"Carrinho ou produto não encontrado."}` |
| 409 | Carrinho já foi confirmado. | `{"codigo":"carrinhoFechado","mensagem":"O carrinho não pode ser alterado."}` |
| 500 | Falha ao persistir. | `{"codigo":"erroInterno","mensagem":"Não foi possível adicionar o produto."}` |
