CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL UNIQUE CHECK (length(trim(nome)) > 0),
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE subcategorias (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nome VARCHAR(100) NOT NULL CHECK (length(trim(nome)) > 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (categoria_id, nome),
  UNIQUE (categoria_id, id)
);

CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  subcategoria_id INTEGER NOT NULL,
  nome VARCHAR(255) NOT NULL CHECK (length(trim(nome)) > 0),
  descricao VARCHAR(500) NOT NULL CHECK (length(trim(descricao)) > 0),
  imagem_url TEXT NOT NULL CHECK (imagem_url ~ '^https://'),
  preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  em_oferta BOOLEAN NOT NULL DEFAULT false,
  preco_anterior NUMERIC(10,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  validade VARCHAR(50) NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  demo_chave TEXT UNIQUE,
  FOREIGN KEY (categoria_id, subcategoria_id) REFERENCES subcategorias(categoria_id, id),
  CHECK ((em_oferta AND preco_anterior IS NOT NULL AND preco_anterior > preco)
    OR (NOT em_oferta AND preco_anterior IS NULL))
);

CREATE INDEX produtos_classificacao_idx ON produtos(categoria_id, subcategoria_id);
CREATE INDEX produtos_subcategoria_idx ON produtos(subcategoria_id);

-- Importação única do esquema legado. As tabelas de origem são preservadas.
-- Dados incompatíveis fazem a transação falhar; nada é apagado ou corrigido silenciosamente.
DO $$
BEGIN
  IF to_regclass('public.categorys') IS NOT NULL THEN
    INSERT INTO categorias(id, nome) SELECT id, name FROM categorys;
  END IF;
  IF to_regclass('public.products') IS NOT NULL THEN
    INSERT INTO subcategorias(categoria_id, nome)
      SELECT DISTINCT idcategory, type FROM products ORDER BY idcategory, type;
    INSERT INTO produtos(id, categoria_id, subcategoria_id, nome, descricao, imagem_url, preco, validade)
      SELECT p.id, p.idcategory, s.id, p.name, p.description, p.photo, p.price, p.validity
      FROM products p JOIN subcategorias s ON s.categoria_id = p.idcategory AND s.nome = p.type;
  END IF;
END $$;

SELECT setval(pg_get_serial_sequence('categorias', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM categorias;
SELECT setval(pg_get_serial_sequence('produtos', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM produtos;
