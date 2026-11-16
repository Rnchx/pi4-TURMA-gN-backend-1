-- Identificação explícita de bebidas alcoólicas. A idade mínima continua sendo a regra
-- efetivamente validada pelo serviço Java; este marcador evita inferências por nome/categoria.
ALTER TABLE produtos
  ADD COLUMN alcoolico BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE produtos ADD CONSTRAINT produtos_alcoolico_idade_check
  CHECK (NOT alcoolico OR idade_minima = 18);
