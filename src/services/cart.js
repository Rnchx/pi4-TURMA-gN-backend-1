import { randomUUID } from 'node:crypto';
import { ApiError } from '../http/errors.js';

const money = value => Number(value);

const item = row => ({
  produtoId: row.produto_id,
  nome: row.nome,
  quantidade: row.quantidade,
  precoUnitario: money(row.preco_unitario),
  subtotal: money(row.subtotal),
});

const closed = () => new ApiError(409, 'carrinhoFechado', 'O carrinho não pode ser alterado.');

export default class Cart {
  constructor(db, carts) {
    this.db = db;
    this.carts = carts;
  }

  // CT8 adicionarItemAoCarrinho (OP#588): cria o carrinho de visitante quando necessário e
  // soma a quantidade quando o produto já está no carrinho (OP#591), sem duplicar a linha.
  add({ carrinhoId, produtoId, quantidade }) {
    return this.db.tx(async t => {
      let cart;
      if (carrinhoId) {
        cart = await this.carts.lock(t, carrinhoId);
        if (!cart) throw new ApiError(404, 'recursoNaoEncontrado', 'Carrinho ou produto não encontrado.');
        if (cart.status !== 'aberto') throw closed();
      }
      const product = await this.carts.activeProduct(t, produtoId);
      if (!product) throw new ApiError(404, 'recursoNaoEncontrado', 'Carrinho ou produto não encontrado.');
      cart ??= await this.carts.create(t, randomUUID());
      const row = await this.carts.addItem(t, cart.id, produtoId, quantidade, product.preco);
      if (!row) throw new ApiError(400, 'entradaInvalida', 'Revise o produto e a quantidade.');
      await this.carts.touch(t, cart.id);
      return {
        carrinhoId: cart.id,
        mensagem: 'Produto adicionado ao carrinho.',
        item: { produtoId: row.produto_id, quantidade: row.quantidade, precoUnitario: money(row.preco_unitario), subtotal: money(row.subtotal) },
        total: money(await this.carts.total(t, cart.id)),
      };
    });
  }

  // CT11 consultarCarrinho (OP#589), com subtotais e total calculados no banco (OP#594/OP#597).
  async get(carrinhoId) {
    const cart = await this.carts.find(this.db, carrinhoId);
    if (!cart) throw new ApiError(404, 'carrinhoNaoEncontrado', 'Carrinho não encontrado.');
    const rows = await this.carts.items(this.db, carrinhoId);
    return {
      carrinhoId: cart.id,
      status: cart.status,
      itens: rows.map(item),
      total: money(await this.carts.total(this.db, carrinhoId)),
      carrinhoVazio: rows.length === 0,
    };
  }

  // CT12 alterarQuantidadeItem (OP#592/OP#593): mantém o preço persistido no carrinho.
  updateQuantity({ carrinhoId, produtoId, quantidade }) {
    return this.db.tx(async t => {
      const cart = await this.carts.lock(t, carrinhoId);
      if (!cart) throw new ApiError(404, 'itemNaoEncontrado', 'Item do carrinho não encontrado.');
      if (cart.status !== 'aberto') throw closed();
      const row = await this.carts.setQuantity(t, carrinhoId, produtoId, quantidade);
      if (!row) throw new ApiError(404, 'itemNaoEncontrado', 'Item do carrinho não encontrado.');
      await this.carts.touch(t, carrinhoId);
      return {
        carrinhoId,
        produtoId: row.produto_id,
        quantidade: row.quantidade,
        precoUnitario: money(row.preco_unitario),
        subtotal: money(row.subtotal),
        total: money(await this.carts.total(t, carrinhoId)),
      };
    });
  }

  // CT13 removerItemDoCarrinho (OP#595/OP#596): devolve o estado restante e sinaliza carrinho vazio.
  removeItem(carrinhoId, produtoId) {
    return this.db.tx(async t => {
      const cart = await this.carts.lock(t, carrinhoId);
      if (!cart) throw new ApiError(404, 'itemNaoEncontrado', 'Item do carrinho não encontrado.');
      if (cart.status !== 'aberto') throw closed();
      if (!await this.carts.removeItem(t, carrinhoId, produtoId)) {
        throw new ApiError(404, 'itemNaoEncontrado', 'Item do carrinho não encontrado.');
      }
      await this.carts.touch(t, carrinhoId);
      const rows = await this.carts.items(t, carrinhoId);
      return {
        carrinhoId,
        removido: true,
        itens: rows.map(item),
        total: money(await this.carts.total(t, carrinhoId)),
        carrinhoVazio: rows.length === 0,
      };
    });
  }

  // CT14 obterResumoCompra (OP#598): mesmo conteúdo lógico de CT11, recalculado no banco.
  async summary(carrinhoId) {
    const cart = await this.carts.find(this.db, carrinhoId);
    if (!cart) throw new ApiError(404, 'carrinhoNaoEncontrado', 'Carrinho não encontrado.');
    const rows = await this.carts.items(this.db, carrinhoId);
    return {
      carrinhoId: cart.id,
      itens: rows.map(item),
      total: money(await this.carts.total(this.db, carrinhoId)),
      podeConfirmar: cart.status === 'aberto' && rows.length > 0 && rows.every(row => row.disponivel),
    };
  }
}
