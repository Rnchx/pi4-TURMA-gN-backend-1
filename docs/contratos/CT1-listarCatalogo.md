# CT1: listarCatalogo

- **Atende:** E1, E10 e E12
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `GET /produtos`
- **Quem define:** API SAFRA

## Entrada

Não tem.

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| totalProdutos | inteiro | sim | `20` | No catálogo de demonstração é pelo menos 20. |
| produtos | lista de objeto | sim | `[{"produtoId":31,"nome":"Pão de forma","preco":5.50}]` | Contém somente produtos ativos. |
| produtos[].produtoId | inteiro | sim | `31` | Identificador positivo. |
| produtos[].nome | texto | sim | `Pão de forma` | Mesmo nome de CT2. |
| produtos[].imagemUrl | texto | sim | `https://exemplo.com/pao.jpg` | URL HTTPS da imagem. |
| produtos[].preco | decimal | sim | `5.50` | Reais, duas casas, valor não negativo. |
| produtos[].emOferta | booleano | sim | `true` | Indica oferta demonstrativa cadastrada localmente. |
| produtos[].precoAnterior | decimal | não | `6.90` | Obrigatório quando `emOferta` for verdadeiro e maior que `preco`. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 500 | Falha ao consultar o catálogo. | `{"codigo":"erroInterno","mensagem":"Não foi possível carregar o catálogo."}` |
