# CT2: produtos

- **Atende:** E1, E2, E3, E4, E5, E7, E8, E9, E10, E11 e E12
- **Fronteira:** API SAFRA -> Banco SAFRA, SQL
- **Estrutura:** tabela `produtos`
- **Quem define:** API SAFRA, que lê e grava a tabela

## Entrada

Os campos gravados são os mesmos campos lidos.

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| id | inteiro | sim | `31` | Chave primária gerada pelo banco. |
| categoria_id | inteiro | sim | `1` | Chave estrangeira para `categorias.id`. |
| subcategoria_id | inteiro | sim | `4` | Chave estrangeira para `subcategorias.id`. |
| nome | texto | sim | `Pão de forma` | Entre 1 e 255 caracteres. |
| descricao | texto | sim | `Pacote de 400 g` | Entre 1 e 500 caracteres. |
| imagem_url | texto | sim | `https://exemplo.com/pao.jpg` | URL HTTPS. |
| preco | decimal | sim | `5.50` | Reais, duas casas, valor não negativo. |
| em_oferta | booleano | sim | `true` | Verdadeiro somente para oferta demonstrativa. |
| preco_anterior | decimal | não | `6.90` | Obrigatório e maior que `preco` quando `em_oferta` for verdadeiro. |
| ativo | booleano | sim | `true` | Somente ativos aparecem no catálogo. |
| criado_em | data-hora | sim | `2026-10-12T18:00:00Z` | Gerado pelo banco. |
| atualizado_em | data-hora | sim | `2026-10-12T18:00:00Z` | Atualizado em toda mudança. |

## Saída

Os campos lidos são os mesmos campos da entrada.

## Erros

| Código | Quando acontece | Tratamento |
| --- | --- | --- |
| foreign_key_violation | Categoria ou subcategoria não existe. | Reverter a gravação. |
| check_violation | Preço negativo, oferta inconsistente ou dado fora da regra. | Reverter a gravação como inválida. |
| connection_error | Banco indisponível. | A API devolve erro interno sem expor detalhes. |
