-- v1.4: o último produto sem foto (vinho tinto) recebe nome, descrição, foto e preço definidos pela equipe.
-- Idempotente: atualiza somente se algum dos campos ainda for diferente. Oferta, validade, categoria,
-- subcategoria (alcoólicas), idade mínima (18) e marcador alcoólico permanecem inalterados.
UPDATE produtos SET
    nome = 'Vinho Tinto Don Laurindo Gran Reserva 750ml',
    descricao = '750ml',
    imagem_url = 'https://i.imgur.com/1ivZIET.jpeg',
    preco = 795.00,
    atualizado_em = now()
  WHERE demo_chave = 'setores-bebida-vinho'
    AND NOT em_oferta
    AND (nome, descricao, imagem_url, preco) IS DISTINCT FROM
        ('Vinho Tinto Don Laurindo Gran Reserva 750ml', '750ml', 'https://i.imgur.com/1ivZIET.jpeg', 795.00::numeric(10,2));
