const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Admin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const blockEditor = `
                    {/* BLOCK EDITOR: O Que Esta Incluso + Ideal Para */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                      {/* O QUE ESTA INCLUSO */}
                      <div className="bg-gray-50/60 rounded-[2.5rem] border border-black/[0.04] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#d82828]/10 rounded-xl flex items-center justify-center">
                              <Check size={16} className="text-[#d82828]" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-950">O Que Esta Incluso</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, whatsIncluded: [...(prev.whatsIncluded || []), ""] }))}
                            className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center hover:bg-[#d82828] transition-all shadow-lg active:scale-90"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(formData.whatsIncluded || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                              <div className="w-6 h-6 bg-[#d82828]/10 rounded-lg flex items-center justify-center shrink-0">
                                <Check size={12} className="text-[#d82828]" />
                              </div>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const arr = [...(formData.whatsIncluded || [])];
                                  arr[i] = e.target.value;
                                  setFormData(prev => ({ ...prev, whatsIncluded: arr }));
                                }}
                                placeholder={\`Item \${i + 1}...\`}
                                className="flex-1 h-11 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl px-4 outline-none text-sm font-medium transition-all shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, whatsIncluded: (prev.whatsIncluded || []).filter((_, idx) => idx !== i) }))}
                                className="w-9 h-9 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {(formData.whatsIncluded || []).length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Clique em + para adicionar</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* IDEAL PARA */}
                      <div className="bg-gray-50/60 rounded-[2.5rem] border border-black/[0.04] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black/5 rounded-xl flex items-center justify-center">
                              <Star size={16} className="text-gray-700" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-950">Ideal Para</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, idealFor: [...(prev.idealFor || []), ""] }))}
                            className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center hover:bg-[#d82828] transition-all shadow-lg active:scale-90"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(formData.idealFor || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                              <div className="w-6 h-6 bg-black/5 rounded-lg flex items-center justify-center shrink-0">
                                <ChevronRight size={12} className="text-gray-500" />
                              </div>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const arr = [...(formData.idealFor || [])];
                                  arr[i] = e.target.value;
                                  setFormData(prev => ({ ...prev, idealFor: arr }));
                                }}
                                placeholder={\`Perfil \${i + 1}...\`}
                                className="flex-1 h-11 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl px-4 outline-none text-sm font-medium transition-all shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, idealFor: (prev.idealFor || []).filter((_, idx) => idx !== i) }))}
                                className="w-9 h-9 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {(formData.idealFor || []).length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Clique em + para adicionar</p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
`;

// Marker to find where to insert (just before the Actions comment)
const marker = '{/* Actions */}';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('ERROR: Marker not found!');
  process.exit(1);
}

// Find the start of the line containing the marker
const lineStart = content.lastIndexOf('\n', idx) + 1;
const insertion = blockEditor + '\r\n';
content = content.slice(0, lineStart) + insertion + content.slice(lineStart);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Block editor injected at line index', lineStart);
