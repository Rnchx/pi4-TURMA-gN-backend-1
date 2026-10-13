# CT4: categorias

- **Atende:** E2
- **Fronteira:** API SAFRA -> Banco SAFRA, SQL
- **Estrutura:** tabela `categorias`
- **Quem define:** API SAFRA, que lê e grava a tabela

## Entrada

Os campos gravados são os mesmos campos lidos.

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| id | inteiro | sim | `1` | Chave primária. |
| nome | texto | sim | `Padaria` | Único, entre 1 e 150 caracteres. |
| ativo | booleano | sim | `true` | Apenas categorias ativas aparecem. |

## Saída

Os campos lidos são os mesmos campos da entrada.

## Erros

| Código | Quando acontece | Tratamento |
| --- | --- | --- |
| unique_violation | Nome de categoria repetido. | Rejeitar a gravação como conflito. |
| connection_error | Banco indisponível. | A API devolve erro interno. |
