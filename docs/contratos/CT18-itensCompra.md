# CT18: itensCompra

- **Atende:** E9 e E10
- **Fronteira:** Serviço de Confirmação em Java -> Banco SAFRA, SQL transacional
- **Estrutura:** tabela `itens_compra`
- **Quem define:** Serviço de Confirmação em Java, que lê e grava a tabela

## Entrada

Os campos gravados são os mesmos campos lidos.

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| id | inteiro | sim | `201` | Chave primária gerada pelo banco. |
| compra_id | texto | sim | `6278cddd-9295-4e04-88f7-966b02bef9ab` | Chave estrangeira para `compras_demonstrativas.id`. |
| produto_id | inteiro | sim | `31` | Produto confirmado. |
| nome_produto | texto | sim | `Pão de forma` | Cópia do nome exibido. |
| quantidade | inteiro | sim | `2` | Entre 1 e 99. |
| preco_unitario | decimal | sim | `5.50` | Preço do carrinho confirmado. |
| subtotal | decimal | sim | `11.00` | `quantidade * preco_unitario`. |

## Saída

Os campos lidos são os mesmos campos da entrada.

## Erros

| Código | Quando acontece | Tratamento |
| --- | --- | --- |
| foreign_key_violation | Compra ou produto não existe. | Reverter toda a confirmação. |
| check_violation | Quantidade, preço ou subtotal inválido. | Reverter toda a confirmação. |
| connection_error | Banco indisponível. | O serviço Java reverte a transação e devolve erro em CT16. |
