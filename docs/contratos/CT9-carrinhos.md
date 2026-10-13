# CT9: carrinhos

- **Atende:** E4, E5, E6, E7, E8, E9, E10 e E11
- **Fronteira:** API SAFRA -> Banco SAFRA, SQL
- **Estrutura:** tabela `carrinhos`
- **Quem define:** API SAFRA, que lê e grava a tabela

## Entrada

Os campos gravados são os mesmos campos lidos.

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| id | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | Chave primária UUID. |
| status | um de: aberto, confirmado | sim | `aberto` | Somente aberto pode ser alterado. |
| criado_em | data-hora | sim | `2026-10-12T18:00:00Z` | Gerado na criação. |
| atualizado_em | data-hora | sim | `2026-10-12T18:10:00Z` | Atualizado em toda mudança. |

## Saída

Os campos lidos são os mesmos campos da entrada.

## Erros

| Código | Quando acontece | Tratamento |
| --- | --- | --- |
| check_violation | Status fora da lista. | Reverter a alteração. |
| connection_error | Banco indisponível. | A API devolve erro interno. |
