# CT17: comprasDemonstrativas

- **Atende:** E9 e E10
- **Fronteira:** Serviço de Confirmação em Java -> Banco SAFRA, SQL transacional
- **Estrutura:** tabela `compras_demonstrativas`
- **Quem define:** Serviço de Confirmação em Java, que lê e grava a tabela

## Entrada

Os campos gravados são os mesmos campos lidos.

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| id | texto | sim | `6278cddd-9295-4e04-88f7-966b02bef9ab` | Chave primária UUID. |
| carrinho_id | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | Chave estrangeira única para `carrinhos.id`. |
| chave_idempotencia | texto | sim | `confirmacao-9f3819dd-8e95-4fd5-a735-6ca8b80de8ad` | Valor único. |
| confirmacao_id | texto | sim | `SAFRA-DEMO-6278CDDD` | Valor retornado por CT16. |
| status | um de: concluida_demonstrativa | sim | `concluida_demonstrativa` | Único estado desta entrega. |
| total | decimal | sim | `14.00` | Total confirmado. |
| criada_em | data-hora | sim | `2026-10-12T19:00:00Z` | Momento da criação. |

## Saída

Os campos lidos são os mesmos campos da entrada.

## Erros

| Código | Quando acontece | Tratamento |
| --- | --- | --- |
| unique_violation | Carrinho, chave ou confirmação já registrados. | Devolver a compra original quando os dados forem iguais. |
| foreign_key_violation | Carrinho não existe. | Reverter a transação. |
| check_violation | Total negativo ou status inválido. | Reverter a transação. |
| connection_error | Banco indisponível. | O serviço Java reverte a transação e devolve erro em CT16. |
