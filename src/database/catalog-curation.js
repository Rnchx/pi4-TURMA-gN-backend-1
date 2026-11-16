// Curadoria v1.4: nomes, descrições e fotos definidos pela equipe para os produtos que aguardavam imagem.
// O mapeamento é feito pela demo_chave (nunca pela posição). Preço, oferta, categoria, subcategoria,
// validade, idade mínima e marcador alcoólico NÃO fazem parte desta tabela e permanecem inalterados.
// As URLs são diretas (i.imgur.com), resolvidas a partir do og:image de cada álbum informado.
export const catalogCuration = [
  // Bebidas
  { chave: 'ciclo4-alcool-1', album: 'GIuswfR', nome: 'Cerveja Pilsen 960ml', descricao: 'La Casa Uruguay', imagem: 'https://i.imgur.com/E5wbQIo.jpeg' },
  { chave: 'setores-bebida-agua-gas', album: 'CV7tYI8', nome: 'Água Crystal Mineral com Gás 500ml', descricao: '500ml', imagem: 'https://i.imgur.com/NlsqB0Z.jpeg' },
  { chave: 'setores-bebida-cola', album: 'PQiXoqX', nome: 'Coca-Cola Original 2L', descricao: '2L', imagem: 'https://i.imgur.com/MWoqQfi.jpeg' },
  { chave: 'setores-bebida-guarana', album: 'Ivlm2Gx', nome: 'Refrigerante Guaraná Antarctica 2L', descricao: '2L', imagem: 'https://i.imgur.com/9HJCJet.jpeg' },
  { chave: 'setores-bebida-suco', album: 'ZW3AgPq', nome: 'Suco de Laranja NATURAL ONE', descricao: '1,7L', imagem: 'https://i.imgur.com/I823UTw.png' },
  { chave: 'setores-bebida-energetico', album: 'eK1b8bs', nome: 'Monster Energy', descricao: '473ml', imagem: 'https://i.imgur.com/3kVUioS.jpeg' },
  // Único item da curadoria com preço novo, definido pela equipe (R$ 795,00; migration 008).
  { chave: 'setores-bebida-vinho', album: 'nIMe6OK', nome: 'Vinho Tinto Don Laurindo Gran Reserva 750ml', descricao: '750ml', imagem: 'https://i.imgur.com/1ivZIET.jpeg', preco: 795 },
  // Açougue e Peixaria
  { chave: 'setores-peixe-tilapia', album: 'HWypkjI', nome: 'Filé de Tilápia congelado', descricao: '500g', imagem: 'https://i.imgur.com/5ilMKiN.jpeg' },
  { chave: 'setores-peixe-salmao', album: '27cNrYE', nome: 'Filé de Salmão Bom Peixe', descricao: '300g', imagem: 'https://i.imgur.com/x1WEZVl.jpeg' },
  { chave: 'setores-peixe-camarao', album: 'Dn6qya9', nome: 'Camarão COSTA SUL Cozido Descascado', descricao: '300g', imagem: 'https://i.imgur.com/38DXclZ.jpeg' },
  // Hortifrúti (a Laranja Pera é o registro único já existente; é atualizado sem criar outro)
  { chave: 'ciclo2-3-8', album: '9pk0DYT', nome: 'Laranja Pera', descricao: '1kg', imagem: 'https://i.imgur.com/cxlcTjH.jpeg' },
  { chave: 'setores-horti-alface', album: '5tMo6Cd', nome: 'Alface crespa', descricao: 'Pacote 100g', imagem: 'https://i.imgur.com/2L3e2ZH.jpeg' },
  // Higiene e Limpeza (pela ordem da lista: o único desinfetante pendente recebe o primeiro desinfetante)
  { chave: 'setores-limpeza-detergente', album: 'ZDyaW5O', nome: 'Detergente Líquido Neutro Ypê', descricao: '500ml', imagem: 'https://i.imgur.com/83O9vnv.jpeg' },
  { chave: 'setores-limpeza-desinfetante', album: 'XwLSt6w', nome: 'Desinfetante Floral', descricao: '5L', imagem: 'https://i.imgur.com/T206ysc.jpeg' },
  { chave: 'setores-limpeza-sabao', album: 'yw61WKO', nome: 'Sabão em pó OMO Puro Cuidado', descricao: '800g', imagem: 'https://i.imgur.com/HCqRzMH.jpeg' },
  // Mercearia
  { chave: 'setores-mercearia-arroz', album: '89Calaq', nome: 'Arroz Preto Médio Tipo 1 Camil Gourmet', descricao: '250g', imagem: 'https://i.imgur.com/qdjIocJ.jpeg' },
  { chave: 'setores-mercearia-feijao', album: 'NJA1rbI', nome: 'Feijão Preto Tipo 1 Kicaldo', descricao: '1kg', imagem: 'https://i.imgur.com/m5yMFtW.jpeg' },
  { chave: 'setores-mercearia-acucar', album: 'by1Ai7N', nome: 'Açúcar Refinado União', descricao: '1kg', imagem: 'https://i.imgur.com/gcIQ8zv.jpeg' },
  { chave: 'setores-mercearia-oleo', album: '4UwNioa', nome: 'Óleo de Soja Soya', descricao: '900ml', imagem: 'https://i.imgur.com/9Nr8wkV.jpeg' },
  { chave: 'setores-mercearia-cafe', album: 'sS1JwVx', nome: 'Café Torrado e Moído Torra Forte Café Sabor de Garça', descricao: '500g', imagem: 'https://i.imgur.com/hUAH4ST.png' },
  { chave: 'setores-mercearia-macarrao', album: '6vR1zwq', nome: 'Macarrão Espaguete MONDO Pasta', descricao: '400g', imagem: 'https://i.imgur.com/JPsscuO.jpeg' },
  { chave: 'setores-mercearia-molho', album: 'SAV9H5H', nome: 'Molho de Tomate Heinz Tradicional', descricao: '320g', imagem: 'https://i.imgur.com/zuykYQs.jpeg' },
  { chave: 'setores-mercearia-farinha', album: 'J9LKwKd', nome: 'Farinha de Trigo Renata Premium', descricao: '1kg', imagem: 'https://i.imgur.com/imAbjwV.jpeg' },
  // Congelados
  { chave: 'setores-congelado-pizza', album: 'XGoYcWO', nome: 'Pizza Sadia Frango com Requeijão e Mussarela', descricao: '460g', imagem: 'https://i.imgur.com/BlffczI.png' },
  { chave: 'setores-congelado-lasanha', album: 'TJScNPN', nome: 'Lasanha Sadia Bolonhesa Congelada', descricao: '1kg', imagem: 'https://i.imgur.com/Djof1Pi.jpeg' },
  { chave: 'setores-congelado-hamburguer', album: 'b6Ur1gi', nome: 'Hambúrguer Congelado Bovino Costela Maturatta', descricao: '180g', imagem: 'https://i.imgur.com/sf4uL7N.jpeg' },
  { chave: 'setores-congelado-acai', album: 'IoA53pw', nome: 'Açaí Frooty Original', descricao: '700ml', imagem: 'https://i.imgur.com/QrHNoYs.jpeg' },
  { chave: 'setores-congelado-fritas', album: 'jN4OKJQ', nome: 'Batata Congelada McCain Tradicional', descricao: '1,5kg', imagem: 'https://i.imgur.com/Y3dD8v1.jpeg' },
  { chave: 'setores-congelado-nuggets', album: 'MLAD16Z', nome: 'Nuggets de Frango Tradicional Sadia', descricao: '300g', imagem: 'https://i.imgur.com/BBPasDO.jpeg' },
  { chave: 'setores-congelado-frutas', album: 'iUGmqoW', nome: 'Mix de Frutas Vermelhas Congeladas Carrefour Viver', descricao: '1,02kg', imagem: 'https://i.imgur.com/qrLHduT.jpeg' },
  { chave: 'setores-congelado-sorvete', album: 'xrjYqG2', nome: 'Sorvete Napolitano Tradicional Nestlé', descricao: '1,5 litro', imagem: 'https://i.imgur.com/UFWJmwE.jpeg' },
  // Utensílios Domésticos e Bazar
  { chave: 'setores-bazar-pote', album: 'k2GgcXj', nome: 'Pote Plástico Redondo Freezer e Micro-ondas com Tampa', descricao: '1000ml', imagem: 'https://i.imgur.com/7Csn8X9.jpeg' },
  { chave: 'setores-bazar-copo', album: '586zBVV', nome: 'Jogo 4 Copos Altos Elysia Gold Rim de Vidro', descricao: '450ml', imagem: 'https://i.imgur.com/panHLqy.jpeg' },
  { chave: 'setores-bazar-prato', album: 'QKEqvd5', nome: 'Conjunto 6 Pratos de Porcelana Paddy', descricao: '19cm', imagem: 'https://i.imgur.com/2hP2ABp.jpeg' },
  { chave: 'setores-bazar-talheres', album: 'cGFDGDa', nome: 'Jogo de Talheres Luxe Gourmet', descricao: '24 peças', imagem: 'https://i.imgur.com/qtRI9cL.jpeg' },
  { chave: 'setores-bazar-pano', album: 'd0oG0U4', nome: 'Conjunto de Panos de Prato de Cozinha em Tecido Sortido', descricao: '45 × 71cm', imagem: 'https://i.imgur.com/jyCW23z.jpeg' },
  { chave: 'setores-bazar-esponja', album: 'tz33y7P', nome: 'Esponja Multiuso Dupla Face Scotch-Brite', descricao: '4 unidades', imagem: 'https://i.imgur.com/16spAlM.jpeg' },
  { chave: 'setores-bazar-balde', album: 'ZWIRT1F', nome: 'Balde com Alça de Metal em Plástico Resistente', descricao: '20L — 12 unidades', imagem: 'https://i.imgur.com/plK1KOF.jpeg' },
  { chave: 'setores-bazar-vassoura', album: 'uov53pC', nome: 'Vassoura Doméstica com Cabo', descricao: '260 × 40', imagem: 'https://i.imgur.com/tmEKaKa.jpeg' },
  // Pet Shop
  { chave: 'setores-pet-racao-cao', album: '506Idi4', nome: 'Ração Special Dog Premium Carne para Cães Adultos', descricao: '10kg', imagem: 'https://i.imgur.com/lNgmG7W.jpeg' },
  { chave: 'setores-pet-racao-gato', album: 'dgjrqP0', nome: 'Ração Golden Formula para Gatos Sabor Salmão', descricao: '10kg', imagem: 'https://i.imgur.com/Hao7TGC.jpeg' },
  { chave: 'setores-pet-petisco-cao', album: '2YEHHFX', nome: 'Petisco para Cães Premier Cookie', descricao: '250g', imagem: 'https://i.imgur.com/ZoiuisG.png' },
  { chave: 'setores-pet-petisco-gato', album: 'XUdW333', nome: 'Petisco para Gatos Optimum Sabor Carne e Linhaça', descricao: '80g', imagem: 'https://i.imgur.com/IZacHlk.jpeg' },
  { chave: 'setores-pet-areia', album: 'DlbkLRS', nome: 'Areia Pipicat', descricao: '4kg', imagem: 'https://i.imgur.com/IxPynSA.jpeg' },
  { chave: 'setores-pet-shampoo', album: 'NxIoAJP', nome: 'Shampoo Pet Azul Granado para Pelos Claros', descricao: '500ml', imagem: 'https://i.imgur.com/CWxm5Gr.jpeg' },
  { chave: 'setores-pet-brinquedo', album: 'PMg2YuG', nome: 'Brinquedo para Cachorro Almofada Ossinho Solar', descricao: 'Unidade', imagem: 'https://i.imgur.com/58ADE4A.jpeg' },
  { chave: 'setores-pet-comedouro', album: 'J9CRvas', nome: 'Comedouro para Pets Formato Infinito', descricao: 'Unidade', imagem: 'https://i.imgur.com/kiK8qI2.jpeg' },
];

// Registros pendentes sem item correspondente na lista, e itens da lista sem registro pendente.
// Nada é criado, excluído ou deslocado para outro produto.
export const pendingCurationDecisions = [];

export const unusedCurationItems = [
  { album: 'Xch122w', nome: 'Desinfetante Concentrado Floral Cif', descricao: '5 litros', imagem: 'https://i.imgur.com/L27biiB.jpeg',
    motivo: 'Higiene e Limpeza tem 3 pendentes para 4 itens; não há segundo desinfetante pendente.' },
];
