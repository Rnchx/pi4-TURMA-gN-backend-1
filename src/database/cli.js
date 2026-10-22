import { readConfig } from '../config.js';
import { createDatabase, checkDatabase } from './index.js';
import { migrate } from './migrate.js';
import { seed } from './seed.js';

let database;
try {
  const command = process.argv[2];
  if (!['check', 'migrate', 'seed'].includes(command)) throw new Error('Comando inválido.');
  database = createDatabase(readConfig().database);
  await checkDatabase(database.db);
  if (command === 'migrate') await migrate(database.db);
  if (command === 'seed') await seed(database.db);
  console.log(`Banco: ${command} concluído.`);
} catch {
  console.error('Não foi possível executar a operação do banco. Confira a configuração e as migrations.');
  process.exitCode = 1;
} finally {
  await database?.close();
}
