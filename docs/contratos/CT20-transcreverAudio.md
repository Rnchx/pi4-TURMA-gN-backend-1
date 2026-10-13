# CT20: transcreverAudio

- **Atende:** E11
- **Fronteira:** API SAFRA -> OpenAI Audio Transcriptions API, HTTPS multipart/form-data
- **Operação externa:** `POST /v1/audio/transcriptions`
- **Quem define:** API SAFRA quanto aos campos usados do serviço externo
- **Documentação oficial:** https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create

## Entrada

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| file | arquivo | sim | `pedido.webm` | Áudio recebido e validado em CT19. |
| model | texto | sim | `gpt-4o-mini-transcribe` | Configurado somente no backend. |
| language | texto | não | `pt` | Código de idioma usado quando conhecido. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| text | texto | sim | `Preciso de dois pães e um leite` | Único conteúdo da resposta usado pela API SAFRA. |

## Erros

| Código | Quando acontece | Tratamento na API SAFRA |
| --- | --- | --- |
| 400 | Arquivo ou parâmetro rejeitado pelo serviço externo. | Converter para erro 422 de CT19 sem expor detalhes. |
| 401 | Credencial da OpenAI ausente ou inválida. | Registrar internamente e devolver erro 503 de CT19. |
| 429 | Limite de uso atingido. | Devolver erro 503 de CT19. |
| 5xx | Serviço externo indisponível. | Devolver erro 503 de CT19 após o tempo limite configurado. |
