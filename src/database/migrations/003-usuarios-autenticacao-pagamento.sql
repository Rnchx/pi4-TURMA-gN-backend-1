-- Cadastro e autenticação. O CPF é armazenado somente com os 11 dígitos e a senha somente como hash Argon2id.
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  nome VARCHAR(150) NOT NULL CHECK (length(trim(nome)) BETWEEN 3 AND 150),
  cpf CHAR(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
  email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  senha_hash TEXT NOT NULL CHECK (senha_hash LIKE '$argon2id$%'),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessoes (
  id UUID PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  token_hash CHAR(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  ultimo_uso_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expira_em > criada_em)
);

CREATE INDEX sessoes_usuario_idx ON sessoes(usuario_id);
CREATE INDEX sessoes_ativas_idx ON sessoes(token_hash, expira_em) WHERE revogada_em IS NULL;

-- A chave é o SHA-256 do e-mail normalizado: limita tentativas sem manter credenciais em logs ou nesta tabela.
CREATE TABLE tentativas_login (
  identificador_hash CHAR(64) PRIMARY KEY CHECK (identificador_hash ~ '^[0-9a-f]{64}$'),
  tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
  janela_iniciada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  bloqueado_ate TIMESTAMPTZ
);

ALTER TABLE carrinhos ADD COLUMN usuario_id UUID REFERENCES usuarios(id);
ALTER TABLE compras_demonstrativas ADD COLUMN usuario_id UUID REFERENCES usuarios(id);
ALTER TABLE compras_demonstrativas ADD COLUMN metodo_pagamento VARCHAR(20)
  CHECK (metodo_pagamento IN ('pix', 'credito', 'debito', 'dinheiro'));

CREATE INDEX carrinhos_usuario_idx ON carrinhos(usuario_id);
CREATE INDEX compras_usuario_idx ON compras_demonstrativas(usuario_id);
