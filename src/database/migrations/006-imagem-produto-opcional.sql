-- Produtos adicionados após o catálogo original aguardam curadoria manual de imagem.
ALTER TABLE produtos
  ALTER COLUMN imagem_url DROP NOT NULL;

ALTER TABLE produtos
  DROP CONSTRAINT IF EXISTS produtos_imagem_url_check;

ALTER TABLE produtos
  ADD CONSTRAINT produtos_imagem_url_check
  CHECK (imagem_url IS NULL OR imagem_url ~ '^https://');
