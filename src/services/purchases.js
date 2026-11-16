import { randomUUID } from 'node:crypto';
import { ApiError } from '../http/errors.js';

const money = value => Number(value);
const MAX_QUANTITY = 99;
const HISTORY_LIMIT = 3;

const historyItem = item => ({
  produtoId: Number(item.produtoId),
  nome: item.nome,
  quantidade: item.quantidade,
  precoUnitario: money(item.precoUnitario),
  subtotal: money(item.subtotal),
});

const historyPurchase = compra => ({
  compraId: compra.compraId,
  confirmacaoId: compra.confirmacaoId,
  criadaEm: compra.criadaEm,
  metodoPagamento: compra.metodoPagamento,
  subtotal: money(compra.subtotal),
  cupom: compra.cupom ?? null,
  desconto: money(compra.desconto),
  total: money(compra.total),
  quantidadeItens: compra.quantidadeItens,
  itens: (compra.itens || []).map(historyItem),
});

const BLOCKED_AGE = new Set(['restricaoEtaria', 'dataNascimentoAusente']);

// CT24 histórico e CT25 "Adicionar novamente ao carrinho". As compras são lidas pelo serviço Java (TCP),
// sempre filtradas pelo usuário da sessão; a API nunca aceita usuarioId do aplicativo.
export default class Purchases {
  constructor(db, carts, java, validarIdade = async () => {}) {
    this.db = db;
    this.carts = carts;
    this.java = java;
    this.validarIdade = validarIdade;
  }

  async history(usuario) {
    const data = await this.java('listarHistoricoCompras', { usuarioId: usuario.id, limite: HISTORY_LIMIT });
    const compras = (data.compras || []).slice(0, HISTORY_LIMIT).map(historyPurchase);
    return { compras, limite: HISTORY_LIMIT };
  }

  // Usa os preços ATUAIS dos produtos ativos; nunca reabre a compra antiga nem reaproveita seus valores.
  // Itens indisponíveis, bloqueados pela idade ou acima do limite de 99 unidades são informados.
  async repeat({ usuario, compraId, carrinhoId }) {
    const compra = await this.java('consultarCompra', { usuarioId: usuario.id, compraId });
    const requested = (compra.itens || []).map(historyItem);

    return this.db.tx(async t => {
      let cart = null;
      if (carrinhoId) {
        const current = await this.carts.lock(t, carrinhoId);
        // Carrinho confirmado, inexistente ou de outra conta não é reutilizado: um novo carrinho é aberto.
        if (current && current.status === 'aberto' && (!current.usuario_id || current.usuario_id === usuario.id)) cart = current;
      }
      const adicionados = [];
      const naoAdicionados = [];
      for (const item of requested) {
        const product = await this.carts.activeProduct(t, item.produtoId);
        if (!product) {
          naoAdicionados.push({ produtoId: item.produtoId, nome: item.nome, motivo: 'indisponivel' });
          continue;
        }
        if (product.idade_minima > 0) {
          try {
            await this.validarIdade({ usuarioId: usuario.id, produtoIds: [item.produtoId] });
          } catch (error) {
            if (!(error instanceof ApiError) || !BLOCKED_AGE.has(error.codigo)) throw error;
            naoAdicionados.push({ produtoId: item.produtoId, nome: product.nome, motivo: 'restricaoEtaria' });
            continue;
          }
        }
        cart ??= await this.carts.create(t, randomUUID());
        const existing = await this.carts.quantity(t, cart.id, item.produtoId);
        const quantidade = Math.min(item.quantidade, MAX_QUANTITY - existing);
        if (quantidade < 1) {
          naoAdicionados.push({ produtoId: item.produtoId, nome: product.nome, motivo: 'limiteQuantidade' });
          continue;
        }
        const row = await this.carts.addItem(t, cart.id, item.produtoId, quantidade, product.preco);
        if (!row) {
          naoAdicionados.push({ produtoId: item.produtoId, nome: product.nome, motivo: 'limiteQuantidade' });
          continue;
        }
        adicionados.push({
          produtoId: item.produtoId,
          nome: product.nome,
          quantidade,
          quantidadeNoCarrinho: row.quantidade,
          precoUnitario: money(row.preco_unitario),
          ajustado: quantidade < item.quantidade,
        });
      }
      if (cart) {
        await this.carts.bindUser(t, cart.id, usuario.id);
        await this.carts.touch(t, cart.id);
      }
      const total = cart ? money(await this.carts.total(t, cart.id)) : 0;
      return {
        carrinhoId: cart?.id ?? carrinhoId ?? null,
        adicionados,
        naoAdicionados,
        total,
        mensagem: adicionados.length
          ? (naoAdicionados.length ? 'Alguns itens foram adicionados ao carrinho.' : 'Itens adicionados ao carrinho.')
          : 'Nenhum item pôde ser adicionado ao carrinho.',
      };
    });
  }
}
