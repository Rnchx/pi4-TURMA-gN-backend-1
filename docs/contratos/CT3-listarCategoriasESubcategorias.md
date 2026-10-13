# CT3: listarCategoriasESubcategorias

- **Atende:** E2
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `GET /categorias`
- **Quem define:** API SAFRA

## Entrada

Não tem.

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| categorias | lista de objeto | sim | `[{"categoriaId":1,"nome":"Padaria","subcategorias":[...]}]` | No catálogo demonstrativo contém pelo menos 4 categorias. |
| categorias[].categoriaId | inteiro | sim | `1` | Identificador positivo. |
| categorias[].nome | texto | sim | `Padaria` | Mesmo nome de CT4. |
| categorias[].subcategorias | lista de objeto | sim | `[{"subcategoriaId":4,"nome":"Pães"}]` | Pertencem à categoria da linha. |
| categorias[].subcategorias[].subcategoriaId | inteiro | sim | `4` | Identificador positivo. |
| categorias[].subcategorias[].nome | texto | sim | `Pães` | Mesmo nome de CT5. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 500 | Falha ao consultar a classificação. | `{"codigo":"erroInterno","mensagem":"Não foi possível carregar categorias e subcategorias."}` |
