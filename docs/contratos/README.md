# Contratos do SAFRA

As fichas abaixo são a fonte de verdade das fronteiras do escopo E1-E12. Os fluxos ficam em `docs/fluxos` no repositório do frontend.

| ID | Contrato | Fronteira | Atende |
| --- | --- | --- | --- |
| CT1 | [listarCatalogo](CT1-listarCatalogo.md) | Frontend -> API SAFRA | E1, E10, E12 |
| CT2 | [produtos](CT2-produtos.md) | API SAFRA -> PostgreSQL | E1-E5, E7-E12 |
| CT3 | [listarCategoriasESubcategorias](CT3-listarCategoriasESubcategorias.md) | Frontend -> API SAFRA | E2 |
| CT4 | [categorias](CT4-categorias.md) | API SAFRA -> PostgreSQL | E2 |
| CT5 | [subcategorias](CT5-subcategorias.md) | API SAFRA -> PostgreSQL | E2 |
| CT6 | [listarProdutosPorClassificacao](CT6-listarProdutosPorClassificacao.md) | Frontend -> API SAFRA | E2 |
| CT7 | [consultarProduto](CT7-consultarProduto.md) | Frontend -> API SAFRA | E3, E10, E12 |
| CT8 | [adicionarItemAoCarrinho](CT8-adicionarItemAoCarrinho.md) | Frontend -> API SAFRA | E4, E11 |
| CT9 | [carrinhos](CT9-carrinhos.md) | API SAFRA -> PostgreSQL | E4-E11 |
| CT10 | [itensCarrinho](CT10-itensCarrinho.md) | API SAFRA -> PostgreSQL | E4-E11 |
| CT11 | [consultarCarrinho](CT11-consultarCarrinho.md) | Frontend -> API SAFRA | E4, E7, E10 |
| CT12 | [alterarQuantidadeItem](CT12-alterarQuantidadeItem.md) | Frontend -> API SAFRA | E5, E7 |
| CT13 | [removerItemDoCarrinho](CT13-removerItemDoCarrinho.md) | Frontend -> API SAFRA | E6 |
| CT14 | [obterResumoCompra](CT14-obterResumoCompra.md) | Frontend -> API SAFRA | E8 |
| CT15 | [confirmarCompraDemonstrativa](CT15-confirmarCompraDemonstrativa.md) | Frontend -> API SAFRA | E9, E10 |
| CT16 | [gerarConfirmacaoDemonstrativa](CT16-gerarConfirmacaoDemonstrativa.md) | API SAFRA -> Serviço Java | E9, E10 |
| CT17 | [comprasDemonstrativas](CT17-comprasDemonstrativas.md) | Serviço Java -> PostgreSQL | E9, E10 |
| CT18 | [itensCompra](CT18-itensCompra.md) | Serviço Java -> PostgreSQL | E9, E10 |
| CT19 | [solicitarAssistenciaIA](CT19-solicitarAssistenciaIA.md) | Frontend -> API SAFRA | E11 |
| CT20 | [transcreverAudio](CT20-transcreverAudio.md) | API SAFRA -> OpenAI | E11 |
| CT21 | [interpretarPedido](CT21-interpretarPedido.md) | API SAFRA -> OpenAI | E11 |
| CT22 | [listarOfertasDemonstrativas](CT22-listarOfertasDemonstrativas.md) | Frontend -> API SAFRA | E12 |
