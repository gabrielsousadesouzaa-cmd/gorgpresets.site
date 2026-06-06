const fs = require('fs');
const path = 'c:/Users/anton/gorgpresets/site-vendas/src/pages/Admin.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                            </div>
                                     <div className="pt-10 border-t border-black/5 space-y-6">`;

const replacement = `                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>
                <div className="pt-10 border-t border-black/5 space-y-6">`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log('Fixed successfully');
} else {
  console.log('Target not found');
  // Try with flexible spacing
  const flexibleTarget = /<\/div>\s+<div className="pt-10 border-t border-black\/5 space-y-6">/;
  if (flexibleTarget.test(content)) {
    content = content.replace(flexibleTarget, replacement);
    fs.writeFileSync(path, content);
    console.log('Fixed with regex');
  } else {
    console.log('Even regex failed');
  }
}
