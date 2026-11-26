# Roteiro da apresentação final — SAFRA Online

**Grupo:** PROJETO-0101 — Grupo 01
**Data:** quinta, 26/11/2026, às 19h59
**Duração:** 10 minutos — 5 de apresentação e 5 de arguição

A apresentação termina aos 5:00 mesmo que não tenha acabado, e o cumprimento do tempo faz parte da nota. No horário do grupo, o computador já precisa estar ligado, com os slides abertos e o sistema no ar (ou o vídeo carregado).

## Divisão do tempo

| Tempo | Parte | Slide |
|---|---|---|
| 0:00–1:00 | O problema: que situação o SAFRA resolve e para quem | Capa e "O problema" |
| 1:00–4:00 | O sistema funcionando, do cadastro à compra confirmada | "Um caso do começo ao fim" e passos 1 a 4 |
| 4:00–5:00 | Como é montado: contêineres e socket TCP entre os backends | "Três contêineres e um socket TCP" |
| 5:00–10:00 | Arguição | "Obrigado. Perguntas?" |

## Demonstração (1:00–4:00)

O sistema sobe com `docker compose up -d --build` (ver o [README](../../README.md)). A compra é demonstrativa, sem cobrança.

| Tempo | Passo | O que fazer | O que falar |
|---|---|---|---|
| 1:00–1:45 | 1. Entrar e achar o produto | Criar uma conta nova e abrir um setor | Cadastro validado pelo servidor Java (CPF, e-mail, idade); senha em Argon2id; catálogo vem da API |
| 1:45–2:30 | 2. Montar o carrinho | Adicionar 2 ou 3 produtos, passando de R$ 40, e mudar a quantidade de um | O carrinho guarda o preço do catálogo na adição; subtotal e total vêm prontos da API |
| 2:30–3:15 | 3. Cupom e confirmação | Aplicar `PRIMEIRA40`, escolher o método fictício e confirmar | O Java confere o cupom de novo na confirmação; a chave de idempotência impede compra duplicada |
| 3:15–4:00 | 4. Histórico e ofertas | Abrir o histórico e repetir a compra; se sobrar tempo, mostrar as ofertas | As três últimas compras ficam salvas no PostgreSQL |

A conta precisa ser nova porque o `PRIMEIRA40` só vale na primeira compra. Se o sistema não subir, os slides dos passos 1 a 4 têm as telas e servem de plano B.

## Arguição (5:00–10:00)

As perguntas saem do [Documento de Projeto](../documento-de-projeto.md), do código e do quadro no OpenProject, e o professor escolhe quem responde. Todos precisam conhecer o projeto inteiro. Perguntas prováveis:

- **Por que TCP entre a API e o Java, e não HTTP?** Era requisito do PI IV ter dois backends conversando por socket. A decisão está registrada nas ADRs ([`docs/adr`](../adr)).
- **Como é o protocolo?** Uma mensagem JSON por linha (LF), com `BufferedReader` e `PrintWriter` em UTF-8, sem `Serializable`. Limite de 32 KiB e timeout. Contrato em [`TCP-JSON.md`](../contratos/TCP-JSON.md).
- **O que acontece se o Java cair?** Catálogo e carrinho continuam funcionando; as operações que dependem do Java (login, cupom, confirmação) respondem 503.
- **Como o servidor Java desliga?** `PedidoParaSair` inicia o desligamento: o servidor para de aceitar conexões, envia `ComunicadoDeDesligamento` aos clientes e fecha sockets, executores e o pool do banco.
- **Como evitam compra duplicada?** Cada confirmação leva uma chave de idempotência; repetir com a mesma chave não cria outra compra.
- **Como guardam senha e sessão?** Senha com Argon2id; o token de sessão volta ao cliente e o banco guarda só o SHA-256 dele.
- **Por que a IA ficou de fora?** Falta de tempo e pouco domínio do grupo sobre o tema. Os contratos CT19 a CT21 foram mantidos como evolução futura.
- **Como testaram?** `node:test` e Supertest com PostgreSQL real na API, e JUnit com AssertJ no Java. Roteiro em [`VALIDACAO.md`](../VALIDACAO.md).

## Checklist antes do dia

- [ ] Ensaiar com cronômetro: cinco minutos passam muito rápido
- [ ] Testar o sistema (ou o vídeo) no computador da apresentação
- [ ] Combinar quem fala em cada parte
- [ ] Deixar os dados da conta nova prontos para colar no cadastro
- [ ] Revisar juntos o Documento de Projeto entregue na Tarefa 6
