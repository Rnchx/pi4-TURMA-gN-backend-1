import { ApiError } from '../http/errors.js';

const unavailable = () => new ApiError(503, 'confirmacaoIndisponivel', 'Tente novamente mais tarde.');

// Cliente HTTP/JSON do Serviço de Confirmação (CT16). Tempo limite e indisponibilidade viram 503 de CT15.
export function confirmationClient(baseUrl, timeoutMs = 5000) {
  return async payload => {
    let response;
    try {
      response = await fetch(`${baseUrl}/confirmacoes-demonstrativas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw unavailable();
    }
    let body = null;
    try { body = await response.json(); } catch { /* Corpo ausente ou inválido tratado abaixo. */ }
    if ([200, 201].includes(response.status) && body?.compraId && body?.confirmacaoId && body?.geradaEm) {
      return { ...body, criada: response.status === 201 };
    }
    if (response.status === 409) throw new ApiError(409, 'confirmacaoNaoPermitida', 'O carrinho não pode ser confirmado.');
    if (response.status === 503 || response.status === 502 || response.status === 504) throw unavailable();
    throw new Error(`Resposta inesperada do Serviço de Confirmação: ${response.status}`);
  };
}
