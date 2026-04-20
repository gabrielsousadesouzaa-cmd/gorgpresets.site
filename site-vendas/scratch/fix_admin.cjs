const fs = require('fs');
const path = 'C:/Users/anton/gorgpresets/site-vendas/src/pages/Admin.tsx';
let content = fs.readFileSync(path, 'utf8');

// The mangled piece I found in view_file
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
  // Try with flexible spacing regex
  const flexibleTarget = /<\/div>\s+<div className="pt-10 border-t border-black\/5 space-y-6">/;
  if (flexibleTarget.test(content)) {
    content = content.replace(flexibleTarget, (match) => {
        // We want to keep the start </div> and add the missing logic then the start of the next div
        return replacement;
    });
    fs.writeFileSync(path, content);
    console.log('Fixed with regex');
  } else {
    console.log('Even regex failed');
    // Let's print a small chunk to see why
    const index = content.indexOf('Nenhum produto fixado nesta seção');
    if (index !== -1) {
        console.log('Snippet around issue:', content.substring(index, index + 300));
    }
  }
}
