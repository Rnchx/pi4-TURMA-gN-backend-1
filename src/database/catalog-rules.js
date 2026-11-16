// Regras do catálogo demonstrativo, compartilhadas pelo verificador (scripts/verify-catalog-images.js) e pelos testes.

// Subcategoria canônica de bebidas +18 dentro de "Bebidas". Grafias como "alcoolicas" ou
// "Bebidas Alcoólicas" são normalizadas para este nome pela migration 007.
export const ALCOHOLIC_SUBCATEGORY = 'alcoólicas';

export const normalize = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// "demonstrativo"/"demonstrativa" e "venda simulada" não fazem parte do rótulo de nenhum produto.
export const DEMO_LABEL = /demonstrativ[oa]s?|venda simulada/i;

const DIRECT_IMAGE = /^https:\/\/i\.imgur\.com\/[A-Za-z0-9]{5,10}\.(jpe?g|png|gif|webp)$/;

export function catalogProblems(products, curation = []) {
  const problems = [];
  const keys = new Set();
  for (const product of products) {
    if (keys.has(product.chave)) problems.push(`demo_chave duplicada: ${product.chave}.`);
    keys.add(product.chave);
    if (product.imagem !== null) {
      let url;
      try { url = new URL(product.imagem); } catch { /* registrado abaixo */ }
      if (!url || url.protocol !== 'https:') problems.push(`${product.chave}: URL de imagem inválida.`);
      if (/imgur\.com\/(a|gallery)\//.test(product.imagem)) problems.push(`${product.chave}: URL de álbum usada como imagem.`);
    }
    if (DEMO_LABEL.test(product.nome) || DEMO_LABEL.test(product.descricao)) problems.push(`${product.chave}: rótulo demonstrativo no nome/descrição.`);
    const alcoholicType = product.categoria === 'Bebidas' && normalize(product.tipo).includes('alcool');
    if (alcoholicType && product.tipo !== ALCOHOLIC_SUBCATEGORY) problems.push(`${product.chave}: subcategoria alcoólica fora do padrão.`);
    if (Boolean(product.alcoolico) !== alcoholicType) problems.push(`${product.chave}: marcador alcoólico incoerente com a subcategoria.`);
    if (product.alcoolico && product.idadeMinima !== 18) problems.push(`${product.chave}: alcoólico sem idade mínima 18.`);
  }
  const byKey = new Map(products.map(product => [product.chave, product]));
  const curatedImages = new Set();
  for (const entry of curation) {
    const product = byKey.get(entry.chave);
    if (!product) { problems.push(`curadoria sem produto: ${entry.chave}.`); continue; }
    if (!DIRECT_IMAGE.test(entry.imagem)) problems.push(`${entry.chave}: URL da curadoria não é direta.`);
    if (curatedImages.has(entry.imagem)) problems.push(`${entry.chave}: imagem repetida na curadoria.`);
    curatedImages.add(entry.imagem);
    if (product.nome !== entry.nome || product.descricao !== entry.descricao || product.imagem !== entry.imagem) {
      problems.push(`${entry.chave}: produto diverge da curadoria.`);
    }
  }
  return problems;
}
