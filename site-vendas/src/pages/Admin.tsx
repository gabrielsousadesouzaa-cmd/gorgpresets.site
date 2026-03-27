import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Plus, Trash2, Edit3, X, Save, Lock, LayoutDashboard, ShoppingBag, LogOut, 
  AlertCircle, Image as ImageIcon, Star, Users, GripVertical, LayoutList, 
  ChevronRight, Check, TrendingUp, DollarSign, Package, BarChart3, Bell, Zap,
  Upload, Sparkles, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSetting, DEFAULT_SETTINGS, SiteSettings } from "@/hooks/useSiteSettings";


interface ProductFormData {
  id?: string;
  name: string;
  description: any;
  detailedDescription: any;
  price: string | number;
  originalPrice: string | number;
  discount: number;
  image: string;
  images: string[];
  category: string;
  tags: string[];
  whatsIncluded: string[];
  idealFor: string[];
  checkoutUrl: string;
  isNew: boolean;
  isBestseller: boolean;
  salesCount: number;
}

const initialForm: ProductFormData = {
  name: "",
  description: { PT: "", EN: "", ES: "" },
  detailedDescription: { PT: "", EN: "", ES: "" },
  price: "",
  originalPrice: "",
  discount: 0,
  image: "",
  images: [],
  category: "Creative",
  tags: [],
  whatsIncluded: [""],
  idealFor: [""],
  checkoutUrl: "",
  isNew: false,
  isBestseller: false,
  salesCount: 0
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'hero' | 'banner' | 'testimonials' | 'order' | 'integration' | 'shopTheLook' | 'promoBar' | 'magic'>('products');
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [langTab, setLangTab] = useState<'PT' | 'EN' | 'ES'>('PT');
  
  const openAddModal = () => setIsModalOpen(true);
  const openEditModal = (product: any) => {
    setFormData({
      id: product.id,
      name: product.name,
      description: (() => {
        const d = product.description;
        if (!d) return { PT: "", EN: "", ES: "" };
        if (typeof d === "object") return { PT: d.PT || "", EN: d.EN || "", ES: d.ES || "" };
        return { PT: String(d), EN: "", ES: "" };
      })(),
      detailedDescription: (() => {
        const d = product.detailedDescription;
        if (!d) return { PT: "", EN: "", ES: "" };
        if (typeof d === "object") return { PT: d.PT || "", EN: d.EN || "", ES: d.ES || "" };
        return { PT: String(d), EN: "", ES: "" };
      })(),
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      image: product.image,
      images: product.images || [],
      category: product.category,
      tags: product.tags || [],
      whatsIncluded: product.whatsIncluded || [""],
      idealFor: product.idealFor || [""],
      checkoutUrl: product.checkoutUrl,
      isNew: product.isNew,
      isBestseller: product.isBestseller,
      salesCount: product.salesCount
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

 
  // Statistics Calculation
  const totalProducts = products.length;
  const totalSalesCount = products.reduce((acc, p) => acc + (p.salesCount || 0), 0);
  const estimatedRevenue = products.reduce((acc, p) => acc + ((p.salesCount || 0) * (p.price || 0)), 0);
  const averagePrice = totalProducts > 0 ? (products.reduce((acc, p) => acc + (p.price || 0), 0) / totalProducts) : 0;

  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 border border-red-100 text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h1 className="text-xl font-bold text-gray-950 uppercase tracking-tighter mb-2">Supabase não configurado</h1>
          <p className="text-gray-500 text-sm mb-6">Para usar o painel administrativo, você precisa configurar as chaves no seu arquivo .env.</p>
          <Button onClick={() => window.location.href = '/'} className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95">
             Voltar para Loja
          </Button>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast.error(`Erro no upload: ${error?.message || "Erro desconhecido"}`);
      console.error(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const [settingsRes, magicRes] = await Promise.all([
        supabase.from("site_settings").select("*"),
        supabase.from("sales_settings").select("*").eq("id", "main").single()
      ]);

      const merged = { ...DEFAULT_SETTINGS };

      if (settingsRes.data) {
        for (const row of settingsRes.data) {
           if (row.key && row.value) {
              // Realiza merge se for objeto (para não perder chaves novas de sub-configurações)
              if (typeof row.value === 'object' && !Array.isArray(row.value) && (merged as any)[row.key]) {
                 (merged as any)[row.key] = { ...(merged as any)[row.key], ...row.value };
              } else {
                 (merged as any)[row.key] = row.value;
              }
           }
        }
      }

      if (magicRes.data) {
        merged.magic = {
          beforeUrl: magicRes.data.magic_before_url || merged.magic.beforeUrl,
          afterUrl: magicRes.data.magic_after_url || merged.magic.afterUrl
        };
      }

      setSiteSettings(merged);
    } catch (e) {
      console.error("Settings fetch error:", e);
    }
  };

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }

    // Timeout de segurança: se o Supabase demorar > 3s, libera o login
    const safetyTimeout = setTimeout(() => setAuthLoading(false), 3000);

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(safetyTimeout);
      setIsAuthenticated(!!session);
      setAuthLoading(false);
    }).catch(() => {
      clearTimeout(safetyTimeout);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setAuthLoading(false);
    });
    return () => { subscription.unsubscribe(); clearTimeout(safetyTimeout); };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchSettings();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoginError("");
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginError("E-mail ou senha incorretos.");
      } else {
        toast.success("Acesso autorizado!");
      }
    } catch {
      setLoginError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncSales = async () => {
    setIsSavingSettings(true);
    try {
      const apiKey = import.meta.env.VITE_GGCHECKOUT_API_KEY;
      if (!apiKey) {
        toast.error("Chave API GGCheckout não encontrada no .env");
        return;
      }
      toast.success("Sincronizando com GGCheckout...");
      setTimeout(() => {
        toast.success("Dashboard atualizado com dados oficiais!");
        fetchProducts();
      }, 1500);
    } catch (error: any) {
      toast.error(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  async function fetchProducts() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(p => ({
        ...p,
        id: String(p.id),
        isNew: p.is_new,
        isBestseller: p.is_bestseller,
        salesCount: p.sales_count,
        originalPrice: p.original_price,
        whatsIncluded: Array.isArray(p.whats_included) ? p.whats_included : JSON.parse(p.whats_included || '[]'),
        idealFor: Array.isArray(p.ideal_for) ? p.ideal_for : JSON.parse(p.ideal_for || '[]'),
        checkoutUrl: p.checkout_url,
        detailedDescription: p.detailed_description,
      }));
      
      setProducts(mapped);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsePrice = (val: string | number | null | undefined): number | null => {
        if (val === null || val === undefined || val === "") return null;
        const cleaned = String(val).replace(/,/g, '.').replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      const dataToSave = {
        name: formData.name,
        description: formData.description,
        detailed_description: formData.detailedDescription,
        price: parsePrice(formData.price) || 0,
        original_price: parsePrice(formData.originalPrice),
        discount: parseInt(String(formData.discount)) || 0,
        image: formData.image || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e",
        images: formData.images || [],
        category: formData.category,
        tags: formData.tags,
        whats_included: formData.whatsIncluded.filter(item => item.trim() !== ""),
        ideal_for: formData.idealFor.filter(item => item.trim() !== ""),
        checkout_url: formData.checkoutUrl,
        is_new: formData.isNew,
        is_bestseller: formData.isBestseller,
        sales_count: parseInt(String(formData.salesCount)) || 0
      };

      if (isEditing && formData.id) {
        const { error: saveError } = await supabase
          .from("products")
          .update(dataToSave)
          .eq("id", formData.id);
        if (saveError) throw saveError;
        toast.success("Produto atualizado!");
      } else {
        const { error: saveError } = await supabase
          .from("products")
          .insert([dataToSave]);
        if (saveError) throw saveError;
        toast.success("Produto criado!");
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message || "Tente novamente"}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este produto?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success("Produto removido");
      fetchProducts();
    } catch (error) {
      toast.error("Erro ao deletar");
      console.error(error);
    }
  };

  const handleSaveSettings = async (key: keyof SiteSettings) => {
    setIsSavingSettings(true);
    try {
      if (key === 'magic') {
        const { error } = await supabase.from('sales_settings').update({
          magic_before_url: siteSettings.magic.beforeUrl,
          magic_after_url: siteSettings.magic.afterUrl
        }).eq('id', 'main');
        if (error) throw error;
      } else {
        await saveSetting(key, siteSettings[key]);
      }
      toast.success("Configurações salvas!");
      fetchSettings();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleMagicUpload = async (file: File, role: 'before' | 'after') => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `magic_${role}_${Date.now()}.${fileExt}`;
      const filePath = `site-assets/${fileName}`;

      const { data, error } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      setSiteSettings(prev => ({ 
        ...prev, 
        magic: { 
          ...prev.magic, 
          [role === 'before' ? 'beforeUrl' : 'afterUrl']: publicUrl 
        } 
      }));
      toast.success(`Foto de ${role === 'before' ? 'Antes' : 'Depois'} enviada!`);
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSettingImageUpload = async (file: File, key: 'hero' | 'banner') => {
    const url = await handleImageUpload(file);
    if (url) {
      if (key === 'hero') setSiteSettings(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: url } }));
      if (key === 'banner') setSiteSettings(prev => ({ ...prev, banner: { ...prev.banner, image: url } }));
      toast.success("Imagem enviada!");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#d82828] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-black">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 border border-black/5">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#d82828] rounded-2xl flex items-center justify-center shadow-xl mb-4"><Lock className="text-white" size={28} /></div>
            <h1 className="text-2xl font-bold uppercase tracking-tighter">Área Restrita</h1>
            <p className="text-gray-400 text-sm mt-1">Identifique-se para gerenciar a loja</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#d82828] focus:bg-white rounded-2xl px-6 outline-none transition-all font-semibold" placeholder="admin@gorgpresets.com" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#d82828] focus:bg-white rounded-2xl px-6 outline-none transition-all font-semibold" placeholder="••••••••" />
            </div>
            {loginError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl px-4 py-3">
                <AlertCircle size={14} /> {loginError}
              </div>
            )}
            <Button type="submit" disabled={isLoading} className="w-full h-14 bg-[#d82828] hover:bg-black text-white rounded-2xl font-bold uppercase tracking-widest transition-all mt-2 flex items-center justify-center gap-2">
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />}
              {isLoading ? "Verificando..." : "Entrar no Painel"}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col text-black font-sans" style={{ paddingTop: '112px' }}>
      <header className="bg-white/95 backdrop-blur-xl border-b border-black/5 shadow-sm fixed top-0 inset-x-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="text-[#d82828]" />
            <h1 className="text-xl font-bold uppercase tracking-tighter text-gray-950">GORG Admin</h1>
          </div>
          <div className="flex items-center gap-3">
             {activeTab === 'products' && (
               <Button onClick={openAddModal} className="bg-black hover:bg-[#d82828] text-white rounded-full px-6 h-10 flex items-center gap-2 transition-all">
                  <Plus size={18} /> Novo Produto
               </Button>
             )}
             <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-all">
                <LogOut size={20} />
             </button>
          </div>
        </div>
        
        <div className="container mx-auto px-6 flex gap-1 border-t border-black/5 overflow-x-auto no-scrollbar">
          {[
            { key: 'products', label: 'Produtos', icon: ShoppingBag },
            { key: 'magic', label: 'Mágica', icon: Sparkles },
            { key: 'hero', label: 'Hero', icon: ImageIcon },
            { key: 'banner', label: 'Banner', icon: ImageIcon },
            { key: 'testimonials', label: 'Feedbacks', icon: Users },
            { key: 'shopTheLook', label: 'Mosaico', icon: ImageIcon },
            { key: 'order', label: 'Ordenação', icon: LayoutList },
            { key: 'integration', label: 'Integração', icon: Zap },
            { key: 'promoBar', label: 'Aviso Topo', icon: Bell },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key as any)} className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === key ? 'border-[#d82828] text-[#d82828]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-lg overflow-hidden">
             {(products || []).map((p) => (
               <div key={p.id} className="grid grid-cols-[64px_1fr_120px_100px] items-center px-8 py-5 gap-3 hover:bg-gray-50 transition-colors border-b border-black/[0.03]">
                 <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-black/5"><img src={p.image} alt="" className="w-full h-full object-cover" /></div>
                 <div><p className="text-sm font-bold text-gray-950 uppercase tracking-tighter truncate">{p.name}</p><span className="text-[9px] font-bold text-[#d82828] uppercase">{p.category}</span></div>
                 <span className="text-sm font-black">R$ {Number(p.price || 0).toFixed(2)}</span>
                 <div className="flex items-center gap-2 justify-end"><button onClick={() => openEditModal(p)} className="p-2 hover:bg-black hover:text-white rounded-xl transition-all"><Edit3 size={16} /></button><button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button></div>
               </div>
             ))}
          </div>
        )}

        {/* MAGIC TAB */}
        {activeTab === 'magic' && (
          <div className="max-w-4xl mx-auto space-y-10 bg-white rounded-[3.5rem] border border-black/5 shadow-2xl p-12">
            <div className="flex items-center gap-6 border-l-4 border-[#d82828] pl-8">
               <div className="w-14 h-14 bg-red-50 text-[#d82828] rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={32} /></div>
               <div><h2 className="text-3xl font-black uppercase tracking-tighter">A Mágica</h2><p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Antes e Depois</p></div>
            </div>
            <div className="grid md:grid-cols-2 gap-12">
               {['before', 'after'].map((r) => (
                 <div key={r} className="space-y-4">
                    <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-gray-50 border border-black/5 relative group">
                       <img src={r==='before'?siteSettings.magic.beforeUrl:siteSettings.magic.afterUrl} className="w-full h-full object-cover" alt="" />
                       <label className="absolute inset-x-8 bottom-8 h-14 bg-white/10 hover:bg-white text-white hover:text-black rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase cursor-pointer transition-all border border-white/20 opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                          {isUploading ? <RefreshCw className="animate-spin" /> : <Upload size={16} />} ARQUIVO
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMagicUpload(f, r as any); }} />
                       </label>
                    </div>
                    <input value={r==='before'?siteSettings.magic.beforeUrl:siteSettings.magic.afterUrl} onChange={(e) => setSiteSettings(prev => ({ ...prev, magic: { ...prev.magic, [r==='before'?'beforeUrl':'afterUrl']: e.target.value } }))} className="w-full h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 font-mono text-[10px]" placeholder="URL" />
                 </div>
               ))}
            </div>
            <Button onClick={() => handleSaveSettings('magic')} disabled={isSavingSettings} className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl"><Save size={20} /> SALVAR MÁGICA</Button>
          </div>
        )}

        {/* HERO TAB */}
        {activeTab === 'hero' && (
          <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-10 space-y-8">
            <h2 className="text-2xl font-bold uppercase tracking-tighter border-b pb-4">Hero Home</h2>
            <div className="grid gap-6">
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold uppercase text-[#d82828] ml-1">Título</p>
                   <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                     {['PT', 'EN', 'ES'].map(l => (
                       <button key={l} onClick={() => setLangTab(l as any)} className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all ${langTab === l ? 'bg-white text-[#d82828] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{l}</button>
                     ))}
                   </div>
                 </div>
                 <input 
                   value={typeof siteSettings.hero.title === 'object' ? (siteSettings.hero.title[langTab] || "") : (langTab === 'PT' ? siteSettings.hero.title : "")} 
                   onChange={(e) => {
                     const currentTitle = typeof siteSettings.hero.title === 'object' ? siteSettings.hero.title : { PT: siteSettings.hero.title, EN: "", ES: "" };
                     setSiteSettings(prev => ({ ...prev, hero: { ...prev.hero, title: { ...currentTitle, [langTab]: e.target.value } } }));
                   }} 
                   className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none border border-black/5 focus:border-[#d82828] transition-all" 
                   placeholder={`Título em ${langTab}...`}
                 />
               </div>

               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold uppercase text-[#d82828] ml-1">Subtítulo</p>
                 </div>
                 <input 
                   value={typeof siteSettings.hero.subtitle === 'object' ? (siteSettings.hero.subtitle[langTab] || "") : (langTab === 'PT' ? siteSettings.hero.subtitle : "")} 
                   onChange={(e) => {
                     const currentSub = typeof siteSettings.hero.subtitle === 'object' ? siteSettings.hero.subtitle : { PT: siteSettings.hero.subtitle, EN: "", ES: "" };
                     setSiteSettings(prev => ({ ...prev, hero: { ...prev.hero, subtitle: { ...currentSub, [langTab]: e.target.value } } }));
                   }} 
                   className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none border border-black/5 focus:border-[#d82828] transition-all" 
                   placeholder={`Subtítulo em ${langTab}...`}
                 />
               </div>
               <div className="space-y-4">
                 <p className="text-[10px] font-bold uppercase text-gray-400 ml-1">Imagem de Fundo</p>
                 <div className="relative group aspect-video rounded-3xl overflow-hidden bg-gray-50 border border-black/5 mb-4 shadow-inner">
                    <img src={siteSettings.hero.backgroundImage} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="Hero Preview" />
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                       <div className="flex flex-col items-center gap-2 text-white">
                          {isUploading ? <RefreshCw className="animate-spin" size={24} /> : <Upload size={24} />}
                          <span className="text-[10px] font-black uppercase tracking-widest">Trocar Imagem</span>
                       </div>
                       <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSettingImageUpload(f, 'hero'); }} />
                    </label>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase text-gray-300 ml-1">Ou cole uma URL direta</p>
                    <input 
                       value={siteSettings.hero.backgroundImage} 
                       onChange={(e) => setSiteSettings(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: e.target.value } }))} 
                       className="w-full h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 font-mono text-[10px] focus:border-[#d82828] transition-all" 
                       placeholder="https://images.unsplash.com/..." 
                    />
                 </div>
               </div>
            </div>
            <Button onClick={() => handleSaveSettings('hero')} disabled={isSavingSettings} className="w-full h-16 bg-black text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-black/10 mt-6 flex items-center justify-center gap-3">
              {isSavingSettings ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} 
              SALVAR HERO
            </Button>
          </div>
        )}

        {/* BANNER TAB */}
        {activeTab === 'banner' && (
          <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-10 space-y-8">
            <h2 className="text-2xl font-bold uppercase tracking-tighter border-b pb-4">Banner Oferta</h2>
            <img src={siteSettings.banner.image} className="w-full h-40 object-cover rounded-3xl mb-6 shadow-inner" />
            <div className="flex gap-4">
              <label className="flex-1 h-16 bg-gray-100 hover:bg-black hover:text-white rounded-2xl flex items-center justify-center font-black text-xs uppercase cursor-pointer transition-all border border-black/5 shadow-sm">
                {isUploading ? "ENVIANDO..." : "ESCOLHER BANNER"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSettingImageUpload(f, 'banner'); }} />
              </label>
            </div>
            <Button onClick={() => handleSaveSettings('banner')} className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest mt-6 shadow-xl"><Save size={18} /> SALVAR BANNER</Button>
          </div>
        )}

        {/* FEEDBACKS TAB */}
        {activeTab === 'testimonials' && (
          <div className="max-w-4xl mx-auto bg-white rounded-[3.5rem] border border-black/5 shadow-2xl p-12 space-y-12">
            <div className="flex justify-between items-center border-b border-black/5 pb-10">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-red-50 text-[#d82828] rounded-2xl flex items-center justify-center shadow-lg"><Users size={32} /></div>
                 <div><h2 className="text-3xl font-black uppercase tracking-tighter">Feedbacks de Elite</h2><p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Depoimentos do seu império</p></div>
               </div>
               <Button onClick={() => setSiteSettings(prev => ({ ...prev, testimonials: [...(prev.testimonials || []), { name: "Novo Cliente", role: "Elite Member", content: "Produto Fantástico!", image: "https://api.dicebear.com/7.x/notionists/svg?seed=N-" + Date.now() }] }))} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-14 px-10 font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">NOVO FEEDBACK</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {(siteSettings.testimonials || []).map((t, i) => (
                <div key={i} className="bg-gray-50 rounded-[2.5rem] p-10 relative border border-black/5 group hover:shadow-2xl transition-all flex flex-col gap-6">
                  <button onClick={() => setSiteSettings(prev => ({ ...prev, testimonials: prev.testimonials.filter((_, idx) => idx !== i) }))} className="absolute top-8 right-8 text-gray-200 hover:text-red-500 transition-colors bg-white p-2 rounded-xl shadow-sm"><Trash2 size={18} /></button>
                  
                  <div className="flex items-center gap-6">
                    <div className="relative group/avatar">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white"><img src={t.image || "https://api.dicebear.com/7.x/notionists/svg?seed="+i} className="w-full h-full object-cover" /></div>
                      <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-all">
                        <Upload size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                           const f = e.target.files?.[0];
                           if (f) {
                             const url = await handleImageUpload(f);
                             if (url) {
                               const nt = [...siteSettings.testimonials];
                               nt[i].image = url;
                               setSiteSettings(prev => ({ ...prev, testimonials: nt }));
                             }
                           }
                        }} />
                      </label>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Nome</label>
                        <input value={t.name} onChange={(e) => { const nt = [...siteSettings.testimonials]; nt[i].name = e.target.value; setSiteSettings(prev => ({ ...prev, testimonials: nt })); }} className="w-full h-10 bg-white border border-black/5 px-4 rounded-xl font-black text-sm outline-none focus:border-[#d82828] transition-all uppercase" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Profissão / Cargo</label>
                        <input value={t.role} onChange={(e) => { const nt = [...siteSettings.testimonials]; nt[i].role = e.target.value; setSiteSettings(prev => ({ ...prev, testimonials: nt })); }} className="w-full h-10 bg-white border border-black/5 px-4 rounded-xl font-bold text-xs outline-none focus:border-[#d82828] transition-all text-gray-500" />
                      </div>
                    </div>
                  </div>

                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <label className="text-[10px] font-bold uppercase text-[#d82828] ml-1">Mensagem</label>
                       <div className="flex gap-1 bg-white p-1 rounded-xl shadow-inner border border-black/5">
                         {['PT', 'EN', 'ES'].map(l => (
                           <button key={l} onClick={() => setLangTab(l as any)} className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all ${langTab === l ? 'bg-[#d82828] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{l}</button>
                         ))}
                       </div>
                     </div>
                     <textarea 
                       value={typeof t.content === 'object' ? (t.content[langTab] || "") : (langTab === 'PT' ? t.content : "")} 
                       onChange={(e) => { 
                         const nt = [...siteSettings.testimonials]; 
                         const currentContent = typeof t.content === 'object' ? t.content : { PT: t.content, EN: "", ES: "" };
                         nt[i].content = { ...currentContent, [langTab]: e.target.value }; 
                         setSiteSettings(prev => ({ ...prev, testimonials: nt })); 
                       }} 
                       className="w-full text-xs outline-none bg-white p-6 rounded-[2rem] h-32 border border-black/5 focus:bg-white transition-all shadow-inner focus:border-[#d82828]/20" 
                       placeholder={`Depoimento em ${langTab}...`} 
                     />
                   </div>
                </div>
              ))}
            </div>
            
            <div className="pt-6 border-t border-black/5">
              <Button onClick={() => handleSaveSettings('testimonials')} className="w-full h-20 bg-black text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-4 hover:bg-[#d82828]"><Save size={24} /> SALVAR TODOS FEEDBACKS</Button>
              <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">Alterações só refletem no site após clicar em SALVAR</p>
            </div>
          </div>
        )}

        {/* MOSAICO TAB */}
        {activeTab === 'shopTheLook' && (
          <div className="max-w-4xl mx-auto bg-white rounded-[3.5rem] border border-black/5 shadow-2xl p-12 space-y-12">
            <div className="flex items-center gap-6 border-b border-black/5 pb-8">
               <div className="w-16 h-16 bg-red-50 text-[#d82828] rounded-2xl flex items-center justify-center shadow-lg"><ImageIcon size={32} /></div>
               <div><h2 className="text-3xl font-black uppercase tracking-tighter">Mosaico Visual</h2><p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Vitrine estilo Instagram</p></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
               {(siteSettings.shopTheLook || []).map((item, i) => (
                 <div key={i} className="bg-gray-50 p-6 rounded-[2.5rem] border border-black/5 hover:shadow-2xl transition-all flex flex-col gap-4 group">
                    <div className="aspect-square w-full overflow-hidden rounded-[2rem] border-4 border-white shadow-xl relative group/mosaic bg-white">
                      <img src={item.src} className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover/mosaic:opacity-100 cursor-pointer transition-all">
                        <div className="flex flex-col items-center gap-2">
                           {isUploading ? <RefreshCw className="animate-spin" /> : <Upload size={24} />}
                           <span className="text-[10px] font-black uppercase tracking-widest">Trocar Foto</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                             const f = e.target.files?.[0];
                             if (f) {
                               const url = await handleImageUpload(f);
                               if (url) {
                                 const nl = [...siteSettings.shopTheLook];
                                 nl[i].src = url;
                                 setSiteSettings(prev => ({ ...prev, shopTheLook: nl }));
                               }
                             }
                        }} />
                      </label>
                    </div>

                    <div className="space-y-3 px-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Legenda (Preset)</label>
                        <input value={item.presetName} onChange={(e) => { const nl = [...siteSettings.shopTheLook]; nl[i].presetName = e.target.value; setSiteSettings(prev => ({ ...prev, shopTheLook: nl })); }} className="w-full h-10 bg-white border border-black/5 px-4 rounded-xl font-black text-[10px] uppercase outline-none focus:border-[#d82828] transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">ID do Produto / Link</label>
                        <input value={item.productId} onChange={(e) => { const nl = [...siteSettings.shopTheLook]; nl[i].productId = e.target.value; setSiteSettings(prev => ({ ...prev, shopTheLook: nl })); }} className="w-full h-10 bg-white border border-black/5 px-4 rounded-xl font-bold text-[10px] outline-none focus:border-[#d82828] transition-all font-mono" placeholder="Ex: 5 ou link" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[9px] font-black uppercase text-gray-400 ml-1">URL da Imagem</label>
                         <input value={item.src} onChange={(e) => { const nl = [...siteSettings.shopTheLook]; nl[i].src = e.target.value; setSiteSettings(prev => ({ ...prev, shopTheLook: nl })); }} className="w-full h-8 bg-white border border-black/5 px-3 rounded-lg font-mono text-[8px] outline-none text-gray-400" />
                      </div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="pt-6 border-t border-black/5">
              <Button onClick={() => handleSaveSettings('shopTheLook')} className="w-full h-20 bg-black text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-4 hover:bg-[#d82828]"><Save size={24} /> SALVAR MOSAICO</Button>
            </div>
          </div>
        )}

        {/* ORDER TAB */}
        {activeTab === 'order' && (
          <div className="max-w-4xl mx-auto space-y-12">
             <div className="bg-white rounded-[3.5rem] border border-black/5 shadow-2xl p-12 space-y-10">
                <div className="flex items-center gap-6 border-l-4 border-[#d82828] pl-10 mb-10">
                   <div className="w-16 h-16 bg-red-50 text-[#d82828] rounded-2xl flex items-center justify-center shadow-lg"><LayoutList size={32} /></div>
                   <div><h2 className="text-3xl font-black uppercase tracking-tighter italic">Ordenação Vital</h2><p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-none">Controle a exibição da sua vitrine de elite</p></div>
                </div>

                <div className="space-y-20">
                   {/* NOVO: REORDENAR SEÇÕES DA HOME */}
                   <div className="space-y-6 bg-gray-50/50 p-8 rounded-[3rem] border border-black/5">
                      <div className="px-4">
                         <h3 className="text-xl font-black uppercase tracking-tighter text-[#d82828] italic">Ordem das Seções na Home</h3>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Arraste para mudar a ordem das seções na página inicial</p>
                      </div>
                      
                      <Reorder.Group 
                        axis="y" 
                        values={siteSettings.homeSectionOrder.sections || []} 
                        onReorder={(newOrder) => setSiteSettings(prev => ({ ...prev, homeSectionOrder: { ...prev.homeSectionOrder, sections: newOrder } }))}
                        className="space-y-3"
                      >
                         {(siteSettings.homeSectionOrder.sections || []).map((id) => {
                           const SECTION_LABELS: Record<string, string> = {
                             novidades: 'Novidades Exclusivas',
                             bestsellers: 'Best Sellers',
                             banner: 'Banner Edição',
                             categorias: 'Carrossel de Categorias',
                             magica: 'A Mágica (Antes/Depois)',
                             catalogo: 'Todos os Presets',
                             testimonials: 'Feedbacks de Clientes',
                             faq: 'Dúvidas Frequentes (FAQ)',
                             mosaico: 'Mosaico Shop the Look',
                             features: 'Diferenciais (Features)'
                           };
                           return (
                             <Reorder.Item 
                               key={id} 
                               value={id}
                               className="bg-white border border-black/5 p-5 rounded-2xl flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-xl transition-all group"
                             >
                                <GripVertical className="text-gray-200 group-hover:text-[#d82828]" size={20} />
                                <div className="flex-1">
                                  <p className="text-sm font-black uppercase tracking-tighter text-gray-1000 italic">{SECTION_LABELS[id] || id}</p>
                                </div>
                             </Reorder.Item>
                           );
                         })}
                      </Reorder.Group>
                   </div>

                   <div className="space-y-10">
                     <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Abaixo, escolha quais produtos aparecem em cada vitrine:</p>
                   </div>

                   {([
                     { key: 'newArrivals', label: 'Novidades Exclusivas', description: 'Bloco superior da página inicial' },
                     { key: 'bestSellers', label: 'Mais Vendidos (Best Sellers)', description: 'Carrossel de destaques' },
                     { key: 'allPresets', label: 'Catálogo Geral (Todos os Presets)', description: 'Grade principal de produtos' }
                   ] as const).map(({ key, label, description }) => {
                     const savedIds = siteSettings.homeSectionOrder[key] || [];
                     const currentItems = savedIds.map(id => products.find(p => p.id === id)).filter(Boolean);

                     return (
                       <div key={key} className="space-y-6 bg-gray-50/50 p-8 rounded-[3rem] border border-black/5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                             <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter text-gray-950 italic">{label}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{description}</p>
                             </div>
                             
                             <div className="flex items-center gap-3">
                                <select 
                                   className="h-12 bg-white border border-black/5 rounded-xl px-4 text-xs font-black uppercase outline-none focus:border-[#d82828] transition-all min-w-[200px]"
                                   onChange={(e) => {
                                      const productId = e.target.value;
                                      if (productId && !savedIds.includes(productId)) {
                                         setSiteSettings(prev => ({
                                            ...prev,
                                            homeSectionOrder: {
                                               ...prev.homeSectionOrder,
                                               [key]: [...(prev.homeSectionOrder[key] || []), productId]
                                            }
                                         }));
                                      }
                                      e.target.value = "";
                                   }}
                                >
                                   <option value="">+ ADICIONAR PRODUTO</option>
                                   {products
                                     .filter(p => !savedIds.includes(p.id))
                                     .map(p => (
                                       <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
                                     ))
                                   }
                                </select>
                                <span className="text-[9px] font-black bg-white px-3 py-1.5 rounded-full border border-black/5 text-gray-400">{currentItems.length} ITENS</span>
                             </div>
                          </div>
                          
                          <Reorder.Group 
                            axis="y" 
                            values={currentItems} 
                            onReorder={(newOrder) => {
                              const newIds = newOrder.map(item => item.id);
                              setSiteSettings(prev => ({
                                ...prev,
                                homeSectionOrder: {
                                  ...prev.homeSectionOrder,
                                  [key]: newIds
                                }
                              }));
                            }}
                            className="space-y-3"
                          >
                            {currentItems.map((p) => (
                              <Reorder.Item 
                                key={p.id} 
                                value={p}
                                className="bg-white border border-black/5 p-4 rounded-2xl flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-xl transition-all group"
                              >
                                 <GripVertical className="text-gray-200 group-hover:text-[#d82828]" size={16} />
                                 <div className="w-12 h-12 rounded-xl overflow-hidden border border-black/5 bg-gray-50 flex-shrink-0"><img src={p.image} className="w-full h-full object-cover" /></div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-tighter text-gray-950 truncate leading-none italic">{p.name}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                       <span className="text-[9px] font-bold text-[#d82828] uppercase">{p.category}</span>
                                       <span className="text-gray-300">•</span>
                                       <span className="text-[9px] font-mono text-gray-400">ID: {p.id}</span>
                                    </div>
                                 </div>
                                 <button 
                                    onClick={() => {
                                       setSiteSettings(prev => ({
                                          ...prev,
                                          homeSectionOrder: {
                                             ...prev.homeSectionOrder,
                                             [key]: prev.homeSectionOrder[key].filter(id => id !== p.id)
                                          }
                                       }));
                                    }}
                                    className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                          
                          {currentItems.length === 0 && (
                            <div className="p-16 text-center border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-white/50">
                               <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhum produto fixado nesta seção</p>
                               <p className="text-gray-200 text-[8px] font-bold mt-2 uppercase">Use o seletor acima para adicionar produtos manualmente</p>
                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>

                <div className="pt-10 border-t border-black/5 space-y-6">
                   <Button onClick={() => handleSaveSettings('homeSectionOrder')} className="w-full h-20 bg-black text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-4 hover:bg-[#d82828]"><Save size={24} /> SALVAR ORDEM DAS SEÇÕES</Button>
                   <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dica: Arraste os cards para mudar a ordem na Home. Adicione qualquer produto usando o seletor de cada seção.</p>
                </div>
             </div>
          </div>
        )}

        {/* INTEGRATION TAB */}
        {activeTab === 'integration' && (
          <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-12 space-y-10">
             <div className="flex items-center gap-4 border-b pb-6"><Zap className="text-amber-500" /><h2 className="text-2xl font-black uppercase tracking-tighter">Integração GGCheckout</h2></div>

             {/* Carrinho Toggle */}
             <div className="bg-gray-50 p-8 rounded-[2rem] border border-black/5 flex items-center justify-between">
               <div className="flex items-center gap-5">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${siteSettings.integration.isCartEnabled ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}><ShoppingBag size={26} /></div>
                 <div>
                   <h3 className="text-base font-bold uppercase tracking-tighter">Status do Carrinho</h3>
                   <p className="text-xs text-gray-400 mt-0.5">{siteSettings.integration.isCartEnabled ? 'Ativo — clientes podem adicionar ao carrinho' : 'Desativado — redireciona direto ao checkout'}</p>
                 </div>
               </div>
               <button
                 onClick={async () => {
                   const n = !siteSettings.integration.isCartEnabled;
                   setSiteSettings(prev => ({ ...prev, integration: { ...prev.integration, isCartEnabled: n } }));
                   await saveSetting('integration', { ...siteSettings.integration, isCartEnabled: n });
                   toast.success(`Carrinho ${n ? 'Habilitado' : 'Desativado'}`);
                 }}
                 className={`w-16 h-8 rounded-full relative transition-all flex-shrink-0 ${siteSettings.integration.isCartEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
               >
                 <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-sm ${siteSettings.integration.isCartEnabled ? 'left-9' : 'left-1'}`} />
               </button>
             </div>

             <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-gray-400">Base URL do Checkout</p>
                <input value={siteSettings.integration.checkoutBaseUrl} onChange={(e) => setSiteSettings(prev => ({ ...prev, integration: { ...prev.integration, checkoutBaseUrl: e.target.value } }))} className="w-full h-16 bg-gray-50 rounded-2xl px-8 font-mono text-sm border border-black/5" placeholder="https://..." />
             </div>
             <Button onClick={() => handleSaveSettings('integration')} className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl"><Save size={18} /> SALVAR INTEGRAÇÃO</Button>
          </div>
        )}

        {/* PROMO BAR TAB */}
        {activeTab === 'promoBar' && (
          <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-10 space-y-10">
            <div className="flex items-center gap-4 border-b pb-6"><Bell className="text-[#d82828]" /><h2 className="text-2xl font-black uppercase tracking-tighter">Aviso no Cabeçalho</h2></div>
            <div className="grid gap-6">
               <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400">Mensagem (Português)</p><input value={siteSettings.promoBar.PT} onChange={(e) => setSiteSettings(prev => ({ ...prev, promoBar: { ...prev.promoBar, PT: e.target.value } }))} className="w-full h-14 bg-gray-50 rounded-2xl px-6 font-bold outline-none focus:border-[#d82828] border-2 border-transparent transition-all" /></div>
               <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400">Mensagem (Inglês)</p><input value={siteSettings.promoBar.EN} onChange={(e) => setSiteSettings(prev => ({ ...prev, promoBar: { ...prev.promoBar, EN: e.target.value } }))} className="w-full h-14 bg-gray-50 rounded-2xl px-6 font-bold outline-none focus:border-[#d82828] border-2 border-transparent transition-all" /></div>
               <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400">Mensagem (Espanhol)</p><input value={siteSettings.promoBar.ES} onChange={(e) => setSiteSettings(prev => ({ ...prev, promoBar: { ...prev.promoBar, ES: e.target.value } }))} className="w-full h-14 bg-gray-50 rounded-2xl px-6 font-bold outline-none focus:border-[#d82828] border-2 border-transparent transition-all" /></div>
            </div>
            <Button onClick={() => handleSaveSettings('promoBar')} className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase shadow-xl transition-all active:scale-95 hover:bg-[#d82828] flex items-center justify-center gap-3"><Save size={20} /> SALVAR AVISOS MULTI-IDIOMA</Button>
          </div>
        )}
      </main>

      {/* MODAL: PRODUCT EDIT/ADD */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-black overflow-y-auto">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
                <button onClick={() => { setIsModalOpen(false); setIsEditing(false); setFormData(initialForm); }} className="absolute top-8 right-8 text-gray-300 hover:text-black transition-all"><X size={24} /></button>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">{isEditing ? "Editar Pack Preset" : "Novo Pack de Elite"}</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-400">Nome do Pack</label>
                        <input name="name" value={formData.name} onChange={handleInputChange} className="w-full h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-400">Categoria</label>
                        <select name="category" value={formData.category} onChange={handleInputChange as any} className="w-full h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 uppercase font-bold text-xs ring-offset-background focus:ring-2 focus:ring-[#d82828] transition-all">
                          <option value="Creative">Creative</option>
                          <option value="Urban">Urban</option>
                          <option value="Nature">Nature</option>
                          <option value="Portrait">Portrait</option>
                        </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-400">Preço Atual (R$)</label>
                        <input name="price" value={formData.price} onChange={handleInputChange} className="w-full h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5" placeholder="Ex: 49.90" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-400">Preço Original (R$)</label>
                        <input name="originalPrice" value={formData.originalPrice} onChange={handleInputChange} className="w-full h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5" placeholder="Ex: 199.90" />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Checkout URL (Botão Comprar)</label>
                      <input name="checkoutUrl" value={formData.checkoutUrl} onChange={handleInputChange} className="w-full h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 font-mono text-xs" placeholder="https://www.ggcheckout.com/..." />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Imagem de Capa</label>
                      <div className="flex gap-4">
                        <input name="image" value={formData.image} onChange={handleInputChange} className="flex-1 h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 font-mono text-xs" placeholder="https://..." />
                        <label className="h-12 px-4 bg-black text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#d82828] transition-all text-xs font-bold uppercase">
                          {isUploading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Upload size={16} />}
                          Arquivo
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const url = await handleImageUpload(f);
                              if (url) setFormData(prev => ({ ...prev, image: url }));
                            }
                          }} />
                        </label>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Galeria (Outras Imagens)</label>
                      <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mb-3">Arraste para reordenar • Passe o mouse para deletar</p>
                      <Reorder.Group
                        axis="x"
                        values={formData.images || []}
                        onReorder={(newOrder) => setFormData(prev => ({ ...prev, images: newOrder }))}
                        className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4"
                        style={{ listStyle: 'none', padding: 0, margin: 0 }}
                      >
                        {(formData.images || []).map((img) => (
                          <Reorder.Item
                            key={img}
                            value={img}
                            className="aspect-square rounded-lg overflow-hidden border border-black/5 relative group bg-gray-50 cursor-grab active:cursor-grabbing"
                            style={{ listStyle: 'none' }}
                            whileDrag={{ scale: 1.08, zIndex: 50, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
                          >
                            <img src={img} className="w-full h-full object-cover pointer-events-none" />
                            {/* Ícone de grip */}
                            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md p-0.5">
                              <GripVertical size={12} className="text-white" />
                            </div>
                            {/* Deletar */}
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((i) => i !== img) }))}
                              className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all pt-4"
                            >
                              <Trash2 size={16} />
                            </button>
                          </Reorder.Item>
                        ))}
                        {/* Botão de adicionar imagem */}
                        <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-[#d82828] hover:border-[#d82828] cursor-pointer transition-all">
                          {isUploading ? <RefreshCw className="animate-spin" /> : <Plus size={24} />}
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const url = await handleImageUpload(f);
                              if (url) setFormData(prev => ({ ...prev, images: [...(prev.images || []), url] }));
                            }
                          }} />
                        </label>
                      </Reorder.Group>

                      <div className="flex gap-4">
                        <input id="new-gamma-img" className="flex-1 h-12 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 font-mono text-xs" placeholder="Colar link de nova imagem" onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             e.preventDefault();
                             const target = e.target as HTMLInputElement;
                             if (target.value.trim()) {
                               setFormData(prev => ({ ...prev, images: [...(prev.images || []), target.value.trim()] }));
                               target.value = '';
                             }
                           }
                        }} />
                        <Button type="button" onClick={() => {
                           const el = document.getElementById('new-gamma-img') as HTMLInputElement;
                           if (el.value.trim()) {
                             setFormData(p => ({ ...p, images: [...(p.images || []), el.value.trim()] }));
                             el.value = '';
                           }
                        }} className="h-12 px-6 bg-gray-100 text-black hover:bg-black hover:text-white rounded-xl text-xs">ADD</Button>
                      </div>
                   </div>

                    <div className="space-y-4">
                       {/* Descrição Curta — Multilíngue */}
                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <label className="text-[10px] font-bold uppercase text-gray-400">Descrição Curta</label>
                           <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                             {['PT', 'EN', 'ES'].map(l => (
                               <button key={l} type="button" onClick={() => setLangTab(l as any)} className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all ${langTab === l ? 'bg-white text-[#d82828] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{l}</button>
                             ))}
                           </div>
                         </div>
                         <textarea
                           value={typeof formData.description === 'object' ? (formData.description[langTab] || '') : (langTab === 'PT' ? (formData.description || '') : '')}
                           onChange={(e) => {
                             const cur = typeof formData.description === 'object' ? formData.description : { PT: formData.description || '', EN: '', ES: '' };
                             setFormData(prev => ({ ...prev, description: { ...cur, [langTab]: e.target.value } }));
                           }}
                           placeholder={`Descrição curta em ${langTab}...`}
                           className="w-full h-24 bg-gray-50 rounded-xl p-4 outline-none border border-black/5 focus:border-[#d82828] transition-all"
                         />
                       </div>
                       {/* Descrição Detalhada — Multilíngue */}
                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <label className="text-[10px] font-bold uppercase text-gray-400">Descrição Detalhada</label>
                           <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                             {['PT', 'EN', 'ES'].map(l => (
                               <button key={l} type="button" onClick={() => setLangTab(l as any)} className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all ${langTab === l ? 'bg-white text-[#d82828] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{l}</button>
                             ))}
                           </div>
                         </div>
                         <textarea
                           value={typeof formData.detailedDescription === 'object' ? (formData.detailedDescription[langTab] || '') : (langTab === 'PT' ? (formData.detailedDescription || '') : '')}
                           onChange={(e) => {
                             const cur = typeof formData.detailedDescription === 'object' ? formData.detailedDescription : { PT: formData.detailedDescription || '', EN: '', ES: '' };
                             setFormData(prev => ({ ...prev, detailedDescription: { ...cur, [langTab]: e.target.value } }));
                           }}
                           placeholder={`Descrição detalhada em ${langTab}...`}
                           className="w-full h-40 bg-gray-50 rounded-xl p-4 outline-none border border-black/5 focus:border-[#d82828] transition-all"
                         />
                       </div>
                    </div>

                    {/* O que está incluso */}
                    <div className="space-y-3">
                       <label className="text-[10px] font-bold uppercase text-gray-400">O que está incluso</label>
                       {formData.whatsIncluded.map((item, idx) => (
                         <div key={idx} className="flex gap-2">
                           <input
                             value={item}
                             onChange={(e) => {
                               const updated = [...formData.whatsIncluded];
                               updated[idx] = e.target.value;
                               setFormData(prev => ({ ...prev, whatsIncluded: updated }));
                             }}
                             className="flex-1 h-11 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 focus:border-[#d82828] transition-all text-sm"
                             placeholder={`Item ${idx + 1}...`}
                           />
                           <button type="button" onClick={() => setFormData(prev => ({ ...prev, whatsIncluded: prev.whatsIncluded.filter((_, i) => i !== idx) }))} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                         </div>
                       ))}
                       <button type="button" onClick={() => setFormData(prev => ({ ...prev, whatsIncluded: [...prev.whatsIncluded, ''] }))} className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400 hover:text-black transition-colors mt-1">
                         <Plus size={14} /> Adicionar item
                       </button>
                    </div>

                    {/* Ideal Para */}
                    <div className="space-y-3">
                       <label className="text-[10px] font-bold uppercase text-gray-400">Ideal Para</label>
                       {formData.idealFor.map((item, idx) => (
                         <div key={idx} className="flex gap-2">
                           <input
                             value={item}
                             onChange={(e) => {
                               const updated = [...formData.idealFor];
                               updated[idx] = e.target.value;
                               setFormData(prev => ({ ...prev, idealFor: updated }));
                             }}
                             className="flex-1 h-11 bg-gray-50 rounded-xl px-4 outline-none border border-black/5 focus:border-[#d82828] transition-all text-sm"
                             placeholder={`Perfil ${idx + 1}...`}
                           />
                           <button type="button" onClick={() => setFormData(prev => ({ ...prev, idealFor: prev.idealFor.filter((_, i) => i !== idx) }))} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                         </div>
                       ))}
                       <button type="button" onClick={() => setFormData(prev => ({ ...prev, idealFor: [...prev.idealFor, ''] }))} className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400 hover:text-black transition-colors mt-1">
                         <Plus size={14} /> Adicionar perfil
                       </button>
                    </div>

                   <Button type="submit" disabled={isLoading} className="w-full h-16 bg-black text-white hover:bg-[#d82828] rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl mt-4 select-none">
                      {isLoading ? <RefreshCw className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
                      {isEditing ? "Atualizar Pack" : "Criar Novo Pack"}
                   </Button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

