# CT10: itensCarrinho

- **Atende:** E4, E5, E6, E7, E8, E9, E10 e E11
- **Fronteira:** API SAFRA -> Banco SAFRA, SQL
- **Estrutura:** tabela `itens_carrinho`
- **Quem define:** API SAFRA, que lê e grava a tabela

## Entrada

Os campos gravados são os mesmos campos lidos.

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| id | inteiro | sim | `81` | Chave primária gerada pelo banco. |
| carrinho_id | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | Chave estrangeira para `carrinhos.id`. |
| produto_id | inteiro | sim | `31` | Chave estrangeira para `produtos.id`. |
| quantidade | inteiro | sim | `2` | Entre 1 e 99. |
| preco_unitario | decimal | sim | `5.50` | Preço validado no momento da adição. |

## Saída

Os campos lidos são os mesmos campos da entrada. Subtotal é calculado como `quantidade * preco_unitario` e não é armazenado.

## Erros

| Código | Quando acontece | Tratamento |
| --- | --- | --- |
| foreign_key_violation | Carrinho ou produto não existe. | Reverter a transação. |
| unique_violation | O produto já possui linha no carrinho. | Atualizar a quantidade da linha existente. |
| check_violation | Quantidade menor que 1 ou preço negativo. | Reverter a transação. |
| connection_error | Banco indisponível. | A API devolve erro interno. |
