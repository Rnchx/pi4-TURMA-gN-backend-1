import { demoProducts } from '../src/database/demo-products.js';

const products = demoProducts.filter(product => product.chave.startsWith('setores-'));
const failures = [];

for (const product of products) {
  try {
    const response = await fetch(product.imagem, { headers: { Range: 'bytes=0-2047', 'User-Agent': 'SafraOnlineAcademic/1.2' } });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.startsWith('image/')) {
      failures.push(`${product.nome}: HTTP ${response.status}, ${type || 'sem Content-Type'}`);
    }
  } catch (error) {
    failures.push(`${product.nome}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(['Imagens não verificadas:', ...failures.map(item => `- ${item}`)].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`${products.length} imagens novas verificadas com resposta HTTPS de imagem.`);
}
