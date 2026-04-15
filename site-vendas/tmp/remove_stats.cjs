const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Admin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '{/* Statistics Dashboard */}';
const endMarker = '{/* PRODUCTS TAB */}';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found', { startIdx, endIdx });
  process.exit(1);
}

// Find the beginning of the line that contains startMarker
const lineStart = content.lastIndexOf('\n', startIdx) + 1;

content = content.slice(0, lineStart) + content.slice(endIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Stats dashboard removed!');
