-- Perfil, nascimento e restrição etária. A migration é incremental e preserva contas antigas.
ALTER TABLE usuarios
  ADD COLUMN data_nascimento DATE,
  ADD COLUMN foto_perfil_chave VARCHAR(100)
    CHECK (foto_perfil_chave IS NULL OR foto_perfil_chave ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$');

-- Contas novas sempre recebem data_nascimento pelo serviço Java. A coluna permanece nula apenas
-- para usuários legados, pois não é seguro inventar uma data durante a atualização do banco.
ALTER TABLE usuarios ADD CONSTRAINT usuarios_data_nascimento_valida
  CHECK (data_nascimento IS NULL OR data_nascimento <= CURRENT_DATE);

ALTER TABLE produtos ADD COLUMN idade_minima SMALLINT NOT NULL DEFAULT 0
  CHECK (idade_minima IN (0, 18));

-- Preserva a informação histórica de eventuais pagamentos em dinheiro, mas impede novos registros
-- desse tipo: as novas inserções usam legado=false e aceitam somente os quatro meios online.
ALTER TABLE compras_demonstrativas ADD COLUMN metodo_pagamento_legado BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE compras_demonstrativas SET metodo_pagamento_legado = TRUE WHERE metodo_pagamento = 'dinheiro';
ALTER TABLE compras_demonstrativas DROP CONSTRAINT IF EXISTS compras_demonstrativas_metodo_pagamento_check;
ALTER TABLE compras_demonstrativas ADD CONSTRAINT compras_demonstrativas_metodo_pagamento_check CHECK (
  metodo_pagamento IN ('pix', 'credito', 'debito', 'boleto')
  OR (metodo_pagamento = 'dinheiro' AND metodo_pagamento_legado)
);

-- A conta é apagada de fato. Sessões somem; carrinhos e compras demonstrativas permanecem
-- tecnicamente íntegros e irreversivelmente desvinculados da pessoa.
ALTER TABLE sessoes DROP CONSTRAINT sessoes_usuario_id_fkey;
ALTER TABLE sessoes ADD CONSTRAINT sessoes_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE carrinhos DROP CONSTRAINT carrinhos_usuario_id_fkey;
ALTER TABLE carrinhos ADD CONSTRAINT carrinhos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE compras_demonstrativas DROP CONSTRAINT compras_demonstrativas_usuario_id_fkey;
ALTER TABLE compras_demonstrativas ADD CONSTRAINT compras_demonstrativas_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
