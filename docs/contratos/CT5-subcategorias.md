# CT5: subcategorias

- **Atende:** E2
- **Fronteira:** API SAFRA -> Banco SAFRA, SQL
- **Estrutura:** tabela `subcategorias`
- **Quem define:** API SAFRA, que lê e grava a tabela

## Entrada

Os campos gravados são os mesmos campos lidos.

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| id | inteiro | sim | `4` | Chave primária. |
| categoria_id | inteiro | sim | `1` | Chave estrangeira para `categorias.id`. |
| nome | texto | sim | `Pães` | Único dentro da categoria. |
| ativo | booleano | sim | `true` | Apenas subcategorias ativas aparecem. |

## Saída

Os campos lidos são os mesmos campos da entrada.

## Erros

| Código | Quando acontece | Tratamento |
| --- | --- | --- |
| foreign_key_violation | Categoria não existe. | Reverter a gravação. |
| unique_violation | Nome repetido na mesma categoria. | Rejeitar como conflito. |
| connection_error | Banco indisponível. | A API devolve erro interno. |
