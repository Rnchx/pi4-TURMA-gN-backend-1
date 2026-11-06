import 'dotenv/config';

function port(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Configuração inválida: ${name}.`);
  }
  return parsed;
}

export function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const defaults = production ? '' : 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006';
  const origins = (env.CORS_ORIGINS ?? defaults).split(',').map(s => s.trim()).filter(Boolean);
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('Configuração inválida: CORS_ORIGINS.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) {
      throw new Error('CORS_ORIGINS deve conter origens HTTP/HTTPS exatas, sem curingas.');
    }
  }
  const confirmacaoUrl = (env.CONFIRMACAO_URL || 'http://localhost:8080').replace(/\/+$/, '');
  let parsed;
  try { parsed = new URL(confirmacaoUrl); } catch { /* Mensagem pública abaixo. */ }
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Configuração inválida: CONFIRMACAO_URL.');
  }
  return {
    port: port(env.PORT, 4000, 'PORT'),
    origins,
    confirmacaoUrl,
    database: {
      host: env.DB_HOST || 'localhost',
      port: port(env.DB_PORT, 5432, 'DB_PORT'),
      database: env.DB_NAME || 'safra',
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      max: 10,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 10000,
      query_timeout: 3000,
      statement_timeout: 3000,
      application_name: 'safra-online',
    },
  };
}
