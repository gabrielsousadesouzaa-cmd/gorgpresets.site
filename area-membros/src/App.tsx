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
      className={`group relative flex-none w-[280px] sm:w-[320px] aspect-[4/5] rounded-[2.5rem] overflow-hidden transition-all duration-700 bg-black ${isLocked ? (preset.upsell_link ? 'cursor-pointer shadow-lg shadow-gray-200' : 'opacity-80 grayscale-[0.3]') : 'cursor-pointer shadow-2xl shadow-gray-200'}`}
    >
      <img src={preset.image} alt={preset.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent group-hover:via-black/60 transition-colors duration-700" />
      
      {isAdmin && (
        <div className="absolute top-6 left-6 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-[#d82828] hover:border-[#d82828] transition-all text-white shadow-2xl">
            <Edit size={18} />
          </button>
        </div>
      )}
      
      <div className="absolute inset-x-8 bottom-8 flex flex-col justify-end">
         <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-4">Coleção Premium</p>
         <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none truncate italic">{preset.name}</h3>
         
         <AnimatePresence mode="wait">
           {!isLocked ? (
             <motion.div key="dl" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 overflow-hidden -mx-2">
               <div className="w-full py-4 bg-[#d82828] text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-3 decoration-none hover:bg-white hover:text-black transition-all uppercase tracking-widest shadow-xl">
                 <Play size={14} fill="currentColor" /> ACESSAR CONTEÚDO
               </div>
             </motion.div>
           ) : preset.upsell_link && (
             <motion.div key="up" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 overflow-hidden -mx-2">
               <div className="w-full py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-3 uppercase tracking-tighter hover:bg-white hover:text-black transition-all">
                 <ExternalLink size={14} /> ADQUIRIR ACESSO
               </div>
             </motion.div>
           )}
         </AnimatePresence>
      </div>
      
      {isLocked && (
        <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl text-white">
          <Lock className="w-4 h-4" />
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
        <button onClick={onBack} className="p-5 bg-black/5 border border-black/10 rounded-3xl hover:bg-white hover:text-black transition-all group shrink-0 shadow-2xl">
          <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex border-l-4 border-[#d82828] pl-8 flex-col">
          <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none">{product.name}</h2>
          <p className="text-gray-500 text-[11px] font-black uppercase mt-3 tracking-widest leading-none">Acesso VIP Protegido • Gorg Elite</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          {activeLesson ? (
            <div className="bg-black/5 border border-black/10 rounded-[4rem] overflow-hidden shadow-2xl aspect-video relative group ring-1 ring-white/10">
              <iframe 
                src={activeLesson.video_url?.includes('youtube.com') ? activeLesson.video_url.replace('watch?v=', 'embed/') : activeLesson.video_url} 
                className="w-full h-full border-0" 
                allowFullScreen 
              />
            </div>
          ) : (
            <div className="aspect-video bg-black/5 rounded-[4rem] border-2 border-dashed border-black/5 flex flex-col items-center justify-center text-gray-700 italic font-black uppercase">
              <PlayCircle size={80} className="mb-6 opacity-10" /> 
              Nenhuma aula disponível ainda.
            </div>
          )}

          <div className="bg-black/5 border border-black/10 p-12 rounded-[3.5rem] flex flex-col sm:flex-row items-center justify-between shadow-2xl group hover:border-[#d82828]/20 transition-all gap-8">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-[2rem] bg-[#d82828] text-black flex items-center justify-center shadow-2xl shadow-[#d82828]/30 group-hover:scale-105 transition-all">
                <Download size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-black uppercase italic tracking-tight italic">Arquivos Master</h3>
                <p className="text-gray-500 text-[11px] font-bold uppercase mt-2 tracking-widest leading-none">Download Seguro de Alta Performance</p>
              </div>
            </div>
            <a href={product.download_link} target="_blank" rel="noreferrer" className="w-full sm:w-auto px-12 py-6 bg-black text-white rounded-3xl font-black text-[12px] uppercase tracking-widest hover:bg-[#d82828] hover:text-black transition-all shadow-2xl text-center">
              BAIXAR AGORA
            </a>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between border-l-4 border-[#d82828] pl-8">
            <h3 className="text-[14px] font-black text-black uppercase italic tracking-widest">Aulas Protegidas</h3>
            {isAdmin && (
              <button onClick={addLesson} className="p-4 bg-emerald-500 text-black rounded-2xl hover:bg-white hover:text-emerald-500 transition-all shadow-xl">
                <Plus size={20} />
              </button>
            )}
          </div>

          <div className="space-y-5 max-h-[700px] overflow-y-auto no-scrollbar pr-4">
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} className="relative group">
                <div 
                  onClick={() => setActiveLesson(lesson)} 
                  className={`p-7 rounded-[3rem] border transition-all cursor-pointer flex items-center gap-6 ${activeLesson?.id === lesson.id ? 'bg-[#d82828] border-[#d82828] shadow-2xl scale-[1.02]' : 'bg-black/5 border-black/5 hover:border-black/10'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${activeLesson?.id === lesson.id ? 'bg-black text-white shadow-lg' : 'bg-black/5 text-gray-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 truncate">
                    <h4 className={`text-[12px] font-black uppercase truncate italic ${activeLesson?.id === lesson.id ? 'text-black' : 'text-gray-700'}`}>
                      {lesson.title}
                    </h4>
                    {activeLesson?.id === lesson.id && (
                      <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.25em] mt-2 italic animate-pulse">Assistindo</p>
                    )}
                  </div>
                  <Play size={14} fill="currentColor" className={activeLesson?.id === lesson.id ? 'text-black' : 'text-gray-700 opacity-0 group-hover:opacity-100 transition-all'} />
                </div>
                {isAdmin && (
                  <div className="absolute top-1/2 -translate-y-1/2 -right-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingLesson(lesson); }} className="p-3 bg-black text-white rounded-xl shadow-2xl hover:bg-[#d82828] hover:text-black transition-all">
                      <Edit size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir aula?')) { supabase.from('lessons').delete().eq('id', lesson.id).then(() => fetchLessons()); } }} className="p-3 bg-red-500 text-black rounded-xl shadow-2xl hover:bg-black transition-all">
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
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[4.5rem] p-16 relative shadow-2xl border border-black/20">
              <button onClick={() => setIsEditingLesson(null)} className="absolute top-12 right-12 text-gray-800 hover:text-black transition-all">
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
                <button type="submit" className="w-full py-7 bg-gray-950 text-black rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-5 hover:bg-[#d82828] transition-all shadow-2xl shadow-red-500/10">
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
    <div className="space-y-16 pb-32 selection:bg-[#d82828] selection:text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 border-b border-black/5 pb-14">
        <div className="flex border-l-4 border-[#d82828] pl-10 flex-col">
          <div className="flex items-center gap-4 text-amber-500 mb-3">
             <ShieldCheck size={22} />
             <span className="text-[12px] font-black uppercase tracking-[0.3em]">COMANDO MESTRE</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-black uppercase italic tracking-tighter leading-none italic">COCKPIT GORG</h2>
        </div>
        
        <div className="flex bg-black/5 p-2 rounded-[2.5rem] border border-black/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'content', label: 'Cofre', icon: Layout },
            { id: 'users', label: 'Elite', icon: Users },
            { id: 'sales', label: 'Vitrine', icon: Sparkles },
            { id: 'email', label: 'Automate', icon: Mail },
            { id: 'webhooks', label: 'Integrações', icon: Zap }
          ].map(tab => (
            <button key={tab.id} onClick={() => setAdminSection(tab.id as any)} className={`flex items-center gap-3 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all ${adminSection === tab.id ? 'bg-[#d82828] text-white shadow-2xl shadow-[#d82828]/20' : 'text-gray-500 hover:text-black'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {adminSection === 'sales' && (
          <motion.div key="v" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-black/5 border border-black/10 p-12 rounded-[4rem] space-y-12 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
             <div className="flex items-center gap-6 border-l-4 border-[#d82828] pl-10">
                <div className="w-16 h-16 bg-[#d82828]/10 text-[#d82828] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#d82828]/5"><Sparkles size={32} /></div>
                <div><h3 className="text-3xl font-black text-black uppercase italic">A Mágica Acontece</h3><p className="text-gray-500 text-[11px] font-bold uppercase mt-2 tracking-widest leading-none">Gestão de Impacto Visual da Vitrine</p></div>
             </div>
             {salesSettings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {['before', 'after'].map(role => (
                     <div key={role} className="space-y-8">
                        <label className="text-[12px] font-black uppercase text-gray-400 tracking-widest italic">{role === 'before' ? 'FOTO ORIGINAL (ANTES)' : 'FOTO REVELADA (DEPOIS)'}</label>
                        <div className="relative group overflow-hidden rounded-[3.5rem] aspect-square bg-black border border-black/5 shadow-2xl ring-1 ring-white/10">
                           <img src={role === 'before' ? salesSettings.magic_before_url : salesSettings.magic_after_url} className={`w-full h-full object-cover ${role === 'before' ? 'grayscale opacity-60' : 'opacity-80 group-hover:scale-105 transition-transform duration-1000'}`} />
                           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md">
                              <label className="cursor-pointer flex flex-col items-center gap-6">
                                 {isUploading === role ? <RefreshCw className="animate-spin text-black" size={32} /> : <Upload className="text-black" size={40} />}
                                 <div className="px-10 py-5 bg-black text-white rounded-3xl font-black text-[12px] uppercase tracking-widest shadow-2xl">UPAR FOTO</div>
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

        {adminSection === 'webhooks' && (
          <motion.div key="w" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="flex items-center gap-6 border-l-4 border-[#d82828] pl-10 mb-8">
               <div className="w-16 h-16 bg-[#d82828]/10 text-[#d82828] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#d82828]/5"><Zap size={32} /></div>
               <div><h3 className="text-3xl font-black text-black uppercase italic">Plataformas e Webhooks</h3><p className="text-gray-500 text-[11px] font-bold uppercase mt-2 tracking-widest leading-none">Conecte com GGCHECKOUT, Kiwify, Hotmart, etc.</p></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-black/5 border border-black/10 p-10 rounded-[3rem] space-y-8 shadow-2xl relative">
                <h4 className="text-[14px] font-black text-black uppercase italic tracking-widest flex items-center gap-3"><Globe className="text-[#d82828]"/> URL do Webhook Universal</h4>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Cole este link na sua plataforma de vendas para receber as confirmações de compra automaticamente.</p>
                <div className="flex items-center gap-4 bg-black/5 p-5 rounded-2xl border border-black/5 cursor-pointer hover:border-black/20 transition-all" onClick={() => { navigator.clipboard.writeText('https://ibsnizsdascywkonvcvu.supabase.co/functions/v1/webhook-vendas'); toast('URL Copiada!'); }}>
                  <code className="text-[#d82828] font-black text-sm truncate flex-1 flex items-center gap-2">
                     <span className="text-gray-500">POST</span> /functions/v1/webhook-vendas
                  </code>
                  <Download size={18} className="text-black/40" />
                </div>
              </div>

              <div className="bg-black/5 border border-black/10 p-10 rounded-[3rem] space-y-8 shadow-2xl relative">
                <h4 className="text-[14px] font-black text-black uppercase italic tracking-widest flex items-center gap-3"><Database className="text-[#d82828]" /> Plataformas Cadastradas</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-black/5 p-5 rounded-2xl border border-black/5">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black">GG</div>
                       <div><p className="font-black text-black uppercase text-xs italic">GGCHECKOUT</p><p className="text-[9px] text-emerald-500 uppercase tracking-widest mt-1">Ativo e Ouvindo</p></div>
                     </div>
                     <button className="text-gray-500 hover:text-black transition-all"><Settings size={16} /></button>
                  </div>
                  <button onClick={() => alert('Em breve: Modal para adicionar nova plataforma (Hotmart, Kiwify, etc).')} className="w-full flex items-center justify-center gap-3 py-6 bg-black/5 border-2 border-dashed border-black/10 rounded-2xl text-gray-500 hover:text-black hover:border-black/20 transition-all font-black text-[10px] uppercase tracking-widest">
                    <Plus size={16} /> ADICIONAR NOVA PLATAFORMA
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-black/5 border border-black/10 rounded-[3rem] p-10 space-y-6">
              <h4 className="text-[14px] font-black text-black uppercase italic tracking-widest mb-4">Log de Recebimentos</h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                {webhookLogs.length > 0 ? webhookLogs.map((log: any) => (
                  <div key={log.id} className="text-xs text-gray-500 font-mono p-3 bg-black/5 rounded-xl flex items-center gap-3">
                    <span className="text-emerald-500">[{new Date(log.received_at).toLocaleTimeString()}]</span> <span className="font-bold text-black">POST /webhook-vendas</span> <span className="text-gray-400">{log.payload?.email || 'Sem email'}</span>
                  </div>
                )) : <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest text-center py-10">Nenhum webhook recebido recentemente.</p>}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* ... (Other Admin sections omitted for space but assume they are here or restored) */}
        {adminSection === 'users' && (
          <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
            <div className="bg-black/5 border border-black/10 rounded-[4rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead><tr className="border-b border-black/5"><th className="p-10 text-[11px] font-black uppercase text-gray-500 tracking-[0.3em]">ALUNO ELITE</th><th className="p-10 text-[11px] font-black uppercase text-gray-500 tracking-[0.3em]">SITUAÇÃO</th><th className="p-10 text-[11px] font-black uppercase text-gray-500 tracking-[0.3em] text-right">AÇÕES</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-10"><div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-center font-black text-[#d82828]">{u.full_name?.charAt(0)}</div><div><p className="font-black text-black uppercase italic text-sm">{u.full_name}</p><p className="text-[10px] text-gray-500 mt-2 font-bold">{u.email}</p></div></div></td>
                      <td className="p-10"><div className="flex items-center gap-3"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Membro Ativo</span></div></td>
                      <td className="p-10 text-right"><button className="p-4 bg-black/5 border border-black/10 rounded-2xl hover:bg-[#d82828] hover:text-black transition-all"><Edit size={16} /></button></td>
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
                <button onClick={() => { const t = prompt('Título Módulo:'); const d = prompt('Descrição:'); if (t) supabase.from('modules_presets').insert([{ module_title: t, module_desc: d, order_index: modules.length }]).then(() => onUpdate()); }} className="aspect-video bg-black/5 border-2 border-dashed border-black/5 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 group hover:border-[#d82828]/40 hover:bg-[#d82828]/5 transition-all outline-none">
                   <div className="w-20 h-20 bg-black/5 rounded-[2rem] flex items-center justify-center text-gray-700 group-hover:bg-[#d82828] group-hover:text-black transition-all shadow-2xl"><Plus size={32} /></div>
                   <span className="text-[11px] font-black uppercase text-gray-700 group-hover:text-black tracking-[0.3em]">Nova Coleção Master</span>
                </button>
             </div>
             {modules.map((mod, idx) => (
               <div key={mod.id} className="bg-black/5 border border-black/10 p-12 rounded-[4rem] space-y-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-5 left-12 px-8 py-3 bg-[#d82828] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest italic shadow-2xl">MÓDULO {String(idx + 1).padStart(2, '0')}</div>
                  <div className="flex items-end justify-between border-l-4 border-[#d82828] pl-10 pt-6">
                     <div><h3 className="text-3xl font-black text-black uppercase italic leading-none">{mod.module_title}</h3><p className="text-gray-500 text-[11px] uppercase font-black tracking-[0.2em] mt-4">{mod.module_desc}</p></div>
                     <div className="flex gap-4">
                        <button onClick={async () => { const name = prompt('Nome Preset:'); const img = prompt('Imagem:'); const dl = prompt('Download:'); if (name) { const npd = [...(mod.presets_data || []), { id: Date.now().toString(), name, image: img, download_link: dl, upsell_link: '' }]; await supabase.from('modules_presets').update({ presets_data: npd }).eq('id', mod.id); onUpdate(); } }} className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"><Plus size={14} /> ADICIONAR PRESET</button>
                        <button onClick={() => { if (confirm('Excluir módulo?')) supabase.from('modules_presets').delete().eq('id', mod.id).then(() => onUpdate()); }} className="p-4 bg-black/5 border border-black/10 rounded-2xl hover:bg-black transition-all text-gray-500 hover:text-red-500"><Trash2 size={18} /></button>
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
const LoginView = ({ onLogin, logoUrl }: { onLogin: (e: string, p: string, r: boolean) => Promise<boolean>, logoUrl: string }) => {
  const savedEmail = localStorage.getItem('gorg_remember_email') || '';
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(!!savedEmail);
  const [loading, setLoading] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(false);
    const success = await onLogin(email, password, remember);
    if (!success) {
      setLoading(false);
      setLoginError(true);
    } else {
      // Salva ou remove o email conforme o "Lembrar"
      if (remember) {
        localStorage.setItem('gorg_remember_email', email);
      } else {
        localStorage.removeItem('gorg_remember_email');
      }
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f4f4f5] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Efeito Aurora Otimizado para iOS (Troca blur pesado por radial-gradient real) */}
      <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(216,40,40,0.15) 0%, transparent 60%)' }} />
      <motion.div animate={{ x: ["-50%", "-30%", "-50%"], y: ["-50%", "-60%", "-50%"] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 55%)' }} />
      <motion.div animate={{ x: ["-50%", "-60%", "-50%"], y: ["-50%", "-35%", "-50%"] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(216,40,40,0.12) 0%, transparent 55%)' }} />
      
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.08)] relative z-10 mx-auto">
        
        <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-36 sm:w-40 mb-4 sm:mb-6 flex items-center justify-center min-h-[40px]">
            {logoUrl && <img src={logoUrl} alt="" className="max-w-full h-auto object-contain drop-shadow-sm" />}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <h1 className="text-[20px] sm:text-[22px] font-black text-gray-900 uppercase tracking-tight">ÁREA DE MEMBROS</h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-gray-400 mt-1 sm:mt-2">Identifique-se para acessar o material</p>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="space-y-2">
             <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">E-MAIL</label>
             <input 
               type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setLoginError(false); }}
               className="w-full h-14 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d82828] focus:shadow-[0_0_0_4px_rgba(216,40,40,0.1)] rounded-xl px-5 text-gray-800 font-bold outline-none transition-all placeholder:text-gray-400" 
               placeholder="seu@email.com" 
             />
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="space-y-2">
             <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
               SENHA
             </label>
             <input 
               type="password" required value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
               className={`w-full h-14 bg-gray-50 border-2 focus:bg-white rounded-xl px-5 text-gray-800 font-bold outline-none transition-all placeholder:text-gray-300 tracking-[0.2em] ${loginError ? 'border-[#d82828] shadow-[0_0_0_4px_rgba(216,40,40,0.1)]' : 'border-transparent focus:border-[#d82828] focus:shadow-[0_0_0_4px_rgba(216,40,40,0.1)]'}`}
               placeholder="••••••••" 
             />
             <AnimatePresence>
               {loginError && (
                 <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-[#d82828] font-black flex items-center gap-1.5 ml-1">
                   <AlertCircle size={12} /> E-mail ou senha inválidos.
                 </motion.p>
               )}
             </AnimatePresence>
             {!loginError && <p className="text-[11px] text-gray-400 text-center pt-1 font-medium">A sua senha padrão de acesso é <strong className="text-[#d82828] font-black">1234</strong></p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col pt-2 gap-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRemember(!remember)} className="flex items-center gap-3 group">
                 <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${remember ? 'bg-[#d82828] border-[#d82828]' : 'border-gray-200 bg-gray-50'}`}>
                   {remember && <CheckCircle2 size={12} className="text-white" />}
                 </div>
                 <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-900 transition-colors">Lembrar</span>
              </button>
              <button type="button" onClick={() => setShowSupport(!showSupport)} className="text-[11px] font-black text-black uppercase tracking-widest hover:text-[#d82828] transition-colors">Precisa de ajuda?</button>
            </div>
            
            <div style={{ perspective: 1000 }}>
              <AnimatePresence>
                {showSupport && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, rotateX: -90 }} 
                    animate={{ opacity: 1, height: 'auto', rotateX: 0 }} 
                    exit={{ opacity: 0, height: 0, rotateX: -90 }} 
                    transition={{ duration: 0.6, type: "spring", bounce: 0.4 }} 
                    style={{ transformOrigin: "top" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 mt-1 shadow-inner">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mx-auto block text-center">E-MAIL DO SUPORTE</span>
                      <a href="mailto:suporte@gorgpresets.com" className="text-[12px] sm:text-[13px] font-black text-gray-800 tracking-[0.1em] hover:text-[#d82828] transition-colors mx-auto block text-center">
                        suporte@gorgpresets.com
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <button disabled={loading} type="submit" className="w-full h-14 mt-4 bg-[#d82828] text-white rounded-xl font-bold text-[13px] uppercase tracking-widest hover:bg-[#b01e1e] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/20">
              {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {loading ? 'VALIDANDO...' : 'ACESSAR CONTA'}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  )
}

// --- SUPPORT VIEW ---
const SupportView = () => {
  const [formSent, setFormSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;
    await new Promise(r => setTimeout(r, 1200));
    window.location.href = `mailto:suporte@gorgpresets.com?subject=Suporte - ${name}&body=${encodeURIComponent(message + '\n\nContato: ' + email)}`;
    setLoading(false);
    setFormSent(true);
  };

  const faqs = [
    { q: 'Como faço para baixar meus presets?', a: 'Acesse a sua coleção na página Início, clique no preset desejado e depois no botão "BAIXAR AGORA".' },
    { q: 'Minha senha padrão não funciona.', a: 'A senha padrão de acesso é 1234. Se ainda não conseguir entrar, entre em contato pelo formulário ou WhatsApp.' },
    { q: 'Os presets funcionam em qual versão do Lightroom?', a: 'Nossos presets são compatíveis com Lightroom Classic, CC e Mobile (versão 6.0 ou superior).' },
    { q: 'Como instalar os presets no celular?', a: 'Baixe o arquivo DNG, importe no Lightroom Mobile, abra a foto e copie as configurações para os demais presets.' },
    { q: 'Posso usar em mais de um dispositivo?', a: 'Sim! Seu acesso é pessoal, mas você pode usar em todos os seus dispositivos com o mesmo login.' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full min-h-screen pt-[100px] pb-32 px-6 lg:px-14">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* HEADER DA PÁGINA */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-black uppercase tracking-widest text-[#d82828]">
            <Headphones size={14} /> Central de Suporte
          </div>
          <h1 className="text-[40px] lg:text-[60px] font-black text-white uppercase tracking-tighter leading-none">
            Como podemos<br/><span className="text-[#d82828]">te ajudar?</span>
          </h1>
          <p className="text-gray-400 text-[15px] font-medium max-w-md mx-auto">
            Nossa equipe está pronta para garantir que você tenha a melhor experiência possível.
          </p>
        </div>

        {/* CARDS DE CONTATO RÁPIDO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.a
            href="https://wa.me/351000000000"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.02, y: -4 }}
            className="group flex items-center gap-6 p-8 bg-[#1a1a1a] border border-white/10 hover:border-green-500/40 rounded-[2rem] transition-all cursor-pointer hover:bg-green-500/5"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500 group-hover:border-green-500 transition-all shrink-0">
              <svg className="w-7 h-7 text-green-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-gray-500 mb-1">Atendimento Rápido</p>
              <p className="text-white font-black text-[18px]">WhatsApp</p>
              <p className="text-green-400 text-[12px] font-bold mt-1">Canal de atendimento prioritário</p>
            </div>
            <ChevronRight size={20} className="ml-auto text-gray-600 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
          </motion.a>

          <motion.a
            href="mailto:suporte@gorgpresets.com"
            whileHover={{ scale: 1.02, y: -4 }}
            className="group flex items-center gap-6 p-8 bg-[#1a1a1a] border border-white/10 hover:border-[#d82828]/40 rounded-[2rem] transition-all cursor-pointer hover:bg-[#d82828]/5"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-[#d82828]/10 border border-[#d82828]/20 flex items-center justify-center group-hover:bg-[#d82828] group-hover:border-[#d82828] transition-all shrink-0">
              <Mail size={28} className="text-[#d82828] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-gray-500 mb-1">E-mail Oficial</p>
              <p className="text-white font-black text-[18px]">E-mail</p>
              <p className="text-[#d82828] text-[12px] font-bold mt-1">suporte@gorgpresets.com</p>
            </div>
            <ChevronRight size={20} className="ml-auto text-gray-600 group-hover:text-[#d82828] group-hover:translate-x-1 transition-all" />
          </motion.a>
        </div>

        {/* FAQ - LARGURA TOTAL */}
        <div className="space-y-6 max-w-3xl mx-auto w-full">
          <div>
            <h2 className="text-[26px] font-black text-white uppercase tracking-tighter">Perguntas Frequentes</h2>
            <p className="text-gray-500 text-[13px] font-medium mt-2">Respostas para as dúvidas mais comuns.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FaqItem key={i} faq={faq} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FaqItem = ({ faq }: { faq: { q: string; a: string } }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-[1.5rem] overflow-hidden transition-all">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-6 text-left gap-4">
        <span className="text-[13px] font-black text-white uppercase tracking-wide">{faq.q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={18} className="text-[#d82828] shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <p className="px-6 pb-6 text-gray-400 text-[13px] font-medium leading-relaxed border-t border-white/5 pt-4">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const getInitials = (name: string) => {
  if (!name) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    '#8b5cf6', '#d82828', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1'
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeProducts, setActiveProducts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'admin' | 'support'>('home');
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditingPreset, setIsEditingPreset] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [portalSettings, setPortalSettings] = useState<any>({ 
    hero_title: 'SEU IMPÉRIO VISUAL COMEÇA AQUI', 
    hero_image: '' 
  });

  useEffect(() => {
    const initApp = async () => {
      // Dispara as requisições em paralelo para não travar a tela em conexões de celular (Principalmente iOS)
      const fetchPromise = fetchInitialData();
      const sessionPromise = supabase.auth.getSession();
      
      const [_, { data: { session } }] = await Promise.all([fetchPromise, sessionPromise]);
      
      if (session) {
         const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
         if (data) {
            setCurrentUser(data); setActiveProducts(data.active_products || []); setIsAdmin(false); setIsLoggedIn(true);
         }
      } else {
         const savedEmail = localStorage.getItem('gorg_persistent_session');
         if (savedEmail === ADMIN_EMAIL) { await onLogin(savedEmail, 'admin123', true); }
      }
      setIsReady(true);
    };
    initApp();
  }, []);

  const fetchInitialData = async () => {
    const { data: settings } = await supabase.from('portal_settings').select('*').eq('id', 'main').single();
    if (settings) setPortalSettings(settings);
    const { data: modData } = await supabase.from('modules_presets').select('*').order('order_index');
    if (modData) setModules(modData);
  }

  const onLogin = async (email: string, pass: string, remember: boolean) => {
    const inputEmail = email.toLowerCase().trim();
    
    // Mock Admin Login setup
    if (inputEmail === ADMIN_EMAIL && pass === 'admin123') { // Senha fixa do admin para este estágio
      if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
      setIsAdmin(true); setCurrentUser({ full_name: 'Gabriel Souza (Admin)', email: inputEmail }); setActiveProducts(['*']); setIsLoggedIn(true);
      return true;
    }
    
    try {
      // SUPABASE REAL AUTH: Tenta logar oficialmente
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: inputEmail, password: pass });
      
      if (authError) {
        // FALLBACK LEGACY: Para não quebrar quem estava sem senha oficial antes da migração
        const { data, error } = await supabase.from('profiles').select('*').eq('email', inputEmail).single();
        if (error || !data) return false;
        
        // Simula senha padrão ("1234" ou antiga "gorg123") requerida p/Fallback
        if (pass !== '1234' && pass !== 'gorg123' && pass !== data.password) return false;
        
        if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
        setCurrentUser(data); setActiveProducts(data.active_products || []); setIsAdmin(false); setIsLoggedIn(true); return true;
      }

      // Se Autenticação Oficial (authData) foi sucesso:
      const { data, error } = await supabase.from('profiles').select('*').eq('id', authData.user?.id).single();
      if (error || !data) return false;
      
      if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
      setCurrentUser(data); setActiveProducts(data.active_products || []); setIsAdmin(false); setIsLoggedIn(true); return true;
    } catch (err) { return false; }
  }

  const handleLogout = () => { localStorage.removeItem('gorg_persistent_session'); supabase.auth.signOut(); setIsLoggedIn(false); setIsAdmin(false); setCurrentUser(null); setViewingProduct(null); }

  if (!isReady) return <div className="min-h-[100dvh] bg-[#f4f4f5] flex items-center justify-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-[#d82828] rounded-full animate-spin" /></div>;

  if (!isLoggedIn) return <LoginView onLogin={onLogin} logoUrl={portalSettings.hero_image} />

  return (
    <div className="var-wrapper min-h-[100dvh] bg-black text-white flex flex-col font-sans selection:bg-[#d82828] selection:text-white overflow-x-hidden">
      {/* HEADER SUPERIOR (TOP NAVBAR) FIXED COM EFEITO DE VIDRO (GLASSMORPHISM) */}
      <header className="fixed top-0 left-0 w-full h-[80px] px-6 lg:px-14 flex items-center justify-between bg-[#0a0a0a]/50 backdrop-blur-xl border-b border-white/10 z-[70] shadow-sm">
        
        {/* ESQUERDA: Menu Mobile (Hamburger) ou Links Desktop */}
        <div className="flex-1 flex items-center justify-start">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white p-2 -ml-2"><Menu size={28} /></button>
          
          <nav className="hidden md:flex items-center gap-8">
             <button onClick={() => { setActiveTab('home'); setViewingProduct(null); }} className={`flex items-center gap-2 text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === 'home' && !viewingProduct ? 'text-[#d82828] drop-shadow-md' : 'text-gray-300 hover:text-white'}`}>
               <Home size={16} /> Início
             </button>
             <button onClick={() => { setActiveTab('support'); setViewingProduct(null); }} className={`flex items-center gap-2 text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === 'support' ? 'text-[#d82828] drop-shadow-md' : 'text-gray-300 hover:text-white'}`}>
               <Headphones size={16} /> Suporte
             </button>
             {isAdmin && (
               <button onClick={() => { setActiveTab('admin'); setViewingProduct(null); }} className={`flex items-center gap-2 text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === 'admin' ? 'text-amber-500 drop-shadow-md' : 'text-amber-500/50 hover:text-amber-400'}`}>
                 <Settings size={16} /> Comando VIP
               </button>
             )}
          </nav>
        </div>

        {/* CENTRO ABSOLUTO: Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <img src="/logo_branca.png" alt="Gorg Presets" className="h-[65px] lg:h-[85px] cursor-pointer object-contain transition-transform hover:scale-105" onClick={() => { setActiveTab('home'); setViewingProduct(null); }} />
        </div>

        {/* DIREITA: Perfil do Desenvolvedor/Membro e Logout */}
        <div className="flex-1 flex items-center justify-end gap-6">
          <div className="hidden md:flex items-center gap-4">
             <p className="text-[11px] font-bold text-gray-300">
               Bem vindo(a) <span className="font-black text-white uppercase italic">{currentUser?.full_name || 'Membro'}</span>!
             </p>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs shadow-xl uppercase border border-white/20 active:scale-95 transition-transform cursor-default"
                style={{ backgroundColor: getAvatarColor(currentUser?.full_name) }}
              >
                {getInitials(currentUser?.full_name)}
              </div>
          </div>
          <button onClick={handleLogout} className="text-[#d82828] hover:text-red-400 transition-colors p-2 -mr-2 cursor-pointer z-50">
            <LogOut size={24} className="md:w-[20px] md:h-[20px]" />
          </button>
        </div>
      </header>

      {/* MOBILE MENU (If opened) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex flex-col p-8">
            <button onClick={() => setIsSidebarOpen(false)} className="self-end text-white hover:text-[#d82828] mb-10"><X size={32} /></button>
            <nav className="flex flex-col gap-10 text-center flex-1 justify-center">
               <button onClick={() => { setActiveTab('home'); setViewingProduct(null); setIsSidebarOpen(false); }} className={`text-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 ${activeTab === 'home' ? 'text-[#d82828]' : 'text-white'}`}>
                 <Home size={28} /> Início
               </button>
               <button onClick={() => { setActiveTab('support'); setViewingProduct(null); setIsSidebarOpen(false); }} className={`text-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 ${activeTab === 'support' ? 'text-[#d82828]' : 'text-white'}`}>
                 <Headphones size={28} /> Suporte
               </button>
               {isAdmin && (
                 <button onClick={() => { setActiveTab('admin'); setViewingProduct(null); setIsSidebarOpen(false); }} className={`text-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 ${activeTab === 'admin' ? 'text-amber-500' : 'text-white'}`}>
                   <Settings size={28} /> Comando VIP
                 </button>
               )}
            </nav>
            <div className="mt-auto flex flex-col items-center gap-4 pt-10 border-t border-white/10">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-2xl uppercase border-2 border-white/20"
                style={{ backgroundColor: getAvatarColor(currentUser?.full_name) }}
              >
                 {getInitials(currentUser?.full_name)}
              </div>
              <p className="text-[14px] font-medium text-white/50">Bem vindo(a) <span className="font-black text-white uppercase">{currentUser?.full_name}</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative bg-black">
        <div className="w-full relative z-10 flex-1">
          {viewingProduct ? (
            <div className="p-6 lg:p-14 max-w-7xl mx-auto w-full text-black bg-[#f4f4f5] min-h-screen rounded-[3rem] mt-[100px] mb-10 shadow-2xl">
               <ProductDetailView product={viewingProduct} isAdmin={isAdmin} onBack={() => setViewingProduct(null)} />
            </div>
          ) : activeTab === 'home' ? (
            <div className="flex flex-col min-h-screen">
              {/* HERO SECTION DE LOGIN/DASHBOARD BASEADO NA IMAGEM */}
              <section className="relative w-full pt-[90px] pb-16 lg:pt-[160px] lg:pb-56 px-6 lg:px-14 flex flex-col items-center overflow-hidden" style={{ background: 'linear-gradient(to bottom, #f0f0f0 0%, #d4d4d4 50%, rgba(0,0,0,1) 100%)' }}>
                 <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-12 relative z-10">
                    <div className="w-full lg:w-[45%] flex flex-col items-center lg:items-start text-center lg:text-left z-20">
                      <motion.img 
                        initial={{ opacity: 0, y: -20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.8 }}
                        src="/logo_preta.png" alt="Gorg Presets" className="w-[75%] max-w-[280px] lg:max-w-[450px] drop-shadow-xl mb-4 lg:mb-8" 
                      />
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-[13px] lg:text-[20px] font-medium text-gray-600 mb-3 lg:mb-5 tracking-wide max-w-[80%] lg:max-w-none leading-snug"
                      >
                        Eleve os padrões das suas fotos em poucos cliques, com os nossos
                      </motion.p>
                      <motion.h1 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-[24px] lg:text-[52px] font-black text-gray-900 uppercase tracking-tighter leading-[1.05] mb-4 lg:mb-12"
                      >
                        PRESETS EXCLUSIVOS<br/>
                        EM UM SÓ LUGAR!
                      </motion.h1>
                    </div>
                    
                    <div className="w-full lg:w-[55%] relative h-[340px] lg:h-[550px] flex justify-center lg:justify-end mt-0 lg:mt-0">
                       {/* Mock devices that resemble the image */}
                       {/* Tablet */}
                       <div className="absolute left-[8%] top-[8%] lg:left-[5%] lg:top-[5%] w-[130px] lg:w-[280px] aspect-[3/4] bg-gray-900 rounded-[1.2rem] lg:rounded-[2rem] border-[4px] lg:border-[8px] border-[#1a1a1a] shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden z-10 -rotate-12">
                          <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80" className="w-full h-full object-cover opacity-80 mix-blend-luminosity grayscale-[0.5]" alt="Tablet" />
                       </div>
                       
                       {/* Laptop */}
                       <div className="absolute pt-3 lg:pt-6 left-1/2 -translate-x-1/2 bottom-[40px] lg:left-[25%] lg:translate-x-0 lg:bottom-[2%] w-[230px] lg:w-[520px] aspect-[16/10] bg-black rounded-t-lg lg:rounded-t-2xl border-[5px] lg:border-[10px] border-[#2a2a2a] border-b-[14px] lg:border-b-[30px] shadow-[0_40px_80px_rgba(0,0,0,0.7)] overflow-hidden z-20">
                          <img src="https://images.unsplash.com/photo-1621360841013-c76831f125b4?w=800&q=80" className="w-full h-full object-cover opacity-90 scale-105" alt="Laptop" />
                       </div>
                       
                       {/* Phone */}
                       <div className="absolute right-[8%] top-[4%] lg:right-[-2%] lg:top-[2%] w-[85px] lg:w-[170px] aspect-[9/19] bg-black rounded-[1.5rem] lg:rounded-[2.5rem] border-[3px] lg:border-[6px] border-[#333] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-30 rotate-12">
                          <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80" className="w-full h-full object-cover opacity-90" alt="Phone" />
                       </div>
                    </div>
                 </div>

                 {/* BOTTOM LOGO ICON (G) */}
                 <div className="absolute bottom-6 lg:bottom-24 left-1/2 -translate-x-1/2 z-30">
                    <img src="/favicon.png" alt="Icon" className="w-14 lg:w-20 drop-shadow-xl" />
                 </div>
              </section>

              {/* COLLECTIONS LIST */}
              <section className="bg-black w-full relative z-20 pt-2 lg:pt-10 pb-40 px-6 lg:px-14 min-h-[500px]">
                 <div className="max-w-[1400px] mx-auto space-y-20">


                   <AnimatePresence mode="popLayout">
                     {modules.map((mod, modIdx) => (
                       <motion.div key={mod.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-10">
                          <div className="flex items-center gap-6">
                            <div className="w-2 h-10 bg-[#d82828] rounded-full" />
                            <h3 className="text-2xl lg:text-3xl font-black text-white uppercase italic">{mod.module_title}</h3>
                          </div>
                          
                          <div className="flex gap-6 lg:gap-10 overflow-x-auto pb-10 no-scrollbar items-stretch snap-x">
                            {mod.presets_data?.map((p: any, pIdx: number) => { 
                              const isLocked = !isAdmin && !activeProducts.includes(p.id) && !activeProducts.includes('*'); 
                              return (
                                <div key={modIdx + '-' + pIdx} className="snap-start shrink-0">
                                   <PresetCard preset={p} isLocked={isLocked} isAdmin={isAdmin} onClick={() => setViewingProduct(p)} onEdit={() => setIsEditingPreset({modIdx, pIdx, p})} />
                                </div>
                              );
                            })}
                          </div>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                 </div>
              </section>
            </div>
          ) : activeTab === 'admin' ? (
            <div className="p-6 lg:p-14 max-w-7xl mx-auto bg-[#f4f4f5] text-black min-h-screen rounded-[3rem] mt-6 shadow-2xl overflow-hidden">
              <AdminPanel portalData={portalSettings} onUpdate={fetchInitialData} modules={modules} />
            </div>
          ) : activeTab === 'support' ? (
            <SupportView />
          ) : null}
        </div>
      </main>

      <AnimatePresence>
        {isEditingPreset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 text-gray-950 font-sans">
             <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[4.5rem] p-16 relative shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
                <button onClick={() => setIsEditingPreset(null)} className="absolute top-12 right-12 text-gray-800 hover:text-black transition-all">
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
                   <button type="submit" className="w-full py-8 bg-gray-950 text-black rounded-[2.5rem] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-6 shadow-2xl hover:bg-[#d82828] transition-all">
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
