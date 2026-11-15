import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ApiError } from '../http/errors.js';

const tokenHash = token => createHash('sha256').update(token, 'utf8').digest('hex');
const credentials = body => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'dadosInvalidos', 'Revise os dados informados.');
  return body;
};

export default class Auth {
  constructor(db, java, ttlHours = 168) {
    this.db = db;
    this.java = java;
    this.ttlHours = ttlHours;
  }

  register(body) {
    const data = credentials(body);
    return this.java('cadastrarUsuario', {
      nome: data.nome, cpf: data.cpf, email: data.email,
      senha: data.senha, confirmacaoSenha: data.confirmacaoSenha, dataNascimento: data.dataNascimento,
    });
  }

  async login(body) {
    const data = credentials(body);
    const result = await this.java('autenticarUsuario', { email: data.email, senha: data.senha });
    const token = randomBytes(32).toString('base64url');
    await this.db.none(`INSERT INTO sessoes(id, usuario_id, token_hash, expira_em)
      VALUES($1, $2, $3, now() + ($4 * interval '1 hour'))`, [randomUUID(), result.usuario.id, tokenHash(token), this.ttlHours]);
    return { token, usuario: result.usuario, expiraEmHoras: this.ttlHours };
  }

  async session(token) {
    if (typeof token !== 'string' || token.length < 32 || token.length > 200) throw new ApiError(401, 'naoAutorizado', 'Faça login para continuar.');
    const row = await this.db.oneOrNone(`UPDATE sessoes s SET ultimo_uso_em = now()
      FROM usuarios u WHERE s.usuario_id = u.id AND s.token_hash = $1 AND s.revogada_em IS NULL
        AND s.expira_em > now() AND u.ativo
      RETURNING s.id AS sessao_id, u.id, u.nome, u.email, u.criado_em`, [tokenHash(token)]);
    if (!row) throw new ApiError(401, 'naoAutorizado', 'Sua sessão expirou. Entre novamente.');
    return { sessionId: row.sessao_id, usuario: { id: row.id, nome: row.nome, email: row.email, criadoEm: row.criado_em } };
  }

  logout(token) {
    return this.db.none('UPDATE sessoes SET revogada_em = now() WHERE token_hash = $1 AND revogada_em IS NULL', [tokenHash(token)]);
  }

  profile(usuarioId) {
    return this.java('obterPerfil', { usuarioId });
  }

  updateProfile(usuarioId, body) {
    return this.java('atualizarPerfil', { ...credentials(body), usuarioId });
  }

  changePassword(usuarioId, body) {
    return this.java('alterarSenha', { ...credentials(body), usuarioId });
  }

  deleteAccount(usuarioId, body) {
    return this.java('excluirConta', { ...credentials(body), usuarioId });
  }
}
