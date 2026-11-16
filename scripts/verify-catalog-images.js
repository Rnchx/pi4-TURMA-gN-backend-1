// Verificação do catálogo demonstrativo. Sem argumentos, valida offline; com --online, confirma também
// que cada URL da curadoria responde com Content-Type de imagem.
import { demoProducts, originalProductCount, curatedImageCount, pendingManualImageCount } from '../src/database/demo-products.js';
import { catalogCuration } from '../src/database/catalog-curation.js';
import { catalogProblems } from '../src/database/catalog-rules.js';

const problems = catalogProblems(demoProducts, catalogCuration);
const withImage = demoProducts.filter(product => product.imagem !== null).length;
const pending = demoProducts.filter(product => product.imagem === null).length;
if (withImage !== originalProductCount + curatedImageCount) problems.push(`${withImage} produtos com imagem (esperado ${originalProductCount + curatedImageCount}).`);
if (pending !== pendingManualImageCount) problems.push(`${pending} produtos pendentes (esperado ${pendingManualImageCount}).`);

if (process.argv.includes('--online')) {
  for (const { chave, imagem } of catalogCuration) {
    try {
      const response = await fetch(imagem, { method: 'HEAD', redirect: 'follow' });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.startsWith('image/')) problems.push(`${chave}: ${imagem} respondeu ${response.status} ${type}.`);
    } catch {
      problems.push(`${chave}: ${imagem} inacessível.`);
    }
  }
}

if (problems.length) {
  console.error(`Catálogo inconsistente:\n- ${problems.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`${withImage} produtos com imagem direta (${originalProductCount} originais + ${curatedImageCount} da curadoria); `
    + `${pending} aguardam decisão manual.`);
}
