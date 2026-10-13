# CT21: interpretarPedido

- **Atende:** E11
- **Fronteira:** API SAFRA -> OpenAI Responses API, HTTPS/JSON
- **Operação externa:** `POST /v1/responses`
- **Quem define:** API SAFRA quanto aos campos usados do serviço externo
- **Documentação oficial:** https://developers.openai.com/api/reference/resources/responses/methods/create
- **Formato estruturado:** https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| model | texto | sim | `gpt-4o-mini` | Configurado somente no backend e compatível com saída estruturada. |
| input | texto | sim | `Preciso de dois pães e um leite` | Texto de CT19 ou CT20, sem credenciais nem dados sensíveis adicionais. |
| text.format.type | um de: json_schema | sim | `json_schema` | Exige saída estruturada. |
| text.format.name | texto | sim | `pedido_compra` | Nome estável do esquema. |
| text.format.strict | booleano | sim | `true` | Exige aderência estrita ao esquema. |

O esquema enviado em `text.format.schema` exige o objeto `{"itens":[{"termo":"texto","quantidade":1}]}` e não permite propriedades adicionais.

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| status | um de: completed, incomplete, failed | sim | `completed` | A API só usa o conteúdo quando concluído. |
| outputText.itens | lista de objeto | sim | `[{"termo":"pão","quantidade":2}]` | Conteúdo JSON validado pelo esquema. |
| outputText.itens[].termo | texto | sim | `pão` | Termo para busca interna em CT2; não é um produto confirmado. |
| outputText.itens[].quantidade | inteiro | sim | `2` | Entre 1 e 99. |
| refusal | texto | não | `Não posso atender a esse pedido.` | Quando presente, a API não consulta nem adiciona itens. |

## Erros

| Código | Quando acontece | Tratamento na API SAFRA |
| --- | --- | --- |
| 400 | Entrada ou esquema rejeitado. | Converter para erro 422 de CT19 e registrar diagnóstico. |
| 401 | Credencial da OpenAI ausente ou inválida. | Registrar internamente e devolver erro 503 de CT19. |
| 429 | Limite de uso atingido. | Devolver erro 503 de CT19. |
| refusal | O modelo recusa produzir a estrutura. | Devolver erro 422 de CT19 sem consultar o catálogo. |
| 5xx | Serviço externo indisponível. | Devolver erro 503 de CT19 após o tempo limite configurado. |
