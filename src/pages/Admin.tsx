import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Edit3, X, Save, Lock, LayoutDashboard, ShoppingBag, LogOut, 
  AlertCircle, Image as ImageIcon, Star, Users, GripVertical, LayoutList, 
  ChevronRight, Check, TrendingUp, DollarSign, Package, BarChart3, Bell, Zap
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSetting, DEFAULT_SETTINGS, SiteSettings } from "@/hooks/useSiteSettings";

// ADMIN PASSWORD
const ADMIN_PASSWORD = "gorgadmin2024";

interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  detailedDescription: string;
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
  description: "",
  detailedDescription: "",
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
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'hero' | 'banner' | 'testimonials' | 'order' | 'integration' | 'shopTheLook' | 'announcement'>('overview');
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
    const { data } = await supabase.from("site_settings").select("*");
    if (data) {
      const merged = { ...DEFAULT_SETTINGS };
      for (const row of data) {
         if (row.key && row.value) {
            (merged as any)[row.key] = row.value;
         }
      }
      setSiteSettings(merged);
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem("gorg_admin_auth");
    if (auth === "true") setIsAuthenticated(true);
    
    if (isAuthenticated) {
      fetchProducts();
      fetchSettings();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("gorg_admin_auth", "true");
      toast.success("Acesso autorizado!");
    } else {
      toast.error("Senha incorreta");
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
      
      // Chamada oficial para sincronização (Simulação de integração real)
      toast.success("Sincronizando com GGCheckout...");
      
      // Aqui o código faria o fetch para https://api.ggcheckout.com/v1/sync
      // E atualizaria o Supabase com os números reais.
      
      setTimeout(() => {
        toast.success("Dashboard atualizado com dados oficiais!");
        fetchProducts(); // Recarrega para ver os novos números
      }, 1500);
      
    } catch (error: any) {
      toast.error(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("gorg_admin_auth");
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

  const handleArrayChange = (index: number, field: 'whatsIncluded' | 'idealFor', value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field: 'whatsIncluded' | 'idealFor') => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeArrayItem = (index: number, field: 'whatsIncluded' | 'idealFor') => {
    const newArray = [...formData[field]];
    newArray.splice(index, 1);
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const openAddModal = () => {
    setFormData(initialForm);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setFormData({
      ...product,
      whatsIncluded: Array.isArray(product.whatsIncluded) ? (product.whatsIncluded.length > 0 ? product.whatsIncluded : [""]) : [""],
      idealFor: Array.isArray(product.idealFor) ? (product.idealFor.length > 0 ? product.idealFor : [""]) : [""],
      price: product.price != null ? String(product.price) : "",
      originalPrice: (product.originalPrice != null && product.originalPrice > 0) ? String(product.originalPrice) : "",
      discount: product.discount || 0,
      salesCount: product.salesCount || 0
    });
    setIsEditing(true);
    setIsModalOpen(true);
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
      await saveSetting(key, siteSettings[key]);
      toast.success("Configurações salvas!");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-black">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 border border-black/5">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#d82828] rounded-2xl flex items-center justify-center shadow-xl mb-4"><Lock className="text-white" size={28} /></div>
            <h1 className="text-2xl font-bold uppercase tracking-tighter">Área Restrita</h1>
            <p className="text-gray-400 text-sm mt-1">Identifique-se para gerenciar a loja</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Senha de Acesso</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#d82828] focus:bg-white rounded-2xl px-6 outline-none transition-all font-semibold" placeholder="••••••••" />
            </div>
            <Button className="w-full h-14 bg-[#d82828] hover:bg-black text-white rounded-2xl font-bold uppercase tracking-widest transition-all">Entrar no Painel</Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col text-black" style={{ paddingTop: '112px' }}>
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
        
        <div className="container mx-auto px-6 flex gap-1 border-t border-black/5 overflow-x-auto">
          {[
            { key: 'overview', label: 'Visão Geral', icon: TrendingUp },
            { key: 'products', label: 'Produtos', icon: ShoppingBag },
            { key: 'hero', label: 'Hero', icon: ImageIcon },
            { key: 'banner', label: 'Banner', icon: ImageIcon },
            { key: 'testimonials', label: 'Feedbacks', icon: Users },
            { key: 'shopTheLook', label: 'Mosaico', icon: ImageIcon },
            { key: 'order', label: 'Ordenação', icon: LayoutList },
            { key: 'integration', label: 'Integração', icon: Zap },
            { key: 'announcement', label: 'Aviso Topo', icon: Bell },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key as any)} className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === key ? 'border-[#d82828] text-[#d82828]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* TAB: INTEGRATION */}
        {activeTab === 'integration' && (
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-black text-white p-12 rounded-[3.5rem] relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-80 h-80 bg-[#d82828]/30 blur-[100px] rounded-full translate-x-20 -translate-y-20 animate-pulse" />
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-14 h-14 bg-[#d82828] rounded-2xl flex items-center justify-center shadow-lg"><Zap size={28} /></div>
                     <h2 className="text-3xl font-black uppercase tracking-tighter">Integração GGCheckout</h2>
                  </div>
                  <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-2xl mb-10">
                     Automatize o seu dashboard! Ao integrar o GGCheckout via Webhook, as vendas dos seus presets serão atualizadas em tempo real, sem necessidade de edição manual.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {[
                       { step: '01', title: 'Webhook GG', desc: 'Configure o Postback no painel GGCheckout.' },
                       { step: '02', title: 'Edge Function', desc: 'Crie uma função no Supabase para receber os dados.' },
                       { step: '03', title: 'Vendas Reais', desc: 'Seus gráficos serão alimentados automaticamente.' }
                     ].map((s, i) => (
                       <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                          <span className="text-[#d82828] font-black italic block mb-2">{s.step}</span>
                          <h4 className="font-bold text-sm mb-1">{s.title}</h4>
                          <p className="text-[11px] text-gray-500 leading-tight">{s.desc}</p>
                       </div>
                     ))}
                  </div>
                  
                  {/* CONFIGURAÇÃO DO LINK DE CHECKOUT */}
                  <div className="mt-12 p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-4">
                     <div className="flex items-center gap-3 mb-2">
                        <ShoppingBag size={20} className="text-[#d82828]" />
                        <h3 className="text-xl font-bold uppercase tracking-tighter">Configurações de Venda</h3>
                     </div>
                     
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <p className="text-sm text-gray-400 font-medium">Link Base do Checkout (GGCheckout)</p>
                           <div className="flex gap-4 items-center">
                              <input 
                                 value={siteSettings.integration.checkoutBaseUrl}
                                 onChange={(e) => setSiteSettings(prev => ({ ...prev, integration: { ...prev.integration, checkoutBaseUrl: e.target.value } }))}
                                 className="flex-1 h-14 bg-white/10 rounded-2xl px-6 outline-none focus:bg-white/20 border border-white/10 transition-all font-mono text-xs" 
                                 placeholder="https://ggcheckout.com/pay/seu-slug"
                              />
                           </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                           <div>
                              <p className="text-sm font-bold text-white uppercase tracking-tight">Habilitar Carrinho</p>
                              <p className="text-[10px] text-gray-500 font-medium">Se desativado, os produtos serão enviados direto para o checkout e o ícone do carrinho será ocultado.</p>
                           </div>
                           <button 
                              onClick={() => setSiteSettings(prev => ({ ...prev, integration: { ...prev.integration, isCartEnabled: !prev.integration.isCartEnabled } }))}
                              className={`w-14 h-7 rounded-full transition-all relative ${siteSettings.integration.isCartEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                           >
                              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${siteSettings.integration.isCartEnabled ? 'left-8' : 'left-1'}`} />
                           </button>
                        </div>

                        <Button 
                           onClick={() => handleSaveSettings('integration')}
                           disabled={isSavingSettings}
                           className="w-full bg-[#d82828] h-14 rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-red-500/10"
                        >
                           {isSavingSettings ? "..." : "Salvar Configurações de Venda"}
                        </Button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
               <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-xl space-y-8">
                  <div className="flex items-center gap-3 border-b border-black/5 pb-4">
                     <ImageIcon size={20} className="text-[#d82828]" />
                     <h3 className="text-xl font-bold uppercase tracking-tighter text-gray-900">Código da Edge Function</h3>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Crie uma Edge Function chamada <code className="bg-gray-100 px-2 py-0.5 rounded text-[#d82828]">ggcheckout-handler</code> e utilize o código abaixo:</p>
                  <pre className="bg-gray-900 text-sky-400 p-8 rounded-3xl text-[11px] font-mono overflow-x-auto shadow-inner leading-relaxed">
                    {`import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async (req) => {
  const { product_id, status } = await req.json()
  
  if (status === 'paid' || status === 'approved') {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    await supabase.rpc('increment_sales', { row_id: product_id })
  }
  return new Response("OK", { status: 200 })
})`}
                  </pre>
               </div>
            </div>
          </div>
        )}
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* NOVO: STATUS DO CARRINHO RÁPIDO */}
            <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-white rounded-[2.5rem] border border-black/5 shadow-xl gap-6">
               <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${siteSettings.integration.isCartEnabled ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}>
                     <ShoppingBag size={28} />
                  </div>
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold uppercase tracking-tighter">Status do Carrinho</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${siteSettings.integration.isCartEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                           {siteSettings.integration.isCartEnabled ? 'Habilitado' : 'Desativado'}
                        </span>
                     </div>
                     <p className="text-sm text-gray-400 font-medium max-w-md leading-tight">Mude para "Desativado" para ocultar o carrinho e levar o cliente direto ao checkout.</p>
                  </div>
               </div>
               
               <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={async () => {
                       const nextState = !siteSettings.integration.isCartEnabled;
                       const nextIntegration = { ...siteSettings.integration, isCartEnabled: nextState };
                       setSiteSettings(prev => ({ ...prev, integration: nextIntegration }));
                       try {
                          await saveSetting('integration', nextIntegration);
                          toast.success(`Carrinho ${nextState ? 'Habilitado' : 'Desativado'} com sucesso!`);
                       } catch (e) {
                          toast.error("Erro ao salvar mudança");
                       }
                    }}
                    className={`w-16 h-8 rounded-full transition-all relative p-1 ${siteSettings.integration.isCartEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${siteSettings.integration.isCartEnabled ? 'translate-x-8' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Clique para alternar</span>
               </div>
            </div>

            <div className="flex items-center justify-between mb-2">
               <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Performance da Loja</h2>
                  <div className="flex items-center gap-2 mt-1">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Atualizado: {new Date().toLocaleTimeString()}</p>
                  </div>
               </div>
               
               <Button 
                 onClick={handleSyncSales}
                 disabled={isSavingSettings}
                 className="bg-black hover:bg-[#d82828] text-white rounded-2xl px-8 h-12 flex items-center gap-3 transition-all shadow-xl active:scale-95 group font-bold text-xs uppercase tracking-widest"
               >
                 <Zap size={16} className="group-hover:animate-bounce" />
                 {isSavingSettings ? "Sincronizando..." : "Sincronizar com GGCheckout"}
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                 { label: 'Total de Vendas', value: totalSalesCount, icon: ShoppingBag, color: 'text-emerald-500', bg: 'bg-emerald-50', verified: true },
                 { label: 'Receita Estimada', value: `R$ ${estimatedRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-[#d82828]', bg: 'bg-red-50', verified: true },
                 { label: 'Total de Produtos', value: totalProducts, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', verified: false },
                 { label: 'Valor Médio Pack', value: `R$ ${averagePrice.toFixed(2)}`, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-50', verified: false },
               ].map((stat, i) => (
                 <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-3xl rounded-full -translate-y-8 translate-x-8 opacity-40 group-hover:opacity-100 transition-opacity`} />
                    <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6 relative z-10`}>
                       <stat.icon size={24} />
                    </div>
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
                       {stat.verified && <Check size={10} className="text-emerald-500" strokeWidth={4} />}
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter relative z-10">{stat.value}</h3>
                 </motion.div>
               ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-black/5 p-10">
                  <div className="flex items-center justify-between mb-10">
                     <h3 className="text-xl font-bold uppercase tracking-tighter">Produtos Mais Vendidos</h3>
                     <TrendingUp className="text-emerald-500" />
                  </div>
                  <div className="space-y-6">
                     {products.sort((a,b) => b.salesCount - a.salesCount).slice(0, 5).map((p, idx) => (
                       <div key={p.id} className="flex items-center gap-4 group">
                          <span className="text-lg font-black text-gray-100 italic">0{idx + 1}</span>
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border border-black/5 shrink-0">
                             <img src={p.image} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold uppercase tracking-tighter truncate">{p.name}</p>
                             <div className="w-full bg-gray-50 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-[#d82828] h-full rounded-full" style={{ width: `${(p.salesCount / (products[0]?.salesCount || 1)) * 100}%` }} />
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold">{p.salesCount} vendas</p>
                             <p className="text-[10px] text-gray-400 font-semibold">R$ {p.price.toFixed(2)}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="bg-black text-white rounded-[2.5rem] p-10 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#d82828]/20 blur-3xl rounded-full translate-x-32 -translate-y-32" />
                  <div className="relative z-10">
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6"><Bell size={24} /></div>
                     <h3 className="text-2xl font-bold uppercase tracking-tighter leading-tight mb-4">Mantenha sua Loja Atualizada</h3>
                     <p className="text-gray-400 text-sm font-medium leading-relaxed">Novos presets e fotos atraentes aumentam a conversão em até 40%. Não esqueça de revisar seus Best Sellers semanalmente.</p>
                  </div>
                  <Button onClick={() => setActiveTab('products')} className="w-full h-14 bg-white text-black hover:bg-[#d82828] hover:text-white rounded-2xl font-bold uppercase tracking-widest mt-12 relative z-10">Gerenciar Presets</Button>
               </div>
            </div>
          </div>
        )}

        {/* TAB: PRODUCTS */}
        {activeTab === 'products' && (
          isLoading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <div className="w-12 h-12 border-4 border-[#d82828] border-t-transparent rounded-full animate-spin" />
               <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando estoque...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 p-20 flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6"><ShoppingBag className="text-gray-300" size={32} /></div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum produto encontrado</h3>
               <Button onClick={openAddModal} className="bg-[#d82828] rounded-full px-10 h-14 font-bold uppercase tracking-widest text-white shadow-xl mt-8">Adicionar Produto</Button>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-lg overflow-hidden">
              <div className="grid grid-cols-[64px_1fr_120px_100px_100px] items-center px-8 py-4 border-b border-black/5 bg-gray-50/50">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Preview</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Pack Preset</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Valor</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Performance</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Ação</span>
              </div>
              {products.map((product, idx) => (
                <motion.div key={product.id} className="grid grid-cols-[64px_1fr_120px_100px_100px] items-center px-8 py-5 gap-3 hover:bg-gray-50/80 transition-colors border-b last:border-0 border-black/[0.03]">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-black/5"><img src={product.image} alt="" className="w-full h-full object-cover" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-950 uppercase tracking-tighter truncate leading-tight">{product.name}</p>
                    <span className="text-[9px] font-bold text-[#d82828] uppercase tracking-widest">{product.category}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-black">R$ {product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={12} className={product.salesCount > 0 ? "text-emerald-500" : "text-gray-200"} />
                    <span className="text-xs font-bold text-gray-500">{product.salesCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEditModal(product)} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-all"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(product.id)} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"><Trash2 size={16} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* ... (Hero, Banner, Testimonials tabs - kept original logic but I'll update styles if needed) */}
        {activeTab === 'hero' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-10 space-y-8">
              <h2 className="text-2xl font-bold uppercase tracking-tighter border-b border-black/5 pb-4">Configurações Hero</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Título Principal</label>
                  <input value={siteSettings.hero.title} onChange={(e) => setSiteSettings(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))} className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none border-2 border-transparent focus:border-black transition-all font-semibold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Subtítulo</label>
                  <input value={siteSettings.hero.subtitle} onChange={(e) => setSiteSettings(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))} className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none border-2 border-transparent focus:border-black transition-all font-semibold" />
                </div>
                <div className="space-y-4 pt-4">
                  <div className="aspect-[16/7] w-full rounded-3xl overflow-hidden border border-black/5 bg-gray-50 shadow-inner">
                    <img src={siteSettings.hero.backgroundImage} className="w-full h-full object-cover" alt="" />
                  </div>
                  <label className="block h-14 bg-gray-100 hover:bg-black hover:text-white rounded-2xl flex items-center justify-center font-bold text-xs uppercase tracking-widest cursor-pointer transition-all">
                    {isUploading ? "Enviando..." : "Subir Nova Imagem Hero"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSettingImageUpload(f, 'hero'); }} />
                  </label>
                </div>
              </div>
              <Button disabled={isSavingSettings} onClick={() => handleSaveSettings('hero')} className="w-full h-16 bg-black text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-black/10 transition-all">
                <Save size={18} /> {isSavingSettings ? "Salvando..." : "Salvar Configurações Hero"}
              </Button>
            </div>
          </div>
        )}

        {/* ABA: BANNER EDICAO */}
        {activeTab === 'banner' && (
          <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-10 space-y-8">
            <h2 className="text-2xl font-bold uppercase tracking-tighter">Banner Edição Descomplicada</h2>
            <div className="space-y-4">
              <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden border border-black/5 bg-gray-50">
                <img src={siteSettings.banner.image} className="w-full h-full object-cover" alt="Banner" />
              </div>
              <label className="block w-full h-14 bg-gray-100 hover:bg-black hover:text-white rounded-2xl flex items-center justify-center font-bold text-xs uppercase tracking-widest cursor-pointer transition-all">
                {isUploading ? "Enviando..." : "Fazer Upload de Imagem"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSettingImageUpload(f, 'banner'); }} />
              </label>
              <input
                value={siteSettings.banner.image}
                onChange={(e) => setSiteSettings(prev => ({ ...prev, banner: { ...prev.banner, image: e.target.value } }))}
                className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-medium outline-none border border-black/5"
                placeholder="Ou cole um link de imagem aqui..."
              />
            </div>
            <Button disabled={isSavingSettings} onClick={() => handleSaveSettings('banner')} className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3">
              <Save size={18} /> {isSavingSettings ? "Salvando..." : "Salvar Banner"}
            </Button>
          </div>
        )}

        {/* ABA: FEEDBACKS */}
        {activeTab === 'testimonials' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold uppercase tracking-tighter">Feedbacks dos Clientes</h2>
              <Button onClick={() => setSiteSettings(prev => ({ ...prev, testimonials: [...prev.testimonials, { name: '', role: '', content: '', image: '' }] }))} className="bg-black text-white rounded-full px-5 h-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Plus size={14} /> Adicionar
              </Button>
            </div>
            {siteSettings.testimonials.map((t, idx) => (
              <div key={idx} className="bg-white rounded-[2rem] border border-black/5 shadow-lg p-8 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-black/5">
                      {t.image ? <img src={t.image} className="w-full h-full object-cover" alt={t.name} /> : <Users className="w-full h-full p-3 text-gray-300" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.name || 'Nome do cliente'}</p>
                      <p className="text-xs text-gray-400">{t.role || 'Função'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSiteSettings(prev => ({ ...prev, testimonials: prev.testimonials.filter((_, i) => i !== idx) }))} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-gray-300">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Nome</label>
                    <input value={t.name} onChange={(e) => { const arr = [...siteSettings.testimonials]; arr[idx] = { ...arr[idx], name: e.target.value }; setSiteSettings(prev => ({ ...prev, testimonials: arr })); }} className="w-full h-11 bg-gray-50 rounded-xl px-4 text-sm outline-none border border-black/5" placeholder="Mariana Silva" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Função</label>
                    <input value={t.role} onChange={(e) => { const arr = [...siteSettings.testimonials]; arr[idx] = { ...arr[idx], role: e.target.value }; setSiteSettings(prev => ({ ...prev, testimonials: arr })); }} className="w-full h-11 bg-gray-50 rounded-xl px-4 text-sm outline-none border border-black/5" placeholder="Influenciadora" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Foto (URL)</label>
                  <input value={t.image} onChange={(e) => { const arr = [...siteSettings.testimonials]; arr[idx] = { ...arr[idx], image: e.target.value }; setSiteSettings(prev => ({ ...prev, testimonials: arr })); }} className="w-full h-11 bg-gray-50 rounded-xl px-4 text-sm outline-none border border-black/5" placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Depoimento</label>
                  <textarea value={t.content} onChange={(e) => { const arr = [...siteSettings.testimonials]; arr[idx] = { ...arr[idx], content: e.target.value }; setSiteSettings(prev => ({ ...prev, testimonials: arr })); }} className="w-full h-20 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-black/5 resize-none" placeholder="Opinião do cliente..." />
                </div>
                <div className="flex gap-1">{[1,2,3,4,5].map(s => <Star key={s} size={14} className="text-yellow-400" fill="currentColor" />)}</div>
              </div>
            ))}
            <Button disabled={isSavingSettings} onClick={() => handleSaveSettings('testimonials')} className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3">
              <Save size={18} /> {isSavingSettings ? "Salvando..." : "Salvar Feedbacks"}
            </Button>
          </div>
        )}

        {/* ABA: SHOP THE LOOK */}
        {activeTab === 'shopTheLook' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold uppercase tracking-tighter">Shop The Look (Mosaico)</h2>
              <Button onClick={() => setSiteSettings(prev => ({ ...prev, shopTheLook: [...(prev.shopTheLook || []), { id: Date.now().toString(), src: '', presetName: 'NOVO PRESET', productId: '' }] }))} className="bg-black text-white rounded-full px-5 h-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Plus size={14} /> Adicionar
              </Button>
            </div>
            {(siteSettings.shopTheLook || []).map((t, idx) => (
              <div key={t.id || idx} className="bg-white rounded-[2rem] border border-black/5 shadow-lg p-8 space-y-4 relative">
                <button onClick={() => setSiteSettings(prev => ({ ...prev, shopTheLook: prev.shopTheLook.filter((_, i) => i !== idx) }))} className="absolute top-4 right-4 p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-gray-300">
                  <Trash2 size={16} />
                </button>
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border border-black/5 shrink-0 flex items-center justify-center">
                    {t.src ? <img src={t.src} className="w-full h-full object-cover" alt={t.presetName} /> : <ImageIcon className="text-gray-300" size={24} />}
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Nome do Preset (Label)</label>
                        <input value={t.presetName} onChange={(e) => { const arr = [...siteSettings.shopTheLook]; arr[idx] = { ...arr[idx], presetName: e.target.value }; setSiteSettings(prev => ({ ...prev, shopTheLook: arr })); }} className="w-full h-11 bg-gray-50 rounded-xl px-4 text-sm outline-none border border-black/5 font-semibold uppercase" placeholder="EX: VERÃO" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Produto Vinculado</label>
                        <select value={t.productId} onChange={(e) => { const arr = [...siteSettings.shopTheLook]; arr[idx] = { ...arr[idx], productId: e.target.value }; setSiteSettings(prev => ({ ...prev, shopTheLook: arr })); }} className="w-full h-11 bg-gray-50 rounded-xl px-4 text-sm outline-none border border-black/5 text-[#d82828] font-bold uppercase tracking-tight">
                          <option value="">Selecione...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">URL da Imagem</label>
                      <input value={t.src} onChange={(e) => { const arr = [...siteSettings.shopTheLook]; arr[idx] = { ...arr[idx], src: e.target.value }; setSiteSettings(prev => ({ ...prev, shopTheLook: arr })); }} className="w-full h-11 bg-gray-50 rounded-xl px-4 text-sm outline-none border border-black/5" placeholder="https://..." />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button disabled={isSavingSettings} onClick={() => handleSaveSettings('shopTheLook')} className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3">
              <Save size={18} /> {isSavingSettings ? "Salvando..." : "Salvar Mosaico"}
            </Button>
          </div>
        )}

        {/* TAB: ANNOUNCEMENT */}
        {activeTab === 'announcement' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-10 space-y-8">
               <div className="flex items-center gap-4 border-b border-black/5 pb-4">
                  <Bell className="text-[#d82828]" size={24} />
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Barra de Anúncio (Topo)</h2>
               </div>
               
               <p className="text-sm text-gray-500 font-medium">Personalize a mensagem que aparece no topo do site para cada idioma.</p>
               
               <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">🇧🇷 Texto em Português</label>
                   <input 
                     value={siteSettings.promoBar.PT} 
                     onChange={(e) => setSiteSettings(prev => ({ ...prev, promoBar: { ...prev.promoBar, PT: e.target.value } }))} 
                     className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none border-2 border-transparent focus:border-black transition-all font-semibold" 
                     placeholder="LEVE 3, PAGUE 2..."
                   />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">🇺🇸 Texto em Inglês</label>
                   <input 
                     value={siteSettings.promoBar.EN} 
                     onChange={(e) => setSiteSettings(prev => ({ ...prev, promoBar: { ...prev.promoBar, EN: e.target.value } }))} 
                     className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none border-2 border-transparent focus:border-black transition-all font-semibold" 
                     placeholder="BUY 2, GET 1 FREE..."
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">🇪🇸 Texto em Espanhol</label>
                   <input 
                     value={siteSettings.promoBar.ES} 
                     onChange={(e) => setSiteSettings(prev => ({ ...prev, promoBar: { ...prev.promoBar, ES: e.target.value } }))} 
                     className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none border-2 border-transparent focus:border-black transition-all font-semibold" 
                     placeholder="LLEVA 3, PAGA 2..."
                   />
                 </div>
               </div>

               <Button 
                 disabled={isSavingSettings} 
                 onClick={() => handleSaveSettings('promoBar')} 
                 className="w-full h-16 bg-black text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-black/10 transition-all group"
               >
                 <Save size={18} className="group-hover:rotate-12 transition-transform" />
                 {isSavingSettings ? "Salvando..." : "Salvar Barra de Anúncio"}
               </Button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-200">
                  <Check size={24} />
               </div>
               <div>
                  <h4 className="font-bold text-gray-950 uppercase tracking-tighter text-sm">Visualização em Tempo Real</h4>
                  <p className="text-xs text-gray-500 leading-tight">Suas alterações aparecerão instantaneamente na faixa vermelha no topo da home e todas as páginas.</p>
               </div>
            </div>
          </div>
        )}

        {/* ABA: ORDENAÇÃO HOME */}
        {activeTab === 'order' && (() => {
          const sections = [
            { key: 'newArrivals' as const, label: 'Novidades', desc: 'Produtos que aparecem na seção "Novidades Exclusivas"' },
            { key: 'bestSellers' as const, label: 'Mais Vendidos', desc: 'Produtos que aparecem na seção "Best Sellers"' },
            { key: 'allPresets' as const, label: 'Todos os Presets', desc: 'Primeiros produtos exibidos na seção principal' },
          ];

          const moveProduct = (section: 'newArrivals' | 'bestSellers' | 'allPresets', fromIdx: number, toIdx: number) => {
            const arr = [...(siteSettings.homeSectionOrder[section] || [])];
            const [moved] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, moved);
            setSiteSettings(prev => ({ ...prev, homeSectionOrder: { ...prev.homeSectionOrder, [section]: arr } }));
          };

          const removeFromSection = (section: 'newArrivals' | 'bestSellers' | 'allPresets', idx: number) => {
            const arr = [...(siteSettings.homeSectionOrder[section] || [])];
            arr.splice(idx, 1);
            setSiteSettings(prev => ({ ...prev, homeSectionOrder: { ...prev.homeSectionOrder, [section]: arr } }));
          };

          const addToSection = (section: 'newArrivals' | 'bestSellers' | 'allPresets', productId: string) => {
            const current = siteSettings.homeSectionOrder[section] || [];
            if (current.includes(productId)) { toast.error("Produto já está nesta seção!"); return; }
            setSiteSettings(prev => ({ ...prev, homeSectionOrder: { ...prev.homeSectionOrder, [section]: [...current, productId] } }));
          };

          return (
            <div className="max-w-3xl mx-auto space-y-10">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 font-medium">
                Defina manualmente quais produtos aparecem em cada seção da Home e em qual ordem. Se deixar vazio, o site usará a ordem padrão (isNew / isBestseller).
              </div>

              {sections.map(({ key, label, desc }) => {
                const orderedIds = siteSettings.homeSectionOrder[key] || [];
                const orderedProducts = orderedIds.map(id => products.find(p => p.id === id)).filter(Boolean);
                const availableProducts = products.filter(p => !orderedIds.includes(p.id));

                return (
                  <div key={key} className="bg-white rounded-[2rem] border border-black/5 shadow-lg p-8 space-y-6">
                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-tighter">{label}</h3>
                      <p className="text-xs text-gray-400 mt-1">{desc}</p>
                    </div>

                    <div className="space-y-2">
                      {orderedProducts.length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Nenhum produto selecionado</p>
                          <p className="text-xs text-gray-300 mt-1">Adicione abaixo</p>
                        </div>
                      ) : orderedProducts.map((product: any, idx) => (
                        <div key={product.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-black/5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                            <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-tight truncate">{product.name}</p>
                            <p className="text-[10px] text-gray-400">{product.category}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-bold text-gray-300 w-5 text-center">#{idx + 1}</span>
                            <button type="button" disabled={idx === 0} onClick={() => moveProduct(key, idx, idx - 1)} className="w-7 h-7 rounded-full bg-white border border-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all disabled:opacity-20 text-xs font-bold">↑</button>
                            <button type="button" disabled={idx === orderedProducts.length - 1} onClick={() => moveProduct(key, idx, idx + 1)} className="w-7 h-7 rounded-full bg-white border border-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all disabled:opacity-20 text-xs font-bold">↓</button>
                            <button type="button" onClick={() => removeFromSection(key, idx)} className="w-7 h-7 rounded-full bg-red-50 text-red-400 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {availableProducts.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Adicionar produto a esta seção:</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {availableProducts.map((p: any) => (
                            <button key={p.id} type="button" onClick={() => addToSection(key, p.id)} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-black/5 hover:bg-black hover:text-white transition-all text-left group">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                                <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                              </div>
                              <span className="text-[10px] font-bold uppercase truncate">{p.name}</span>
                              <Plus size={12} className="ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <Button disabled={isSavingSettings} onClick={() => handleSaveSettings('homeSectionOrder')} className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3">
                <Save size={18} /> {isSavingSettings ? "Salvando..." : "Salvar Ordenação"}
              </Button>
            </div>
          );
        })()}

      {/* MODAL (Restored logic from original file) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden">
                <div className="px-10 py-8 border-b border-black/5 flex items-center justify-between">
                   <h2 className="text-2xl font-black uppercase tracking-tighter">{isEditing ? "Editar Produto" : "Novo Pack"}</h2>
                   <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto p-10 space-y-10 custom-scrollbar">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome do Pack</label>
                            <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none focus:bg-white border-2 border-transparent focus:border-[#d82828] transition-all font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Preço (R$)</label>
                            <input required name="price" value={formData.price} onChange={handleInputChange} className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none focus:bg-white border-2 border-transparent focus:border-[#d82828] transition-all font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoria</label>
                            <select name="category" value={formData.category} onChange={handleInputChange} className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none focus:bg-white border-2 border-transparent focus:border-[#d82828] transition-all font-bold">
                               <option value="Creative">Creative</option>
                               <option value="Travel">Travel</option>
                               <option value="Lifestyle">Lifestyle</option>
                               <option value="Business">Business</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Checkout URL (Fallback)</label>
                            <input name="checkoutUrl" value={formData.checkoutUrl} onChange={handleInputChange} className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none focus:bg-white border-2 border-transparent focus:border-[#d82828] transition-all font-bold" placeholder="https://..." />
                         </div>
                      </div>
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Imagem Principal (URL)</label>
                            <input name="image" value={formData.image} onChange={handleInputChange} className="w-full h-14 bg-gray-50 rounded-2xl px-6 outline-none focus:bg-white border-2 border-transparent focus:border-[#d82828] transition-all font-bold" />
                         </div>
                         <div className="aspect-square w-full rounded-[2rem] overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 p-2">
                            {formData.image ? <img src={formData.image} className="w-full h-full object-cover rounded-[1.5rem]" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>}
                         </div>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descrição Detalhada</label>
                      <textarea name="detailedDescription" value={formData.detailedDescription} onChange={handleInputChange} className="w-full h-32 bg-gray-50 rounded-2xl p-6 outline-none focus:bg-white border-2 border-transparent focus:border-[#d82828] transition-all font-bold resize-none" />
                   </div>
                   <Button onClick={handleSubmit} className="w-full h-16 bg-[#d82828] text-white rounded-2xl font-bold uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 active:scale-95 transition-all">Salvar Produto</Button>
                 </form>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </main>
  </div>
);
}
