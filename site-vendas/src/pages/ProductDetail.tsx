import { useState, useEffect } from "react";
import { trackCheckoutClick } from "@/components/SiteTracker";
import { useParams, Link } from "react-router-dom";
import { useProduct, useProducts } from "@/hooks/useProducts";
import { 
  ChevronRight, 
  ChevronLeft,
  Sparkles, 
  CheckCircle2, 
  Lock,
  ShoppingBag,
  Zap,
  Minus,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/store/currencyStore";
import { useLanguage } from "@/store/languageStore";
import { useCart } from "@/store/cartStore";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ProductCarousel } from "@/components/ProductCarousel";
import { InstallationGuide } from "@/components/InstallationGuide";
import { useMenu } from "@/store/MenuContext";

export default function ProductDetail() {
  const { slug } = useParams();
  const { product, loading: productLoading } = useProduct(slug);
  const { products: allProducts } = useProducts();
  const { formatCurrency, currency } = useCurrency();
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const { settings } = useSiteSettings();
  const { setIsProductStickyVisible } = useMenu();
  
  const [selectedImage, setSelectedImage] = useState("");
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    setIsProductStickyVisible(showStickyBar);
  }, [showStickyBar, setIsProductStickyVisible]);

  // Limpar estado ao desmontar
  useEffect(() => {
    return () => setIsProductStickyVisible(false);
  }, [setIsProductStickyVisible]);

  useEffect(() => {
    if (product?.image) {
      setSelectedImage(product.image);
    }
  }, [product]);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = () => {
    if (product) {
      addItem(product);
      toast.success("Adicionado ao carrinho!");
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    if (product.checkoutUrl && product.checkoutUrl !== "#") {
      await trackCheckoutClick();
      window.location.href = product.checkoutUrl;
    } else {
      toast.info(language === 'PT' ? "Link de checkout não configurado." : "Checkout link not configured.");
    }
  };

  if (productLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
          <div className="w-12 h-12 border-4 border-[#d82828] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Carregando detalhes do preset...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white p-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tighter">Produto não encontrado</h1>
        <Link to="/catalog" className="px-10 py-4 bg-black text-white rounded-full font-bold uppercase tracking-widest text-xs">Ver Catálogo</Link>
      </div>
    );
  }

  // Fallbacks de segurança para arrays
  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image];
  const whatsIncluded = Array.isArray(product.whatsIncluded) ? product.whatsIncluded : [];
  const idealFor = Array.isArray(product.idealFor) ? product.idealFor : [];

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = images.indexOf(selectedImage);
    const nextIndex = (currentIndex + 1) % images.length;
    setSelectedImage(images[nextIndex]);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = images.indexOf(selectedImage);
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIndex]);
  };

  return (
    <div className="bg-[#fafafa] min-h-screen">
      <div className="w-full max-w-[1350px] mx-auto px-4 md:px-8 py-0">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] md:text-[11px] text-gray-400 py-6 md:py-8 overflow-x-auto whitespace-nowrap uppercase tracking-[0.15em] font-medium">
          <Link to="/" className="hover:text-black transition-colors">{t("pdHomeBreadcrumb")}</Link>
          <ChevronRight size={10} className="text-gray-300" strokeWidth={2} />
          <Link to="/catalog" className="hover:text-black transition-colors">{t("pdProductsBreadcrumb")}</Link>
          <ChevronRight size={10} className="text-gray-300" strokeWidth={2} />
          <span className="text-gray-900 font-semibold">{product.name}</span>
        </nav>

        {/* Master Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-16">
          <div className="flex flex-col space-y-12">
            
            {/* Gallery Section */}
            <div className="bg-white rounded-[2rem] border border-black/5 shadow-xl p-2 md:p-3">
              <div className="flex flex-col md:flex-row gap-4 md:gap-7">
                <div className="hidden md:flex flex-col gap-3 min-w-[70px]">
                  {images.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`relative w-[70px] h-[70px] rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedImage === img ? 'border-[#d82828] shadow-md' : 'border-transparent opacity-80 hover:opacity-100 hover:border-black/10'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex-grow w-full relative group">
                  <div className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-50 border border-black/5 relative">
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={selectedImage}
                        src={selectedImage || product.image} 
                        alt={product.name} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full object-cover select-none rounded-[1.5rem]"
                      />

                    </AnimatePresence>

                    {images.length > 1 && (
                      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-30 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                         <button onClick={handlePrevImage} className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center pointer-events-auto active:scale-90 text-black/90 hover:bg-white transition-colors"><ChevronLeft size={22} /></button>
                         <button onClick={handleNextImage} className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center pointer-events-auto active:scale-90 text-black/90 hover:bg-white transition-colors"><ChevronRight size={22} /></button>
                      </div>
                    )}
                  </div>

                  <div className="flex md:hidden overflow-x-auto gap-2.5 py-4 custom-scrollbar mt-1">
                    {images.map((img, idx) => (
                      <button key={idx} onClick={() => setSelectedImage(img)} className={`w-16 h-16 rounded-[4px] overflow-hidden shrink-0 border-[1px] transition-all ${selectedImage === img ? 'border-[#d82828] scale-[1.04] shadow-md' : 'border-black/5 opacity-80'}`}><img src={img} alt="" className="w-full h-full object-cover" /></button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Nome + Preco + Botoes (so aparece em mobile) */}
            <div className="lg:hidden bg-white rounded-[2rem] border border-black/5 shadow-xl p-6 space-y-5">
              {/* Badge Removido Temporariamente */}

              {/* Nome */}
              <h1 className="text-3xl font-extrabold text-gray-950 uppercase tracking-tighter leading-[1]">{product.name}</h1>

              {/* Preco */}
              <div className="flex items-center gap-4">
                <span className="text-4xl font-extrabold text-[#d82828] tracking-tighter leading-none">{formatCurrency(product.price, { priceUSD: product.priceUSD, priceEUR: product.priceEUR })}</span>
                {product.originalPrice > 0 && (
                  <div className="flex flex-col">
                    <span className="text-base text-gray-300 line-through font-semibold leading-none">{formatCurrency(product.originalPrice, { priceUSD: product.originalPriceUSD, priceEUR: product.originalPriceEUR })}</span>
                    <div className="px-2 py-0.5 bg-[#d82828] text-white text-[10px] font-bold rounded-full w-fit mt-1">
                      {t("pdDiscountTag")}
                    </div>
                  </div>
                )}
              </div>

              {/* Parcelamento + Pix */}
              <div className="bg-[#f8fafc] rounded-2xl p-4 space-y-3">
                {currency === "BRL" ? (
                  <div className="flex justify-between items-center text-sm font-semibold px-1">
                    <span className="text-gray-400">{t("pdInstallments")}</span>
                    <span className="text-gray-950 font-bold">{t("pdInstallmentText")} {formatCurrency(product.price / 12)}</span>
                  </div>
                ) : (
                  <div className="space-y-4 py-1">
                    <div className="flex items-center gap-3 text-[#d82828]">
                      <ShieldCheck size={16} fill="currentColor" />
                      <span className="text-xs font-bold uppercase tracking-widest">{t("pdInternationalTitle")}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                          <CheckCircle2 size={13} className="text-[#32BCAD]" /> {t("pdInternationalAccess")}
                       </div>
                       <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                          <CheckCircle2 size={13} className="text-[#32BCAD]" /> {t("pdInternationalCompatible")}
                       </div>
                       <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                          <CheckCircle2 size={13} className="text-[#32BCAD]" /> {t("pdInternationalLifetime")}
                       </div>
                    </div>
                  </div>
                )}
                {currency === "BRL" && (
                  <div className="flex justify-between items-center bg-[#4ade80]/8 p-4 rounded-2xl border border-[#4ade80]/10">
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{t("pdPixPrice")}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[#32BCAD] font-black text-xl tracking-tight">{formatCurrency(product.price * 0.95)}</span>
                        <span className="bg-[#32BCAD] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">5% OFF</span>
                      </div>
                    </div>
                    <img src="/pix.png" alt="Pix" className="h-5 w-auto object-contain opacity-50" />
                  </div>
                )}
              </div>

              {/* Botoes */}
              <div className="space-y-3 pt-1">
                <button onClick={handleBuyNow} className={`shimmer-effect w-full h-[60px] bg-[#d82828] text-white rounded-2xl text-base font-bold uppercase tracking-[0.05em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all ${!settings.integration.isCartEnabled ? 'scale-105' : ''}`}>
                  {t("pdBuyNow")}
                </button>
                {settings.integration.isCartEnabled && (
                  <button onClick={handleAddToCart} className="w-full h-14 bg-white text-gray-950 border-2 border-gray-950 rounded-2xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <ShoppingBag size={18} /> {t("addToCart")}
                  </button>
                )}
              </div>

              {/* Trust Badges Mobile */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-4 border-t border-black/5 mt-2">
                <div className="flex items-center gap-1.5 grayscale opacity-70">
                  <ShieldCheck size={14} className="text-[#32BCAD]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("pdBadgeWarranty")}</span>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-70">
                  <Lock size={14} className="text-gray-900" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("pdBadgeSecure")}</span>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-70">
                  <Zap size={14} fill="currentColor" className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("pdBadgeInstant")}</span>
                </div>
              </div>

              {/* Bloco de Segurança Mobile */}
              <div className="pt-4 border-t border-black/5 mt-2 text-center flex flex-col items-center">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-950 mb-3 flex items-center justify-center gap-2">
                  <Lock size={14} className="text-[#d82828]" /> {t("pdSafetyTitle")}
                </h4>
                <p className="text-[11px] text-gray-500 leading-relaxed mb-4 max-w-[280px]">
                  {t("pdSafetyDesc")}
                </p>
                <div className="flex flex-wrap justify-center gap-2 opacity-80">
                  {/* Mastercard */}
                  <div className="w-8 h-5 border border-black/5 rounded bg-white flex items-center justify-center">
                    <svg width="14" height="10" viewBox="0 0 24 16" fill="none"><circle cx="7.5" cy="8" r="7.5" fill="#EB001B"/><circle cx="16.5" cy="8" r="7.5" fill="#F79E1B"/><path d="M12 14.5A7.46 7.46 0 0 0 15 8a7.46 7.46 0 0 0-3-6.5A7.46 7.46 0 0 0 9 8a7.46 7.46 0 0 0 3 6.5Z" fill="#FF5F00"/></svg>
                  </div>
                  {/* Elo */}
                  <div className="w-8 h-5 border border-black/5 rounded bg-white flex items-center justify-center p-0.5">
                    <img src="/elo-black.png" alt="Elo" className="h-full w-auto object-contain" />
                  </div>
                  {/* VISA */}
                  <div className="w-8 h-5 border border-black/5 rounded bg-white flex items-center justify-center">
                    <span className="text-[#1434CB] text-[9px] italic font-black">VISA</span>
                  </div>
                  {/* AMEX REMOVIDO */}
                  {/* PIX */}
                  <div className="w-8 h-5 border border-black/5 rounded bg-white flex items-center justify-center p-0.5">
                    <img src="/pix.png" alt="Pix" className="h-full w-auto object-contain" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-8 md:p-14">
              <h2 className="text-3xl font-bold text-gray-950 mb-10 tracking-tight flex items-center gap-4">
                <span className="w-1.5 h-8 bg-[#d82828] rounded-full"></span>
                {t("pdDescTitle")}
              </h2>
              
              <div className="space-y-12">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#d82828] mb-6">{t("pdEstheticTitle")}</h3>
                  {/* Helper local: suporta string legada OU objeto { PT, EN, ES } */}
                  {(() => {
                    const getLocalizedDesc = (val: any): string => {
                      if (!val) return "";
                      if (typeof val === "string") return val;
                      return val[language] || val.PT || val.EN || val.ES || "";
                    };
                    return (
                      <p className="text-lg leading-relaxed text-gray-700">
                        {getLocalizedDesc(product.detailedDescription) || getLocalizedDesc(product.description)}
                      </p>
                    );
                  })()}

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#d82828]">{t("pdIncludedTitle")}</h3>
                    <ul className="space-y-4">
                      {whatsIncluded.map((item, i) => (
                        <li key={i} className="flex gap-3 items-start text-sm font-normal text-gray-700">
                          <CheckCircle2 size={18} className="text-[#d82828] shrink-0 mt-0.5" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#d82828]">{t("pdIdealTitle")}</h3>
                    <ul className="space-y-4">
                      {idealFor.map((item, i) => (
                        <li key={i} className="flex gap-3 items-start text-sm font-normal text-gray-700">
                          <Minus size={18} className="text-[#d82828] shrink-0 mt-0.5" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sticky) */}
          <div className="hidden lg:block lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-2xl p-10 space-y-8">
              {/* Vendas removidas (apenas Admin) */}

              <h1 className="text-4xl font-extrabold text-gray-950 uppercase tracking-tighter leading-[0.9]">{product.name}</h1>

              <div className="flex items-center gap-4">
                <span className="text-5xl font-extrabold text-[#d82828] tracking-tighter leading-none">{formatCurrency(product.price, { priceUSD: product.priceUSD, priceEUR: product.priceEUR })}</span>
                {product.originalPrice > 0 && (
                  <div className="flex flex-col">
                    <span className="text-lg text-gray-300 line-through font-semibold leading-none">{formatCurrency(product.originalPrice, { priceUSD: product.originalPriceUSD, priceEUR: product.originalPriceEUR })}</span>
                    <div className="px-3 py-1 bg-[#d82828] text-white text-[11px] font-bold rounded-full shadow-lg transform -rotate-1 w-fit mt-1">
                      {t("pdDiscountTag")}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#f8fafc] rounded-2xl p-6 space-y-4">
                {currency === "BRL" ? (
                  <div className="flex justify-between items-center text-sm font-semibold px-1">
                    <span className="text-gray-400">{t("pdInstallments")}</span>
                    <span className="text-gray-900 font-bold">{t("pdInstallmentText")} {formatCurrency(product.price / 12)}</span>
                  </div>
                ) : (
                  <div className="space-y-4 py-2 border-b border-black/[0.03] mb-2">
                    <div className="flex items-center gap-3 text-[#d82828] mb-1">
                      <ShieldCheck size={20} fill="currentColor" />
                      <span className="text-sm font-black uppercase tracking-[0.15em]">{t("pdInternationalTitle")}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                       <div className="flex items-center gap-3 text-sm text-gray-600 font-semibold">
                          <CheckCircle2 size={16} className="text-[#32BCAD]" /> {t("pdInternationalAccess")}
                       </div>
                       <div className="flex items-center gap-3 text-sm text-gray-600 font-semibold">
                          <CheckCircle2 size={16} className="text-[#32BCAD]" /> {t("pdInternationalCompatible")}
                       </div>
                       <div className="flex items-center gap-3 text-sm text-gray-600 font-semibold">
                          <CheckCircle2 size={16} className="text-[#32BCAD]" /> {t("pdInternationalLifetime")}
                       </div>
                    </div>
                  </div>
                )}
                {currency === "BRL" && (
                  <div className="flex justify-between items-center bg-[#4ade80]/8 p-5 rounded-2xl border border-[#4ade80]/10">
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{t("pdPixPrice")}</span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[#32BCAD] font-black text-2xl tracking-tight">{formatCurrency(product.price * 0.95)}</span>
                        <span className="bg-[#32BCAD] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase shadow-sm">5% OFF</span>
                      </div>
                    </div>
                    <img src="/pix.png" alt="Pix" className="h-6 w-auto object-contain opacity-50" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <button onClick={handleBuyNow} className={`shimmer-effect w-full h-[70px] bg-[#d82828] text-white rounded-2xl text-[1.2rem] font-bold uppercase tracking-[0.05em] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all ${!settings.integration.isCartEnabled ? 'scale-105' : ''}`}>
                   {t("pdBuyNow")}
                </button>
                {settings.integration.isCartEnabled && (
                  <button onClick={handleAddToCart} className="w-full h-16 bg-white text-gray-950 border-2 border-gray-950 rounded-2xl text-[0.95rem] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all">
                    <ShoppingBag size={20} /> {t("addToCart")}
                  </button>
                )}
              </div>

              {/* Trust Badges Desktop simplified */}
              <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-2 py-6 border-y border-black/5 mt-auto">
                <div className="flex items-center gap-2 group/badge">
                  <ShieldCheck size={16} className="text-[#32BCAD]" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-950">{t("pdBadgeWarranty")}</span>
                </div>
                <div className="flex items-center gap-2 group/badge">
                  <Lock size={16} className="text-gray-950" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-950">{t("pdBadgeSecure")}</span>
                </div>
                <div className="flex items-center gap-2 group/badge">
                  <Zap size={16} fill="currentColor" className="text-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-950">{t("pdBadgeInstant")}</span>
                </div>
              </div>

              {/* Bloco de Segurança Desktop */}
              <div className="pt-8 border-t border-black/5 text-center flex flex-col items-center">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-950 mb-4 flex items-center justify-center gap-2">
                  <Lock size={16} className="text-[#d82828]" /> {t("pdSafetyTitle")}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-[320px]">
                  {t("pdSafetyDesc")}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {/* Mastercard */}
                  <div className="w-10 h-6 border border-black/5 rounded-md bg-white shadow-sm flex items-center justify-center">
                    <svg width="18" height="12" viewBox="0 0 24 16" fill="none"><circle cx="7.5" cy="8" r="7.5" fill="#EB001B"/><circle cx="16.5" cy="8" r="7.5" fill="#F79E1B"/><path d="M12 14.5A7.46 7.46 0 0 0 15 8a7.46 7.46 0 0 0-3-6.5A7.46 7.46 0 0 0 9 8a7.46 7.46 0 0 0 3 6.5Z" fill="#FF5F00"/></svg>
                  </div>
                  {/* Elo */}
                  <div className="w-10 h-6 border border-black/5 rounded-md bg-white shadow-sm flex items-center justify-center p-1">
                    <img src="/elo-black.png" alt="Elo" className="h-full w-auto object-contain" />
                  </div>
                  {/* VISA */}
                  <div className="w-10 h-6 border border-black/5 rounded-md bg-white shadow-sm flex items-center justify-center">
                    <span className="text-[#1434CB] text-[11px] italic font-black">VISA</span>
                  </div>
                  {/* AMEX REMOVIDO */}
                  {/* PIX */}
                  <div className="w-10 h-6 border border-black/5 rounded-md bg-white shadow-sm flex items-center justify-center p-1">
                    <img src="/pix.png" alt="Pix" className="h-full w-auto object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Guia Visual do Aplicativo */}
      <div className="w-full max-w-[1350px] mx-auto px-4 md:px-8 mt-10">
         <InstallationGuide />
      </div>

      {/* Carrossel: Você Pode Gostar */}
      <div className="mt-8 mb-4">
        <ProductCarousel 
          title={t("pdYouMayLike")}
          products={allProducts.filter(p => p.id !== product.id).sort(() => Math.random() - 0.5).slice(0, 8)}
          bgClass="bg-[#fafafa]"
        />
      </div>

      <AnimatePresence>
        {showStickyBar && (
          <>
            {/* Versão Mobile (Bottom Bar) */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="fixed bottom-0 inset-x-0 z-[100] bg-white/90 backdrop-blur-2xl border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] px-4 py-4 pb-8 flex items-center justify-between lg:hidden rounded-t-[2.2rem]"
            >
               <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-black/5 shadow-sm shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] font-black text-[#d82828] uppercase tracking-[0.2em] leading-none mb-1">{product.category}</span>
                    <h4 className="text-[13px] font-black text-gray-950 uppercase tracking-tighter truncate leading-tight mb-1">{product.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-black text-gray-950 leading-none">{formatCurrency(product.price, { priceUSD: product.priceUSD, priceEUR: product.priceEUR })}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t("pdInstallmentText")} {formatCurrency(product.price / 12)}</span>
                    </div>
                  </div>
               </div>
               <button onClick={handleBuyNow} className="shimmer-effect bg-[#d82828] text-white h-12 px-6 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] shadow-xl shadow-[#d82828]/20 active:scale-95 transition-all shrink-0">
                 {t("pdBuyNow")}
               </button>
            </motion.div>

            {/* Versão Desktop (Bottom Full Bar) */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="fixed bottom-0 inset-x-0 z-[3000] hidden lg:flex items-center justify-center bg-white/90 backdrop-blur-2xl border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-20 py-5"
            >
              <div className="container max-w-[1300px] flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-black/5">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#d82828] uppercase tracking-[0.2em]">{product.category}</span>
                    <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter leading-tight">{product.name}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="text-right flex flex-col items-end">
                     <div className="flex items-center gap-4">
                        {product.originalPrice > 0 && <span className="text-base text-gray-400 line-through font-medium">{formatCurrency(product.originalPrice, { priceUSD: product.originalPriceUSD, priceEUR: product.originalPriceEUR })}</span>}
                        <span className="text-3xl font-black text-gray-950 tracking-tighter">{formatCurrency(product.price, { priceUSD: product.priceUSD, priceEUR: product.priceEUR })}</span>
                     </div>
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("pdInstallmentText")} {formatCurrency(product.price/12)}</p>
                  </div>
                  <button 
                    onClick={handleBuyNow}
                    className="shimmer-effect h-16 px-16 bg-[#d82828] text-white rounded-[1.2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[#d82828]/20 hover:scale-[1.03] active:scale-95 transition-all"
                  >
                    {t("pdBuyNow")}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
