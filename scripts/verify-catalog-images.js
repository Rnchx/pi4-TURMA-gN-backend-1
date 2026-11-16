import { demoProducts, originalProductCount, pendingManualImageCount } from '../src/database/demo-products.js';

const withImage = demoProducts.filter(product => product.imagem !== null);
const pending = demoProducts.filter(product => product.imagem === null);
const invalid = withImage.filter(product => {
  try { return new URL(product.imagem).protocol !== 'https:'; } catch { return true; }
});

if (withImage.length !== originalProductCount || pending.length !== pendingManualImageCount || invalid.length) {
  console.error(`Catálogo inconsistente: ${withImage.length} com imagem, ${pending.length} pendentes, ${invalid.length} URLs inválidas.`);
  process.exitCode = 1;
} else {
  console.log(`${withImage.length} URLs originais preservadas; ${pending.length} produtos aguardam imagem manual.`);
}
