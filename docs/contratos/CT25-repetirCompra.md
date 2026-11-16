# CT25: repetirCompra ("Adicionar novamente ao carrinho")

- **Atende:** aba "Histórico" do carrinho
- **Fronteira:** Aplicativo SAFRA -> API SAFRA, HTTP/JSON; API SAFRA -> Serviço Java, TCP (`consultarCompra`)
- **Operação HTTP:** `POST /compras/{compraId}/repetir`
- **Autenticação:** `Authorization: Bearer <token-de-sessão>`
- **Quem define:** API SAFRA (carrinho) e Serviço Java (propriedade da compra)

1. A API pede ao Java `consultarCompra` com `{"usuarioId":"<uuid da sessão>","compraId":"<uuid>"}`. O Java busca `WHERE id = ? AND usuario_id = ?`; compra de outra conta é indistinguível de compra inexistente (`compraNaoEncontrada`).
2. Para cada item, a API relê o produto **ativo** e usa o **preço atual** (nunca o preço antigo da compra).
3. Produtos com idade mínima passam por `validarRestricaoEtaria` no Java; bloqueados são informados.
4. Os itens vão para o carrinho aberto informado (se pertencer à sessão ou não tiver dono) ou para um novo carrinho aberto. Quantidades são somadas e limitadas a 99 por item.
5. A compra antiga não é reaberta e nenhuma compra nova é criada: o histórico só muda após uma nova confirmação (CT15).

## Entrada

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| compraId | texto | sim | UUID em parâmetro de rota. |
| carrinhoId | texto | não | UUID do carrinho aberto atual; ausente ou inválido para a sessão → novo carrinho. Nenhum outro campo é aceito. |

## Saída

| Campo | Tipo | Regra |
| --- | --- | --- |
| carrinhoId | texto ou nulo | Carrinho que recebeu os itens. |
| adicionados[] | lista | `produtoId`, `nome`, `quantidade` (adicionada), `quantidadeNoCarrinho`, `precoUnitario` (atual), `ajustado` (true quando limitado pelo máximo de 99). |
| naoAdicionados[] | lista | `produtoId`, `nome`, `motivo`: `indisponivel`, `restricaoEtaria` ou `limiteQuantidade`. |
| total | decimal | Total atual do carrinho, calculado no banco. |
| mensagem | texto | Resumo do resultado. |

## Erros

| HTTP | Código | Quando acontece |
| --- | --- | --- |
| 400 | `entradaInvalida` / `compraNaoEncontrada` | Corpo com campos não suportados ou `compraId` malformado. |
| 401 | `naoAutorizado` | Sessão ausente ou inválida. |
| 404 | `compraNaoEncontrada` | Compra inexistente ou de outra conta. |
| 503 | `servicoValidacaoIndisponivel` | Serviço Java indisponível. |
