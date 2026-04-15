const fs = require('fs');
const path = require('path');

const detailPath = path.join(__dirname, '..', 'src', 'pages', 'ProductDetail.tsx');
let detail = fs.readFileSync(detailPath, 'utf8');

// Replace all formatCurrency(product.price) with formatCurrency(product.price, { priceUSD: product.priceUSD, priceEUR: product.priceEUR })
// and formatCurrency(product.originalPrice) similarly
// and formatCurrency(product.price / 12) for installments (no manual override)
// and formatCurrency(product.price * 0.95) for pix (no manual override — BRL only)

let count = 0;
detail = detail.replace(/formatCurrency\(product\.price\)/g, () => {
  count++;
  return 'formatCurrency(product.price, { priceUSD: product.priceUSD, priceEUR: product.priceEUR })';
});
detail = detail.replace(/formatCurrency\(product\.originalPrice\)/g, () => {
  count++;
  return 'formatCurrency(product.originalPrice, { priceUSD: product.originalPriceUSD, priceEUR: product.originalPriceEUR })';
});

console.log(`Replaced ${count} occurrences in ProductDetail.tsx`);
fs.writeFileSync(detailPath, detail, 'utf8');
console.log('SUCCESS');
