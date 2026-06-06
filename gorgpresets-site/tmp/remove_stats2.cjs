const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Admin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove the 4 stat calculation lines + comment
const block = `  // Statistics Calculation\r\n  const totalProducts = products.length;\r\n  const totalSalesCount = products.reduce((acc, p) => acc + (p.salesCount || 0), 0);\r\n  const estimatedRevenue = products.reduce((acc, p) => acc + ((p.salesCount || 0) * (p.price || 0)), 0);\r\n  const averagePrice = totalProducts > 0 ? (products.reduce((acc, p) => acc + (p.price || 0), 0) / totalProducts) : 0;\r\n`;

if (!content.includes(block)) {
  // Try LF version
  const blockLF = block.replace(/\r\n/g, '\n');
  if (content.includes(blockLF)) {
    content = content.replace(blockLF, '');
    console.log('Removed (LF)');
  } else {
    console.error('Block not found - dumping context:');
    const idx = content.indexOf('Statistics Calculation');
    console.log(JSON.stringify(content.slice(idx, idx + 300)));
    process.exit(1);
  }
} else {
  content = content.replace(block, '');
  console.log('Removed (CRLF)');
}

// Also remove unused imports: TrendingUp, DollarSign, BarChart3
// These might still be used elsewhere, let's check
const stillUsed = ['TrendingUp', 'DollarSign', 'BarChart3'].filter(name => {
  // Count occurrences (more than just in import line)
  const regex = new RegExp(name, 'g');
  const matches = content.match(regex);
  return matches && matches.length > 1; // >1 means used beyond import
});
console.log('Still used after removal:', stillUsed);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS');
