# CT7: consultarProduto

- **Atende:** E3, E10 e E12
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `GET /produtos/{produtoId}`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| produtoId | inteiro | sim | `31` | Parâmetro de rota, maior que zero. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| produtoId | inteiro | sim | `31` | Mesmo identificador do catálogo. |
| nome | texto | sim | `Pão de forma` | Igual a CT2. |
| imagemUrl | texto | sim | `https://exemplo.com/pao.jpg` | Igual a CT2. |
| descricao | texto | sim | `Pacote de 400 g` | Igual a CT2. |
| preco | decimal | sim | `5.50` | Igual a CT2. |
| emOferta | booleano | sim | `true` | Igual a `em_oferta` de CT2. |
| precoAnterior | decimal | não | `6.90` | Igual a `preco_anterior` de CT2; presente em oferta. |
| categoriaId | inteiro | sim | `1` | Categoria atual. |
| subcategoriaId | inteiro | sim | `4` | Subcategoria atual. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | `produtoId` não é inteiro positivo. | `{"codigo":"produtoIdInvalido","mensagem":"Informe um produto válido."}` |
| 404 | Produto não existe ou está inativo. | `{"codigo":"produtoNaoEncontrado","mensagem":"Produto não encontrado."}` |
| 500 | Falha na consulta. | `{"codigo":"erroInterno","mensagem":"Não foi possível consultar o produto."}` |
