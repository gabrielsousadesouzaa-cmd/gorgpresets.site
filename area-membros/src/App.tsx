import { useState, useMemo, useEffect } from 'react'
import { 
  Lock, Home, LogOut, Headphones, Menu, ArrowRight, ChevronRight, 
  Settings, Layout, Image as ImageIcon, Users, Activity, 
  CheckCircle2, AlertCircle, RefreshCw, Smartphone, Monitor, X, 
  MoreVertical, ShieldCheck, Zap, UserCheck, Globe, Database, Cpu, 
  Search, Send, Key, Code, Smartphone as PhoneIcon, Play, Video, 
  Box, ArrowLeft, PlayCircle, Sparkles, Image, Upload 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast, Toaster } from 'sonner'
import { supabase } from './lib/supabase'

// Components
import { PresetCard } from './components/LMS/PresetCard'
import { ProductDetailView } from './components/LMS/ProductDetailView'
import { AdminPanel } from './components/Admin/AdminPanel'
import { LoginView } from './components/Auth/LoginView'
import { SupportView } from './components/Common/SupportView'

// --- CONSTANTS ---
const ADMIN_EMAIL = 'ggabriellgorgg@admin';

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

  useEffect(() => {
    const initApp = async () => {
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
    
    if (inputEmail === ADMIN_EMAIL && pass === 'admin123') {
      if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
      setIsAdmin(true); setCurrentUser({ full_name: 'Gabriel Souza (Admin)', email: inputEmail }); setActiveProducts(['*']); setIsLoggedIn(true);
      return true;
    }
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: inputEmail, password: pass });
      
      if (authError) {
        const { data, error } = await supabase.from('profiles').select('*').eq('email', inputEmail).single();
        if (error || !data) return false;
        if (pass !== '1234' && pass !== 'gorg123' && pass !== data.password) return false;
        
        if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
        setCurrentUser(data); setActiveProducts(data.active_products || []); setIsAdmin(false); setIsLoggedIn(true); return true;
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', authData.user?.id).single();
      if (error || !data) return false;
      
      if (remember) localStorage.setItem('gorg_persistent_session', inputEmail);
      setCurrentUser(data); setActiveProducts(data.active_products || []); setIsAdmin(false); setIsLoggedIn(true); return true;
    } catch (err) { return false; }
  }

  const handleLogout = () => { 
    localStorage.removeItem('gorg_persistent_session'); 
    supabase.auth.signOut(); 
    setIsLoggedIn(false); 
    setIsAdmin(false); 
    setCurrentUser(null); 
    setViewingProduct(null); 
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <RefreshCw className="animate-spin text-[#d82828]" size={40} />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <Toaster position="top-center" expand={true} richColors />
        <LoginView onLogin={onLogin} logoUrl={portalSettings.logo_url} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex text-gray-900 font-sans selection:bg-[#d82828] selection:text-white">
      <Toaster position="top-center" expand={true} richColors />
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-[100] w-72 bg-white border-r border-black/5 transform transition-transform duration-500 ease-[0.16, 1, 0.3, 1] lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-none`}>
        <div className="flex flex-col h-full p-8">
          <div className="flex items-center justify-between mb-12">
            <div className="w-32">
               {portalSettings.logo_url && <img src={portalSettings.logo_url} alt="Logo" className="w-full h-auto" />}
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-black">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-3">
            {[
              { id: 'home', label: 'Minha Coleção', icon: Home },
              { id: 'support', label: 'Suporte VIP', icon: Headphones },
              ...(isAdmin ? [{ id: 'admin', label: 'Cockpit', icon: ShieldCheck }] : [])
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => { setActiveTab(item.id as any); setViewingProduct(null); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === item.id && !viewingProduct ? 'bg-[#d82828] text-white shadow-xl shadow-red-900/10' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
              >
                <item.icon size={18} /> {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-10 border-t border-black/5 space-y-6">
            <div className="flex items-center gap-4 p-2">
               <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg" style={{ backgroundColor: getAvatarColor(currentUser?.full_name) }}>
                  {getInitials(currentUser?.full_name)}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase truncate text-black">{currentUser?.full_name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{isAdmin ? 'Acesso Mestre' : 'Membro Elite'}</p>
               </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={18} /> Sair da Conta
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-72 min-h-screen relative">
        {/* MOBILE HEADER */}
        <header className="lg:hidden h-20 bg-white/80 backdrop-blur-xl border-b border-black/5 flex items-center justify-between px-6 sticky top-0 z-50">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-950">
             <Menu size={24} />
           </button>
           <div className="w-24">
              {portalSettings.logo_url && <img src={portalSettings.logo_url} alt="Logo" className="w-full h-auto" />}
           </div>
           <div className="w-10 h-10 rounded-full" style={{ backgroundColor: getAvatarColor(currentUser?.full_name) }} />
        </header>

        <div className="p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            {viewingProduct ? (
              <ProductDetailView 
                key="detail" 
                product={viewingProduct} 
                isAdmin={isAdmin} 
                onBack={() => setViewingProduct(null)} 
              />
            ) : (
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }} 
                transition={{ duration: 0.5 }}
              >
                {activeTab === 'home' && (
                  <div className="space-y-16">
                    {/* HERO WELCOME */}
                    <div className="relative bg-black rounded-[3.5rem] p-10 md:p-16 overflow-hidden shadow-3xl group">
                       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d82828]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-[#d82828]/20 transition-colors duration-1000" />
                       <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                          <div className="space-y-8 max-w-xl text-center lg:text-left">
                             <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Acesso Autorizado</span>
                             </div>
                             <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-[0.9]">Seja bem-vindo, <br/><span className="text-[#d82828]">{currentUser?.full_name.split(' ')[0]}</span></h1>
                             <p className="text-gray-400 text-[13px] md:text-[15px] font-medium leading-relaxed">Sua jornada para o próximo nível de edição começa aqui. Explore sua coleção exclusiva de presets e ferramentas profissionais abaixo.</p>
                             <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4">
                                <div className="flex flex-col">
                                   <span className="text-3xl font-black text-white tracking-tighter">{modules.reduce((acc, m) => acc + (m.presets_data?.length || 0), 0)}</span>
                                   <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Presets Totais</span>
                                </div>
                                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                                <div className="flex flex-col">
                                   <span className="text-3xl font-black text-white tracking-tighter">{activeProducts.includes('*') ? modules.length : activeProducts.length}</span>
                                   <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Módulos Ativos</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* PRODUCT LIST */}
                    <div className="space-y-24">
                       {modules.map((mod, modIdx) => (
                          <section key={mod.id} className="space-y-10">
                             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/5 pb-8">
                                <div className="space-y-3">
                                   <div className="flex items-center gap-3">
                                      <span className="w-8 h-1 bg-[#d82828] rounded-full" />
                                      <h3 className="text-[11px] font-black text-[#d82828] uppercase tracking-[0.4em]">Módulo {modIdx + 1}</h3>
                                   </div>
                                   <h2 className="text-3xl md:text-5xl font-black text-black uppercase italic tracking-tighter">{mod.module_title}</h2>
                                   {mod.module_desc && <p className="text-gray-400 text-sm font-medium max-w-2xl">{mod.module_desc}</p>}
                                </div>
                             </div>

                             <div className="flex overflow-x-auto pb-10 gap-8 no-scrollbar -mx-2 px-2 snap-x">
                                {mod.presets_data?.map((p: any) => {
                                  const isLocked = !activeProducts.includes('*') && !activeProducts.includes(p.id);
                                  return (
                                    <div key={p.id} className="snap-start">
                                      <PresetCard 
                                        preset={p} 
                                        isLocked={isLocked} 
                                        isAdmin={isAdmin}
                                        onClick={() => setViewingProduct(p)}
                                        onEdit={() => setIsEditingPreset({ modIdx, p })}
                                      />
                                    </div>
                                  );
                                })}
                             </div>
                          </section>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'support' && <SupportView />}
                {activeTab === 'admin' && isAdmin && (
                  <AdminPanel 
                    portalData={portalSettings} 
                    onUpdate={fetchInitialData} 
                    modules={modules} 
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
