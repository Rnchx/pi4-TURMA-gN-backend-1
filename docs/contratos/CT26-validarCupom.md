# CT26: validarCupom

- **Atende:** resumo da compra (E8) e confirmação (E9)
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON; API SAFRA -> Serviço Java, TCP (`validarCupom`)
- **Operação HTTP:** `POST /carrinhos/{carrinhoId}/cupom`
- **Autenticação:** `Authorization: Bearer <token-de-sessão>`
- **Quem define:** Serviço Java (regras do cupom); API SAFRA (rota e checagem do carrinho)

O aplicativo nunca calcula nem decide o desconto. A API confere que o carrinho existe, está aberto, pertence à sessão (ou ainda não tem dono) e possui itens disponíveis; em seguida envia `validarCupom` ao Java. O Java lê o subtotal do carrinho no PostgreSQL, valida a conta, a primeira compra e o código, e devolve os valores calculados com `BigDecimal`.

Esta validação serve para exibição no resumo e na revisão. A decisão definitiva é tomada novamente pelo Java dentro da transação de [CT16](CT16-gerarConfirmacaoDemonstrativa.md).

## Regras

| Cupom | Desconto | Regra |
| --- | --- | --- |
| `PRIMEIRA40` | R$ 40,00 | Somente se a conta não tiver nenhuma compra concluída; uso único por conta, garantido também pelo índice único parcial `compras_primeira40_por_usuario`. |
| `QUERO100` | R$ 100,00 | Código exato, sensível a maiúsculas (`quero100` é recusado). Uma vez por pedido. |

- Apenas um cupom por compra (os cupons não acumulam).
- `desconto = min(valor do cupom, subtotal)`; `total = subtotal - desconto`, nunca negativo.
- Espaços nas pontas do texto digitado são ignorados; maiúsculas e minúsculas, não.

## Entrada (HTTP)

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| carrinhoId | texto | sim | `0c9d92c6-6939-4a33-9132-2dd75fe512ad` | UUID em parâmetro de rota. |
| codigo | texto | sim | `PRIMEIRA40` | 1 a 30 letras ou números. |

## Saída

| Campo | Tipo | Obrigatório | Exemplo | Regra |
| --- | --- | --- | --- | --- |
| cupom | texto | sim | `PRIMEIRA40` | Código aceito, como cadastrado. |
| subtotal | decimal | sim | `125.82` | Soma dos itens do carrinho, lida no banco pelo Java. |
| desconto | decimal | sim | `40.00` | Limitado ao subtotal. |
| total | decimal | sim | `85.82` | `subtotal - desconto`, mínimo 0,00. |
| mensagem | texto | sim | `Cupom aplicado.` | Texto público. |

## Operação TCP `validarCupom`

Entrada `dados`: `{"usuarioId":"<uuid da sessão>","carrinhoId":"<uuid>","codigo":"PRIMEIRA40"}`.
Saída `dados`: `{"codigo","subtotal","desconto","total","mensagem"}`.

## Erros

| HTTP | Código | Quando acontece |
| --- | --- | --- |
| 400 | `cupomInvalido` | Código malformado, inexistente, inativo ou com maiúsculas/minúsculas diferentes. |
| 401 | `naoAutorizado` | Sessão ausente ou inválida. |
| 404 | `carrinhoNaoEncontrado` | Carrinho não existe. |
| 409 | `cupomIndisponivel` | `PRIMEIRA40` em conta que já possui compra concluída. |
| 409 | `cupomJaUtilizado` | `PRIMEIRA40` já usado por esta conta. |
| 409 | `confirmacaoNaoPermitida` | Carrinho vazio, fechado, de outra conta ou com item indisponível. |
| 409 | `cupomExpirado` | Reservado para cupons com validade (não usado nesta versão). |
| 503 | `servicoValidacaoIndisponivel` | Serviço Java indisponível. |
