# CT6: listarProdutosPorClassificacao

- **Atende:** E2
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `GET /categorias/{categoriaId}/subcategorias/{subcategoriaId}/produtos`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| categoriaId | inteiro | sim | `1` | Parâmetro de rota, maior que zero. |
| subcategoriaId | inteiro | sim | `4` | Deve pertencer à categoria informada. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| categoriaId | inteiro | sim | `1` | Categoria aplicada. |
| subcategoriaId | inteiro | sim | `4` | Subcategoria aplicada. |
| produtos | lista de objeto | sim | `[{"produtoId":31,"nome":"Pão de forma","preco":5.50}]` | Somente produtos correspondentes e ativos. |
| produtos[].produtoId | inteiro | sim | `31` | Mesmo identificador de CT2. |
| produtos[].nome | texto | sim | `Pão de forma` | Mesmo nome de CT2. |
| produtos[].imagemUrl | texto | sim | `https://exemplo.com/pao.jpg` | URL HTTPS. |
| produtos[].preco | decimal | sim | `5.50` | Mesmo preço de CT2. |
| produtos[].emOferta | booleano | sim | `true` | Mesmo indicador de CT2. |
| produtos[].precoAnterior | decimal | não | `6.90` | Presente quando `emOferta` for verdadeiro. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | Identificador inválido ou relação incompatível. | `{"codigo":"classificacaoInvalida","mensagem":"Informe categoria e subcategoria compatíveis."}` |
| 404 | Categoria ou subcategoria não existe. | `{"codigo":"classificacaoNaoEncontrada","mensagem":"Categoria ou subcategoria não encontrada."}` |
| 500 | Falha na consulta. | `{"codigo":"erroInterno","mensagem":"Não foi possível filtrar os produtos."}` |
