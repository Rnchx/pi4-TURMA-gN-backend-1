import { readdir, readFile } from 'node:fs/promises';

export async function migrate(db) {
  return db.tx(async tx => {
    await tx.any('SELECT pg_advisory_xact_lock(20261022, 2)');
    await tx.none(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome TEXT PRIMARY KEY, aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const directory = new URL('./migrations/', import.meta.url);
    const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
    for (const name of files) {
      if (await tx.oneOrNone('SELECT nome FROM schema_migrations WHERE nome = $1', [name])) continue;
      await tx.any(await readFile(new URL(name, directory), 'utf8'));
      await tx.none('INSERT INTO schema_migrations(nome) VALUES($1)', [name]);
    }
  });
}
