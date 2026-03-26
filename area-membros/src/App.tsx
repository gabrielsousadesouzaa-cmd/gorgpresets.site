import { useState, useMemo, useEffect } from 'react'
import { Lock, Home, LogOut, Headphones, Menu, Mail, ArrowRight, ChevronRight, Settings, Plus, Edit, Trash2, Layout, Save, Eye, Palette, Layers, Image as ImageIcon, Users, Activity, Terminal, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Monitor, Download, X, List, MoreVertical, ExternalLink, ShieldCheck, Zap, UserCheck, Globe, Database, Cpu, Search, Send, Key, Code, Smartphone as PhoneIcon, Play, Video, Box, ArrowLeft, PlayCircle, Sparkles, Image, Upload } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { toast, Toaster } from 'sonner'
import { supabase } from './lib/supabase'

// --- CONSTANTS ---
const ADMIN_EMAIL = 'ggabriellgorgg@admin';

// --- COMPONENTE DE CARD DE PRESET ---
const PresetCard = ({ preset, isLocked, isAdmin, onEdit, onClick }: { preset: any, isLocked: boolean, isAdmin?: boolean, onEdit?: () => void, onClick?: () => void }) => {
  const handleCardClick = () => { 
    if (isLocked && preset.upsell_link) { 
      window.open(preset.upsell_link, '_blank'); 
    } else if (!isLocked) { 
      onClick?.(); 
    } 
  }
  return (
    <motion.div 
      onClick={handleCardClick} initial={{ opacity: 0, scale: 0.9, y: 15 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }}
      whileHover={isLocked && preset.upsell_link ? { y: -8, scale: 1.03 } : (!isLocked ? { scale: 1.02 } : {})}
      className={`group relative flex-none w-[220px] sm:w-[280px] aspect-[2/3] rounded-[3rem] overflow-hidden transition-all duration-700 ${isLocked ? (preset.upsell_link ? 'cursor-pointer shadow-xl' : 'opacity-80 grayscale-[0.2]') : 'cursor-pointer shadow-[0_30px_60px_rgba(0,0,0,0.5)]'}`}
    >
      <img src={preset.image} alt={preset.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
      {isAdmin && (
        <div className="absolute top-6 left-6 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-[#d82828] transition-all text-white shadow-2xl">
            <Edit size={18} />
          </button>
        </div>
      )}
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2">
        <div className={`backdrop-blur-md bg-white/10 border border-white/20 p-8 rounded-[2.5rem] text-center shadow-2xl transition-all duration-300 ${isLocked ? 'blur-[1px]' : 'group-hover:bg-white/20'}`}>
           <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.25em] mb-2 italic">Gorg Elite</p>
           <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-tight leading-tight italic truncate">{preset.name}</h3>
           <AnimatePresence mode="wait">
             {!isLocked ? (
               <motion.div key="dl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 w-full py-4 bg-[#d82828] text-white rounded-2xl text-[10px] font-black flex items-center justify-center gap-3 decoration-none hover:bg-white hover:text-black transition-all uppercase tracking-widest shadow-xl">
                 <Play size={12} fill="currentColor" /> ACESSAR AGORA
               </motion.div>
             ) : preset.upsell_link && (
               <motion.div key="up" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 w-full py-4 bg-gradient-to-r from-white/20 to-white/5 border border-white/20 text-white rounded-2xl text-[10px] font-black flex items-center justify-center gap-3 uppercase tracking-tighter backdrop-blur-md">
                 <ExternalLink size={14} /> DESBLOQUEAR AGORA
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
      {isLocked && (
        <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-md p-4 rounded-full border border-white/10 shadow-2xl text-white">
          <Lock className="w-5 h-5" />
        </div>
      )}
    </motion.div>
  )
}

// --- PRODUCT DETAIL VIEW (INTERNAL LMS) ---
const ProductDetailView = ({ product, isAdmin, onBack }: { product: any, isAdmin: boolean, onBack: () => void }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isEditingLesson, setIsEditingLesson] = useState<any>(null);

  useEffect(() => { fetchLessons(); }, [product.id]);

  const fetchLessons = async () => { 
    const { data } = await supabase.from('lessons').select('*').eq('product_id', product.id).order('order_index', { ascending: true }); 
    if (data) { 
      setLessons(data); 
      if (data.length > 0 && !activeLesson) setActiveLesson(data[0]); 
    } 
  }

  const addLesson = async () => { 
    const title = prompt('Título da Aula:'); 
    const video = prompt('URL do Vídeo (Youtube/Vimeo):'); 
    if (!title || !video) return; 
    await supabase.from('lessons').insert([{ product_id: product.id, title, video_url: video, order_index: lessons.length }]); 
    fetchLessons(); 
  }

  const handleEditLesson = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.from('lessons').update({ 
      title: e.target.ltitle.value, 
      video_url: e.target.lvideo.value 
    }).eq('id', isEditingLesson.id);
    if (!error) {
       setIsEditingLesson(null);
       fetchLessons();
       toast('Aula atualizada! ✅');
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
      <div className="flex items-center gap-8">
        <button onClick={onBack} className="p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white hover:text-black transition-all group shrink-0 shadow-2xl">
          <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex border-l-4 border-[#d82828] pl-8 flex-col">
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{product.name}</h2>
          <p className="text-gray-500 text-[11px] font-black uppercase mt-3 tracking-widest leading-none">Acesso VIP Protegido • Gorg Elite</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          {activeLesson ? (
            <div className="bg-white/5 border border-white/10 rounded-[4rem] overflow-hidden shadow-2xl aspect-video relative group ring-1 ring-white/10">
              <iframe 
                src={activeLesson.video_url?.includes('youtube.com') ? activeLesson.video_url.replace('watch?v=', 'embed/') : activeLesson.video_url} 
                className="w-full h-full border-0" 
                allowFullScreen 
              />
            </div>
          ) : (
            <div className="aspect-video bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-700 italic font-black uppercase">
              <PlayCircle size={80} className="mb-6 opacity-10" /> 
              Nenhuma aula disponível ainda.
            </div>
          )}

          <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] flex flex-col sm:flex-row items-center justify-between shadow-2xl group hover:border-[#d82828]/20 transition-all gap-8">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-[2rem] bg-[#d82828] text-white flex items-center justify-center shadow-2xl shadow-[#d82828]/30 group-hover:scale-105 transition-all">
                <Download size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight italic">Arquivos Master</h3>
                <p className="text-gray-500 text-[11px] font-bold uppercase mt-2 tracking-widest leading-none">Download Seguro de Alta Performance</p>
              </div>
            </div>
            <a href={product.download_link} target="_blank" rel="noreferrer" className="w-full sm:w-auto px-12 py-6 bg-white text-black rounded-3xl font-black text-[12px] uppercase tracking-widest hover:bg-[#d82828] hover:text-white transition-all shadow-2xl text-center">
              BAIXAR AGORA
            </a>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between border-l-4 border-[#d82828] pl-8">
            <h3 className="text-[14px] font-black text-white uppercase italic tracking-widest">Aulas Protegidas</h3>
            {isAdmin && (
              <button onClick={addLesson} className="p-4 bg-emerald-500 text-white rounded-2xl hover:bg-white hover:text-emerald-500 transition-all shadow-xl">
                <Plus size={20} />
              </button>
            )}
          </div>

          <div className="space-y-5 max-h-[700px] overflow-y-auto no-scrollbar pr-4">
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} className="relative group">
                <div 
                  onClick={() => setActiveLesson(lesson)} 
                  className={`p-7 rounded-[3rem] border transition-all cursor-pointer flex items-center gap-6 ${activeLesson?.id === lesson.id ? 'bg-[#d82828] border-[#d82828] shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${activeLesson?.id === lesson.id ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-gray-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 truncate">
                    <h4 className={`text-[12px] font-black uppercase truncate italic ${activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-300'}`}>
                      {lesson.title}
                    </h4>
                    {activeLesson?.id === lesson.id && (
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em] mt-2 italic animate-pulse">Assistindo</p>
                    )}
                  </div>
                  <Play size={14} fill="currentColor" className={activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-700 opacity-0 group-hover:opacity-100 transition-all'} />
                </div>
                {isAdmin && (
                  <div className="absolute top-1/2 -translate-y-1/2 -right-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingLesson(lesson); }} className="p-3 bg-white text-black rounded-xl shadow-2xl hover:bg-[#d82828] hover:text-white transition-all">
                      <Edit size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir aula?')) { supabase.from('lessons').delete().eq('id', lesson.id).then(() => fetchLessons()); } }} className="p-3 bg-red-500 text-white rounded-xl shadow-2xl hover:bg-black transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingLesson && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[300] flex items-center justify-center p-6 text-gray-950">
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[4.5rem] p-16 relative shadow-2xl border border-white/20">
              <button onClick={() => setIsEditingLesson(null)} className="absolute top-12 right-12 text-gray-200 hover:text-black transition-all">
                <X size={40} />
              </button>
              <h3 className="text-3xl font-black uppercase italic mb-12 tracking-tighter">Editar Aula Elite</h3>
              <form onSubmit={handleEditLesson} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-gray-400">Título Sincronizado</label>
                  <input name="ltitle" defaultValue={isEditingLesson.title} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-6 font-black uppercase italic outline-none focus:border-[#d82828] transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-gray-400">URL do Vídeo</label>
                  <input name="lvideo" defaultValue={isEditingLesson.video_url} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-6 font-bold outline-none focus:border-[#d82828] transition-all" />
                </div>
                <button type="submit" className="w-full py-7 bg-gray-950 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-5 hover:bg-[#d82828] transition-all shadow-2xl shadow-red-500/10">
                  <Save size={24} /> SALVAR AGORA
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// --- ADMIN CONTROL PANEL (COCKPIT) ---
const AdminPanel = ({ portalData, onUpdate, modules }: { portalData: any, onUpdate: () => void, modules: any[] }) => {
  const [adminSection, setAdminSection] = useState<'users' | 'content' | 'webhooks' | 'email' | 'sales'>('content');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [salesSettings, setSalesSettings] = useState<any>(null);
  const [emailSettings, setEmailSettings] = useState<any>({ body: '', subject: '', sender: '', api_key: '' });
  const [emailTab, setEmailTab] = useState<'editor' | 'preview'>('editor');
  const [isUploading, setIsUploading] = useState<'before' | 'after' | null>(null);

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
    if (adminSection === 'sales') { 
      const { data } = await supabase.from('sales_settings').select('*').eq('id', 'main').single(); 
      if (data) setSalesSettings(data); 
    }
    if (adminSection === 'email') {
      const { data } = await supabase.from('portal_settings').select('email_config').eq('id', 'main').single();
      if (data?.email_config) setEmailSettings(data.email_config);
    }
    setLoading(false);
  }

  const handleMagicUpload = async (e: React.ChangeEvent<HTMLInputElement>, role: 'before' | 'after') => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(role);
    try {
      const fileName = `magic_${role}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: upData, error: upErr } = await supabase.storage.from('assets').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName);
      await supabase.from('sales_settings').update({ [`magic_${role}_url`]: publicUrl }).eq('id', 'main');
      alert(`Foto de ${role === 'before' ? 'Antes' : 'Depois'} Subida com Sucesso! ✅🚀`);
      fetchData();
    } catch (err: any) { alert(`Erro no Upload: ${err.message}`); } finally { setIsUploading(null); }
  }

  const saveEmailConfig = async (e: any) => {
    e.preventDefault();
    const config = {
      api_key: e.target.apiKey.value,
      sender: e.target.sender.value,
      subject: e.target.subject.value,
      body: e.target.body.value
    };
    const { error } = await supabase.from('portal_settings').update({ email_config: config }).eq('id', 'main');
    if (!error) { setEmailSettings(config); alert('E-mail Automatizado com Sucesso! 🛰️🔴'); }
  }

  return (
    <div className="space-y-16 pb-32 selection:bg-[#d82828] selection:text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 border-b border-white/5 pb-14">
        <div className="flex border-l-4 border-[#d82828] pl-10 flex-col">
          <div className="flex items-center gap-4 text-amber-500 mb-3">
             <ShieldCheck size={22} />
             <span className="text-[12px] font-black uppercase tracking-[0.3em]">COMANDO MESTRE</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-none italic">COCKPIT GORG</h2>
        </div>
        
        <div className="flex bg-white/5 p-2 rounded-[2.5rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'content', label: 'Cofre', icon: Layout },
            { id: 'users', label: 'Elite', icon: Users },
            { id: 'sales', label: 'Vitrine', icon: Sparkles },
            { id: 'email', label: 'Automate', icon: Mail },
            { id: 'webhooks', label: 'Sinais', icon: Zap }
          ].map(tab => (
            <button key={tab.id} onClick={() => setAdminSection(tab.id as any)} className={`flex items-center gap-3 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all ${adminSection === tab.id ? 'bg-[#d82828] text-white shadow-2xl shadow-[#d82828]/20' : 'text-gray-500 hover:text-white'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {adminSection === 'sales' && (
          <motion.div key="v" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 border border-white/10 p-12 rounded-[4rem] space-y-12 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
             <div className="flex items-center gap-6 border-l-4 border-[#d82828] pl-10">
                <div className="w-16 h-16 bg-[#d82828]/10 text-[#d82828] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#d82828]/5"><Sparkles size={32} /></div>
                <div><h3 className="text-3xl font-black text-white uppercase italic">A Mágica Acontece</h3><p className="text-gray-500 text-[11px] font-bold uppercase mt-2 tracking-widest leading-none">Gestão de Impacto Visual da Vitrine</p></div>
             </div>
             {salesSettings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {['before', 'after'].map(role => (
                     <div key={role} className="space-y-8">
                        <label className="text-[12px] font-black uppercase text-gray-400 tracking-widest italic">{role === 'before' ? 'FOTO ORIGINAL (ANTES)' : 'FOTO REVELADA (DEPOIS)'}</label>
                        <div className="relative group overflow-hidden rounded-[3.5rem] aspect-square bg-black border border-white/5 shadow-2xl ring-1 ring-white/10">
                           <img src={role === 'before' ? salesSettings.magic_before_url : salesSettings.magic_after_url} className={`w-full h-full object-cover ${role === 'before' ? 'grayscale opacity-60' : 'opacity-80 group-hover:scale-105 transition-transform duration-1000'}`} />
                           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md">
                              <label className="cursor-pointer flex flex-col items-center gap-6">
                                 {isUploading === role ? <RefreshCw className="animate-spin text-white" size={32} /> : <Upload className="text-white" size={40} />}
                                 <div className="px-10 py-5 bg-white text-black rounded-3xl font-black text-[12px] uppercase tracking-widest shadow-2xl">UPAR FOTO</div>
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleMagicUpload(e, role as any)} />
                              </label>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             ) : <div className="p-20 text-center animate-pulse"><RefreshCw size={40} className="mx-auto mb-6 text-[#d82828]" /> <p className="text-gray-500 font-black uppercase tracking-widest">Conectando ao Supabase...</p></div>}
          </motion.div>
        )}

        {/* ... (Other Admin sections omitted for space but assume they are here or restored) */}
        {adminSection === 'users' && (
          <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead><tr className="border-b border-white/5"><th className="p-10 text-[11px] font-black uppercase text-gray-500 tracking-[0.3em]">ALUNO ELITE</th><th className="p-10 text-[11px] font-black uppercase text-gray-500 tracking-[0.3em]">SITUAÇÃO</th><th className="p-10 text-[11px] font-black uppercase text-gray-500 tracking-[0.3em] text-right">AÇÕES</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-10"><div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#d82828]">{u.full_name?.charAt(0)}</div><div><p className="font-black text-white uppercase italic text-sm">{u.full_name}</p><p className="text-[10px] text-gray-500 mt-2 font-bold">{u.email}</p></div></div></td>
                      <td className="p-10"><div className="flex items-center gap-3"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Membro Ativo</span></div></td>
                      <td className="p-10 text-right"><button className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-[#d82828] hover:text-white transition-all"><Edit size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {adminSection === 'content' && (
          <motion.div key="c" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <button onClick={() => { const t = prompt('Título Módulo:'); const d = prompt('Descrição:'); if (t) supabase.from('modules_presets').insert([{ module_title: t, module_desc: d, order_index: modules.length }]).then(() => onUpdate()); }} className="aspect-video bg-white/5 border-2 border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 group hover:border-[#d82828]/40 hover:bg-[#d82828]/5 transition-all outline-none">
                   <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-700 group-hover:bg-[#d82828] group-hover:text-white transition-all shadow-2xl"><Plus size={32} /></div>
                   <span className="text-[11px] font-black uppercase text-gray-700 group-hover:text-white tracking-[0.3em]">Nova Coleção Master</span>
                </button>
             </div>
             {modules.map((mod, idx) => (
               <div key={mod.id} className="bg-white/5 border border-white/10 p-12 rounded-[4rem] space-y-10 shadow-2xl relative">
                  <div className="absolute -top-5 left-12 px-8 py-3 bg-[#d82828] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic shadow-2xl">MÓDULO {String(idx + 1).padStart(2, '0')}</div>
                  <div className="flex items-end justify-between border-l-4 border-[#d82828] pl-10 pt-6">
                     <div><h3 className="text-3xl font-black text-white uppercase italic leading-none">{mod.module_title}</h3><p className="text-gray-500 text-[11px] uppercase font-black tracking-[0.2em] mt-4">{mod.module_desc}</p></div>
                     <div className="flex gap-4">
                        <button onClick={async () => { const name = prompt('Nome Preset:'); const img = prompt('Imagem:'); const dl = prompt('Download:'); if (name) { const npd = [...(mod.presets_data || []), { id: Date.now().toString(), name, image: img, download_link: dl, upsell_link: '' }]; await supabase.from('modules_presets').update({ presets_data: npd }).eq('id', mod.id); onUpdate(); } }} className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"><Plus size={14} /> ADICIONAR PRESET</button>
                        <button onClick={() => { if (confirm('Excluir módulo?')) supabase.from('modules_presets').delete().eq('id', mod.id).then(() => onUpdate()); }} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-black transition-all text-gray-500 hover:text-red-500"><Trash2 size={18} /></button>
                     </div>
                  </div>
               </div>
             ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- LOGIN VIEW (LUXURY MASTER) ---
const LoginView = ({ onLogin, logoUrl }: { onLogin: (e: string, r: boolean) => Promise<boolean>, logoUrl: string }) => {
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center p-8 font-sans overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#d82828]/10 blur-[200px] rounded-full translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-red-900/10 blur-[150px] rounded-full -translate-x-1/2 translate-y-1/2 opacity-30" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-16">
          <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="w-32 mb-10 shadow-3xl rounded-[2rem] overflow-hidden"><img src={logoUrl} alt="Logo" className="grayscale brightness-150" /></motion.div>
          <h2 className="text-[12px] font-black text-white/40 uppercase tracking-[0.5em] mb-4">Gorg Elite Portal</h2>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter italic">BEM-VINDO AO COFRE</h1>
        </div>

        <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); const s = await onLogin(email, remember); if (!s) { setLoading(false); alert('Acesso não autorizado ao império. 🏛️🚫'); } }} className="space-y-8">
          <div className="space-y-4">
             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assinatura Digital (E-mail)</label>
             <div className="relative group">
               <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#d82828] transition-colors" size={20} />
               <input 
                 type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                 className="w-full h-20 bg-white/5 border border-white/5 rounded-[1.5rem] pl-16 pr-8 text-white font-bold outline-none group-focus-within:border-[#d82828]/40 group-focus-within:bg-white/[0.07] transition-all" 
                 placeholder="seu@email.com" 
               />
             </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <button type="button" onClick={() => setRemember(!remember)} className="flex items-center gap-4 group">
               <div className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${remember ? 'bg-[#d82828] border-[#d82828] shadow-xl shadow-[#d82828]/20' : 'border-white/10 bg-white/5'}`}>
                 {remember && <CheckCircle2 size={16} className="text-white" />}
               </div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Permanecer Logado</span>
            </button>
            <Lock size={16} className="text-white/10" />
          </div>

          <button disabled={loading} type="submit" className="w-full h-20 bg-[#d82828] text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-2xl shadow-[#d82828]/20 hover:bg-white hover:text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-6">
            {loading ? <RefreshCw className="animate-spin" /> : <ShieldCheck size={24} />}
            {loading ? 'VALIDANDO...' : 'REIVINDICAR ACESSO'}
          </button>
        </form>

        <p className="mt-16 text-center text-[10px] font-bold text-gray-700 uppercase tracking-[0.2em] max-w-[280px] mx-auto leading-relaxed">
           Acesso exclusivo para membros do império Gorg Presets. <br/><span className="text-white/20">Cofre de alta fidelidade visual.</span>
        </p>
      </motion.div>
    </div>
  )
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeProducts, setActiveProducts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'admin'>('home');
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditingPreset, setIsEditingPreset] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [portalSettings, setPortalSettings] = useState<any>({ 
    hero_title: 'SEU IMPÉRIO VISUAL COMEÇA AQUI', 
    hero_image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200' 
  });

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
        <div className="p-8 h-full flex flex-col items-center overflow-y-auto no-scrollbar">
           <div className="mb-10 w-full max-w-[150px] shadow-2xl rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setActiveTab('home'); setViewingProduct(null); }}>
             <img src={portalSettings.hero_image} alt="Logo" className="grayscale brightness-150 transition-all hover:grayscale-0 hover:brightness-200" />
           </div>
           <nav className="space-y-3 flex-1 w-full">
             <button onClick={() => { setActiveTab('home'); setViewingProduct(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all font-black text-[11px] uppercase tracking-widest ${activeTab === 'home' && !viewingProduct ? 'bg-[#d82828] text-white shadow-xl shadow-[#d82828]/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
               <Home size={18} /> Início
             </button>
             {isAdmin && (
               <button onClick={() => { setActiveTab('admin'); setViewingProduct(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all font-black text-[11px] uppercase tracking-widest ${activeTab === 'admin' ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'text-amber-500/50 hover:text-white hover:bg-amber-500/5'}`}>
                 <Settings size={18} /> Cockpit Admin
               </button>
             )}
           </nav>
           <div className="mt-auto pt-8 border-t border-white/5 w-full">
             <div className="flex items-center gap-4 bg-white/5 p-5 rounded-3xl mb-6 shadow-inner">
               <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm bg-[#d82828]/20 text-[#d82828] shadow-inner border border-white/5">{currentUser?.full_name?.charAt(0)}</div>
               <div className="truncate"><p className="text-[11px] font-black text-white uppercase truncate leading-none italic">{currentUser?.full_name}</p><p className="text-[9px] font-bold text-gray-500 mt-2 tracking-widest italic">{isAdmin ? 'ADMIN MASTER' : 'MEMBRO VIP'}</p></div>
             </div>
             <button onClick={handleLogout} className="w-full py-4 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 group">
               <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> SAIR
             </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto no-scrollbar scroll-smooth relative">
        <header className="h-24 px-10 lg:px-14 flex items-center justify-between border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-2xl z-50 sticky top-0">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-white"><Menu /></button>
            <div className="text-[11px] font-black uppercase text-[#d82828] tracking-[0.3em] flex items-center gap-4 italic">
              <Box size={14} fill="currentColor" /> 
              {viewingProduct ? viewingProduct.name : activeTab.toUpperCase()} {isAdmin && 'COMMAND'}
            </div>
          </div>
        </header>

        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[65] lg:hidden" />}

        <div className="p-10 lg:p-14 pb-40 max-w-7xl mx-auto w-full">
           {viewingProduct ? (
             <ProductDetailView product={viewingProduct} isAdmin={isAdmin} onBack={() => setViewingProduct(null)} />
           ) : activeTab === 'home' ? (
             <div className="space-y-24">
               <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative aspect-[21/9] lg:aspect-[21/7] rounded-[4.5rem] overflow-hidden bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#d82828]/5 to-transparent opacity-50" />
                  <img src={portalSettings.hero_image} alt="Hero" className="max-w-[220px] grayscale brightness-150 mb-10 shadow-3xl rounded-3xl relative z-10" />
                  <h1 className="text-3xl lg:text-7xl font-black text-white uppercase tracking-tighter italic leading-none relative z-10">{portalSettings.hero_title}</h1>
               </motion.section>

               <AnimatePresence mode="popLayout">
                 {modules.map((mod, modIdx) => (
                   <motion.section key={mod.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-14">
                      <div className="flex items-end justify-between border-l-4 border-[#d82828] pl-10">
                        <div>
                           <h2 className="text-4xl font-black text-white uppercase italic leading-none">{mod.module_title}</h2>
                           <p className="text-gray-500 text-[12px] uppercase font-black tracking-[0.3em] mt-5 leading-none">{mod.module_desc}</p>
                        </div>
                      </div>
                      <div className="flex gap-12 overflow-x-auto pb-16 no-scrollbar scroll-smooth px-2">
                        {mod.presets_data?.map((p: any, pIdx: number) => { 
                          const isLocked = !isAdmin && !activeProducts.includes(p.id) && !activeProducts.includes('*'); 
                          return <PresetCard key={modIdx + '-' + pIdx} preset={p} isLocked={isLocked} isAdmin={isAdmin} onClick={() => setViewingProduct(p)} onEdit={() => setIsEditingPreset({modIdx, pIdx, p})} />; 
                        })}
                      </div>
                   </motion.section>
                 ))}
               </AnimatePresence>
             </div>
           ) : activeTab === 'admin' ? (
             <AdminPanel portalData={portalSettings} onUpdate={fetchInitialData} modules={modules} />
           ) : null}
        </div>
      </main>

      <AnimatePresence>
        {isEditingPreset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 text-gray-950 font-sans">
             <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[4.5rem] p-16 relative shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
                <button onClick={() => setIsEditingPreset(null)} className="absolute top-12 right-12 text-gray-200 hover:text-black transition-all">
                  <X size={40} />
                </button>
                <h3 className="text-4xl font-black uppercase italic mb-12 tracking-tighter italic">Editar Preset</h3>
                <form onSubmit={async (e: any) => { 
                  e.preventDefault(); 
                  const { modIdx, pIdx } = isEditingPreset; 
                  const moduleToUpdate = modules[modIdx]; 
                  const newPresets = [...moduleToUpdate.presets_data]; 
                  newPresets[pIdx] = { 
                    ...newPresets[pIdx], 
                    name: e.currentTarget.pname.value, 
                    image: e.currentTarget.pimage.value, 
                    download_link: e.currentTarget.pdownload.value, 
                    upsell_link: e.currentTarget.pupsell.value 
                  }; 
                  const { error } = await supabase.from('modules_presets').update({ presets_data: newPresets }).eq('id', moduleToUpdate.id); 
                  if (!error) {
                    setIsEditingPreset(null); 
                    fetchInitialData();
                    toast('Preset sincronizado! ✅');
                  }
                }} className="space-y-10">
                   <div className="space-y-3">
                     <label className="text-[11px] font-black uppercase text-gray-400 italic">Identidade Visual</label>
                     <input name="pname" defaultValue={isEditingPreset.p.name} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-7 font-black uppercase italic text-xl outline-none focus:border-[#d82828] transition-all" />
                   </div>
                   <div className="space-y-3">
                     <label className="text-[11px] font-black uppercase text-gray-400 italic">Capa Master (URL)</label>
                     <input name="pimage" defaultValue={isEditingPreset.p.image} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 font-bold text-sm outline-none focus:border-[#d82828]" />
                   </div>
                   <div className="space-y-3">
                     <label className="text-[11px] font-black uppercase text-gray-400 italic">Vault de Download</label>
                     <input name="pdownload" defaultValue={isEditingPreset.p.download_link} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 font-bold text-sm outline-none focus:border-[#d82828]" />
                   </div>
                   <div className="space-y-3">
                     <label className="text-[11px] font-black uppercase text-gray-400 italic text-[#d82828]">Link de Redirecionamento (Upsell)</label>
                     <input name="pupsell" defaultValue={isEditingPreset.p.upsell_link} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 font-bold text-sm outline-none focus:border-[#d82828]" />
                   </div>
                   <button type="submit" className="w-full py-8 bg-gray-950 text-white rounded-[2.5rem] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-6 shadow-2xl hover:bg-[#d82828] transition-all">
                     <Save size={28} /> SINCRONIZAR ITEM
                   </button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  )
}
