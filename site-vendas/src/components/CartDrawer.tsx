import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/store/cartStore";
import { useCurrency } from "@/store/currencyStore";
import { useLanguage } from "@/store/languageStore";
import { useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Trash2, X, ShoppingBag, Plus, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackCheckoutClick } from "@/components/SiteTracker";

export function CartDrawer() {
  const { isOpen, closeCart, items, removeItem, getTotal, addItem, getPromoDiscount, getSavings } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const { formatCurrency, currency } = useCurrency();
  const { t } = useLanguage();
  const { products } = useProducts();
  const { settings } = useSiteSettings();

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    // Tracking do clique para analytics interno
    const productNames = items.map(item => item.product.name).join(' + ');
    await trackCheckoutClick(productNames, 'CART');
    
    // 1. Obter a URL base do checkout (Respeita o valor do Admin se existir)
    let baseUrl = settings.integration.checkoutBaseUrl;
    
    // Fallback apenas se estiver vazio
    if (!baseUrl || baseUrl.trim() === "") {
      baseUrl = "https://checkout.gorgpresets.com/checkout/v2/gRcT1osCycxdAJSbMWyN";
    }

    // 2. Coletar IDs de todos os produtos no carrinho (Usando APENAS o campo ID NA GGCHECKOUT)
    const ggProductIds = items
      .map(item => {
        // Puxamos estritamente o ID que você preencheu no novo campo do Admin
        if (item.product.ggCheckoutId && item.product.ggCheckoutId.trim() !== "") {
          return item.product.ggCheckoutId.trim();
        }
        return null;
      })
      .filter(Boolean);

    if (ggProductIds.length === 0) {
      alert("Atenção: Os IDs dos produtos não foram encontrados. Verifique o Catálogo no painel Admin.");
      return;
    }

    // 3. Montar a URL final (v2 + parâmetros)
    const separator = baseUrl.includes('?') ? '&' : '?';
    const cartParam = ggProductIds.join(';');
    let finalUrl = `${baseUrl}${separator}cart=${cartParam}`;

    if (items.length >= 3) {
      finalUrl += `&coupon=LEVE3PAGUE2`;
    }

    // 4. Redirecionar
    window.location.href = finalUrl;
  };

  const upsellProduct = products.find(p => !items.some(item => item.product.id === p.id));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    closeCart();
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center md:justify-end p-4 md:p-8 overflow-hidden"
          >
          {/* Backdrop com Blur Premium (Vidro Profundo) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-all duration-700" 
          />

          <motion.div
            initial={{ 
              x: window.innerWidth < 768 ? 0 : 50, 
              y: window.innerWidth < 768 ? 20 : 0,
              opacity: 0 
            }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ 
              x: window.innerWidth < 768 ? 0 : 50, 
              y: window.innerWidth < 768 ? 20 : 0,
              opacity: 0 
            }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="relative w-[96%] md:w-[420px] h-[88vh] md:h-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-black/[0.05] rounded-[2.5rem] md:mr-0 my-auto"
          >
            {/* Header: Compact Luxury */}
            <div className="px-4 py-4 md:px-8 md:py-8 flex items-center justify-between border-b border-black/[0.03] bg-white/50 backdrop-blur-md sticky top-0 z-20">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 md:gap-2 mb-0">
                   <ShoppingBag size={14} className="text-[#d82828] md:w-4 md:h-4" strokeWidth={2.5} />
                   <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 italic">{t("cartTitle").includes(' ') ? t("cartTitle").split(' ')[1] : t("cartTitle")}</span>
                </div>
                <h2 className="text-lg md:text-2xl font-black text-black uppercase tracking-tighter leading-none italic">
                  {t("cartMyPresets")} <span className="text-[#d82828] text-xs md:text-sm align-top ml-0.5">({items.length})</span>
                </h2>
              </div>

              <button
                onClick={closeCart}
                className="p-2.5 md:p-3 hover:bg-black hover:text-white rounded-full transition-all duration-500 border border-black/5 group"
              >
                <X size={16} className="md:w-4 md:h-4 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {/* Content Section: High Density */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-4 md:space-y-6 pb-28">
              
              {/* Empty State */}
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 md:py-20 px-6 text-center space-y-4 md:space-y-6">
                  <div className="w-12 h-12 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-inner border border-black/5">
                     <ShoppingBag size={20} className="text-gray-200 md:w-8 md:h-8" strokeWidth={1} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-gray-950 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs italic">
                      {t("emptyCart")}
                    </p>
                    <p className="text-gray-400 text-[8px] md:text-[9px] uppercase font-bold tracking-widest max-w-[150px] md:max-w-[180px] mx-auto leading-relaxed">Presets exclusivos aguardam por você.</p>
                  </div>
                  <button
                    onClick={closeCart}
                    className="px-8 py-3 md:px-10 md:py-4 bg-black text-white rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] hover:bg-[#d82828] transition-all shadow-lg"
                  >
                    {t("cartExplore")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {/* Items List */}
                  <div className="space-y-2.5 md:space-y-3">
                    <AnimatePresence mode="popLayout">
                      {items.map((item, idx) => (
                        <motion.div
                          layout
                          key={item.product.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
                          transition={{ duration: 0.3, delay: idx * 0.03 }}
                          className={`flex gap-3 md:gap-5 items-center p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border border-black/[0.03] group hover:bg-gray-50/30 transition-all duration-300 ${item.isFree ? 'bg-red-50/20' : 'bg-white'}`}
                        >
                          <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden shrink-0 border border-black/[0.03] shadow-sm">
                            <img src={item.product.image} className="w-full h-full object-cover" alt="" />
                          </div>

                          <div className="flex-grow min-w-0 space-y-0 md:space-y-0.5">
                            <span className="text-[6px] md:text-[7px] font-black uppercase tracking-[0.15em] text-[#d82828] italic">{item.product.category}</span>
                            <h3 className="text-[13px] md:text-lg font-black text-black uppercase tracking-tighter truncate leading-tight italic">
                              {item.product.name}
                            </h3>
                            {item.isFree ? (
                               <span className="inline-block px-1.5 py-0 md:px-2 md:py-0.5 bg-[#d82828] text-white text-[7px] md:text-[8px] font-black uppercase rounded-md md:rounded-full tracking-widest">{t("free")}</span>
                            ) : (
                               <div className="flex items-center gap-1.5 md:gap-2">
                                  <span className="text-sm md:text-base font-black text-gray-950">{formatCurrency(item.product.price)}</span>
                                  {item.product.originalPrice > 0 && <span className="text-[8px] md:text-[9px] text-gray-300 line-through font-bold">{formatCurrency(item.product.originalPrice)}</span>}
                               </div>
                            )}
                          </div>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="text-gray-300 hover:text-red-500 p-2 md:p-3 rounded-lg md:rounded-xl hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={16} className="md:w-4 md:h-4" strokeWidth={2.5} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Upsell Sugestão */}
                  {upsellProduct && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 md:p-6 rounded-[1.8rem] md:rounded-[2.5rem] border border-black/[0.03] bg-gray-50/50 flex items-center justify-between gap-3 md:gap-4 mt-6 relative overflow-hidden group"
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden shrink-0 border border-white shadow-sm">
                          <img src={upsellProduct.image} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="min-w-0">
                          <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-black text-white text-[6px] md:text-[7px] font-black uppercase tracking-widest rounded-md mb-1 inline-block">
                            {t("cartUpsell")}
                          </span>
                          <p className="font-black text-[11px] md:text-lg text-black uppercase tracking-tighter truncate leading-none mb-0.5 italic">
                            {upsellProduct.name}
                          </p>
                          <p className="text-[10px] md:text-xs font-black text-[#d82828]">{formatCurrency(upsellProduct.price)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addItem(upsellProduct)}
                        className="w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-lg md:rounded-xl flex items-center justify-center hover:bg-[#d82828] transition-all active:scale-95 shadow-md shrink-0"
                      >
                         <Plus size={14} strokeWidth={3} />
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 md:p-8 bg-white border-t border-black/[0.03] flex flex-col gap-3 md:gap-6 shadow-[0_-15px_30px_rgba(0,0,0,0.03)] md:shadow-[0_-20px_40px_rgba(0,0,0,0.05)] sticky bottom-0 z-20 pb-8 md:pb-8">
                <div className="space-y-1.5 md:space-y-3">
                  <div className="flex justify-between items-center text-gray-400">
                     <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest italic">{t("subtotal")}</span>
                     <span className="text-sm md:text-base font-black text-gray-400">{formatCurrency(getTotal() + getSavings())}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                       <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-[#d82828] mb-0 italic">{t("cartTotalOrder")}</span>
                       <span className="text-2xl md:text-4xl font-black text-black tracking-tighter leading-none italic">{formatCurrency(getTotal())}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="shimmer-effect w-full h-14 md:h-18 bg-black text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-[#d82828] transition-all duration-500 shadow-lg italic overflow-hidden relative"
                >
                  <span className="relative z-10">{t("checkout")}</span>
                  <Zap size={14} fill="currentColor" className="relative z-10 md:w-4 md:h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
