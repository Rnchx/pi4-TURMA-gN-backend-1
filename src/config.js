import 'dotenv/config';

function port(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Configuração inválida: ${name}.`);
  }
  return parsed;
}

function positiveInteger(value, fallback, name, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
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
  return {
    port: port(env.PORT, 4000, 'PORT'),
    origins,
    java: {
      host: env.JAVA_TCP_HOST || 'localhost',
      port: port(env.JAVA_TCP_PORT, 3000, 'JAVA_TCP_PORT'),
      timeoutMs: positiveInteger(env.JAVA_TCP_TIMEOUT_MS, 5000, 'JAVA_TCP_TIMEOUT_MS', 60000),
      maxMessageBytes: positiveInteger(env.JAVA_TCP_MAX_MESSAGE_BYTES, 32768, 'JAVA_TCP_MAX_MESSAGE_BYTES', 1048576),
    },
    sessionTtlHours: positiveInteger(env.SESSION_TTL_HOURS, 168, 'SESSION_TTL_HOURS', 8760),
    profilePhotoDir: env.PROFILE_PHOTO_DIR || './uploads/profile',
    profilePhotoMaxBytes: positiveInteger(env.PROFILE_PHOTO_MAX_BYTES, 10485760, 'PROFILE_PHOTO_MAX_BYTES', 10485760),
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
