const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'src', 'pages', 'Admin.tsx');
let admin = fs.readFileSync(adminPath, 'utf8');

// Find the exact marker from the dump output:
// "                </div>\r\n                            </div>\r\n                         </div>\r\n\r\n                         {/* Regional Copy */}
const idx = admin.indexOf('{/* Regional Copy */}');
if (idx === -1) { console.error('Regional Copy not found'); process.exit(1); }

// Find start of that line
const lineStart = admin.lastIndexOf('\n', idx) + 1;
// Extract what's before it (the blank line + closing divs)
const contextBefore = admin.slice(lineStart - 250, lineStart);
console.log('Context before Regional Copy:');
console.log(JSON.stringify(contextBefore));
