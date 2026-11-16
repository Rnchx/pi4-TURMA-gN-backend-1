# CT24: listarHistoricoCompras

- **Atende:** aba "Histórico" do carrinho
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON; API SAFRA -> Serviço Java, TCP (`listarHistoricoCompras`)
- **Operação HTTP:** `GET /compras/historico`
- **Autenticação:** `Authorization: Bearer <token-de-sessão>`
- **Quem define:** Serviço Java

O usuário vem exclusivamente da sessão. A API envia ao Java `{"usuarioId":"<uuid da sessão>","limite":3}` e o Java consulta `compras_demonstrativas` e `itens_compra` filtrando por `usuario_id`, ordenando por `criada_em DESC, id DESC` (índice `compras_usuario_recentes_idx`). Nenhum identificador de usuário é aceito do aplicativo.

## Saída

| Campo | Tipo | Exemplo | Regra |
| --- | --- | --- | --- |
| limite | inteiro | `3` | Máximo de compras devolvidas. |
| compras | lista | | No máximo 3, da mais recente para a mais antiga. Lista vazia quando não há compras. |
| compras[].compraId | texto | `6278cddd-...` | UUID da compra. |
| compras[].confirmacaoId | texto | `SAFRA-DEMO-6278CDDD` | Número exibido ao usuário. |
| compras[].criadaEm | data-hora | `2026-11-16T19:00:00Z` | Data e horário. |
| compras[].metodoPagamento | texto | `pix` | Método demonstrativo. |
| compras[].subtotal | decimal | `125.82` | Soma dos itens. Compras antigas: igual ao total. |
| compras[].cupom | texto ou nulo | `PRIMEIRA40` | `null` quando nenhum cupom foi usado. |
| compras[].desconto | decimal | `40.00` | `0.00` sem cupom. |
| compras[].total | decimal | `85.82` | Total final. |
| compras[].quantidadeItens | inteiro | `18` | Soma das quantidades. |
| compras[].itens[] | lista | | `produtoId`, `nome` (nome no momento da compra), `quantidade`, `precoUnitario`, `subtotal`. |

## Erros

| HTTP | Código | Quando acontece |
| --- | --- | --- |
| 401 | `naoAutorizado` | Sessão ausente ou inválida. |
| 503 | `servicoValidacaoIndisponivel` | Serviço Java indisponível. |
| 500 | `erroInterno` | Falha ao carregar o histórico. |
