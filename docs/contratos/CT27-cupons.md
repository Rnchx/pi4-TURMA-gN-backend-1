# CT27: cupons

- **Fronteira:** Serviço Java -> Banco SAFRA, SQL
- **Estrutura:** tabela `cupons` (migration `007-curadoria-cupons-historico.sql`)
- **Quem define:** Serviço Java, que somente lê a tabela

| Campo | Tipo | Exemplo | Regra |
| --- | --- | --- | --- |
| codigo | texto (PK) | `QUERO100` | `^[A-Z0-9]{3,30}$`; comparação exata (sensível a maiúsculas). |
| valor_desconto | decimal(10,2) | `100.00` | Maior que zero. |
| somente_primeira_compra | booleano | `false` | `true` em `PRIMEIRA40`. |
| ativo | booleano | `true` | Cupom inativo responde `cupomInvalido`. |
| criado_em | data-hora | | Momento do cadastro. |

Carga idempotente: `PRIMEIRA40` (40,00, somente primeira compra) e `QUERO100` (100,00).

`compras_demonstrativas.cupom_codigo` referencia `cupons(codigo)`. Ver [CT17](CT17-comprasDemonstrativas.md) para as restrições de valores e o índice de uso único.
