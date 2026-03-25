import { useState, useMemo, useEffect } from 'react'
import { Lock, Home, LogOut, Headphones, Menu, Mail, ArrowRight, ChevronRight, Settings, Plus, Edit, Trash2, Layout, Save, Eye, Palette, Layers, Image as ImageIcon, Users, Activity, Terminal, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Monitor, Download, X, List, MoreVertical, ExternalLink, ShieldCheck, Zap, UserCheck, Globe, Database, Cpu, Search, Send, Key, Code, Smartphone as PhoneIcon, Play, Video, Box, ArrowLeft, PlayCircle, Sparkles, Image, Upload } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { supabase } from './lib/supabase'

// --- COMPONENTE DE CARD DE PRESET ---
const PresetCard = ({ preset, isLocked, isAdmin, onEdit, onClick }: { preset: any, isLocked: boolean, isAdmin?: boolean, onEdit?: () => void, onClick?: () => void }) => {
  const handleCardClick = () => { if (isLocked && preset.upsell_link) { window.open(preset.upsell_link, '_blank'); } else if (!isLocked) { onClick?.(); } }
  return (
    <motion.div 
      onClick={handleCardClick} initial={{ opacity: 0, scale: 0.9, y: 15 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }}
      whileHover={isLocked && preset.upsell_link ? { y: -8, scale: 1.03 } : (!isLocked ? { scale: 1.02 } : {})}
      className={`group relative flex-none w-[200px] sm:w-[260px] aspect-[2/3] rounded-[2.5rem] overflow-hidden transition-all duration-700 ${isLocked ? (preset.upsell_link ? 'cursor-pointer shadow-xl' : 'opacity-80 grayscale-[0.2]') : 'cursor-pointer shadow-[0_30px_60px_rgba(0,0,0,0.5)]'}`}
    >
      <img src={preset.image} alt={preset.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
      {isAdmin && (<div className="absolute top-5 left-5 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-[#d82828] transition-all text-white"><Edit size={16} /></button></div>)}
      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2">
        <div className={`backdrop-blur-md bg-white/10 border border-white/20 p-6 rounded-[2rem] text-center shadow-2xl transition-all duration-300 ${isLocked ? 'blur-[1px]' : 'group-hover:bg-white/20'}`}>
           <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1 italic">Gorg Elite</p>
           <h3 className="text-[13px] sm:text-[15px] font-black text-white uppercase tracking-tight leading-tight italic truncate">{preset.name}</h3>
           <AnimatePresence mode="wait">{!isLocked ? (<motion.div key="dl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 w-full py-3 bg-[#d82828] text-white rounded-xl text-[9px] font-black flex items-center justify-center gap-2 decoration-none hover:bg-white hover:text-black transition-all uppercase tracking-widest"><Play size={10} fill="currentColor" /> ACESSAR AGORA</motion.div>) : preset.upsell_link && (<motion.div key="up" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 w-full py-3 bg-white text-black rounded-xl text-[9px] font-black flex items-center justify-center gap-2 uppercase tracking-tighter"><ExternalLink size={12} /> Desbloquear Agora</motion.div>)}</AnimatePresence>
        </div>
      </div>
      {isLocked && (<div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-2xl"><Lock className="w-4 h-4 text-white" /></div>)}
    </motion.div>
  )
}

// --- PRODUCT DETAIL VIEW (INTERNAL) ---
const ProductDetailView = ({ product, isAdmin, onBack }: { product: any, isAdmin: boolean, onBack: () => void }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isEditingLesson, setIsEditingLesson] = useState<any>(null);
  useEffect(() => { fetchLessons(); }, [product.id]);
  const fetchLessons = async () => { const { data } = await supabase.from('lessons').select('*').eq('product_id', product.id).order('order_index', { ascending: true }); if (data) { setLessons(data); if (data.length > 0 && !activeLesson) setActiveLesson(data[0]); } }
  const addLesson = async () => { const title = prompt('Título:'); const video = prompt('Vídeo (URL):'); if (!title || !video) return; await supabase.from('lessons').insert([{ product_id: product.id, title, video_url: video, order_index: lessons.length }]); fetchLessons(); }
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
      <div className="flex items-center gap-6"><button onClick={onBack} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white hover:text-black transition-all group shrink-0 shadow-2xl"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /></button><div className="flex border-l-4 border-[#d82828] pl-6 flex-col"><div><h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none italic italic">{product.name}</h2><p className="text-gray-500 text-[10px] font-black uppercase mt-2 tracking-widest leading-none">Acesso VIP Totalmente Liberado</p></div></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10"><div className="lg:col-span-8 space-y-8">{activeLesson ? (<div className="bg-white/5 border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl aspect-video relative group ring-1 ring-white/10"><iframe src={activeLesson.video_url?.includes('youtube.com') ? activeLesson.video_url.replace('watch?v=', 'embed/') : activeLesson.video_url} className="w-full h-full border-0" allowFullScreen /></div>) : (<div className="aspect-video bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-700 italic font-black uppercase"><PlayCircle size={64} className="mb-4 opacity-20" /> Nenhuma aula disponível ainda.</div>)}<div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] flex items-center justify-between shadow-2xl group hover:border-[#d82828]/20 transition-all"><div className="flex items-center gap-6"><div className="w-16 h-16 rounded-[1.5rem] bg-[#d82828] text-white flex items-center justify-center shadow-xl shadow-[#d82828]/30 group-hover:scale-105 transition-all"><Download size={28} /></div><div><h3 className="text-xl font-black text-white uppercase italic tracking-tight italic">Arquivos Master</h3><p className="text-gray-500 text-[10px] font-bold uppercase mt-1 tracking-widest leading-none">Download de Alta Performance</p></div></div><a href={product.download_link} target="_blank" rel="noreferrer" className="px-10 py-5 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-[#d82828] hover:text-white transition-all shadow-2xl">Download Agora</a></div></div><div className="lg:col-span-4 space-y-6"><div className="flex items-center justify-between mb-4 border-l-4 border-[#d82828] pl-6"><h3 className="text-[13px] font-black text-white uppercase italic tracking-widest leading-none">Aulas Protegidas</h3>{isAdmin && <button onClick={addLesson} className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-white hover:text-emerald-500 transition-all shadow-xl"><Plus size={16} /></button>}</div><div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">{lessons.map((lesson, idx) => (<div key={lesson.id} className="relative group"><div onClick={() => setActiveLesson(lesson)} className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer flex items-center gap-4 ${activeLesson?.id === lesson.id ? 'bg-[#d82828] border-[#d82828] shadow-2xl' : 'bg-white/5 border-white/5 hover:border-white/10'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${activeLesson?.id === lesson.id ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-gray-500'}`}>{idx + 1}</div><div className="flex-1 truncate"><h4 className={`text-[11px] font-black uppercase truncate italic ${activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-300'}`}>{lesson.title}</h4>{activeLesson?.id === lesson.id && <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-2 italic animate-pulse">Assistindo</p>}</div><Play size={12} fill="currentColor" className={activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-700 opacity-0 group-hover:opacity-100 transition-all'} /></div>{isAdmin && (<div className="absolute top-1/2 -translate-y-1/2 -right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-3 pointer-events-auto"><button onClick={(e) => { e.stopPropagation(); setIsEditingLesson(lesson); }} className="p-3 bg-white text-black rounded-xl shadow-2xl hover:bg-[#d82828] hover:text-white transition-all"><Edit size={12} /></button><button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir?')) { supabase.from('lessons').delete().eq('id', lesson.id).then(() => fetchLessons()); } }} className="p-3 bg-red-500 text-white rounded-xl shadow-2xl hover:bg-black transition-all"><Trash2 size={12} /></button></div>)}</div>))}</div></div></div>
      <AnimatePresence>{isEditingLesson && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[250] flex items-center justify-center p-6 text-gray-950 font-sans"><motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative shadow-2xl border border-white/20"><button onClick={() => setIsEditingLesson(null)} className="absolute top-12 right-12 text-gray-300 hover:text-black transition-all"><X size={32} /></button><h3 className="text-3xl font-black uppercase italic mb-10 tracking-tighter italic italic">Editar Aula Elite</h3><form onSubmit={async (e: any) => { e.preventDefault(); await supabase.from('lessons').update({ title: e.target.ltitle.value, video_url: e.target.lvideo.value }).eq('id', isEditingLesson.id); setIsEditingLesson(null); fetchLessons(); }} className="space-y-6"><div className="space-y-2"><label className="text-[11px] font-black uppercase text-gray-400">Título</label><input name="ltitle" defaultValue={isEditingLesson.title} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 font-black uppercase" /></div><div className="space-y-2"><label className="text-[11px] font-black uppercase text-gray-400">URL Vídeo</label><input name="lvideo" defaultValue={isEditingLesson.video_url} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 font-bold" /></div><button type="submit" className="w-full py-6 bg-gray-950 text-white rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-[#d82828] transition-all shadow-2xl"><Save size={20} /> Salvar Agora</button></form></motion.div></motion.div>)}</AnimatePresence>
    </motion.div>
  )
}

// --- ADMIN CONTROL PANEL ---
const AdminPanel = ({ portalData, onUpdate, modules }: { portalData: any, onUpdate: () => void, modules: any[] }) => {
  const [adminSection, setAdminSection] = useState<'users' | 'content' | 'webhooks' | 'email' | 'sales'>('content');
  const [isEditingHero, setIsEditingHero] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [salesSettings, setSalesSettings] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<'before' | 'after' | null>(null);

  useEffect(() => { fetchData(); }, [adminSection]);
  const fetchData = async () => { 
    if (adminSection === 'users') { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if (data) setUsers(data); }
    if (adminSection === 'webhooks') { const { data } = await supabase.from('webhook_logs').select('*').order('received_at', { ascending: false }).limit(10); if (data) setWebhookLogs(data); }
    if (adminSection === 'sales') { const { data } = await supabase.from('sales_settings').select('*').eq('id', 'main').single(); if (data) setSalesSettings(data); }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, role: 'before' | 'after') => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(role);
    try {
      const fileName = `${role}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName);
      await supabase.from('sales_settings').update({ [`magic_${role}_url`]: publicUrl }).eq('id', 'main');
      alert(`Foto de ${role === 'before' ? 'Antes' : 'Depois'} Subida com Sucesso! ✅`);
      fetchData();
    } catch (err: any) { alert(`Erro no Upload: ${err.message}`); } finally { setIsUploading(null); }
  }

  const saveSalesMagic = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.from('sales_settings').update({ magic_before_url: e.target.beforeUrl.value, magic_after_url: e.target.afterUrl.value }).eq('id', 'main');
    if (!error) { alert('Mágica Sincronizada! ✅🚀'); fetchData(); }
  }

  return (
    <div className="space-y-12 pb-32 font-sans selection:bg-[#d82828] selection:text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-10"><div className="flex border-l-4 border-[#d82828] pl-6 flex-col"><div className="flex items-center gap-3 text-amber-500 mb-2"><ShieldCheck size={18} /><span className="text-[10px] font-black uppercase tracking-[0.2em]">COMANDO MESTRE</span></div><h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none italic">COCKPIT GORG</h2></div><div className="flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 shadow-2xl overflow-x-auto no-scrollbar scroll-smooth"><button onClick={() => setAdminSection('content')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${adminSection === 'content' ? 'bg-[#d82828] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Módulos</button><button onClick={() => setAdminSection('users')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${adminSection === 'users' ? 'bg-[#d82828] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Alunos</button><button onClick={() => setAdminSection('sales')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${adminSection === 'sales' ? 'bg-[#d82828] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Vitrine</button><button onClick={() => setAdminSection('webhooks')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${adminSection === 'webhooks' ? 'bg-[#d82828] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Sinais</button><button onClick={() => setAdminSection('email')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${adminSection === 'email' ? 'bg-[#d82828] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>E-mail</button></div></div>
      <AnimatePresence mode="wait">
        {adminSection === 'sales' && (<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 focus:outline-none">
             <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] space-y-10 shadow-2xl">
                <div className="flex items-center gap-4 border-l-4 border-[#d82828] pl-8"><div className="w-12 h-12 bg-[#d82828]/10 rounded-2xl flex items-center justify-center text-[#d82828]"><Sparkles size={24} /></div><div><h3 className="text-2xl font-black text-white uppercase italic italic">A Mágica Acontece</h3><p className="text-gray-500 text-[10px] font-bold uppercase mt-1 tracking-widest leading-none">Gestão de Impacto Visual</p></div></div>
                {salesSettings ? (
                  <form onSubmit={saveSalesMagic} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-6">
                        <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest italic flex items-center gap-2">Foto ANTES (Impacto Cru)</label>
                        <div className="relative group overflow-hidden rounded-[2rem] aspect-square bg-black shadow-inner border border-white/5">
                           <img src={salesSettings.magic_before_url} className="w-full h-full object-cover grayscale opacity-60" />
                           <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                              <label className="cursor-pointer flex flex-col items-center gap-3">
                                 {isUploading === 'before' ? <RefreshCw className="animate-spin text-white" /> : <Upload className="text-white" />}
                                 <span className="text-[9px] font-black text-white uppercase tracking-widest">SUBIR NOVA FOTO</span>
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'before')} />
                              </label>
                           </div>
                        </div>
                        <input name="beforeUrl" defaultValue={salesSettings.magic_before_url} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-6 font-bold text-sm text-gray-200 outline-none focus:border-[#d82828] transition-all" />
                     </div>
                     <div className="space-y-6">
                        <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest italic flex items-center gap-2">Foto DEPOIS (Mágica Gorg)</label>
                        <div className="relative group overflow-hidden rounded-[2rem] aspect-square bg-black shadow-inner border border-white/5">
                           <img src={salesSettings.magic_after_url} className="w-full h-full object-cover shadow-[0_0_50px_rgba(216,40,40,0.2)]" />
                           <div className="absolute inset-0 bg-[#d82828]/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                              <label className="cursor-pointer flex flex-col items-center gap-3">
                                 {isUploading === 'after' ? <RefreshCw className="animate-spin text-white" /> : <Upload className="text-white" />}
                                 <span className="text-[9px] font-black text-white uppercase tracking-widest">SUBIR NOVA MÁGICA</span>
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'after')} />
                              </label>
                           </div>
                        </div>
                        <input name="afterUrl" defaultValue={salesSettings.magic_after_url} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-6 font-bold text-sm text-gray-200 outline-none focus:border-[#d82828] transition-all" />
                     </div>
                     <div className="md:col-span-2 flex justify-end pt-6"><button type="submit" className="px-12 py-5 bg-[#d82828] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-white hover:text-black transition-all flex items-center gap-4 group"><Save /> Sincronizar Arquitetura</button></div>
                  </form>
                ) : (<div className="py-24 text-center text-gray-600 font-black uppercase animate-pulse italic">Conectando à Vitrine...</div>)}
             </div>
        </motion.div>)}
        {adminSection === 'content' && (<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-10"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div onClick={() => setIsEditingHero(true)} className="bg-white/5 border border-white/5 p-10 rounded-[3rem] hover:bg-white/10 transition-all cursor-pointer group flex items-center justify-between"><div><h3 className="text-xl font-black text-white uppercase italic tracking-tight">Portal Hero</h3><p className="text-gray-500 text-[10px] font-bold uppercase mt-1 tracking-widest">Logo e Headline</p></div><Edit className="text-[#d82828]/50" /></div><div className="bg-white/5 border border-white/5 p-10 rounded-[3rem] hover:bg-white/10 transition-all cursor-pointer group flex items-center justify-between"><div><h3 className="text-xl font-black text-white uppercase italic tracking-tight">Novos Módulos</h3><p className="text-gray-500 text-[10px] font-bold uppercase mt-1 tracking-widest">Categorias</p></div><Plus className="text-emerald-500/50" /></div></div><div className="space-y-8">{modules.map(mod => (<div key={mod.id} className="bg-white/5 border border-white/5 p-10 rounded-[3.5rem] space-y-10"><div className="flex justify-between items-center border-l-4 border-white/20 pl-8"><div><h3 className="text-xl font-black text-white uppercase italic">{mod.module_title}</h3><p className="text-gray-500 text-[10px] font-bold uppercase mt-1">{mod.presets_data.length} Itens</p></div><button className="px-6 py-4 bg-white hover:bg-[#d82828] hover:text-white text-black rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3"><Plus size={16} /> Add Preset</button></div><div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">{mod.presets_data.map((p: any, i: number) => (<div key={i} className="flex-none w-36 aspect-square relative group rounded-2xl overflow-hidden border border-white/5"><img src={p.image} className="w-full h-full object-cover grayscale opacity-30 group-hover:opacity-100 group-hover:grayscale-0 transition-all shadow-2xl" /><div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 text-center group-hover:bg-black/20 transition-all"><span className="text-[10px] font-black text-white uppercase italic truncate w-full tracking-tighter">{p.name}</span></div></div>))}</div></div>))}</div></motion.div>)}
        {adminSection === 'users' && (<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 p-10 rounded-[4.5rem] border border-white/5 overflow-hidden shadow-2xl"><table className="w-full text-left uppercase"><thead className="text-[10px] font-black text-gray-400 border-b border-white/5"><tr><th className="pb-8 italic">Membro VIP</th><th className="pb-8">Email de Acesso</th><th className="pb-8 text-right">Ação</th></tr></thead><tbody className="divide-y divide-white/1">{users.map(u => (<tr key={u.id} className="hover:bg-white/2 transition-colors"><td className="py-8 text-[11px] font-black italic text-white tracking-widest">{u.full_name}</td><td className="py-8 text-[10px] font-bold text-gray-500 italic lowercase">{u.email}</td><td className="py-8 text-right"><button className="p-4 bg-white/5 rounded-2xl hover:bg-red-500/20 text-red-500 transition-all shadow-xl"><Trash2 size={18} /></button></td></tr>))}</tbody></table></motion.div>)}
        {adminSection === 'email' && (<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 selection:bg-black selection:text-[#d82828] italic"><div className="bg-white/5 p-10 rounded-[4rem] space-y-8"><div className="flex border-l-4 border-[#d82828] pl-8 flex-col"><div><h3 className="text-2xl font-black text-white uppercase italic tracking-tight">E-mail de Elite</h3><p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Mensagem de Boas-vindas</p></div></div><div className="space-y-4"><label className="text-[11px] font-black uppercase text-gray-400">Corpo do E-mail (HTML)</label><textarea defaultValue={portalData.email_welcome_body} className="w-full bg-black border-2 border-white/5 rounded-[2.5rem] p-10 font-mono text-emerald-500 text-sm outline-none focus:border-[#d82828] shadow-inner" rows={10} /></div><div className="flex justify-end"><button className="px-10 py-5 bg-[#d82828] text-white rounded-[2rem] font-black uppercase tracking-widest transition-all"><Save /> Salvar E-mail</button></div></div></motion.div>)}
        {adminSection === 'webhooks' && (<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8"><div className="bg-[#d82828]/5 border-2 border-dashed border-[#d82828]/20 p-12 rounded-[4.5rem] flex flex-col items-center text-center gap-6 shadow-2xl"><div className="p-5 bg-[#d82828] text-white rounded-3xl shadow-2xl shadow-[#d82828]/30"><Globe size={32} /></div><div className="space-y-2"><p className="text-2xl font-black text-white uppercase italic tracking-widest">Sincronia Biônica</p><p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Link Universal do Webhook</p></div><code className="bg-black/80 text-[#d82828] p-6 rounded-[2rem] text-[11px] font-mono break-all max-w-full italic border border-white/5 shadow-2xl">{'https://ibsnizsdascywkonvcvu.supabase.co/rest/v1/rpc/handle_incoming_webhook'}</code></div></motion.div>)}
      </AnimatePresence>
      <AnimatePresence>{isEditingHero && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[150] flex items-center justify-center p-10"><motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[4.5rem] p-14 relative text-gray-900 focus:outline-none shadow-2xl"><button onClick={() => setIsEditingHero(false)} className="absolute top-14 right-14 text-gray-300 hover:text-black transition-all"><X size={32} /></button><h3 className="text-4xl font-black uppercase italic mb-10 tracking-tighter italic italic">Redesenhar Portal</h3><div className="space-y-10 text-center"><textarea defaultValue={portalData.hero_title} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] p-8 font-black uppercase italic text-2xl outline-none focus:border-[#d82828] transition-all text-center leading-tight shadow-inner" rows={4} /><button className="w-full py-6 bg-gray-950 text-white rounded-[1.5rem] font-black text-base uppercase tracking-widest flex items-center justify-center gap-5 shadow-2xl hover:bg-[#d82828] transition-all"><Zap size={24} /> Aplicar Arquitetura</button></div></motion.div></motion.div>)}</AnimatePresence>
    </div>
  )
}

// --- MAIN PROJECT COMPONENT ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeProducts, setActiveProducts] = useState<string[]>([]);
  const [portalSettings, setPortalSettings] = useState<any>({ hero_title: '...', hero_image: '/logo_pglogin.png' });
  const [modules, setModules] = useState<any[]>([]);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [isEditingPreset, setIsEditingPreset] = useState<{modIdx: number, pIdx: number, p: any} | null>(null);

  const ADMIN_EMAIL = 'ggabriellgorgg@admin';

  useEffect(() => {
    const savedEmail = localStorage.getItem('gorg_persistent_session');
    if (savedEmail) { onLogin(savedEmail, true); }
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: settings } = await supabase.from('portal_settings').select('*').eq('id', 'main').single();
    if (settings) setPortalSettings(settings);
    const { data: modData } = await supabase.from('modules_presets').select('*').order('order_index');
    if (modData) setModules(modData);
  }

  const onLogin = async (email: string, remember: boolean) => {
    const inputEmail = email.toLowerCase().trim();
    if (inputEmail === ADMIN_EMAIL) {
      if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
      setIsAdmin(true); setCurrentUser({ full_name: 'Gabriel Souza (Admin)', email: inputEmail }); setActiveProducts(['*']); setIsLoggedIn(true);
      return true;
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('email', inputEmail).single();
      if (error || !data) { localStorage.removeItem('gorg_persistent_session'); return false; }
      if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
      setCurrentUser(data); setActiveProducts(data.active_products || []); setIsAdmin(false); setIsLoggedIn(true); return true;
    } catch (err) { return false; }
  }

  const handleLogout = () => { localStorage.removeItem('gorg_persistent_session'); setIsLoggedIn(false); setIsAdmin(false); setCurrentUser(null); setViewingProduct(null); }
  if (!isLoggedIn) return <LoginView onLogin={onLogin} logoUrl={portalSettings.hero_image} />

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-200 flex overflow-hidden font-sans selection:bg-[#d82828] selection:text-white">
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-[280px] bg-[#0d0d0d] border-r border-white/5 z-[70] transition-transform duration-500 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col items-center overflow-y-auto no-scrollbar"><div className="mb-10 w-full max-w-[150px] shadow-2xl rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setActiveTab('home'); setViewingProduct(null); }}><img src={portalSettings.hero_image} alt="Logo" className="grayscale brightness-150 transition-all hover:grayscale-0 hover:brightness-200" /></div><nav className="space-y-3 flex-1 w-full"><button onClick={() => { setActiveTab('home'); setViewingProduct(null); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all font-black text-[11px] uppercase tracking-widest ${activeTab === 'home' && !viewingProduct ? 'bg-[#d82828] text-white shadow-xl shadow-[#d82828]/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}><Home size={18} /> Início</button>{isAdmin && (<button onClick={() => { setActiveTab('admin'); setViewingProduct(null); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all font-black text-[11px] uppercase tracking-widest ${activeTab === 'admin' ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'text-amber-500/50 hover:text-white hover:bg-amber-500/5'}`}><Settings size={18} /> Cockpit Admin</button>)}</nav><div className="mt-auto pt-8 border-t border-white/5 w-full"><div className="flex items-center gap-4 bg-white/5 p-5 rounded-3xl mb-6 shadow-inner"><div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm bg-[#d82828]/20 text-[#d82828] shadow-inner border border-white/5">{currentUser?.full_name?.charAt(0)}</div><div className="truncate"><p className="text-[11px] font-black text-white uppercase truncate leading-none italic">{currentUser?.full_name}</p><p className="text-[9px] font-bold text-gray-500 mt-2 tracking-widest italic">{isAdmin ? 'ADMIN MASTER' : 'MEMBRO VIP'}</p></div></div><button onClick={handleLogout} className="w-full py-4 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 group"><LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> SAIR</button></div></div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-y-auto no-scrollbar scroll-smooth">
        <header className="h-24 px-10 lg:px-14 flex items-center justify-between border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-2xl z-50 sticky top-0"><div className="flex items-center gap-8"><button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-white"><Menu /></button><div className="text-[11px] font-black uppercase text-[#d82828] tracking-[0.3em] flex items-center gap-4 italic"><Box size={14} fill="currentColor" /> {viewingProduct ? viewingProduct.name : activeTab.toUpperCase()} {isAdmin && 'COMMAND'}</div></div></header>
        <div className="p-10 lg:p-14 pb-40 max-w-7xl mx-auto w-full">
           {viewingProduct ? (<ProductDetailView product={viewingProduct} isAdmin={isAdmin} onBack={() => setViewingProduct(null)} />) : activeTab === 'home' ? (
             <div className="space-y-24">
               <section className="relative aspect-[21/9] lg:aspect-[21/6] rounded-[4.5rem] overflow-hidden bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)]"><img src={portalSettings.hero_image} alt="Hero" className="max-w-[220px] grayscale brightness-150 mb-10 shadow-2xl rounded-2xl" /><h1 className="text-3xl lg:text-6xl font-black text-white uppercase tracking-tighter italic leading-none italic">{portalSettings.hero_title}</h1></section>
               <AnimatePresence mode="popLayout">{modules.map((mod, modIdx) => (<section key={mod.id} className="space-y-12"><div className="flex items-end justify-between border-l-4 border-[#d82828] pl-10"><div><h2 className="text-3xl font-black text-white uppercase italic leading-none italic">{mod.module_title}</h2><p className="text-gray-500 text-[11px] uppercase font-black tracking-[0.2em] mt-4">{mod.module_desc}</p></div></div><div className="flex gap-10 overflow-x-auto pb-12 no-scrollbar scroll-smooth">{mod.presets_data?.map((p: any, pIdx: number) => { const isLocked = !isAdmin && !activeProducts.includes(p.id) && !activeProducts.includes('*'); return <PresetCard key={modIdx + '-' + pIdx} preset={p} isLocked={isLocked} isAdmin={isAdmin} onClick={() => setViewingProduct(p)} onEdit={() => setIsEditingPreset({modIdx, pIdx, p})} />; })}</div></section>))}</AnimatePresence>
             </div>
           ) : activeTab === 'admin' ? (<AdminPanel portalData={portalSettings} onUpdate={fetchInitialData} modules={modules} />) : null}
        </div>
      </main>
      <AnimatePresence>{isEditingPreset && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 text-gray-950 font-sans"><motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative shadow-2xl overflow-y-auto max-h-[90vh]"><button onClick={() => setIsEditingPreset(null)} className="absolute top-12 right-12 text-gray-200 hover:text-black transition-all"><X size={32} /></button><h3 className="text-4xl font-black uppercase italic mb-12 tracking-tighter italic italic italic">Editar Preset</h3><form onSubmit={async (e: any) => { e.preventDefault(); const { modIdx, pIdx } = isEditingPreset; const moduleToUpdate = modules[modIdx]; const newPresets = [...moduleToUpdate.presets_data]; newPresets[pIdx] = { ...newPresets[pIdx], name: e.currentTarget.pname.value, image: e.currentTarget.pimage.value, download_link: e.currentTarget.pdownload.value, upsell_link: e.currentTarget.pupsell.value }; await supabase.from('modules_presets').update({ presets_data: newPresets }).eq('id', moduleToUpdate.id); setIsEditingPreset(null); fetchInitialData(); }} className="space-y-8"><div className="space-y-3"><label className="text-[11px] font-black uppercase text-gray-400 italic">Identidade</label><input name="pname" defaultValue={isEditingPreset.p.name} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-6 font-black uppercase italic text-lg outline-none focus:border-[#d82828] transition-all" /></div><div className="space-y-3"><label className="text-[11px] font-black uppercase text-gray-400 italic">Capa (URL)</label><input name="pimage" defaultValue={isEditingPreset.p.image} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-5 font-bold text-sm outline-none focus:border-[#d82828]" /></div><div className="space-y-3"><label className="text-[11px] font-black uppercase text-gray-400 italic">Download Master</label><input name="pdownload" defaultValue={isEditingPreset.p.download_link} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-5 font-bold text-sm outline-none focus:border-[#d82828]" /></div><div className="space-y-3"><label className="text-[11px] font-black uppercase text-gray-400 italic text-[#d82828]">Link de Upsell</label><input name="pupsell" defaultValue={isEditingPreset.p.upsell_link} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-5 font-bold text-sm outline-none focus:border-[#d82828]" /></div><button type="submit" className="w-full py-6 bg-gray-950 text-white rounded-[1.5rem] font-black text-base uppercase tracking-widest flex items-center justify-center gap-5 shadow-2xl hover:bg-[#d82828] transition-all shadow-2xl"><Save size={24} /> Sincronizar Item</button></form></motion.div></motion.div>)}</AnimatePresence>
    </div>
  )
}
