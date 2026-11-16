# CT23: autenticação, perfil e conta

- **Fronteira pública:** aplicativo SAFRA → API Node.js, HTTP/JSON
- **Fronteira de validação:** API Node.js → serviço Java, TCP/JSON por linha
- **Sessão:** token opaco no cabeçalho `Authorization: Bearer <token>`

## Cadastro

`POST /auth/cadastro` recebe `nome`, `cpf`, `email`, `senha`, `confirmacaoSenha` e `dataNascimento` em `DD/MM/AAAA`. O Java normaliza e valida todos os campos, calcula Argon2id e persiste o usuário. CPF e e-mail são únicos. A data é persistida como `DATE`; idade não é armazenada.

Regras: nome completo sem números; CPF com verificadores válidos; e-mail estruturalmente válido de qualquer domínio; senha com no mínimo 8 caracteres, incluindo maiúscula, minúscula e número; confirmação idêntica; nascimento real e não futuro. A validação de formato não comprova titularidade do e-mail nem idade civil.

## Login

`POST /auth/login` recebe `email` e `senha`. Credenciais inválidas usam uma mensagem genérica. Após cinco falhas na janela de 15 minutos, novas tentativas ficam temporariamente bloqueadas. Em caso de sucesso, a API cria um token aleatório de 256 bits e guarda apenas seu SHA-256 no PostgreSQL.

## Perfil, senha, foto e exclusão

- `GET /auth/perfil`: o Node pede ao Java nome, e-mail, nascimento e idade calculada.
- `PATCH /auth/perfil`: altera somente o nome. CPF, e-mail e nascimento são recusados pelo Java.
- `POST /auth/perfil/alterar-senha`: valida senha atual, grava novo Argon2id e invalida todas as sessões.
- `GET|PUT|DELETE /auth/perfil/foto`: lê, substitui ou remove JPEG/PNG/WebP de até 10 MB. O arquivo fica em volume persistente; o banco guarda uma chave aleatória.
- `DELETE /auth/conta`: exige senha, apaga a conta e sessões, desvincula compras técnicas e remove a foto.
- `POST /auth/logout`: revoga a sessão e responde `204`.

Tokens ausentes, malformados, expirados ou revogados respondem `401` sem revelar detalhes internos. A exclusão não restaura nem reutiliza o UUID da conta antiga; um cadastro posterior é uma conta nova.
