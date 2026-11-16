-- v1.4: curadoria do catálogo, subcategoria canônica de bebidas +18, cupons e histórico de compras.
-- Segura para bancos novos (tabelas vazias) e já existentes. Todas as instruções são idempotentes:
-- reexecutar o arquivo não altera o resultado. Preços, ofertas, validade e idade mínima não são tocados.

-- 1. Subcategoria canônica "alcoólicas" em Bebidas -----------------------------------------------------
-- Grafias como "alcoolicas", "Alcoólicas" ou "bebidas alcoólicas" são consolidadas em uma única linha.
INSERT INTO subcategorias(categoria_id, nome)
  SELECT DISTINCT c.id, 'alcoólicas'
  FROM categorias c JOIN subcategorias s ON s.categoria_id = c.id
  WHERE c.nome = 'Bebidas'
    AND translate(lower(s.nome), 'óòôõ', 'oooo') LIKE '%alcoolica%'
ON CONFLICT (categoria_id, nome) DO NOTHING;

INSERT INTO subcategorias(categoria_id, nome)
  SELECT DISTINCT p.categoria_id, 'alcoólicas'
  FROM produtos p JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nome = 'Bebidas' AND p.alcoolico
ON CONFLICT (categoria_id, nome) DO NOTHING;

UPDATE subcategorias SET ativo = true
  WHERE nome = 'alcoólicas' AND categoria_id IN (SELECT id FROM categorias WHERE nome = 'Bebidas');

-- Produtos alcoólicos de Bebidas, ou em uma grafia variante, passam para a subcategoria canônica.
UPDATE produtos p SET subcategoria_id = canonica.id, atualizado_em = now()
  FROM categorias c, subcategorias atual, subcategorias canonica
  WHERE c.id = p.categoria_id AND c.nome = 'Bebidas'
    AND atual.id = p.subcategoria_id
    AND canonica.categoria_id = c.id AND canonica.nome = 'alcoólicas'
    AND p.subcategoria_id <> canonica.id
    AND (p.alcoolico OR translate(lower(atual.nome), 'óòôõ', 'oooo') LIKE '%alcoolica%');

-- Produto de bebida alcoólica sempre exige 18 anos (mantém produtos_alcoolico_idade_check).
UPDATE produtos p SET alcoolico = true, idade_minima = 18, atualizado_em = now()
  FROM subcategorias s, categorias c
  WHERE s.id = p.subcategoria_id AND c.id = p.categoria_id AND c.nome = 'Bebidas' AND s.nome = 'alcoólicas'
    AND (NOT p.alcoolico OR p.idade_minima <> 18);

-- Variantes sem produtos são removidas; nenhuma outra tabela referencia subcategorias.
DELETE FROM subcategorias s
  USING categorias c
  WHERE c.id = s.categoria_id AND c.nome = 'Bebidas' AND s.nome <> 'alcoólicas'
    AND translate(lower(s.nome), 'óòôõ', 'oooo') LIKE '%alcoolica%'
    AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.subcategoria_id = s.id);

-- 2. Curadoria de nomes, descrições e fotos (por demo_chave; somente esses três campos) ------------------
UPDATE produtos p SET nome = v.nome, descricao = v.descricao, imagem_url = v.imagem, atualizado_em = now()
  FROM (VALUES
    ('ciclo4-alcool-1', 'Cerveja Pilsen 960ml', 'La Casa Uruguay', 'https://i.imgur.com/E5wbQIo.jpeg'),
    ('setores-bebida-agua-gas', 'Água Crystal Mineral com Gás 500ml', '500ml', 'https://i.imgur.com/NlsqB0Z.jpeg'),
    ('setores-bebida-cola', 'Coca-Cola Original 2L', '2L', 'https://i.imgur.com/MWoqQfi.jpeg'),
    ('setores-bebida-guarana', 'Refrigerante Guaraná Antarctica 2L', '2L', 'https://i.imgur.com/9HJCJet.jpeg'),
    ('setores-bebida-suco', 'Suco de Laranja NATURAL ONE', '1,7L', 'https://i.imgur.com/I823UTw.png'),
    ('setores-bebida-energetico', 'Monster Energy', '473ml', 'https://i.imgur.com/3kVUioS.jpeg'),
    ('setores-peixe-tilapia', 'Filé de Tilápia congelado', '500g', 'https://i.imgur.com/5ilMKiN.jpeg'),
    ('setores-peixe-salmao', 'Filé de Salmão Bom Peixe', '300g', 'https://i.imgur.com/x1WEZVl.jpeg'),
    ('setores-peixe-camarao', 'Camarão COSTA SUL Cozido Descascado', '300g', 'https://i.imgur.com/38DXclZ.jpeg'),
    ('ciclo2-3-8', 'Laranja Pera', '1kg', 'https://i.imgur.com/cxlcTjH.jpeg'),
    ('setores-horti-alface', 'Alface crespa', 'Pacote 100g', 'https://i.imgur.com/2L3e2ZH.jpeg'),
    ('setores-limpeza-detergente', 'Detergente Líquido Neutro Ypê', '500ml', 'https://i.imgur.com/83O9vnv.jpeg'),
    ('setores-limpeza-desinfetante', 'Desinfetante Floral', '5L', 'https://i.imgur.com/T206ysc.jpeg'),
    ('setores-limpeza-sabao', 'Sabão em pó OMO Puro Cuidado', '800g', 'https://i.imgur.com/HCqRzMH.jpeg'),
    ('setores-mercearia-arroz', 'Arroz Preto Médio Tipo 1 Camil Gourmet', '250g', 'https://i.imgur.com/qdjIocJ.jpeg'),
    ('setores-mercearia-feijao', 'Feijão Preto Tipo 1 Kicaldo', '1kg', 'https://i.imgur.com/m5yMFtW.jpeg'),
    ('setores-mercearia-acucar', 'Açúcar Refinado União', '1kg', 'https://i.imgur.com/gcIQ8zv.jpeg'),
    ('setores-mercearia-oleo', 'Óleo de Soja Soya', '900ml', 'https://i.imgur.com/9Nr8wkV.jpeg'),
    ('setores-mercearia-cafe', 'Café Torrado e Moído Torra Forte Café Sabor de Garça', '500g', 'https://i.imgur.com/hUAH4ST.png'),
    ('setores-mercearia-macarrao', 'Macarrão Espaguete MONDO Pasta', '400g', 'https://i.imgur.com/JPsscuO.jpeg'),
    ('setores-mercearia-molho', 'Molho de Tomate Heinz Tradicional', '320g', 'https://i.imgur.com/zuykYQs.jpeg'),
    ('setores-mercearia-farinha', 'Farinha de Trigo Renata Premium', '1kg', 'https://i.imgur.com/imAbjwV.jpeg'),
    ('setores-congelado-pizza', 'Pizza Sadia Frango com Requeijão e Mussarela', '460g', 'https://i.imgur.com/BlffczI.png'),
    ('setores-congelado-lasanha', 'Lasanha Sadia Bolonhesa Congelada', '1kg', 'https://i.imgur.com/Djof1Pi.jpeg'),
    ('setores-congelado-hamburguer', 'Hambúrguer Congelado Bovino Costela Maturatta', '180g', 'https://i.imgur.com/sf4uL7N.jpeg'),
    ('setores-congelado-acai', 'Açaí Frooty Original', '700ml', 'https://i.imgur.com/QrHNoYs.jpeg'),
    ('setores-congelado-fritas', 'Batata Congelada McCain Tradicional', '1,5kg', 'https://i.imgur.com/Y3dD8v1.jpeg'),
    ('setores-congelado-nuggets', 'Nuggets de Frango Tradicional Sadia', '300g', 'https://i.imgur.com/BBPasDO.jpeg'),
    ('setores-congelado-frutas', 'Mix de Frutas Vermelhas Congeladas Carrefour Viver', '1,02kg', 'https://i.imgur.com/qrLHduT.jpeg'),
    ('setores-congelado-sorvete', 'Sorvete Napolitano Tradicional Nestlé', '1,5 litro', 'https://i.imgur.com/UFWJmwE.jpeg'),
    ('setores-bazar-pote', 'Pote Plástico Redondo Freezer e Micro-ondas com Tampa', '1000ml', 'https://i.imgur.com/7Csn8X9.jpeg'),
    ('setores-bazar-copo', 'Jogo 4 Copos Altos Elysia Gold Rim de Vidro', '450ml', 'https://i.imgur.com/panHLqy.jpeg'),
    ('setores-bazar-prato', 'Conjunto 6 Pratos de Porcelana Paddy', '19cm', 'https://i.imgur.com/2hP2ABp.jpeg'),
    ('setores-bazar-talheres', 'Jogo de Talheres Luxe Gourmet', '24 peças', 'https://i.imgur.com/qtRI9cL.jpeg'),
    ('setores-bazar-pano', 'Conjunto de Panos de Prato de Cozinha em Tecido Sortido', '45 × 71cm', 'https://i.imgur.com/jyCW23z.jpeg'),
    ('setores-bazar-esponja', 'Esponja Multiuso Dupla Face Scotch-Brite', '4 unidades', 'https://i.imgur.com/16spAlM.jpeg'),
    ('setores-bazar-balde', 'Balde com Alça de Metal em Plástico Resistente', '20L — 12 unidades', 'https://i.imgur.com/plK1KOF.jpeg'),
    ('setores-bazar-vassoura', 'Vassoura Doméstica com Cabo', '260 × 40', 'https://i.imgur.com/tmEKaKa.jpeg'),
    ('setores-pet-racao-cao', 'Ração Special Dog Premium Carne para Cães Adultos', '10kg', 'https://i.imgur.com/lNgmG7W.jpeg'),
    ('setores-pet-racao-gato', 'Ração Golden Formula para Gatos Sabor Salmão', '10kg', 'https://i.imgur.com/Hao7TGC.jpeg'),
    ('setores-pet-petisco-cao', 'Petisco para Cães Premier Cookie', '250g', 'https://i.imgur.com/ZoiuisG.png'),
    ('setores-pet-petisco-gato', 'Petisco para Gatos Optimum Sabor Carne e Linhaça', '80g', 'https://i.imgur.com/IZacHlk.jpeg'),
    ('setores-pet-areia', 'Areia Pipicat', '4kg', 'https://i.imgur.com/IxPynSA.jpeg'),
    ('setores-pet-shampoo', 'Shampoo Pet Azul Granado para Pelos Claros', '500ml', 'https://i.imgur.com/CWxm5Gr.jpeg'),
    ('setores-pet-brinquedo', 'Brinquedo para Cachorro Almofada Ossinho Solar', 'Unidade', 'https://i.imgur.com/58ADE4A.jpeg'),
    ('setores-pet-comedouro', 'Comedouro para Pets Formato Infinito', 'Unidade', 'https://i.imgur.com/kiK8qI2.jpeg')
  ) AS v(chave, nome, descricao, imagem)
  WHERE p.demo_chave = v.chave
    AND (p.nome, p.descricao, p.imagem_url) IS DISTINCT FROM (v.nome, v.descricao, v.imagem);

-- 3. "demonstrativo/demonstrativa" e "venda simulada" deixam nomes e descrições de produtos ---------------
UPDATE produtos SET nome = 'Vinho Tinto', descricao = '750ml', atualizado_em = now()
  WHERE demo_chave = 'setores-bebida-vinho' AND (nome, descricao) IS DISTINCT FROM ('Vinho Tinto', '750ml');

UPDATE produtos SET
    nome = btrim(regexp_replace(nome, '\s*\mdemonstrativ[oa]s?\M', '', 'gi')),
    atualizado_em = now()
  WHERE nome ~* 'demonstrativ[oa]'
    AND length(btrim(regexp_replace(nome, '\s*\mdemonstrativ[oa]s?\M', '', 'gi'))) > 0;

UPDATE produtos SET
    descricao = btrim(regexp_replace(regexp_replace(descricao, '\s*[-–—]?\s*venda simulada[^.]*\.?', '', 'gi'),
      '\s*\m(produto\s+)?demonstrativ[oa]s?\M', '', 'gi')),
    atualizado_em = now()
  WHERE descricao ~* '(demonstrativ[oa]|venda simulada)'
    AND length(btrim(regexp_replace(regexp_replace(descricao, '\s*[-–—]?\s*venda simulada[^.]*\.?', '', 'gi'),
      '\s*\m(produto\s+)?demonstrativ[oa]s?\M', '', 'gi'))) > 0;

-- 4. Cupons ------------------------------------------------------------------------------------------------
-- O código é comparado exatamente (VARCHAR é sensível a maiúsculas no PostgreSQL).
CREATE TABLE IF NOT EXISTS cupons (
  codigo VARCHAR(30) PRIMARY KEY CHECK (codigo ~ '^[A-Z0-9]{3,30}$'),
  valor_desconto NUMERIC(10,2) NOT NULL CHECK (valor_desconto > 0),
  somente_primeira_compra BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO cupons(codigo, valor_desconto, somente_primeira_compra) VALUES
  ('PRIMEIRA40', 40.00, true),
  ('QUERO100', 100.00, false)
ON CONFLICT (codigo) DO NOTHING;

-- 5. Valores da compra: subtotal original, cupom, desconto aplicado e total final -------------------------
ALTER TABLE compras_demonstrativas
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cupom_codigo VARCHAR(30) REFERENCES cupons(codigo),
  ADD COLUMN IF NOT EXISTS desconto NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Compras antigas: subtotal = total antigo, desconto zero e nenhum cupom.
UPDATE compras_demonstrativas SET subtotal = total WHERE subtotal IS NULL;
ALTER TABLE compras_demonstrativas ALTER COLUMN subtotal SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compras_valores_cupom_check') THEN
    ALTER TABLE compras_demonstrativas ADD CONSTRAINT compras_valores_cupom_check CHECK (
      subtotal >= 0 AND desconto >= 0 AND total >= 0
      AND desconto <= subtotal
      AND total = subtotal - desconto
      AND (cupom_codigo IS NOT NULL OR desconto = 0)
    );
  END IF;
END $$;

-- PRIMEIRA40 só pode existir uma vez por conta, mesmo com confirmações concorrentes.
CREATE UNIQUE INDEX IF NOT EXISTS compras_primeira40_por_usuario
  ON compras_demonstrativas(usuario_id) WHERE cupom_codigo = 'PRIMEIRA40';

-- Histórico: as compras mais recentes de cada conta.
CREATE INDEX IF NOT EXISTS compras_usuario_recentes_idx
  ON compras_demonstrativas(usuario_id, criada_em DESC, id DESC);
