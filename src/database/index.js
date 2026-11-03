import pgPromise from 'pg-promise';

// Construir o pool não executa SQL nem abre conexões.
export function createDatabase(options) {
  const pgp = pgPromise({ error: () => {} });
  const db = pgp(options);
  return { db, close: () => db.$pool.end() };
}

export async function checkDatabase(db) {
  await db.one('SELECT 1 AS ok');
}
