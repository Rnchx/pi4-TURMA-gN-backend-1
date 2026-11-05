-- CT9 carrinhos e CT10 itensCarrinho: gravados pela API SAFRA (Node.js).
CREATE TABLE carrinhos (
  id UUID PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'confirmado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE itens_carrinho (
  id SERIAL PRIMARY KEY,
  carrinho_id UUID NOT NULL REFERENCES carrinhos(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL CHECK (quantidade BETWEEN 1 AND 99),
  preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
  UNIQUE (carrinho_id, produto_id)
);

-- CT17 comprasDemonstrativas e CT18 itensCompra: gravados pelo Serviço de Confirmação (Java).
-- A estrutura fica nas migrations da API porque o projeto mantém um único histórico de esquema.
CREATE TABLE compras_demonstrativas (
  id UUID PRIMARY KEY,
  carrinho_id UUID NOT NULL UNIQUE REFERENCES carrinhos(id),
  chave_idempotencia VARCHAR(100) NOT NULL UNIQUE,
  confirmacao_id VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'concluida_demonstrativa' CHECK (status = 'concluida_demonstrativa'),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE itens_compra (
  id SERIAL PRIMARY KEY,
  compra_id UUID NOT NULL REFERENCES compras_demonstrativas(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  nome_produto VARCHAR(255) NOT NULL CHECK (length(trim(nome_produto)) > 0),
  quantidade INTEGER NOT NULL CHECK (quantidade BETWEEN 1 AND 99),
  preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal = quantidade * preco_unitario)
);

CREATE INDEX itens_compra_compra_idx ON itens_compra(compra_id);
