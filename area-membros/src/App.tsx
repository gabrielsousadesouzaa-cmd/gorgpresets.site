import { useState, useMemo, useEffect } from 'react'
import { Lock, Home, LogOut, Headphones, Menu, Mail, ArrowRight, ChevronRight, ChevronUp, ChevronDown, Settings, Plus, Edit, Trash2, Layout, Save, Eye, Palette, Layers, Image as ImageIcon, Users, Activity, Terminal, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Monitor, Download, X, List, MoreVertical, ExternalLink, ShieldCheck, Zap, UserCheck, Globe, Database, Cpu, Search, Send, Key, Code, Smartphone as PhoneIcon, Play, Video, Box, ArrowLeft, PlayCircle, Sparkles, Image, Upload } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { toast, Toaster } from 'sonner'
import { supabase } from './lib/supabase'

// --- CONSTANTS ---
const ADMIN_EMAIL = 'ggabriellgorgg@admin';

// --- COMPONENTE DE CARD DE PRESET ---
const PresetCard = ({ preset, isLocked, isAdmin, onEdit, onClick, isPersonal }: { preset: any, isLocked: boolean, isAdmin?: boolean, onEdit?: () => void, onClick?: () => void, isPersonal?: boolean }) => {
  const handleCardClick = () => { 
    if (isLocked && preset.upsell_link) { 
      window.open(preset.upsell_link, '_blank'); 
    } else if (!isLocked) { 
      onClick?.(); 
    } 
  }
  return (
    <motion.div 
      onClick={handleCardClick} initial={{ opacity: 0, scale: 0.95, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }}
      whileHover={{ y: -12, scale: isPersonal ? 1.02 : 1.03, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
      className={`group relative flex-none w-[220px] sm:w-[280px] aspect-[2/3] ${isPersonal ? 'rounded-3xl' : 'rounded-[2.5rem]'} overflow-hidden transition-all duration-1000 bg-[#0a0a0a] ${isLocked ? (preset.upsell_link ? 'cursor-pointer shadow-3xl' : 'opacity-80 grayscale-[0.8]') : 'cursor-pointer shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]'}`}
    >
      <img src={preset.image} alt={preset.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
      
      {isAdmin && (
        <div className="absolute top-6 left-6 flex gap-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-[#d82828] hover:border-transparent transition-all text-white shadow-2xl">
            <Edit size={16} />
          </button>
        </div>
      )}

      {/* Lock Icon strictly in Top Right for Locked content */}
      {isLocked && (
        <div className="absolute top-6 right-6 z-30 p-4 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 text-white/40 shadow-2xl">
          <Lock size={18} />
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

  useEffect(() => { 
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchLessons(); 
  }, [product.id]);

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
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
      if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 max-w-[1400px] mx-auto px-0 md:px-4">
      {/* HEADER DINÂMICO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-8 lg:pt-12 mb-4">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-black/5 border border-black/10 rounded-full hover:bg-black transition-all group shadow-sm backdrop-blur-md">
            <ArrowLeft size={20} className="text-gray-600 group-hover:text-white group-hover:-translate-x-1 transition-all" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-[#d82828]/10 text-[#d82828] rounded font-black uppercase text-[8px] tracking-widest border border-[#d82828]/20">Módulo Vip</span>
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{lessons.length} Aulas Disponíveis</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter leading-none">{product.name}</h2>
          </div>
        </div>

        {isAdmin && (
          <button onClick={addLesson} className="flex items-center gap-3 px-6 py-3 bg-[#d82828] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-red-900/20">
            <Plus size={14} /> NOVA AULA
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* PLAYER E DETALHES */}
        <div className="xl:col-span-8 space-y-8">
          <div className="relative group rounded-xl md:rounded-3xl overflow-hidden bg-[#050505] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] aspect-video">
            {activeLesson ? (
              <iframe 
                src={getEmbedUrl(activeLesson.video_url)} 
                className="w-full h-full border-0" 
                allowFullScreen 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-6 text-gray-600 font-black uppercase tracking-widest bg-gradient-to-br from-[#0a0a0a] to-black">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
                   <PlayCircle size={40} className="opacity-50 animate-pulse text-white" /> 
                </div>
                <p className="text-xs tracking-[0.3em]">Selecione uma aula</p>
              </div>
            )}
            
            {/* OVERLAY DE CARREGAMENTO SUAVE */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-[#d82828] to-red-500 shadow-[0_0_10px_rgba(216,40,40,0.8)]" />
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-8 group transition-all relative overflow-hidden mt-8">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#d82828]/5 rounded-full blur-[80px] -z-10 group-hover:bg-[#d82828]/10 transition-colors" />
            <div className="flex items-center gap-6 z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#111] border border-white/5 text-gray-300 flex items-center justify-center group-hover:text-white transition-colors">
                <Download size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Material de Apoio</h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase mt-1.5 tracking-widest">Presets e arquivos em alta qualidade</p>
              </div>
            </div>
            <a href={product.download_link} target="_blank" rel="noreferrer" className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#d82828] hover:text-white transition-all shadow-xl z-10 text-center">
              Fazer Download
            </a>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <List size={14} className="text-[#d82828]" /> Grade de Aulas
            </h3>
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto no-scrollbar pr-2 pb-10">
            {lessons.map((lesson, idx) => (
              <motion.div 
                key={lesson.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative group/lesson"
              >
                <div 
                  onClick={() => setActiveLesson(lesson)} 
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 relative overflow-hidden ${activeLesson?.id === lesson.id ? 'bg-[#111] border-[#d82828]/30 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}`}
                >
                  {activeLesson?.id === lesson.id && (
                     <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-[#d82828] rounded-r-full shadow-[0_0_10px_rgba(216,40,40,0.5)]" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 transition-colors ${activeLesson?.id === lesson.id ? 'bg-[#d82828]/10 text-[#d82828]' : 'bg-white/5 text-gray-500 group-hover/lesson:bg-white/10 group-hover/lesson:text-gray-300'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 truncate pr-4">
                    <h4 className={`text-[13px] font-black uppercase truncate tracking-tight transition-colors ${activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-400 group-hover/lesson:text-gray-200'}`}>
                      {lesson.title}
                    </h4>
                    {activeLesson?.id === lesson.id && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex gap-0.5 items-end h-2.5">
                           <motion.div animate={{ height: ['40%', '100%', '40%'] }} transition={{ duration: 1, repeat: Infinity }} className="w-0.5 bg-[#d82828] rounded-full" />
                           <motion.div animate={{ height: ['60%', '100%', '60%'] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-0.5 bg-[#d82828] rounded-full" />
                           <motion.div animate={{ height: ['80%', '60%', '80%'] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-0.5 bg-[#d82828] rounded-full" />
                        </div>
                        <p className="text-[9px] font-black text-[#d82828] uppercase tracking-[0.2em]">Rodando</p>
                      </div>
                    )}
                  </div>
                  <Play size={14} className={activeLesson?.id === lesson.id ? 'text-[#d82828]' : 'text-gray-600 opacity-0 group-hover/lesson:opacity-100 transition-all'} />
                </div>
                
                {isAdmin && (
                  <div className="absolute top-1/2 -translate-y-1/2 -right-2 flex flex-col gap-2 opacity-0 group-hover/lesson:opacity-100 transition-all translate-x-4 z-20">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingLesson(lesson); }} className="p-2.5 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/10 hover:bg-emerald-500 hover:text-black transition-all">
                      <Edit size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir aula?')) { supabase.from('lessons').delete().eq('id', lesson.id).then(() => fetchLessons()); } }} className="p-2.5 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/10 hover:bg-[#d82828] hover:text-black transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingLesson && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-[#111] w-full max-w-xl rounded-[4rem] p-12 relative border border-white/10 shadow-2xl">
              <button onClick={() => setIsEditingLesson(null)} className="absolute top-10 right-10 text-gray-500 hover:text-white transition-all">
                <X size={28} />
              </button>
              <h3 className="text-2xl font-black uppercase italic mb-10 text-white tracking-tighter">Configurações da Aula</h3>
              <form onSubmit={handleEditLesson} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Título da Aula</label>
                  <input name="ltitle" defaultValue={isEditingLesson.title} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-[#d82828] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">URL do Vídeo</label>
                  <input name="lvideo" defaultValue={isEditingLesson.video_url} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-[#d82828] transition-all" />
                </div>
                <button type="submit" className="w-full py-6 bg-[#d82828] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] transition-all shadow-xl shadow-red-900/20">
                  <Save size={20} /> SALVAR ALTERAÇÕES
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
  const [adminSection, setAdminSection] = useState<'users' | 'content' | 'webhooks' | 'email' | 'sales' | 'structure'>('content');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [salesSettings, setSalesSettings] = useState<any>(null);
  const [emailSettings, setEmailSettings] = useState<any>({ body: '', subject: '', sender: '', api_key: '' });
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
      const { data: sData } = await supabase.from('sales_settings').select('*').eq('id', 'main').single();
      if (sData) setSalesSettings(sData);
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
      toast.success(`Foto de ${role === 'before' ? 'Antes' : 'Depois'} atualizada! ✅`);
      fetchData();
    } catch (err: any) { toast.error(`Erro no Upload: ${err.message}`); } finally { setIsUploading(null); }
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
            { id: 'sales', label: 'Vitrine', icon: Sparkles },
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
                        {(!mod.presets_data || mod.presets_data.length === 0) && (
                          <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Nenhum Preset Adicionado</p>
                          </div>
                        )}
                     </div>

                     <button onClick={async () => { 
                       const name = prompt('Nome do Novo Preset:'); 
                       if (name) { 
                         const npd = [...(mod.presets_data || []), { id: Date.now().toString(), name, image: '', download_link: '', upsell_link: '' }]; 
                         const { error } = await supabase.from('modules_presets').update({ presets_data: npd }).eq('id', mod.id); 
                         if (!error) {
                           toast.success('Novo card adicionado! 🚀');
                           onUpdate(); 
                         } else {
                           toast.error('Erro ao adicionar card.');
                         }
                       } 
                     }} className="w-full py-4 bg-[#d82828] text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                       <Plus size={12} /> NOVO CARD (PRESET)
                     </button>
                  </div>
                ))}
             </div>
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
                      <div className="flex flex-col gap-2">
                         <button onClick={async () => {
                           if (idx > 0) {
                             const prev = modules[idx-1];
                             await supabase.from('modules_presets').update({ order_index: mod.order_index }).eq('id', prev.id);
                             await supabase.from('modules_presets').update({ order_index: prev.order_index }).eq('id', mod.id);
                             onUpdate();
                           }
                         }} title="Mover para Cima" className="p-3 bg-gray-50 hover:bg-[#d82828] hover:text-white rounded-xl transition-all">
                           <ChevronUp size={14} />
                         </button>
                         <button onClick={async () => {
                           if (idx < modules.length - 1) {
                             const next = modules[idx+1];
                             await supabase.from('modules_presets').update({ order_index: mod.order_index }).eq('id', next.id);
                             await supabase.from('modules_presets').update({ order_index: next.order_index }).eq('id', mod.id);
                             onUpdate();
                           }
                         }} title="Mover para Baixo" className="p-3 bg-gray-50 hover:bg-[#d82828] hover:text-white rounded-xl transition-all">
                           <ChevronDown size={14} />
                         </button>
                      </div>
                      <button onClick={() => { if (confirm('Excluir seção inteira?')) supabase.from('modules_presets').delete().eq('id', mod.id).then(() => onUpdate()); }} className="p-4 bg-gray-50 text-gray-300 hover:bg-red-500 hover:text-white rounded-2xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => { const t = prompt('Título da Nova Seção:'); if (t) supabase.from('modules_presets').insert([{ module_title: t, order_index: modules.length, module_desc: '' }]).then(() => onUpdate()); }}
                className="py-10 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 group hover:border-[#d82828]/20 hover:bg-[#d82828]/5 transition-all"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-[#d82828] group-hover:text-white transition-all"><Plus size={24} /></div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Criar Nova Seção Elite</span>
              </button>
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
                      <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-100 hover:border-[#d82828]/20 hover:text-[#d82828] text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                        <Plus size={14} /> ADICIONAR GATEWAY
                      </button>
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

        {adminSection === 'sales' && (
          <motion.div key="s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
             <div className="bg-white border border-black/5 p-10 rounded-[3.5rem] shadow-xl space-y-10">
                <div className="flex items-center gap-4 border-b border-black/5 pb-8">
                   <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={20} /></div>
                   <div>
                      <h4 className="text-sm font-black text-black uppercase italic">Vitrine Principal</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão de Comparativos Antes & Depois</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Foto Antes (Original)</span>
                         {isUploading === 'before' && <RefreshCw size={14} className="animate-spin text-[#d82828]" />}
                      </div>
                      <div className="relative group aspect-[2/3] max-w-[220px] mx-auto bg-gray-50 rounded-[2rem] overflow-hidden border border-black/5 shadow-inner">
                         {salesSettings?.magic_before_url ? (
                            <img src={salesSettings.magic_before_url} className="w-full h-full object-cover" alt="" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Plus size={32} /></div>
                         )}
                         <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Alterar</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleMagicUpload(e, 'before')} />
                         </label>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Foto Depois (Preset)</span>
                         {isUploading === 'after' && <RefreshCw size={14} className="animate-spin text-[#d82828]" />}
                      </div>
                      <div className="relative group aspect-[2/3] max-w-[220px] mx-auto bg-gray-50 rounded-[2rem] overflow-hidden border border-black/5 shadow-inner">
                         {salesSettings?.magic_after_url ? (
                            <img src={salesSettings.magic_after_url} className="w-full h-full object-cover" alt="" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Plus size={32} /></div>
                         )}
                         <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Alterar</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleMagicUpload(e, 'after')} />
                         </label>
                      </div>
                   </div>
                </div>

                <div className="pt-10 border-t border-black/5 flex flex-col md:flex-row justify-end items-center gap-6">
                   <p className="text-[10px] font-bold text-gray-400 italic text-center md:text-right">As fotos são enviadas automaticamente ao selecionar, mas use o botão ao lado para confirmar.</p>
                   <button 
                     onClick={() => { fetchData(); toast.success('Vitrine sincronizada com sucesso! ✅'); }}
                     className="px-10 py-5 bg-black text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest hover:bg-[#d82828] transition-all flex items-center gap-3 shadow-xl hover:shadow-red-900/20 active:scale-95"
                   >
                     <CheckCircle2 size={14} /> SALVAR ALTERAÇÕES
                   </button>
                </div>
             </div>
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
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-48 sm:w-56 mb-4 sm:mb-6 flex items-center justify-center min-h-[40px]">
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
            Nossa equipe está pronta para garantir que você tenha a melhor experiêcia possível.
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
  const [portalSettings, setPortalSettings] = useState<any>({});
  const [salesSettings, setSalesSettings] = useState<any>(null);

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
    const { data: sales } = await supabase.from('sales_settings').select('*').eq('id', 'main').single();
    if (sales) setSalesSettings(sales);
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

  if (!isLoggedIn) return <LoginView onLogin={onLogin} logoUrl={portalSettings.logo_url || "/logo_preta.png"} />

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
            <div className="p-2 sm:p-6 lg:p-14 max-w-7xl mx-auto w-full text-black bg-[#f4f4f5] min-h-screen rounded-3xl sm:rounded-[3rem] mt-[100px] mb-10 shadow-2xl">
               <ProductDetailView product={viewingProduct} isAdmin={isAdmin} onBack={() => setViewingProduct(null)} />
            </div>
          ) : activeTab === 'home' ? (
            <div className="flex flex-col min-h-screen">
              {/* HERO SECTION DE LOGIN/DASHBOARD BASEADO NA IMAGEM */}
              <section className="relative w-full pt-[100px] pb-[60px] lg:pt-[120px] lg:pb-[80px] px-6 lg:px-14 flex flex-col items-center overflow-hidden">
                 {/* Cinematic Background Gradient */}
                 <div className="absolute inset-0 bg-gradient-to-br from-[#f8f8f8] via-[#e5e5e5] to-[#c5c5c5] dark:from-[#111] dark:via-[#0a0a0a] dark:to-[#000]" />
                 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(216,40,40,0.1)_0%,transparent_50%)]" />
                 
                 <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24 relative z-10">
                    <div className="w-full lg:w-[48%] flex flex-col items-center lg:items-start text-center lg:text-left z-20">
                      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 mb-8 bg-black/5 px-6 py-2.5 rounded-full border border-black/5 backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Área de Membros • GORG PRESETS</span>
                      </motion.div>
                      
                      <motion.img 
                        initial={{ opacity: 0, y: -20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.8 }}
                        src="/logo_preta.png" alt="Gorg Presets" className="w-[70%] max-w-[260px] lg:max-w-[420px] drop-shadow-2xl mb-8 lg:mb-12" 
                      />
                      
                      <motion.p 
                         initial={{ opacity: 0, y: 10 }} 
                         animate={{ opacity: 1, y: 0 }} 
                         transition={{ duration: 0.8, delay: 0.3 }}
                         className="text-[10px] lg:text-[12px] font-bold text-gray-800 uppercase tracking-[0.25em] mb-4 lg:mb-6"
                       >
                         Eleve os padrões das suas fotos em poucos cliques com os nossos
                       </motion.p>
                      
                      <motion.h1 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-[32px] lg:text-[62px] font-black text-gray-900 uppercase tracking-tighter leading-[1.1] lg:leading-[0.95] mb-6 lg:mb-14"
                      >
                        PRESETS <span className="text-[#d82828] italic">EXCLUSIVOS</span><br/>
                        EM UM SÓ LUGAR!
                      </motion.h1>
                      

                    </div>
                    
                    <div className="hidden lg:flex lg:w-[45%] relative lg:h-[600px] items-center justify-end">
                       <div className="relative w-full h-full flex items-center justify-end gap-6">
                          
                          {/* ANTES Card */}
                          <motion.div 
                            initial={{ opacity: 0, x: -30 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            transition={{ duration: 0.8 }}
                            className="relative w-[180px] lg:w-[240px] aspect-[2/3] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group"
                          >
                             <img src={salesSettings?.magic_before_url || "https://images.unsplash.com/photo-1621360841013-c76831f125b4?w=800&q=80"} className="w-full h-full object-cover brightness-90 transition-all duration-700" alt="Antes" />
                             <div className="absolute inset-0 bg-black/20" />
                             <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Antes</span>
                             </div>
                          </motion.div>

                          {/* DEPOIS Card */}
                          <motion.div 
                            initial={{ opacity: 0, x: 30 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="relative w-[180px] lg:w-[240px] aspect-[2/3] rounded-[2.5rem] overflow-hidden border-2 border-[#d82828]/30 shadow-[0_40px_80px_rgba(216,40,40,0.15)] group"
                          >
                             <img src={salesSettings?.magic_after_url || "https://images.unsplash.com/photo-1621360841013-c76831f125b4?w=800&q=80"} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Depois" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                             <div className="absolute top-6 right-6 px-4 py-1.5 bg-[#d82828] rounded-full shadow-lg shadow-red-900/40 animate-pulse">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Depois</span>
                             </div>
                          </motion.div>

                          {/* Background Glow behind duo */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#d82828]/10 rounded-full blur-[100px] -z-10" />
                       </div>
                    </div>
                 </div>

                 {/* Transition Gradient to Black Section */}
                  <div className="absolute bottom-0 left-0 w-full h-[150px] bg-gradient-to-t from-[#050505] to-transparent z-10 flex items-end justify-center pb-10">

                 </div>
              </section>

              {/* COLLECTIONS LIST */}
              <section className="bg-[#050505] w-full relative z-20 pt-8 pb-16 px-6 lg:px-14 min-h-[500px]">
                  {/* Atmospheric Background Glows */}
                  <div className="absolute top-0 left-0 w-full h-[800px] bg-[radial-gradient(circle_at_20%_30%,rgba(216,40,40,0.05)_0%,transparent_50%)] pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-full h-[800px] bg-[radial-gradient(circle_at_80%_70%,rgba(216,40,40,0.05)_0%,transparent_50%)] pointer-events-none" />
                  
                  <div className="max-w-[1440px] mx-auto space-y-12 relative z-10">
                    <AnimatePresence mode="popLayout">
                       {modules.map((mod, modIdx) => {
                         const isSuaColecao = mod.module_title?.toUpperCase().includes('COLEÇÃO') && mod.module_title?.toUpperCase().includes('PARTICULAR');
                         const presetsToShow = isSuaColecao 
                           ? mod.presets_data?.filter((p: any) => isAdmin || activeProducts.includes(p.id) || activeProducts.includes('*'))
                           : mod.presets_data;

                         if (isSuaColecao && (!presetsToShow || presetsToShow.length === 0)) return null;

                         return (
                           <motion.div 
                             key={mod.id} 
                             initial={{ opacity: 0, y: isSuaColecao ? 30 : 60 }} 
                              whileInView={{ opacity: 1, y: 0 }} 
                              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: isSuaColecao ? 0.2 : 0 }} 
                              viewport={{ once: true, margin: isSuaColecao ? "0px" : "-100px" }} 
                             className="relative group"
                           >
                              {/* Background Numbering (Hide only for personal collection) */}
                              {!isSuaColecao && (
                                <div className="absolute -top-20 -left-10 text-[180px] font-black text-white/[0.02] select-none leading-none tracking-tighter hidden lg:block">
                                   {String(modIdx + 1).padStart(2, '0')}
                                </div>
                              )}

                              <div className="flex flex-col gap-3 mb-4 relative z-10">
                                <div className="flex items-center gap-6">
                                  <div className="w-1.5 h-10 bg-[#d82828] rounded-full shadow-[0_0_20px_rgba(216,40,40,0.5)]" />
                                  <div className="flex flex-col">

                                    <h3 className={`text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none ${isSuaColecao ? '' : 'italic'}`}>
                                      {isSuaColecao ? 'A SUA COLEÇÃO PARTICULAR' : mod.module_title}
                                    </h3>
                                    {mod.module_desc && !isSuaColecao && (
                                      <p className="text-[12px] lg:text-[13px] font-medium text-gray-400 mt-2 max-w-2xl leading-relaxed">
                                        {mod.module_desc}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Horizontal Row with refined spacing */}
                              <div className="relative group/scroll">
                                 <div className="flex gap-8 lg:gap-10 overflow-x-auto pb-16 pt-4 no-scrollbar items-stretch snap-x scroll-smooth px-2">
                                   {presetsToShow?.map((p: any, pIdx: number) => { 
                                     const isLocked = !isAdmin && !activeProducts.includes(p.id) && !activeProducts.includes('*'); 
                                     return (
                                       <motion.div 
                                         key={modIdx + '-' + pIdx} 
                                         initial={{ opacity: 0, y: 20 }} 
                                         whileInView={{ opacity: 1, y: 0 }} 
                                         transition={{ delay: pIdx * 0.1, duration: 0.8 }} 
                                         viewport={{ once: true }} 
                                         className="snap-start shrink-0 first:pl-2"
                                       >
                                          <PresetCard preset={p} isLocked={isLocked} isAdmin={isAdmin} isPersonal={isSuaColecao} onClick={() => setViewingProduct(p)} onEdit={() => setIsEditingPreset({modIdx, pIdx, p})} />
                                       </motion.div>
                                     );
                                   })}
                                 </div>
                                 
                                 {/* Visual Indicator of more content */}
                                 <div className="absolute right-0 top-0 bottom-16 w-32 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-700" />
                              </div>
                           </motion.div>
                         );
                       })}
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
                 <h3 className="text-4xl font-black uppercase italic mb-12 tracking-tighter">Editar Preset</h3>
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
                      <label className="text-[11px] font-black uppercase text-gray-400 italic">Capa Master (URL ou Upload)</label>
                      <div className="flex gap-4">
                        <input name="pimage" id="pimage_input" defaultValue={isEditingPreset.p.image} className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 font-bold text-sm outline-none focus:border-[#d82828]" />
                        <label className="w-20 h-20 bg-black text-white rounded-[1.8rem] flex items-center justify-center cursor-pointer hover:bg-[#d82828] transition-all shrink-0 shadow-lg group">
                           <Upload size={24} className="group-hover:scale-110 transition-transform" />
                           <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              const loadingToast = toast.loading('Enviando imagem...');
                              try {
                                const fileName = `preset_${Date.now()}.${file.name.split('.').pop()}`;
                                const { error: upErr } = await supabase.storage.from('assets').upload(fileName, file);
                                if (upErr) throw upErr;
                                const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName);
                                const input = document.getElementById('pimage_input') as HTMLInputElement;
                                if (input) input.value = publicUrl;
                                toast.success('Imagem carregada! 📸', { id: loadingToast });
                              } catch (err: any) { toast.error(`Erro: ${err.message}`, { id: loadingToast }); }
                           }} />
                        </label>
                      </div>
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
