# CT22: listarOfertasDemonstrativas

- **Atende:** E12
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON
- **Operação:** `GET /produtos/ofertas`
- **Quem define:** API SAFRA

## Entrada

Não tem.

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| aviso | texto | sim | `Ofertas demonstrativas; preços sem atualização em tempo real.` | Sempre exibido no aplicativo. |
| ofertas | lista de objeto | sim | `[{"produtoId":31,"nome":"Pão de forma","preco":5.50,"precoAnterior":6.90,"emOferta":true}]` | Somente produtos ativos com `em_oferta` verdadeiro em CT2. |
| ofertas[].produtoId | inteiro | sim | `31` | Identificador de CT2. |
| ofertas[].nome | texto | sim | `Pão de forma` | Nome de CT2. |
| ofertas[].imagemUrl | texto | sim | `https://exemplo.com/pao.jpg` | Imagem de CT2. |
| ofertas[].preco | decimal | sim | `5.50` | Preço atual de CT2. |
| ofertas[].precoAnterior | decimal | sim | `6.90` | Maior que `preco`. |
| ofertas[].emOferta | booleano | sim | `true` | Sempre verdadeiro nesta operação. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 500 | Falha ao consultar o catálogo. | `{"codigo":"erroInterno","mensagem":"Não foi possível carregar as ofertas."}` |
