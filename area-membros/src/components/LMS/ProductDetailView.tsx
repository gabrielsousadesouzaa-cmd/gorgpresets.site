import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Download, List, Edit, Trash2, X, PlayCircle, Play, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface ProductDetailViewProps {
  product: any
  isAdmin: boolean
  onBack: () => void
}

export const ProductDetailView = ({ product, isAdmin, onBack }: ProductDetailViewProps) => {
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
