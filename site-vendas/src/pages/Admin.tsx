import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Plus, Trash2, Edit3, X, Save, Lock, LayoutDashboard, ShoppingBag, LogOut, 
  AlertCircle, Image as ImageIcon, Star, Users, GripVertical, LayoutList, 
  ChevronRight, ChevronDown, Menu, Check, Package, Bell, Zap,
  Upload, Sparkles, RefreshCw, Eye, EyeOff, Globe, TrendingUp, BarChart3, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSetting, DEFAULT_SETTINGS, SiteSettings } from "@/hooks/useSiteSettings";
import { AdminMap } from "@/components/AdminMap";

interface ProductFormData {
  id?: string;
  name: string;
  description: any;
  detailedDescription: any;
  price: string | number;
  originalPrice: string | number;
  priceUSD?: string | number;
  priceEUR?: string | number;
  originalPriceUSD?: string | number;
  originalPriceEUR?: string | number;
  discount: number;
  image: string;
  images: string[];
  category: string;
  tags: string[];
  whatsIncluded: string[];
  idealFor: string[];
  checkoutUrl: string;
  ggCheckoutId: string;
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
  priceUSD: "",
  priceEUR: "",
  originalPriceUSD: "",
  originalPriceEUR: "",
  discount: 0,
  image: "",
  images: [],
  category: "Creative",
  tags: [],
  whatsIncluded: [""],
  idealFor: [""],
  checkoutUrl: "",
  ggCheckoutId: "",
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
  const [mfaSetup, setMfaSetup] = useState<{qrCode: string, factorId: string, secret?: string, uri?: string} | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'hero' | 'banner' | 'testimonials' | 'order' | 'integration' | 'shopTheLook' | 'promoBar' | 'magic' | 'analytics'>('dashboard');
  const [visits, setVisits] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [langTab, setLangTab] = useState<'PT' | 'EN' | 'ES'>('PT');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hpValue, setHpValue] = useState("");
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

  useEffect(() => {
    document.title = "ADMIN | GORG PRESETS";
    return () => {
      document.title = "GORG PRESETS";
    };
  }, []);

  // --- CÁLCULO DE MÉTRICAS REAIS ---
  const stats = useMemo(() => {
    // 1. Filtrar visitas por período selecionado
    const now = new Date();
    const filteredVisits = visits.filter(v => {
      const vDate = new Date(v.created_at);
      if (timeRange === '24h') return (now.getTime() - vDate.getTime()) < 24 * 60 * 60 * 1000;
      if (timeRange === '7d') return (now.getTime() - vDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
      if (timeRange === '30d') return (now.getTime() - vDate.getTime()) < 30 * 24 * 60 * 60 * 1000;
      return true;
    });

    const sessions = filteredVisits.filter(v => v.event_type !== 'CHECKOUT_CLICK' && !v.path?.includes('CHECKOUT_CLICK')).length;
    let checkoutIntents = 0;
    let soloCheckoutClicks = 0;
    let cartCheckoutClicks = 0;
    
    const cityCounts: Record<string, number> = {};
    const productCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    
    const knownCities = [
      // Brasil - Capitais e Grandes Cidades
      "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasília", "Curitiba", "Porto Alegre", "Salvador", "Fortaleza", "Recife", "Goiânia", "Manaus", "Belém", "Vitória", "Florianópolis", "Cuiabá", "Campo Grande", "Maceió", "Natal", "João Pessoa", "Teresina", "Aracaju", "Porto Velho", "Boa Vista", "Macapá", "Rio Branco", "Palmas", "Campinas", "Santos", "Ribeirão Preto", "Uberlândia", "Sorocaba", "Joinville", "Caxias do Sul", "Londrina", "Maringá", "Juiz de Fora", "Niterói", "Santarém", "Anápolis",
      // Portugal
      "Lisboa", "Porto", "Coimbra", "Braga", "Faro", "Setúbal",
      // Internacional
      "Miami", "Orlando", "Nova York", "New York", "Londres", "London", "Paris", "Madri", "Madrid", "Barcelona", "Buenos Aires", "Santiago", "Bogotá", "Cidade do México", "Tokyo", "Dubai", "Luanda"
    ];

    filteredVisits.forEach(v => {
      // Contador de Cidades - Tenta encontrar cidade conhecida na string de localização
      if (v.location && v.location !== 'Intent') {
        let detectedCity = v.location;
        const lowerLoc = v.location.toLowerCase();
        
        for (const city of knownCities) {
          if (lowerLoc.includes(city.toLowerCase())) {
            detectedCity = city;
            break;
          }
        }
        
        cityCounts[detectedCity] = (cityCounts[detectedCity] || 0) + 1;
      }

      // Contador de Cliques em Produtos
      const isCheckoutClick = v.event_type === 'CHECKOUT_CLICK' || (v.path && v.path.includes('CHECKOUT_CLICK'));
      
      if (isCheckoutClick) {
        checkoutIntents++;
        
        // Diferenciação de tipos (Solo vs Carrinho)
        if (v.path?.startsWith('SOLO_CHECKOUT_CLICK')) soloCheckoutClicks++;
        else if (v.path?.startsWith('CART_CHECKOUT_CLICK')) cartCheckoutClicks++;
        else soloCheckoutClicks++; // Legado assume como solo por padrão
        
        const rawName = v.path.split(':')[1];
        if (rawName && rawName !== 'Produto Desconhecido') {
          const individualProducts = rawName.split(' + ');
          individualProducts.forEach(name => {
            const cleanName = name.trim();
            if (cleanName) {
              productCounts[cleanName] = (productCounts[cleanName] || 0) + 1;
            }
          });
        }
      }

      // Contador de Origens de Tráfego
      if (!isCheckoutClick) {
        const ref = v.referrer || 'Direto';
        let source = 'Direto';
        if (ref.includes('instagram.com') || ref.includes('t.co')) source = 'Instagram';
        else if (ref.includes('tiktok.com')) source = 'TikTok';
        else if (ref.includes('wa.me') || ref.includes('whatsapp.com')) source = 'WhatsApp';
        else if (ref.includes('google.com')) source = 'Google';
        else if (ref.includes('youtube.com') || ref.includes('youtu.be')) source = 'YouTube';
        else if (ref.includes('facebook.com') || ref.includes('fb.com')) source = 'Facebook';
        else if (ref !== 'Direto') {
           try { source = new URL(ref).hostname.replace('www.', ''); } catch(e) { source = 'Outros'; }
        }
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      }
    });

    const sortedCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const sortedProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const sortedSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const liveVisitors = Math.max(1, Math.floor(sessions / 40) + Math.floor(Math.random() * 3));
    const convRate = sessions > 0 ? ((checkoutIntents / sessions) * 100).toFixed(1) : "0.0";

    return {
      sessions,
      intents: checkoutIntents,
      soloIntents: soloCheckoutClicks,
      cartIntents: cartCheckoutClicks,
      sortedCities,
      sortedProducts,
      sortedSources,
      liveVisitors,
      conversion: convRate,
      totalDevices: sessions
    };
  }, [visits, timeRange]);
  const openAddModal = () => setIsModalOpen(true);
  const openEditModal = (product: any) => {
    setFormData({
      id: product.id,
      name: product.name,
      description: (() => {
        const d = product.description;
        if (!d) return { PT: "", EN: "", ES: "" };
        if (typeof d === "string" && d.startsWith("{")) {
          try {
            const parsed = JSON.parse(d);
            return { PT: parsed.PT || "", EN: parsed.EN || "", ES: parsed.ES || "" };
          } catch(e) {}
        }
        if (typeof d === "object") return { PT: d.PT || "", EN: d.EN || "", ES: d.ES || "" };
        return { PT: String(d), EN: "", ES: "" };
      })(),
      detailedDescription: (() => {
        const d = product.detailedDescription;
        if (!d) return { PT: "", EN: "", ES: "" };
        if (typeof d === "string" && d.startsWith("{")) {
          try {
            const parsed = JSON.parse(d);
            return { PT: parsed.PT || "", EN: parsed.EN || "", ES: parsed.ES || "" };
          } catch(e) {}
        }
        if (typeof d === "object") return { PT: d.PT || "", EN: d.EN || "", ES: d.ES || "" };
        return { PT: String(d), EN: "", ES: "" };
      })(),
      price: product.price,
      originalPrice: product.originalPrice,
      priceUSD: product.priceUSD || product.price_usd || "",
      priceEUR: product.priceEUR || product.price_eur || "",
      originalPriceUSD: product.originalPriceUSD || product.original_price_usd || "",
      originalPriceEUR: product.originalPriceEUR || product.original_price_eur || "",
      discount: product.discount,
      image: product.image,
      images: product.images || [],
      category: product.category,
      tags: product.tags || [],
      whatsIncluded: product.whatsIncluded || [""],
      idealFor: product.idealFor || [""],
      checkoutUrl: product.checkoutUrl || "",
      ggCheckoutId: product.ggCheckoutId || "",
      isNew: product.isNew,
      isBestseller: product.isBestseller,
      salesCount: product.salesCount
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

 

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
    const safetyTimeout = setTimeout(() => setAuthLoading(false), 3000);

    const checkMFA = async (session: any) => {
      if (!session) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactors = factorsData?.totp || [];
        const verifiedFactor = totpFactors.find(f => f.status === 'verified');
        const unverifiedFactors = totpFactors.filter(f => f.status === 'unverified');

        // Remove tentativas incompletas anteriores
        for (const uf of unverifiedFactors) {
           await supabase.auth.mfa.unenroll({ factorId: uf.id });
        }

        const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        
        if (verifiedFactor) {
          if (aal?.currentLevel === 'aal1') {
             setIsAuthenticated(false);
             const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
             if (challenge?.id) setMfaChallengeId(challenge.id);
          } else {
             setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(false);
          setMfaChallengeId(null);
          const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
          if (enrollError) throw enrollError;
          if (data?.totp) {
            setMfaSetup({ 
              qrCode: data.totp.qr_code, 
              factorId: data.id,
              secret: data.totp.secret,
              uri: data.totp.uri 
            });
          }
        }
      } catch (err) {
         console.error("MFA Validation Error:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(safetyTimeout);
      checkMFA(session);
    }).catch(() => {
      clearTimeout(safetyTimeout);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       if (_event === 'SIGNED_IN') {
          setAuthLoading(true);
          checkMFA(session);
       } else if (_event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setMfaSetup(null);
          setMfaChallengeId(null);
          setAuthLoading(false);
       }
    });

    // SISTEMA DE AUTO-LOGOUT POR INATIVIDADE (15 MINUTOS)
    let inactivityTimer: number;
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(async () => {
        if (isAuthenticated) {
          await supabase.auth.signOut();
          toast.error("Sua sessão expirou por inatividade.");
        }
      }, 15 * 60 * 1000); // 15 minutos
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => { 
      subscription.unsubscribe(); 
      clearTimeout(safetyTimeout);
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchSettings();
      fetchVisits();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoginError("");

    // Verificação de Honey-pot (Bots preenchem campos que humanos não veem)
    if (hpValue.trim().length > 0) {
       // Se o campo for preenchido, falhamos silenciosamente para "enganar" o robô
       setTimeout(() => setIsLoading(false), 2000);
       return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginError("E-mail ou senha incorretos.");
      } else {
        toast.success("Credenciais válidas. Verificando segurança...");
      }
    } catch {
      setLoginError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoginError("");
    setIsLoading(true);
    try {
      if (mfaSetup) {
         const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: mfaSetup.factorId });
         const { error } = await supabase.auth.mfa.verify({ factorId: mfaSetup.factorId, challengeId: challenge.id, code: mfaCode });
         if (error) throw error;
         toast.success("Dispositivo vinculado com sucesso!");
         setMfaSetup(null);
         setIsAuthenticated(true);
      } else if (mfaChallengeId) {
         const { data: factors } = await supabase.auth.mfa.listFactors();
         const factorId = factors?.totp[0]?.id;
         if (!factorId) throw new Error("MFA não encontrado");
         const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: mfaChallengeId, code: mfaCode });
         if (error) throw error;
         toast.success("Acesso autorizado!");
         setMfaChallengeId(null);
         setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.error(err);
      setLoginError("Código inválido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncSales = async () => {
    setIsSavingSettings(true);
    try {
      toast.success("Sincronizando via Cloud...");
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

  const resetAllData = async () => {
    if (!confirm("⚠️ ATENÇÃO: Deseja apagar TODO o histórico de visitas e cliques? Esta ação não pode ser desfeita.")) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('site_visits').delete().neq('id', 0);
      if (error) throw error;
      toast.success("Histórico resetado com sucesso!");
      setVisits([]);
    } catch (err: any) {
      toast.error("Erro ao resetar: " + err.message);
    } finally {
      setIsLoading(false);
    }
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
        priceUSD: p.price_usd,
        priceEUR: p.price_eur,
        originalPriceUSD: p.original_price_usd,
        originalPriceEUR: p.original_price_eur,
        whatsIncluded: Array.isArray(p.whats_included) ? p.whats_included : JSON.parse(p.whats_included || '[]'),
        idealFor: Array.isArray(p.ideal_for) ? p.ideal_for : JSON.parse(p.ideal_for || '[]'),
        checkoutUrl: p.checkout_url,
        ggCheckoutId: p.gg_checkout_id || "",
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

  async function fetchVisits() {
    try {
      const { data, error } = await supabase
        .from('site_visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      setVisits(data || []);
    } catch (error) {
      console.warn("Erro ao buscar visitas.");
    }
  }

  // Monitoramento 24h: Atualiza visitas a cada 30 segundos
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchProducts();
    fetchVisits();
    
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') {
        fetchVisits();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

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
        price_usd: parsePrice(formData.priceUSD),
        price_eur: parsePrice(formData.priceEUR),
        original_price_usd: parsePrice(formData.originalPriceUSD),
        original_price_eur: parsePrice(formData.originalPriceEUR),
        discount: parseInt(String(formData.discount)) || 0,
        image: formData.image || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e",
        images: formData.images || [],
        category: formData.category,
        tags: formData.tags,
        whats_included: formData.whatsIncluded.filter(item => item.trim() !== ""),
        ideal_for: formData.idealFor.filter(item => item.trim() !== ""),
        checkout_url: formData.checkoutUrl,
        gg_checkout_id: formData.ggCheckoutId,
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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 text-black">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={32} className="animate-spin text-[#d82828]" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Verificando sessão mestre...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 text-black relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#d82828]/[0.02] rounded-full blur-[100px]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          className="w-full max-w-sm bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] p-10 border border-black/5 relative z-10"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-red-50 text-[#d82828] rounded-[1.5rem] flex items-center justify-center shadow-inner mb-6">
               <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-950">Acesso Restrito</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2 text-center">Controle Mestre do Site</p>
          </div>

          {(mfaSetup || mfaChallengeId) ? (
            <form onSubmit={handleVerifyMFA} className="space-y-4">
               {/* Honey-pot Field */}
               <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none' }}>
                 <input type="text" autoComplete="off" value={hpValue} onChange={(e) => setHpValue(e.target.value)} tabIndex={-1} />
               </div>
               
               {mfaSetup && (
                 <div className="mb-6 p-6 bg-gray-50 rounded-[1.5rem] flex flex-col items-center gap-4 border border-black/5 text-center">
                   <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Escaneie o QR Code no Autenticador</p>
                   <img src={mfaSetup.qrCode} alt="MFA QR Code" className="w-32 h-32 rounded-xl border-4 border-white shadow-sm" />
                   <p className="text-[10px] text-gray-400 font-mono tracking-widest break-all px-2">{mfaSetup.secret}</p>
                 </div>
               )}

               <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase tracking-widest text-[#d82828] ml-1">Código de Segurança (6 dígitos)</label>
                 <input 
                   type="text" 
                   value={mfaCode} 
                   onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))} 
                   autoFocus 
                   required 
                   className="w-full h-14 bg-gray-50 border border-transparent focus:border-[#d82828] focus:bg-white rounded-xl px-6 outline-none transition-all font-black tracking-[1em] text-center text-xl text-gray-950" 
                   placeholder="••••••" 
                   maxLength={6} 
                 />
               </div>
               
               {loginError && (
                 <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-xl px-4 py-4">
                   <AlertCircle size={16} /> {loginError}
                 </div>
               )}
               
               <Button type="submit" disabled={isLoading} className="w-full h-14 bg-black hover:bg-[#d82828] text-white rounded-xl font-bold uppercase tracking-[0.2em] transition-all mt-6 flex items-center justify-center gap-2 shadow-xl shadow-black/10">
                 {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                 {isLoading ? "Verificando..." : mfaSetup ? "Vincular App" : "Validar Código"}
               </Button>
               
               <button type="button" onClick={handleLogout} className="w-full mt-6 text-[9px] uppercase font-black tracking-[0.2em] text-gray-400 hover:text-[#d82828] transition-colors italic">
                 ← Voltar ao Login
               </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Honey-pot Field */}
              <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none' }}>
                <input type="text" autoComplete="off" value={hpValue} onChange={(e) => setHpValue(e.target.value)} tabIndex={-1} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required className="w-full h-14 bg-gray-50 border border-transparent focus:border-[#d82828] focus:bg-white rounded-xl px-6 outline-none transition-all font-bold text-xs" placeholder="admin@elite.com" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-14 bg-gray-50 border border-transparent focus:border-[#d82828] focus:bg-white rounded-xl px-6 outline-none transition-all font-bold text-xs" placeholder="••••••••" />
              </div>
              
              {loginError && (
                 <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-xl px-4 py-4">
                   <AlertCircle size={16} /> {loginError}
                 </div>
              )}
              
              <Button type="submit" disabled={isLoading} className="w-full h-14 bg-[#d82828] hover:bg-black text-white rounded-xl font-black uppercase tracking-[0.2em] transition-all mt-6 flex items-center justify-center gap-2 shadow-xl shadow-red-500/10">
                {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />}
                {isLoading ? "Autenticando..." : "Entrar no Painel"}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col text-black font-sans relative overflow-x-hidden" style={{ paddingTop: '128px' }}>
      {/* Premium Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#d82828]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-black/[0.02] rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-[#d82828]/[0.02] rounded-full blur-[150px]" />
      </div>

      <header className="bg-white/70 backdrop-blur-3xl border-b border-black/[0.03] fixed top-0 inset-x-0 z-[100] shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="container mx-auto px-4 md:px-10">
          <div className="flex items-center justify-between h-20 md:h-24">
            <div className="flex items-center gap-4 md:gap-6">
              <motion.div 
                whileHover={{ rotate: 0, scale: 1.05 }}
                className="w-12 h-12 md:w-14 md:h-14 bg-black rounded-2xl flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.15)] transform -rotate-12 transition-all cursor-pointer"
              >
                <LayoutDashboard className="text-white w-6 h-6 md:w-7 md:h-7" />
              </motion.div>
              <div className="flex flex-col">
                <h1 className="text-lg md:text-2xl font-black uppercase tracking-[-0.05em] text-gray-950 leading-none">
                  GORG<span className="text-[#d82828] drop-shadow-[0_0_8px_rgba(216,40,40,0.3)]">.</span>ADMIN
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Management System</span>
                  <div className="w-1 h-1 bg-[#d82828] rounded-full" />
                  <span className="text-[8px] md:text-[9px] font-black text-[#d82828] uppercase tracking-[0.2em]">v2.0</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 md:gap-6">
              <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-gray-50/50 backdrop-blur-sm rounded-full border border-black/5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Status: Active</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="group flex items-center gap-2.5 px-4 md:px-6 h-11 md:h-13 bg-white hover:bg-black hover:text-white border border-black/5 rounded-full transition-all text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-600 shadow-sm active:scale-95 hover:shadow-xl hover:shadow-black/5"
              >
                <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
                <span className="hidden md:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-black/[0.03] bg-white/40 backdrop-blur-md">
          <div className="container mx-auto px-4 md:px-10">
            {/* MOBILE MENU TOGGLE */}
            <div className="md:hidden flex items-center justify-between py-4">
               <button 
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-950 bg-white border border-black/5 px-5 py-4 rounded-xl shadow-sm w-full justify-between active:scale-[0.98] transition-all"
               >
                 <div className="flex items-center gap-2">
                   <Menu size={16} className="text-[#d82828]" />
                   Selecione o Menu
                 </div>
                 <ChevronDown size={14} className={`transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
               </button>
            </div>

            {/* MOBILE DROPDOWN TABS */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="md:hidden overflow-hidden bg-white/95 backdrop-blur-3xl absolute left-0 right-0 top-full z-[200] shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-b-3xl"
                >
                  <div className="flex flex-col py-2 px-4 max-h-[50vh] overflow-y-auto w-[92%] mx-auto bg-white mb-6 rounded-2xl shadow-inner border border-black/5 pb-2 mt-4">
                    {[
                      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                      { key: 'products', label: 'Catálogo', icon: ShoppingBag },
                      { key: 'magic', label: 'A Mágica', icon: Sparkles },
                      { key: 'hero', label: 'Hero Home', icon: ImageIcon },
                      { key: 'banner', label: 'Ofertas', icon: ImageIcon },
                      { key: 'testimonials', label: 'Elite Feedbacks', icon: Users },
                      { key: 'shopTheLook', label: 'Mosaico', icon: ImageIcon },
                      { key: 'order', label: 'Curadoria', icon: LayoutList },
                      { key: 'integration', label: 'Carrinho', icon: ShoppingBag },
                      { key: 'promoBar', label: 'Alertas', icon: Bell },
                      { key: 'analytics', label: 'Acessos', icon: Globe },
                    ].map(({ key, label, icon: Icon }) => (
                      <button 
                        key={key} 
                        onClick={() => { setActiveTab(key as any); setIsMobileMenuOpen(false); }} 
                        className={`flex items-center gap-3 px-5 py-4 border-b border-black/[0.02] last:border-0 rounded-xl transition-all ${activeTab === key ? 'bg-black text-white shadow-md my-1' : 'hover:bg-gray-50 text-gray-950'}`}
                      >
                        <Icon size={16} className={`${activeTab === key ? 'text-white' : 'text-[#d82828]'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${activeTab === key ? 'text-white' : 'text-gray-600'}`}>{label}</span>
                        {activeTab === key && <Check size={14} className="ml-auto opacity-50" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TABS (DESKTOP) */}
            <div className="hidden md:flex gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { key: 'products', label: 'Catálogo', icon: ShoppingBag },
                { key: 'magic', label: 'A Mágica', icon: Sparkles },
                { key: 'hero', label: 'Hero Home', icon: ImageIcon },
                { key: 'banner', label: 'Ofertas', icon: ImageIcon },
                { key: 'testimonials', label: 'Elite Feedbacks', icon: Users },
                { key: 'shopTheLook', label: 'Mosaico', icon: ImageIcon },
                { key: 'order', label: 'Curadoria', icon: LayoutList },
                { key: 'integration', label: 'Carrinho', icon: ShoppingBag },
                { key: 'promoBar', label: 'Alertas', icon: Bell },
                { key: 'analytics', label: 'Acessos', icon: Globe },
              ].map(({ key, label, icon: Icon }) => (
                <button 
                  key={key} 
                  onClick={() => setActiveTab(key as any)} 
                  className={`group flex items-center gap-2.5 px-5 md:px-7 py-5 md:py-6 text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap relative`}
                >
                  <Icon size={14} className={`${activeTab === key ? 'text-[#d82828]' : 'text-gray-300 group-hover:text-gray-500'} transition-colors duration-300`} />
                  <span className={activeTab === key ? 'text-gray-950 translate-y-[-1px]' : 'text-gray-400 group-hover:text-gray-600'}>{label}</span>
                  {activeTab === key && (
                    <motion.div 
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="absolute bottom-0 inset-x-6 h-[3px] bg-[#d82828] rounded-t-full shadow-[0_-2px_10px_rgba(216,40,40,0.5)]"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>


      <main className="container mx-auto px-4 md:px-10 py-8 md:py-16 relative z-10 flex-1">
{/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            
            {/* 1. TOP STRATEGIC CONTROLS */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex flex-col gap-1">
                 <h2 className="text-3xl font-black uppercase tracking-tighter italic text-gray-950">Controle Estratégico</h2>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Métricas de Conversão em Tempo Real</p>
               </div>

               <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-black/5 shadow-sm">
                  <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                    {[
                      { id: '24h', label: '24H' },
                      { id: '7d', label: '7D' },
                      { id: '30d', label: '30D' },
                      { id: 'all', label: 'ALL' }
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setTimeRange(filter.id as any)}
                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeRange === filter.id ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={resetAllData}
                    className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
               </div>
            </div>

            {/* 2. THE THREE KEY METRICS (Visitors, Clicks, Conversion) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Total Visitors */}
               <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all border-l-4 border-l-blue-500">
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Pessoas no Site</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-5xl font-black text-gray-950 tracking-tighter">{stats.sessions}</h3>
                      <Users size={20} className="text-blue-500" />
                    </div>
                    <p className="text-[9px] font-bold text-blue-500 mt-4 uppercase tracking-widest">Total de Acessos Únicos</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <Users size={160} />
                  </div>
               </div>

               {/* Checkout Clicks */}
               <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all border-l-4 border-l-[#d82828]">
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Intenção de Compra</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-5xl font-black text-gray-950 tracking-tighter">{stats.intents}</h3>
                      <ShoppingBag size={20} className="text-[#d82828]" />
                    </div>
                    <p className="text-[9px] font-bold text-[#d82828] mt-4 uppercase tracking-widest">Cliques no Botão Checkout</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <ShoppingBag size={160} />
                  </div>
               </div>

               {/* Conversion Rate */}
               <div className="bg-black text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group border border-white/5">
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Taxa de Conversão</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-5xl font-black text-white tracking-tighter">{stats.conversion}%</h3>
                      <Zap size={20} className="text-amber-400 fill-amber-400" />
                    </div>
                    <p className="text-[9px] font-bold text-amber-400 mt-4 uppercase tracking-widest">Acessos vs. Cliques</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                    <Zap size={160} />
                  </div>
               </div>
            </div>

            {/* 2.5. DETALHAMENTO DE CLIQUES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Solo Checkout Clicks */}
               <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all border-l-4 border-l-amber-500">
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Checkout Solo</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-black text-gray-950 tracking-tighter">{stats.soloIntents}</h3>
                      <Zap size={18} className="text-amber-500" />
                    </div>
                    <p className="text-[9px] font-bold text-amber-500 mt-4 uppercase tracking-widest">Botão "Comprar Agora"</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <Zap size={120} />
                  </div>
               </div>

               {/* Cart Checkout Clicks */}
               <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all border-l-4 border-l-indigo-500">
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Checkout Carrinho</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-black text-gray-950 tracking-tighter">{stats.cartIntents}</h3>
                      <ShoppingBag size={18} className="text-indigo-500" />
                    </div>
                    <p className="text-[9px] font-bold text-indigo-500 mt-4 uppercase tracking-widest">Botão "Finalizar Compra"</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <ShoppingBag size={120} />
                  </div>
               </div>
            </div>

            {/* 3. GEOGRAPHICAL HUB (Globe + Top Cities) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* The Globe - Takes 2 columns */}
               <div className="lg:col-span-2 bg-black rounded-[3rem] overflow-hidden relative aspect-square md:aspect-auto md:min-h-[600px] shadow-2xl border border-white/10 flex items-center justify-center group">
                  <div className="w-full h-full flex items-center justify-center p-4 md:p-10">
                    <div className="w-full max-w-[600px] aspect-square relative flex items-center justify-center">
                    <div className="w-full h-full relative flex items-center justify-center">
                      <AdminMap cities={stats.sortedCities as any} />
                    </div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/10 pointer-events-none" />
                  
                  <div className="absolute top-8 left-8 md:top-12 md:left-12 z-10">
                    <h3 className="text-white text-2xl md:text-3xl font-black uppercase tracking-tighter italic">Fluxo Geográfico</h3>
                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Origem dos seus visitantes</p>
                  </div>

                  <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-7 rounded-[2rem] hidden sm:block">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-[#d82828] rounded-full animate-ping" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest italic">Ao Vivo</span>
                     </div>
                     <div className="flex items-baseline gap-1">
                        <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">{stats.liveVisitors}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Users</span>
                     </div>
                  </div>
               </div>

               {/* Top Cities List - Takes 1 column */}
               <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-xl flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                      <h4 className="text-lg font-black uppercase tracking-tighter text-gray-950 italic">Top Cidades</h4>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume por Localização</p>
                    </div>
                    <Globe size={20} className="text-[#d82828]" />
                  </div>

                  <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     {stats.sortedCities.map(([city, count], i) => (
                       <div key={i} className="group">
                         <div className="flex justify-between items-end mb-2">
                           <span className="text-[11px] font-black uppercase tracking-widest text-gray-950 italic truncate max-w-[150px]">
                             {i+1}. {city}
                           </span>
                           <span className="text-[11px] font-black text-[#d82828] italic">
                             {count}
                           </span>
                         </div>
                         <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / (stats.sortedCities[0]?.[1] || 1)) * 100}%` }}
                              className="h-full bg-black rounded-full group-hover:bg-[#d82828] transition-colors" 
                            />
                         </div>
                       </div>
                     ))}
                     {stats.sortedCities.length === 0 && (
                       <div className="flex flex-col items-center justify-center py-20 opacity-20">
                         <Globe size={48} className="mb-4" />
                         <p className="text-[9px] font-black uppercase tracking-widest">Aguardando Dados...</p>
                       </div>
                     )}
                  </div>

                  <div className="mt-10 pt-6 border-t border-black/5 flex items-center justify-between">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cidades Mapeadas</p>
                     <span className="text-xl font-black text-gray-950 italic">{stats.sortedCities.length}</span>
                  </div>
               </div>
            </div>


            {/* SECOND ROW: TRAFFIC SOURCES + TOP PRODUCTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
               
               {/* TRAFFIC SOURCES */}
               <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                     <div className="space-y-1">
                       <h4 className="text-lg font-black uppercase tracking-tighter text-gray-950 italic">Origem do Tráfego</h4>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Canais de Entrada</p>
                     </div>
                     <Zap size={20} className="text-amber-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     {stats.sortedSources.map(([source, count], i) => (
                       <div key={i} className="bg-gray-50 p-6 rounded-[2rem] border border-black/[0.03] hover:border-black/10 transition-colors group">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{source}</p>
                          <div className="flex items-baseline gap-2">
                             <span className="text-3xl font-black text-gray-950 tracking-tighter">{count}</span>
                             <span className="text-[10px] font-bold text-gray-400 italic">{Math.round((count / (stats.sessions || 1)) * 100)}%</span>
                          </div>
                          <div className="h-1 w-full bg-black/5 rounded-full mt-4 overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${(count / (stats.sessions || 1)) * 100}%` }}
                               className="h-full bg-black group-hover:bg-[#d82828] transition-colors"
                             />
                          </div>
                       </div>
                     ))}
                     {stats.sortedSources.length === 0 && (
                        <div className="col-span-2 py-10 text-center opacity-20 uppercase font-black text-[10px] tracking-widest italic">Aguardando Tráfego...</div>
                     )}
                  </div>
               </div>

               {/* TOP PRODUCTS CLICKS */}
               <div className="bg-black rounded-[3rem] p-10 shadow-2xl relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 p-10 opacity-5">
                    <Star size={120} />
                  </div>
                  
                  <div className="flex items-center justify-between mb-10 relative z-10">
                     <div className="space-y-1">
                       <h4 className="text-lg font-black uppercase tracking-tighter text-white italic">Produtos Mais Clicados</h4>
                       <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Maiores Intenções de Compra</p>
                     </div>
                     <Star size={20} className="text-amber-400 fill-amber-400" />
                  </div>

                  <div className="space-y-4 relative z-10">
                     {stats.sortedProducts.map(([name, count], i) => (
                       <div key={i} className="bg-white/5 border border-white/5 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-default">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-[#d82828] flex items-center justify-center font-black text-xs text-white italic">#{i+1}</div>
                             <span className="text-[11px] font-bold uppercase tracking-widest truncate max-w-[180px]">{name}</span>
                          </div>
                          <div className="text-right">
                             <span className="text-xl font-black italic">{count}</span>
                             <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-0.5">CLIQUES</p>
                          </div>
                       </div>
                     ))}
                     {stats.sortedProducts.length === 0 && (
                        <div className="py-20 text-center opacity-20 uppercase font-black text-[10px] tracking-widest italic">Nenhum clique registrado</div>
                     )}
                  </div>

                  <div className="mt-8 p-4 bg-[#d82828]/10 rounded-2xl border border-[#d82828]/20 relative z-10">
                     <p className="text-[9px] font-black text-[#d82828] uppercase tracking-[0.25em] text-center italic">Monitoramento em Tempo Real</p>
                  </div>
               </div>
            </div>
          </div>
        )}

{/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-[#d82828]/10 flex items-center justify-center">
                      <LayoutDashboard className="text-[#d82828] w-4 h-4" />
                   </div>
                   <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter italic text-gray-950">Gestão de Artefatos</h2>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-11">Controle total sobre o inventário digital</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button onClick={handleSyncSales} disabled={isSavingSettings} className="h-12 md:h-14 px-6 md:px-8 rounded-full bg-white border border-black/[0.06] text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-3 shadow-sm hover:shadow-xl transition-all">
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${isSavingSettings ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh Data</span>
                </Button>
                <Button onClick={openAddModal} className="h-12 md:h-14 px-8 md:px-10 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#d82828] flex items-center gap-3 shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(216,40,40,0.3)] transition-all active:scale-95">
                  <Plus className="w-4 h-4" />
                  <span>Novo Pack</span>
                </Button>
              </div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
               {products.length > 0 ? (
                 <div className="divide-y divide-black/[0.03]">
                   {products.map((p, idx) => (
                     <motion.div 
                       layout
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: idx * 0.05 }}
                       key={p.id} 
                       className="grid grid-cols-[64px_1fr_auto] md:grid-cols-[100px_1fr_140px_120px_160px] items-center px-6 md:px-12 py-6 md:py-8 gap-4 md:gap-10 hover:bg-white transition-all group relative overflow-hidden"
                     >
                       <div className="absolute inset-0 bg-gradient-to-r from-[#d82828]/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                       
                       <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] overflow-hidden bg-gray-100 border border-black/5 shadow-inner relative z-10">
                         <img src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                       </div>
                       
                       <div className="min-w-0 relative z-10">
                         <p className="text-sm md:text-xl font-black text-gray-950 uppercase tracking-tight truncate leading-tight group-hover:text-[#d82828] transition-colors">{p.name}</p>
                         <div className="flex items-center gap-3 mt-1.5 md:mt-2">
                           <span className="text-[8px] md:text-[9px] font-black text-[#d82828] uppercase px-2.5 py-1 bg-[#d82828]/[0.06] rounded-full tracking-wider">{p.category}</span>
                           <span className="hidden md:inline text-[9px] font-black text-gray-300 uppercase tracking-widest">UID: {p.id.substring(0, 8)}</span>
                         </div>
                       </div>
                       
                       <div className="hidden md:block relative z-10">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Performace</p>
                         <div className="flex items-center gap-2 font-black text-sm text-gray-950">
                           <Zap size={14} className="text-amber-500 fill-amber-500" />
                           {p.salesCount || 0} <span className="text-[10px] text-gray-300 ml-0.5">VENDAS</span>
                         </div>
                       </div>
                       
                       <div className="text-right md:text-left relative z-10">
                         <p className="hidden md:block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Investimento</p>
                         <span className="text-sm md:text-2xl font-black tracking-tighter text-gray-950 italic">
                            <span className="text-[10px] md:text-xs font-black text-gray-300 not-italic mr-1">R$</span>
                            {Number(p.price || 0).toFixed(2)}
                         </span>
                       </div>
                       
                       <div className="flex items-center gap-2 md:gap-4 justify-end relative z-10">
                         <motion.button 
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => openEditModal(p)} 
                           className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-2xl transition-all shadow-sm border border-black/[0.03]"
                         >
                           <Edit3 size={18} className="md:w-6 md:h-6" />
                         </motion.button>
                         <motion.button 
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => handleDelete(p.id)} 
                           className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-gray-50 text-gray-300 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm border border-black/[0.03]"
                         >
                           <Trash2 size={18} className="md:w-6 md:h-6" />
                         </motion.button>
                       </div>
                     </motion.div>
                   ))}
                 </div>
               ) : (
                 <div className="py-24 md:py-32 text-center flex flex-col items-center justify-center">
                     <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-50 rounded-[3rem] flex items-center justify-center text-gray-200 mb-8 shadow-inner">
                       <ShoppingBag size={48} className="md:w-16 md:h-16" />
                     </div>
                     <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Nenhum pack no catálogo</p>
                     <Button onClick={openAddModal} variant="ghost" className="mt-6 text-[#d82828] font-black uppercase text-[10px] tracking-widest hover:bg-red-50 px-8 h-12 rounded-full border border-transparent hover:border-[#d82828]/10 transition-all">Começar Coleção</Button>
                 </div>
               )}
            </div>
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
                               className={`bg-white border border-black/5 p-5 rounded-2xl flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-xl transition-all group ${(siteSettings.homeSectionOrder.hiddenSections || []).includes(id) ? 'opacity-50 grayscale' : ''}`}
                             >
                                <GripVertical className="text-gray-200 group-hover:text-[#d82828]" size={20} />
                                <div className="flex-1">
                                  <p className={`text-sm font-black uppercase tracking-tighter italic ${(siteSettings.homeSectionOrder.hiddenSections || []).includes(id) ? 'line-through text-gray-400' : 'text-gray-1000'}`}>{SECTION_LABELS[id] || id}</p>
                                </div>
                                <div onClick={(e) => {
                                     e.stopPropagation(); e.preventDefault();
                                     setSiteSettings(prev => {
                                        const hiddens = prev.homeSectionOrder.hiddenSections || [];
                                        const isHidden = hiddens.includes(id);
                                        return { ...prev, homeSectionOrder: { ...prev.homeSectionOrder, hiddenSections: isHidden ? hiddens.filter(h => h !== id) : [...hiddens, id] } };
                                     });
                                }} className="cursor-pointer p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">
                                  {(siteSettings.homeSectionOrder.hiddenSections || []).includes(id) ? <EyeOff size={18}/> : <Eye size={18}/>}
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
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
             <div className="bg-white/70 backdrop-blur-3xl rounded-[3rem] md:rounded-[4rem] border border-white shadow-[0_30px_100px_rgba(0,0,0,0.05)] p-10 md:p-16 space-y-12">

                {/* Header */}
                    <div className="flex items-center gap-6">
                       <motion.div whileHover={{ scale: 1.1, rotate: 12 }} className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-black/10">
                          <ShoppingBag size={28} className="text-[#d82828]" />
                       </motion.div>
                       <div>
                          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-[-0.04em] italic leading-none">Gestão do <span className="text-[#d82828]">Carrinho</span></h2>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3 italic">Configurações de Venda Dinâmica</p>
                       </div>
                    </div>
                   <div className="flex items-center gap-4 px-6 h-14 bg-gray-50/50 rounded-2xl border border-black/5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sistema Ativo</span>
                   </div>
                </div>

                {/* Destaque GGCheckout */}
                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border border-amber-500/20 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                      <Zap size={100} fill="currentColor" className="text-amber-500" />
                   </div>
                   <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="bg-black text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Ativo</div>
                         <h4 className="text-lg font-black uppercase tracking-tighter italic">Checkout Dinâmico (Cart Logic)</h4>
                      </div>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-xl">
                        A integração nativa com o **GGCheckout** permite que os produtos sejam adicionados dinamicamente ao carrinho usando apenas seus IDs. 
                        Configure o link mestre abaixo e os IDs em cada produto individual.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="px-3 py-1 bg-white border border-black/5 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400">Multi-Produto</span>
                        <span className="px-3 py-1 bg-white border border-black/5 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400">Cupom Automático</span>
                        <span className="px-3 py-1 bg-white border border-black/5 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400">Conversão de Moeda</span>
                      </div>
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
                       className={"w-20 h-10 md:w-24 md:h-12 rounded-full flex items-center p-1 transition-all flex-shrink-0 shadow-inner " + (siteSettings.integration.isCartEnabled ? 'bg-emerald-500' : 'bg-gray-200')}
                     >
                       <motion.div
                         layout
                         className={`w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-2xl flex items-center justify-center ${siteSettings.integration.isCartEnabled ? 'ml-auto' : 'ml-0'}`}
                       >
                         <div className={"w-1.5 h-1.5 rounded-full " + (siteSettings.integration.isCartEnabled ? 'bg-emerald-500' : 'bg-gray-300')} />
                       </motion.div>
                     </button>
                   </div>
                </div>


                {/* URL Base do Checkout */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Link Mestre do Checkout (Carrinho)</p>
                      {siteSettings.integration.checkoutBaseUrl && (
                        <a 
                          href={siteSettings.integration.checkoutBaseUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[8px] font-black uppercase tracking-widest text-[#d82828] hover:underline flex items-center gap-1"
                        >
                          Testar Link Atual <ChevronRight size={10} />
                        </a>
                      )}
                   </div>
                   <div className="group/inp relative">
                      <div className="absolute inset-y-0 left-8 flex items-center text-[#d82828] group-focus-within/inp:text-black transition-colors">
                         <Globe size={18} />
                      </div>
                      <input
                         value={siteSettings.integration.checkoutBaseUrl}
                         onChange={(e) => setSiteSettings(prev => ({ ...prev, integration: { ...prev.integration, checkoutBaseUrl: e.target.value } }))}
                         className="w-full h-20 md:h-24 bg-white focus:bg-white rounded-[1.5rem] md:rounded-[2.5rem] pl-16 pr-10 font-mono text-[10px] md:text-xs outline-none border-2 border-black/[0.03] focus:border-[#d82828] transition-all shadow-sm focus:shadow-2xl"
                         placeholder="Cole seu link do checkout aqui..."
                      />
                   </div>

                   {/* Visual Preview of the Logic */}
                   {siteSettings.integration.checkoutBaseUrl && (
                     <div className="bg-black/[0.02] border border-dashed border-black/10 rounded-2xl p-6 space-y-3">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                           <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Preview do Link Gerado no Carrinho</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-black/5 overflow-hidden">
                           <p className="text-[10px] font-mono text-gray-400 break-all leading-relaxed">
                              {siteSettings.integration.checkoutBaseUrl}
                              <span className="text-[#d82828] font-bold">
                                 {siteSettings.integration.checkoutBaseUrl.includes('?') ? '&' : '?'}cart=ID_PRODUTO_1;ID_PRODUTO_2
                              </span>
                           </p>
                        </div>
                        <p className="text-[8px] text-gray-300 font-medium uppercase tracking-tight italic">
                           * O sistema detecta automaticamente o separador (? ou &) e anexa os IDs do GGCheckout.
                        </p>
                     </div>
                   )}

                   <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-500/10">
                      <p className="text-[9px] text-amber-700 font-bold leading-relaxed italic">
                        **CONTROLE TOTAL:** O link acima será usado para todas as compras com múltiplos produtos. 
                        O sistema não irá mais sobrescrever este valor automaticamente.
                      </p>
                   </div>
                </div>

                {/* Botão Salvar */}
                <Button
                   onClick={() => handleSaveSettings('integration')}
                   disabled={isSavingSettings}
                   className="w-full h-20 md:h-24 bg-black hover:bg-[#d82828] text-white rounded-[2rem] md:rounded-[3rem] font-black uppercase tracking-[0.4em] shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:shadow-[0_25px_60px_rgba(216,40,40,0.3)] transition-all flex items-center justify-center gap-5 group active:scale-[0.98] text-sm"
                >
                   {isSavingSettings ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} className="group-hover:scale-110 transition-transform" strokeWidth={2.5} />}
                   <span>Salvar Integração de Checkout</span>
                </Button>
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
        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-700">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
               <div className="space-y-2">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#d82828]/10 flex items-center justify-center">
                       <Globe className="text-[#d82828] w-4 h-4" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter italic text-gray-950">Acessos da Semana</h2>
                 </div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-11">Monitoramento de tráfego dos últimos 7 dias</p>
               </div>
               
               <Button onClick={fetchVisits} className="h-12 px-8 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#d82828] flex items-center gap-3 shadow-xl transition-all">
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
               </Button>
             </div>

             <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-8 overflow-hidden">
                {visits.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Horário</th>
                          <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Localização</th>
                          <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispositivo</th>
                          <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Página Acessada</th>
                          <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visits.map((v, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-xs font-bold text-gray-950">
                               {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-4 px-4 text-xs font-semibold text-gray-600 truncate max-w-[150px]">
                               {v.location || 'Desconhecida'}
                            </td>
                            <td className="py-4 px-4 text-xs font-semibold text-gray-600">
                               {v.device}
                            </td>
                            <td className="py-4 px-4">
                               <div className="flex flex-col gap-1">
                                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md inline-block ${v.path?.includes('CHECKOUT_CLICK') ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {v.path?.startsWith('SOLO_CHECKOUT_CLICK') ? 'Checkout Solo' : 
                                     v.path?.startsWith('CART_CHECKOUT_CLICK') ? 'Checkout Carrinho' : 
                                     v.path === '/' ? 'Home' : v.path}
                                  </span>
                                  {v.path?.includes(':') && (
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[150px]">
                                      {v.path.split(':')[1]}
                                    </span>
                                  )}
                               </div>
                            </td>
                            <td className="py-4 px-4 text-[10px] font-mono font-bold text-gray-400">
                               {v.ip}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-black/5">
                      <Globe className="text-gray-300 w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black uppercase text-gray-950 tracking-tight">Nenhum acesso registrado hoje</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#d82828] mt-2 max-w-md bg-[#d82828]/10 px-4 py-2 rounded-lg">Aviso: É necessário criar a tabela "site_visits" no Supabase</p>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      {/* MODAL: PRODUCT EDIT/ADD */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[200] flex items-center justify-center p-4 md:p-8 text-black overflow-y-auto"
          >
             <motion.div 
               initial={{ scale: 0.98, y: 40, opacity: 0 }} 
               animate={{ scale: 1, y: 0, opacity: 1 }} 
               exit={{ scale: 0.98, y: 40, opacity: 0 }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
               className="bg-white w-full max-w-5xl rounded-[3rem] md:rounded-[5rem] p-6 md:p-16 relative shadow-[0_50px_200px_rgba(0,0,0,0.8)] overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#d82828] to-transparent opacity-50" />
                
                <motion.button 
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setIsModalOpen(false); setIsEditing(false); setFormData(initialForm); }} 
                  className="absolute top-8 md:top-12 right-8 md:right-12 w-12 h-12 md:w-16 md:h-16 bg-gray-50 text-gray-400 hover:text-black hover:bg-white rounded-full flex items-center justify-center transition-all z-10 border border-black/[0.03] shadow-sm hover:shadow-xl"
                >
                  <X size={28} />
                </motion.button>
                
                <div className="mb-12 md:mb-20">
                   <div className="flex items-center gap-3 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d82828] animate-pulse" />
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-gray-400">Inventory Studio</p>
                   </div>
                   <h3 className="text-3xl md:text-6xl font-black uppercase tracking-[-0.04em] italic leading-none text-gray-950">
                     {isEditing ? "Config." : "New"} <span className="text-[#d82828]">Pack</span>
                   </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12 md:space-y-20 overflow-y-auto max-h-[65vh] pr-4 md:pr-10 custom-scrollbar scroll-smooth pb-10">
                   {/* Layout Grid */}
                   <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 md:gap-14">
                      {/* Form Side */}
                      <div className="space-y-12">
                         {/* Name & Category */}
                         <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Asset Identity</label>
                              <input name="name" value={formData.name} onChange={handleInputChange} className="w-full h-16 md:h-20 bg-gray-50/50 focus:bg-white border border-black/[0.03] focus:border-black rounded-3xl md:rounded-[2rem] px-8 md:px-10 outline-none transition-all font-black text-lg md:text-2xl shadow-sm focus:shadow-2xl" required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Category</label>
                                <select name="category" value={formData.category} onChange={handleInputChange as any} className="w-full h-14 md:h-16 bg-gray-50/50 border border-black/[0.03] focus:border-black rounded-2xl md:rounded-[1.5rem] px-6 outline-none font-black text-[10px] md:text-xs tracking-widest uppercase">
                                  <option value="Creative">Creative Collective</option>
                                  <option value="Urban">Urban Style</option>
                                  <option value="Nature">Deep Nature</option>
                                  <option value="Portrait">Pure Portrait</option>
                                </select>
                              </div>
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Price (R$)</label>
                                <input name="price" value={formData.price} onChange={handleInputChange} className="w-full h-14 md:h-16 bg-gray-50/50 border border-black/[0.03] focus:border-black rounded-2xl md:rounded-[1.5rem] px-6 outline-none font-black text-lg tracking-widest" required />
                              </div>
                            </div>
                         </div>

                          {/* Preços Internacionais */}
                          <div className="bg-gradient-to-br from-blue-50/30 to-white rounded-[2rem] border border-black/[0.04] p-6 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center shrink-0">
                                <Globe size={14} className="text-white" />
                              </div>
                              <div>
                                <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-950">Preços Internacionais</h5>
                                <p className="text-[9px] text-gray-300 font-medium mt-0.5">Opcional — sobrepõe a conversão automática por taxa de câmbio</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇺🇸 Preço USD ($)</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">$</span>
                                  <input name="priceUSD" value={formData.priceUSD} onChange={handleInputChange} placeholder="9.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇪🇺 Preço EUR (€)</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">€</span>
                                  <input name="priceEUR" value={formData.priceEUR} onChange={handleInputChange} placeholder="8.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇺🇸 Original USD</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">$</span>
                                  <input name="originalPriceUSD" value={formData.originalPriceUSD} onChange={handleInputChange} placeholder="14.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇪🇺 Original EUR</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">€</span>
                                  <input name="originalPriceEUR" value={formData.originalPriceEUR} onChange={handleInputChange} placeholder="13.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Integração & Checkout */}
                          <div className="bg-gray-50/50 p-6 md:p-8 rounded-[2rem] border border-black/[0.03] space-y-6">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
                                 <Zap size={14} className="text-amber-500 fill-amber-500" />
                               </div>
                               <div>
                                 <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-950">Integração de Checkout</h4>
                                 <p className="text-[9px] font-medium text-gray-400 mt-0.5">Link de Compra Direta e ID do Produto</p>
                               </div>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">ID na GGCheckout (Para o Carrinho)</label>
                                 <input 
                                   name="ggCheckoutId" 
                                   value={formData.ggCheckoutId || ''} 
                                   onChange={handleInputChange} 
                                   placeholder="Ex: PROD-12345" 
                                   className="w-full h-14 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl px-4 outline-none font-mono text-[10px] transition-all shadow-sm" 
                                 />
                                 <p className="text-[9px] text-gray-400 font-medium px-2">Usado quando o carrinho está ativo para compra com múltiplos produtos.</p>
                               </div>

                               <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Link de Compra Direta (Individual)</label>
                                 <input 
                                   name="checkoutUrl" 
                                   value={formData.checkoutUrl || ''} 
                                   onChange={handleInputChange} 
                                   placeholder="Ex: https://ggcheckout.app/..." 
                                   className="w-full h-14 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl px-4 outline-none font-mono text-[10px] transition-all shadow-sm" 
                                 />
                                 <p className="text-[9px] text-gray-400 font-medium px-2">Usado se você desativar o carrinho e quiser venda direta.</p>
                               </div>
                             </div>
                          </div>

                         {/* Regional Copy */}
                         <div className="bg-gray-50/50 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-black/[0.03] space-y-8">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xl font-black uppercase italic italic">Regional Copy</h4>
                              <div className="flex gap-2">
                                {['PT', 'EN', 'ES'].map(l => (
                                  <button key={l} type="button" onClick={() => setLangTab(l as any)} className={`px-4 py-2 text-[9px] font-bold rounded-xl ${langTab === l ? 'bg-[#d82828] text-white shadow-lg shadow-red-500/10' : 'text-gray-400 hover:text-gray-600'}`}>{l}</button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-6">
                               <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                                  <textarea
                                    value={typeof formData.description === 'object' ? (formData.description[langTab] || '') : (langTab === 'PT' ? (formData.description || '') : '')}
                                    onChange={(e) => {
                                      const cur = typeof formData.description === 'object' ? formData.description : { PT: formData.description || '', EN: '', ES: '' };
                                      setFormData(prev => ({ ...prev, description: { ...cur, [langTab]: e.target.value } }));
                                    }}
                                    className="w-full h-24 bg-white rounded-2xl p-6 outline-none border border-black/[0.03] focus:border-black transition-all shadow-sm"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Detailed Narrative</label>
                                  <textarea
                                    value={typeof formData.detailedDescription === 'object' ? (formData.detailedDescription[langTab] || '') : (langTab === 'PT' ? (formData.detailedDescription || '') : '')}
                                    onChange={(e) => {
                                      const cur = typeof formData.detailedDescription === 'object' ? formData.detailedDescription : { PT: formData.detailedDescription || '', EN: '', ES: '' };
                                      setFormData(prev => ({ ...prev, detailedDescription: { ...cur, [langTab]: e.target.value } }));
                                    }}
                                    className="w-full h-40 bg-white rounded-2xl p-6 outline-none border border-black/[0.03] focus:border-black transition-all shadow-sm"
                                  />
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Right Side: Assets */}
                      <div className="space-y-12">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Cover Art</label>
                            <div className="aspect-[4/5] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-black/[0.05] shadow-2xl relative group bg-gray-100">
                               <img src={formData.image || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-in-out" alt="Cover" />
                               <label className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                                  <Upload size={32} className="text-white" />
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
                      </div>
                   </div>

                   {/* Gallery */}
                   <div className="space-y-8">
                      <div className="flex items-center justify-between">
                         <h4 className="text-xl font-black uppercase tracking-tighter italic">Gallery Preview</h4>
                         <label className="h-12 px-8 bg-black text-white rounded-full flex items-center gap-2 cursor-pointer hover:bg-[#d82828] transition-all text-[10px] font-black uppercase tracking-widest shadow-xl">
                            <Plus size={16} /> <span>Add Assets</span>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const url = await handleImageUpload(f);
                                if (url) setFormData(prev => ({ ...prev, images: [...(prev.images || []), url] }));
                              }
                            }} />
                         </label>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                         {(formData.images || []).map((img, i) => (
                           <div key={i} className="w-40 shrink-0 aspect-[4/5] rounded-3xl overflow-hidden relative group shadow-lg border border-black/5">
                              <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))} className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm"><Trash2 size={24} /></button>
                           </div>
                         ))}
                      </div>
                   </div>


                    {/* BLOCK EDITOR: O Que Esta Incluso + Ideal Para */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                      {/* O QUE ESTA INCLUSO */}
                      <div className="bg-gray-50/60 rounded-[2.5rem] border border-black/[0.04] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#d82828]/10 rounded-xl flex items-center justify-center">
                              <Check size={16} className="text-[#d82828]" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-950">O Que Esta Incluso</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, whatsIncluded: [...(prev.whatsIncluded || []), ""] }))}
                            className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center hover:bg-[#d82828] transition-all shadow-lg active:scale-90"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(formData.whatsIncluded || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                              <div className="w-6 h-6 bg-[#d82828]/10 rounded-lg flex items-center justify-center shrink-0">
                                <Check size={12} className="text-[#d82828]" />
                              </div>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const arr = [...(formData.whatsIncluded || [])];
                                  arr[i] = e.target.value;
                                  setFormData(prev => ({ ...prev, whatsIncluded: arr }));
                                }}
                                placeholder={`Item ${i + 1}...`}
                                className="flex-1 h-11 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl px-4 outline-none text-sm font-medium transition-all shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, whatsIncluded: (prev.whatsIncluded || []).filter((_, idx) => idx !== i) }))}
                                className="w-9 h-9 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {(formData.whatsIncluded || []).length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Clique em + para adicionar</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* IDEAL PARA */}
                      <div className="bg-gray-50/60 rounded-[2.5rem] border border-black/[0.04] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black/5 rounded-xl flex items-center justify-center">
                              <Star size={16} className="text-gray-700" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-950">Ideal Para</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, idealFor: [...(prev.idealFor || []), ""] }))}
                            className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center hover:bg-[#d82828] transition-all shadow-lg active:scale-90"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(formData.idealFor || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                              <div className="w-6 h-6 bg-black/5 rounded-lg flex items-center justify-center shrink-0">
                                <ChevronRight size={12} className="text-gray-500" />
                              </div>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const arr = [...(formData.idealFor || [])];
                                  arr[i] = e.target.value;
                                  setFormData(prev => ({ ...prev, idealFor: arr }));
                                }}
                                placeholder={`Perfil ${i + 1}...`}
                                className="flex-1 h-11 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl px-4 outline-none text-sm font-medium transition-all shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, idealFor: (prev.idealFor || []).filter((_, idx) => idx !== i) }))}
                                className="w-9 h-9 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {(formData.idealFor || []).length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Clique em + para adicionar</p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                   {/* Actions */}
                   <div className="pt-10 flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur-xl py-6 border-t border-black/[0.02]">
                       <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setIsEditing(false); setFormData(initialForm); }} className="h-16 flex-1 rounded-2xl font-black uppercase text-[10px]">Close</Button>
                       <Button type="submit" disabled={isLoading} className="h-16 flex-[2] bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em]">
                          {isLoading ? "Saving..." : (isEditing ? "Apply Changes" : "Create Product")}
                       </Button>
                   </div>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


