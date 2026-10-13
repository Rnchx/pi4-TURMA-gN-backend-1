# CT19: solicitarAssistenciaIA

- **Atende:** E11
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP multipart/form-data
- **Operação:** `POST /assistente/compras`
- **Quem define:** API SAFRA

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| tipoEntrada | um de: texto, audio | sim | `texto` | Determina qual conteúdo deve estar presente. |
| texto | texto | não | `Preciso de dois pães e um leite` | Obrigatório quando `tipoEntrada` for `texto`; máximo de 1.000 caracteres. |
| audio | arquivo | não | `pedido.webm` | Obrigatório quando `tipoEntrada` for `audio`; formatos webm, wav, mp3, m4a, ogg ou mp4; máximo de 10 MB. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| textoInterpretado | texto | sim | `Preciso de dois pães e um leite` | Texto original ou resultado validado de CT20. |
| aviso | texto | sim | `Revise os itens antes de adicionar ao carrinho.` | Informa que a pessoa precisa confirmar. |
| sugestoes | lista de objeto | sim | `[{"produtoId":31,"nome":"Pão de forma","quantidade":2,"preco":5.50}]` | Somente produtos ativos encontrados em CT2. Pode ser vazia. |
| sugestoes[].produtoId | inteiro | sim | `31` | Identificador de CT2. |
| sugestoes[].nome | texto | sim | `Pão de forma` | Nome de CT2. |
| sugestoes[].quantidade | inteiro | sim | `2` | Entre 1 e 99. |
| sugestoes[].preco | decimal | sim | `5.50` | Preço atual de CT2, não criado pela IA. |

## Erros

| Código | Quando acontece | Resposta ao chamador |
| --- | --- | --- |
| 400 | Tipo, texto ou áudio inválido. | `{"codigo":"entradaInvalida","mensagem":"Informe o pedido por texto ou áudio."}` |
| 413 | Arquivo de áudio supera 10 MB. | `{"codigo":"audioMuitoGrande","mensagem":"O áudio excede o limite permitido."}` |
| 422 | A fala não pôde ser transcrita ou o pedido não pôde ser interpretado. | `{"codigo":"pedidoNaoInterpretado","mensagem":"Não foi possível entender o pedido."}` |
| 503 | OpenAI indisponível ou tempo limite excedido. | `{"codigo":"iaIndisponivel","mensagem":"O assistente está temporariamente indisponível."}` |
| 500 | Falha ao conferir o catálogo. | `{"codigo":"erroInterno","mensagem":"Não foi possível preparar as sugestões."}` |
