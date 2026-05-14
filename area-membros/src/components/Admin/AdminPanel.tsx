import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Layout, List, Users, Zap, ShieldCheck, Plus, Edit, Trash2, 
  ImageIcon, Globe, Download, RefreshCw, CheckCircle2, Terminal,
  Settings, Save, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface AdminPanelProps {
  portalData: any
  onUpdate: () => void
  modules: any[]
}

const getInitials = (name: string) => {
  if (!name) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const AdminPanel = ({ portalData, onUpdate, modules }: AdminPanelProps) => {
  const [adminSection, setAdminSection] = useState<'users' | 'content' | 'webhooks' | 'email' | 'structure'>('content');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [emailSettings, setEmailSettings] = useState<any>({ body: '', subject: '', sender: '', api_key: '' });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isEditingPreset, setIsEditingPreset] = useState<any>(null);

  useEffect(() => { fetchData(); }, [adminSection]);

  const fetchData = async () => { 
    setLoading(true);
    if (adminSection === 'users') { 
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); 
      if (data) setUsers(data); 
    }
    if (adminSection === 'webhooks') { 
      const { data } = await supabase.from('webhook_logs').select('*').order('received_at', { ascending: false }).limit(20); 
      if (data) setWebhookLogs(data); 
    }
    setLoading(false);
  }

  const handleEditPresetSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const { modIdx, pIdx } = isEditingPreset;
    const updatedPresets = [...modules[modIdx].presets_data];
    updatedPresets[pIdx] = {
      ...updatedPresets[pIdx],
      name: form.pname.value,
      image: form.pimage.value,
      download_link: form.pdownload.value,
      upsell_link: form.pupsell.value
    };

    const { error } = await supabase.from('modules_presets').update({ presets_data: updatedPresets }).eq('id', modules[modIdx].id);
    if (!error) {
      toast.success('Card atualizado! ✅');
      setIsEditingPreset(null);
      onUpdate();
    }
  }

  return (
    <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 border-b border-black/5 pb-10">
        <div className="flex border-l-4 border-[#d82828] pl-10 flex-col">
          <div className="flex items-center gap-3 text-[#d82828] mb-3">
             <ShieldCheck size={18} />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Cockpit de Comando</span>
          </div>
          <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-tight">Painel de Gestão</h2>
        </div>
        
        <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-[2rem] border border-black/5 shadow-inner overflow-x-auto no-scrollbar">
          {[
            { id: 'content', label: 'Cofre', icon: Layout },
            { id: 'structure', label: 'Seções', icon: List },
            { id: 'users', label: 'Membros', icon: Users },
            { id: 'webhooks', label: 'Conexões', icon: Zap }
          ].map(tab => (
            <button key={tab.id} onClick={() => setAdminSection(tab.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${adminSection === tab.id ? 'bg-[#d82828] text-white shadow-xl shadow-red-900/10' : 'text-gray-400 hover:text-black'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {adminSection === 'content' && (
          <motion.div key="c" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <button onClick={() => { const t = prompt('Título Módulo:'); if (t) supabase.from('modules_presets').insert([{ module_title: t, order_index: modules.length }]).then(() => onUpdate()); }} className="aspect-[16/10] bg-white border-2 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center gap-4 group hover:border-[#d82828]/20 hover:bg-[#d82828]/5 transition-all outline-none shadow-sm">
                   <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#d82828] group-hover:text-white transition-all"><Plus size={24} /></div>
                   <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-black tracking-[0.2em]">Novo Módulo Elite</span>
                </button>
                
                {modules.map((mod, modIdx) => (
                  <div key={mod.id} className="bg-white border border-black/5 p-8 rounded-[3rem] space-y-6 shadow-xl relative group overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-100 transition-all">
                       <Layout size={40} className="text-[#d82828]" />
                     </div>
                     <div className="flex items-center gap-4">
                       <div className="w-1.5 h-6 bg-[#d82828] rounded-full" />
                       <h3 className="text-xl font-black text-black uppercase italic leading-tight truncate">{mod.module_title}</h3>
                     </div>
                     
                     <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                        {mod.presets_data?.map((p: any, pIdx: number) => (
                          <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group/item hover:bg-black hover:text-white transition-all">
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 group-hover/item:bg-white/10"><ImageIcon size={16} /></div>
                              )}
                              <div>
                                <p className="text-[10px] font-black uppercase truncate max-w-[120px]">{p.name}</p>
                                <p className="text-[8px] font-bold text-gray-400 group-hover/item:text-white/50 uppercase tracking-widest">Preset #{pIdx + 1}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                              <button onClick={() => setIsEditingPreset({ modIdx, pIdx, p })} className="p-2 hover:bg-white/10 rounded-lg"><Edit size={12} /></button>
                              <button onClick={async () => {
                                if (confirm('Remover este preset?')) {
                                  const npd = mod.presets_data.filter((_: any, i: number) => i !== pIdx);
                                  await supabase.from('modules_presets').update({ presets_data: npd }).eq('id', mod.id);
                                  onUpdate();
                                }
                              }} className="p-2 hover:bg-red-500 rounded-lg"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                     </div>

                     <button onClick={async () => { 
                       const name = prompt('Nome do Novo Preset:'); 
                       if (name) { 
                         const npd = [...(mod.presets_data || []), { id: Date.now().toString(), name, image: '', download_link: '', upsell_link: '' }]; 
                         const { error } = await supabase.from('modules_presets').update({ presets_data: npd }).eq('id', mod.id); 
                         if (!error) {
                           toast.success('Novo card adicionado! 🚀');
                           onUpdate(); 
                         }
                       } 
                     }} className="w-full py-4 bg-[#d82828] text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                       <Plus size={12} /> NOVO CARD (PRESET)
                     </button>
                  </div>
                ))}
             </div>

             {/* MODAL EDIÇÃO PRESET */}
             <AnimatePresence>
               {isEditingPreset && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                   <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[3rem] p-12 shadow-2xl relative">
                      <button onClick={() => setIsEditingPreset(null)} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"><X size={24} /></button>
                      <h3 className="text-2xl font-black uppercase italic mb-8">Editar Preset</h3>
                      <form onSubmit={handleEditPresetSave} className="space-y-6">
                        <input name="pname" defaultValue={isEditingPreset.p.name} placeholder="Nome do Preset" className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-black font-bold outline-none focus:border-[#d82828] transition-all" />
                        <input name="pimage" defaultValue={isEditingPreset.p.image} placeholder="URL da Imagem" className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-black font-bold outline-none focus:border-[#d82828] transition-all" />
                        <input name="pdownload" defaultValue={isEditingPreset.p.download_link} placeholder="Link de Download" className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-black font-bold outline-none focus:border-[#d82828] transition-all" />
                        <input name="pupsell" defaultValue={isEditingPreset.p.upsell_link} placeholder="Link de Upsell (Bloqueado)" className="w-full bg-gray-50 border border-black/5 rounded-2xl p-5 text-black font-bold outline-none focus:border-[#d82828] transition-all" />
                        <button type="submit" className="w-full py-6 bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Salvar Alterações</button>
                      </form>
                   </motion.div>
                 </motion.div>
               )}
             </AnimatePresence>
          </motion.div>
        )}

        {adminSection === 'structure' && (
          <motion.div key="st" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm p-6 rounded-[2.5rem] border border-black/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/10">
                  <List size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-black">Estrutura da Vitrine</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{modules.length} BLOCOS DE CONTEÚDO ATIVOS</p>
                </div>
              </div>
              <button 
                onClick={() => { const t = prompt('Título da Nova Seção:'); if (t) supabase.from('modules_presets').insert([{ module_title: t, order_index: modules.length, module_desc: '' }]).then(() => onUpdate()); }}
                className="px-6 py-3 bg-[#d82828] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
              >
                <Plus size={14} /> ADICIONAR BLOCO
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {modules.map((mod, idx) => (
                <div key={mod.id} className="bg-white border border-black/5 p-8 rounded-[2.5rem] shadow-xl space-y-6 group hover:border-[#d82828]/20 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-black text-white rounded-lg font-black text-[9px] uppercase tracking-widest">#{idx + 1}</span>
                        <input 
                          defaultValue={mod.module_title}
                          onBlur={async (e) => {
                            if (e.target.value !== mod.module_title) {
                              const { error } = await supabase.from('modules_presets').update({ module_title: e.target.value }).eq('id', mod.id);
                              if (!error) { toast.success('Título atualizado! ✅'); onUpdate(); }
                            }
                          }}
                          className="text-xl font-black text-black uppercase italic bg-transparent border-b-2 border-transparent focus:border-[#d82828] outline-none transition-all w-full max-w-md"
                          placeholder="Título da Seção"
                        />
                      </div>
                      <textarea 
                        defaultValue={mod.module_desc}
                        onBlur={async (e) => {
                          if (e.target.value !== mod.module_desc) {
                            const { error } = await supabase.from('modules_presets').update({ module_desc: e.target.value }).eq('id', mod.id);
                            if (!error) { toast.success('Descrição atualizada! ✅'); onUpdate(); }
                          }
                        }}
                        className="text-[12px] font-medium text-gray-500 bg-gray-50/50 border border-transparent focus:border-[#d82828]/20 rounded-xl p-4 outline-none transition-all w-full resize-none h-20"
                        placeholder="Adicione uma descrição para esta seção..."
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => { if (confirm('Excluir seção inteira?')) supabase.from('modules_presets').delete().eq('id', mod.id).then(() => onUpdate()); }} className="p-4 bg-gray-50 text-gray-300 hover:bg-red-500 hover:text-white rounded-2xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {adminSection === 'users' && (
          <motion.div key="u" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-white border border-black/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3"><Users size={14} /> Base de Membros Elite</h4>
                 <div className="px-4 py-2 bg-[#d82828]/5 text-[#d82828] rounded-full text-[9px] font-black uppercase tracking-widest">{users.length} ATIVOS</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50/50"><th className="px-10 py-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">Identidade</th><th className="px-10 py-5 text-[9px] font-black uppercase text-gray-400 tracking-widest">Produto</th><th className="px-10 py-5 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Ações</th></tr></thead>
                  <tbody className="divide-y divide-black/5">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-black to-gray-800 flex items-center justify-center font-black text-[#d82828] text-xs shadow-lg">{getInitials(u.full_name)}</div>
                            <div>
                               <p className="font-black text-black uppercase italic text-xs">{u.full_name}</p>
                               <p className="text-[10px] text-gray-400 mt-1 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6"><span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Membro Ativo</span></td>
                        <td className="px-10 py-6 text-right">
                           <button className="p-3 bg-black/5 border border-black/10 rounded-xl hover:bg-black hover:text-white transition-all"><Edit size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {adminSection === 'webhooks' && (
          <motion.div key="w" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-black/5 p-10 rounded-[3.5rem] space-y-8 shadow-xl">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#d82828] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/10"><Globe size={20} /></div>
                      <div>
                         <h4 className="text-sm font-black text-black uppercase italic">API Endpoint</h4>
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sincronização Automática</p>
                      </div>
                   </div>
                   <div className="bg-gray-50 border border-black/5 p-6 rounded-2xl flex items-center gap-4 group cursor-pointer" onClick={() => { navigator.clipboard.writeText('https://ibsnizsdascywkonvcvu.supabase.co/functions/v1/webhook-vendas'); toast.success('Link copiado!'); }}>
                      <code className="text-[#d82828] font-black text-xs truncate flex-1">.../functions/v1/webhook-vendas</code>
                      <Download size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                   </div>
                   <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">Cole este link na aba "Webhooks" da sua plataforma de vendas (Kiwify, Hotmart, GG) para liberar os acessos automaticamente.</p>
                </div>

                <div className="bg-white border border-black/5 p-10 rounded-[3.5rem] space-y-8 shadow-xl">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg"><Zap size={20} /></div>
                      <div>
                         <h4 className="text-sm font-black text-black uppercase italic">Status Gate</h4>
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Monitoramento de Fluxo</p>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl">
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">GGCHECKOUT Ativo</span>
                         </div>
                         <Settings size={14} className="text-emerald-300" />
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-white border border-black/5 rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
                <div className="flex items-center justify-between">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3"><Terminal size={14} /> Log de Requisições</h4>
                   <RefreshCw size={14} className="text-gray-300 hover:text-[#d82828] cursor-pointer transition-colors" onClick={fetchData} />
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar font-mono">
                  {webhookLogs.map((log: any) => (
                    <div key={log.id} className="p-4 bg-gray-50 border border-black/5 rounded-2xl text-[10px] flex items-center gap-4 hover:border-[#d82828]/20 transition-all">
                       <span className="text-[#d82828] font-black">200 OK</span>
                       <span className="text-gray-300">|</span>
                       <span className="text-black font-bold uppercase">{new Date(log.received_at).toLocaleTimeString()}</span>
                       <span className="text-gray-400 truncate flex-1">{log.payload?.email || "Payload Vazio"}</span>
                    </div>
                  ))}
                  {webhookLogs.length === 0 && <p className="text-center py-10 text-[10px] font-black uppercase tracking-[0.5em] text-gray-300 italic">Nenhuma atividade registrada.</p>}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
