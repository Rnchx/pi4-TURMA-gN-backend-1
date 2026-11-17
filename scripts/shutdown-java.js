// Desligamento ordenado do servidor Java pelo protocolo TCP (PedidoParaSair → ComunicadoDeDesligamento).
// Uso: npm run java:shutdown            (Java na máquina, lê JAVA_TCP_HOST/JAVA_TCP_PORT do .env)
//      docker compose exec api npm run java:shutdown   (Docker: a porta Java é privada da rede interna)
// Código de saída: 0 quando o comunicado chega; 1 em timeout, servidor indisponível ou resposta inesperada.
import 'dotenv/config';
import { requestJavaShutdown } from '../src/services/java-shutdown.js';

function positive(value, fallback, name, max) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) throw new Error(`Configuração inválida: ${name}.`);
  return parsed;
}

try {
  const host = process.env.JAVA_TCP_HOST || 'localhost';
  const port = positive(process.env.JAVA_TCP_PORT, 3000, 'JAVA_TCP_PORT', 65535);
  const timeoutMs = positive(process.env.JAVA_SHUTDOWN_TIMEOUT_MS, 10000, 'JAVA_SHUTDOWN_TIMEOUT_MS', 120000);
  console.log(`Enviando PedidoParaSair ao servidor Java em ${host}:${port}...`);
  const { comunicado } = await requestJavaShutdown({ host, port, timeoutMs });
  console.log(`ComunicadoDeDesligamento recebido: "${comunicado.mensagem}"`);
  console.log('O servidor Java avisou os clientes ativos e está encerrando sockets, threads e o pool do banco.');
} catch (error) {
  console.error(`Falha ao desligar o servidor Java: ${error.message}`);
  process.exitCode = 1;
}
