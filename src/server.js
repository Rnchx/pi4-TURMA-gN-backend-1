import { pathToFileURL } from 'node:url';
import { readConfig } from './config.js';
import { createDatabase, checkDatabase } from './database/index.js';
import { createApp } from './app.js';

export async function startServer(config = readConfig()) {
  const database = createDatabase(config.database);
  const app = createApp({ db: database.db, origins: config.origins });
  let server;
  try {
    server = await new Promise((resolve, reject) => {
      const instance = app.listen(config.port, () => resolve(instance));
      instance.once('error', reject);
    });
  } catch (error) {
    await database.close();
    throw error;
  }
  console.log(`API SAFRA escutando na porta ${config.port}.`);
  try {
    await checkDatabase(database.db);
    console.log('PostgreSQL disponível.');
  } catch {
    console.warn('PostgreSQL indisponível. HTTP ativo; consulte /health/ready.');
  }
  const close = async () => {
    await new Promise(resolve => {
      server.close(resolve);
      server.closeIdleConnections();
    });
    await database.close();
  };
  return { server, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const running = await startServer();
    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      const timer = setTimeout(() => process.exit(1), 5000).unref();
      try {
        await running.close();
      } catch {
        console.error('Falha ao encerrar a API.');
        process.exitCode = 1;
      } finally { clearTimeout(timer); }
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch {
    console.error('Falha ao iniciar a API. Confira a configuração e a disponibilidade da porta.');
    process.exitCode = 1;
  }
}
