import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createDatabase } from '../../src/database/index.js';

export async function temporaryPostgres() {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const directory = await mkdtemp(join(tmpdir(), 'safra-ciclo2-'));
  const options = { host: '127.0.0.1', port, user: 'safra_test', password: randomBytes(24).toString('hex'),
    database: 'postgres', connectionTimeoutMillis: 1000, query_timeout: 2000, max: 5 };
  const postgres = new EmbeddedPostgres({
    databaseDir: join(directory, 'pgdata'), port, user: options.user, password: options.password,
    authMethod: 'scram-sha-256', persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-h', '127.0.0.1'],
    onLog: () => {}, onError: () => {},
  });
  const database = createDatabase(options);
  const { pg_ctl } = await import(`@embedded-postgres/${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`);
  const exec = (file, args) => new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('pg_ctl falhou; confira o log do cluster temporário.')));
  });
  let running = false;
  const start = async () => {
    await exec(pg_ctl, ['start', '-D', join(directory, 'pgdata'), '-o', `-h 127.0.0.1 -p ${port}`,
      '-l', join(directory, 'postgres.log'), '-w']);
    running = true;
  };
  const stop = async () => {
    if (!running) return;
    await exec(pg_ctl, ['stop', '-D', join(directory, 'pgdata'), '-m', 'fast', '-w']);
    running = false;
  };
  try {
    await postgres.initialise();
    await start();
  } catch (error) {
    await database.close();
    await stop().catch(() => {});
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return { ...database, options, directory, stop, postgres: { start },
    async cleanup() {
      await database.close();
      await stop();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
