const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Admin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start and end of the integration tab block
const startMarker = '{/* INTEGRATION TAB */}';
const endMarker = '{/* PROMO BAR TAB */}';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('ERROR: Markers not found!', { startIdx, endIdx });
  process.exit(1);
}

const newIntegrationTab = `{/* INTEGRATION TAB */}
        {activeTab === 'integration' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
             <div className="bg-white/70 backdrop-blur-3xl rounded-[3rem] md:rounded-[4rem] border border-white shadow-[0_30px_100px_rgba(0,0,0,0.05)] p-10 md:p-16 space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-black/[0.03]">
                   <div className="flex items-center gap-6">
                      <motion.div whileHover={{ scale: 1.1, rotate: 12 }} className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-black/10">
                         <Zap className="text-amber-500 fill-amber-500" size={28} />
                      </motion.div>
                      <div>
                         <h2 className="text-2xl md:text-4xl font-black uppercase tracking-[-0.04em] italic leading-none">Integração de <span className="text-[#d82828]">Checkout</span></h2>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3 italic">Compatível com qualquer plataforma</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 px-6 h-14 bg-gray-50/50 rounded-2xl border border-black/5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sistema Ativo</span>
                   </div>
                </div>

                {/* Toggle do Carrinho */}
                <div className="group relative">
                   <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/0 via-emerald-500/[0.02] to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl" />
                   <div className="relative bg-white/40 backdrop-blur-sm p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border border-black/[0.03] flex items-center justify-between hover:border-emerald-500/10 transition-all shadow-sm">
                     <div className="flex items-center gap-6 md:gap-8">
                       <div className={"w-16 h-16 md:w-20 md:h-20 rounded-3xl md:rounded-[2rem] flex items-center justify-center transition-all duration-500 " + (siteSettings.integration.isCartEnabled ? 'bg-emerald-50 text-emerald-500 shadow-lg shadow-emerald-500/10 scale-110' : 'bg-gray-100 text-gray-300')}>
                          <ShoppingBag size={32} strokeWidth={2.5} />
                       </div>
                       <div>
                         <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-950">Carrinho da Loja</h3>
                         <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">
                           {siteSettings.integration.isCartEnabled
                             ? 'ATIVO — cliente acumula produtos e finaliza tudo junto'
                             : 'INATIVO — ao clicar em Comprar, vai direto ao checkout do produto'}
                         </p>
                         <p className="text-[9px] text-gray-300 mt-2 font-medium">Ative para permitir que o cliente adicione múltiplos presets antes de pagar</p>
                       </div>
                     </div>
                     <button
                       onClick={async () => {
                         const n = !siteSettings.integration.isCartEnabled;
                         setSiteSettings(prev => ({ ...prev, integration: { ...prev.integration, isCartEnabled: n } }));
                         await saveSetting('integration', { ...siteSettings.integration, isCartEnabled: n });
                         toast.success("Carrinho " + (n ? 'ativado' : 'desativado') + "!");
                       }}
                       className={"w-20 h-10 md:w-24 md:h-12 rounded-full relative transition-all flex-shrink-0 shadow-inner " + (siteSettings.integration.isCartEnabled ? 'bg-emerald-500' : 'bg-gray-200')}
                     >
                       <motion.div
                         animate={{ x: siteSettings.integration.isCartEnabled ? 'calc(100% - 32px - 8px)' : '8px' }}
                         className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full absolute top-1 shadow-2xl flex items-center justify-center"
                       >
                         <div className={"w-1.5 h-1.5 rounded-full " + (siteSettings.integration.isCartEnabled ? 'bg-emerald-500' : 'bg-gray-300')} />
                       </motion.div>
                     </button>
                   </div>
                </div>

                {/* Plataformas Compatíveis */}
                <div className="space-y-5">
                   <div className="flex items-center gap-3 px-1">
                      <div className="w-1 h-6 bg-[#d82828] rounded-full" />
                      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-700">Plataformas de checkout compatíveis</p>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {[
                       { name: 'GGCheckout', emoji: '⚡' },
                       { name: 'Hotmart', emoji: '🔥' },
                       { name: 'Kiwify', emoji: '🥝' },
                       { name: 'Lastlink', emoji: '🔗' },
                       { name: 'Monetizze', emoji: '💳' },
                       { name: 'Eduzz', emoji: '🚀' },
                     ].map(p => (
                       <div key={p.name} className="flex items-center gap-3 bg-gray-50/80 border border-black/[0.04] rounded-2xl px-4 py-3 hover:bg-white hover:shadow-md transition-all cursor-default">
                         <span className="text-lg">{p.emoji}</span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">{p.name}</span>
                         <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                       </div>
                     ))}
                   </div>
                   <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest text-center">Cole a URL de checkout de qualquer plataforma no campo abaixo</p>
                </div>

                {/* URL Base do Checkout */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">URL do Carrinho (compra com múltiplos produtos)</p>
                   </div>
                   <div className="group/inp relative">
                      <div className="absolute inset-y-0 left-8 flex items-center text-gray-300 group-focus-within/inp:text-black transition-colors">
                         <Globe size={18} />
                      </div>
                      <input
                         value={siteSettings.integration.checkoutBaseUrl}
                         onChange={(e) => setSiteSettings(prev => ({ ...prev, integration: { ...prev.integration, checkoutBaseUrl: e.target.value } }))}
                         className="w-full h-20 md:h-24 bg-gray-50/50 hover:bg-white focus:bg-white rounded-[1.5rem] md:rounded-[2.5rem] pl-16 pr-10 font-mono text-[10px] md:text-xs outline-none border border-black/[0.03] focus:border-black transition-all shadow-sm focus:shadow-2xl"
                         placeholder="https://pay.hotmart.com/... | https://checkout.kiwify.com.br/..."
                      />
                   </div>
                   <p className="text-[10px] text-gray-400 font-medium px-2 leading-relaxed">
                     Esta URL é usada quando o carrinho está <strong>ativo</strong> e o cliente finaliza com múltiplos produtos. Para compra direta de <strong>1 produto</strong>, configure a URL individualmente em cada produto do catálogo.
                   </p>
                </div>

                {/* Botão Salvar */}
                <Button
                   onClick={() => handleSaveSettings('integration')}
                   disabled={isSavingSettings}
                   className="w-full h-20 md:h-24 bg-black hover:bg-[#d82828] text-white rounded-[2rem] md:rounded-[3rem] font-black uppercase tracking-[0.4em] shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:shadow-[0_25px_60px_rgba(216,40,40,0.3)] transition-all flex items-center justify-center gap-5 group active:scale-[0.98] text-sm"
                >
                   {isSavingSettings ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} className="group-hover:scale-110 transition-transform" strokeWidth={2.5} />}
                   <span>Salvar Configurações</span>
                </Button>
             </div>
          </div>
        )}

        `;

// Replace from start of integration tab to just before promoBar tab
const before = content.slice(0, startIdx);
const after = content.slice(endIdx);
content = before + newIntegrationTab + after;

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Integration tab replaced!');
