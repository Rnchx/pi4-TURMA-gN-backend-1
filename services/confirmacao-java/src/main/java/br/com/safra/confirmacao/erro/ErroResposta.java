package br.com.safra.confirmacao.erro;

/** Corpo JSON padronizado de erro, no mesmo formato da API Node.js e dos contratos (CT16). */
public record ErroResposta(String codigo, String mensagem) {

    static ErroResposta paraStatus(int status) {
        return switch (status) {
            case 400 -> new ErroResposta("entradaInvalida", "Requisição inválida.");
            case 404 -> new ErroResposta("rotaNaoEncontrada", "Rota não encontrada.");
            case 405 -> new ErroResposta("metodoNaoPermitido", "Método não permitido.");
            case 415 -> new ErroResposta("tipoNaoSuportado", "Tipo de conteúdo não suportado.");
            case 503 -> new ErroResposta("bancoIndisponivel", "Banco de dados indisponível.");
            default -> status >= 400 && status < 500
                    ? new ErroResposta("requisicaoRecusada", "Requisição recusada.")
                    : new ErroResposta("erroInterno", "Erro interno do serviço.");
        };
    }
}
