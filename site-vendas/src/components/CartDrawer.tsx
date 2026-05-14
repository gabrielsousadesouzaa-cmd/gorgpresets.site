import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/store/cartStore";
import { useCurrency } from "@/store/currencyStore";
import { useLanguage } from "@/store/languageStore";
import { useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Trash2, X, ShoppingCart, Plus, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackCheckoutClick } from "@/components/trackCheckout";

export function CartDrawer() {
  const { isOpen, closeCart, items, removeItem, getTotal, addItem, getPromoDiscount, getSavings, getSubtotal } = useCart();
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
    
    // 1. Obter a URL base do checkout
    let baseUrl = settings.integration.checkoutBaseUrl;
    if (!baseUrl || baseUrl.trim() === "") {
      baseUrl = "https://checkout.gorgpresets.com/checkout/v2/gRcT1osCycxdAJSbMWyN";
    }

    // 2. Coletar IDs dos presets reais do carrinho.
    //    O produto "CARRINHO GORGPRESETS" é o produto-base da GGCheckout e já está
    //    embutido na baseUrl — deve ser ignorado aqui para não duplicar.
    //    Apenas os presets reais vão no parâmetro cart=.
    const presetItems = items.filter(
      item => !item.product.name.toLowerCase().includes('carrinho')
    );

    const ggProductIds = presetItems.map(item => {
      const id = item.product.ggCheckoutId?.trim();
      if (!id || id === "") {
        console.warn(`[GGCheckout] Produto "${item.product.name}" sem ggCheckoutId — usando id interno: ${item.product.id}`);
      }
      return id && id !== "" ? id : item.product.id;
    });

    if (ggProductIds.length === 0) {
      console.error("[GGCheckout] Nenhum preset encontrado no carrinho para enviar.");
      return;
    }

    // 3. Montar a URL final
    const separator = baseUrl.includes('?') ? '&' : '?';
    const cartParam = ggProductIds.join(';');
    let finalUrl = `${baseUrl}${separator}cart=${cartParam}`;

    // 4. Cupom progressivo da promoção Leve 3 Pague 2
    //    IMPORTANTE: & é o separador correto — a URL já tem ? antes do cart=
    if (items.length >= 6) {
      finalUrl += `&coupon=LEVE6PAGUE3`;
    } else if (items.length >= 3) {
      finalUrl += `&coupon=LEVE3PAGUE2`;
    }

    // Debug: mostra a URL montada no console
    console.log(`[GGCheckout] Redirecionando com ${items.length} produto(s):`, finalUrl);

    // 5. Redirecionar
    window.location.href = finalUrl;
  };

  // Lógica da Barra de Progresso Progressiva
  const itemCount = items.length;
  const getPromoInfo = () => {
    if (itemCount === 0) return {
      msg: t("promoTier0"),
      progress: 0,
      color: "bg-[#d82828]"
    };
    if (itemCount < 3) return {
      msg: t("promoTier1to2").replace("{n}", String(3 - itemCount)),
      progress: (itemCount / 6) * 100,
      color: "bg-[#d82828]"
    };
    if (itemCount === 3) return {
      msg: t("promoTier3"),
      progress: (3 / 6) * 100,
      color: "bg-[#d82828]"
    };
    if (itemCount < 6) return {
      msg: t("promoTier4to5").replace("{n}", String(6 - itemCount)),
      progress: (itemCount / 6) * 100,
      color: "bg-gradient-to-r from-orange-500 to-yellow-500"
    };
    return {
      msg: t("promoTier6Plus"),
      progress: 100,
      color: "bg-gradient-to-r from-orange-500 to-yellow-500",
      isMax: true
    };
  };

  const promo = getPromoInfo();

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
            className="fixed inset-0 z-[3000] flex justify-end overflow-hidden"
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 35, stiffness: 300 }}
            className="relative w-full md:w-[420px] h-[100dvh] bg-white shadow-2xl flex flex-col overflow-hidden border-l border-black/[0.05] rounded-none"
          >
            {/* Header: Compact Luxury */}
            <div className="px-6 py-4 md:px-8 md:py-5 flex items-center justify-between border-b border-black/[0.03] bg-white/50 backdrop-blur-md sticky top-0 z-20">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 mb-0">
                   <ShoppingCart size={14} className="text-[#d82828] md:w-3.5 md:h-3.5" strokeWidth={2.5} />
                   <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 ">{t("cartTitle").includes(' ') ? t("cartTitle").split(' ')[1] : t("cartTitle")}</span>
                </div>
                <h2 className="text-xl md:text-xl font-black text-black uppercase tracking-tighter leading-none ">
                  {t("cartMyPresets")} <span className="text-[#d82828] text-sm md:text-sm align-top ml-1">({items.length})</span>
                </h2>
              </div>

              <button
                onClick={closeCart}
                className="p-3 md:p-2.5 hover:bg-black hover:text-white rounded-full transition-all duration-500 border border-black/5 group"
              >
                <X size={16} className="md:w-4 md:h-4 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {/* Promo Progress Banner: Simplified & Clean */}
            {settings.integration.isBuy3Get1FreeEnabled && (
              <div className="px-6 md:px-8 mt-2 md:mt-3 mb-1">
                <div className={`relative overflow-hidden rounded-xl p-3 md:p-4 transition-all duration-500 border ${itemCount >= 3 ? 'bg-black border-black text-white' : 'bg-gray-50 border-black/5 text-black'}`}>
                  <div className="relative z-10 flex flex-col gap-3">
                    {/* Header Compacto */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${itemCount >= 3 ? 'bg-white/10' : 'bg-white shadow-sm border border-black/5'}`}>
                          {itemCount >= 6 ? '🔥' : itemCount >= 3 ? '🎉' : '🎁'}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[7px] font-bold uppercase tracking-[0.2em] opacity-60`}>
                            {itemCount >= 6 ? 'Status' : 'Progresso'}
                          </span>
                          <p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-tight leading-tight`}>
                            {promo.msg}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold opacity-60`}>
                        {itemCount}/6
                      </span>
                    </div>
                    
                    {/* Barra de Progresso Minimalista */}
                    <div className={`w-full h-1 rounded-full overflow-hidden ${itemCount >= 3 ? 'bg-white/20' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${itemCount >= 6 ? 'bg-yellow-400' : itemCount >= 3 ? 'bg-white' : 'bg-[#d82828]'}`}
                        style={{ width: `${promo.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Content Section: High Density */}
            <div className="flex-1 overflow-y-auto p-6 md:p-6 custom-scrollbar space-y-4 md:space-y-4 pb-32">
              
              {/* Empty State */}
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 md:py-32 px-10 text-center space-y-8 md:space-y-10">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-inner border border-black/5">
                     <ShoppingCart size={24} className="text-gray-200 md:w-10 md:h-10" strokeWidth={1} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-gray-950 font-black uppercase tracking-[0.3em] text-[12px] md:text-sm ">
                      {t("emptyCart")}
                    </p>
                    <p className="text-gray-400 text-[10px] md:text-[11px] uppercase font-bold tracking-[0.2em] max-w-[200px] md:max-w-[240px] mx-auto leading-relaxed">Presets exclusivos aguardam por você.</p>
                  </div>
                  <button
                    onClick={closeCart}
                    className="px-10 py-4 md:px-12 md:py-5 bg-black text-white rounded-full font-black text-[10px] md:text-[11px] uppercase tracking-[0.3em] hover:bg-[#d82828] transition-all shadow-xl active:scale-95"
                  >
                    {t("cartExplore")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upsell Sugestão: Top Position for better conversion */}
                  {upsellProduct && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 md:p-4 rounded-xl md:rounded-2xl border border-black/[0.06] bg-gradient-to-br from-gray-50/80 to-white flex items-center justify-between gap-3 md:gap-4 relative overflow-hidden group shadow-sm"
                    >

                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden shrink-0 border border-black/[0.03] shadow-sm">
                          <img src={upsellProduct.image} className="w-full h-full object-cover" alt="" />
                        </div>

                        <div className="min-w-0">
                          <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-black text-white text-[6px] md:text-[7px] font-black uppercase tracking-widest rounded-md mb-1 inline-block">
                            {t("cartUpsell")}
                          </span>
                          <p className="font-bold text-sm md:text-sm text-black uppercase tracking-tight truncate leading-none mb-1 ">
                            {upsellProduct.name}
                          </p>
                          <p className="text-sm md:text-xs font-bold text-[#d82828]">{formatCurrency(upsellProduct.price)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addItem(upsellProduct)}
                        className="px-4 py-2 md:px-5 md:py-2.5 bg-black text-white rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] hover:bg-[#d82828] transition-all active:scale-95 shadow-md shrink-0 flex items-center justify-center gap-1.5"
                      >
                         <span>+ ADD</span>
                      </button>

                    </motion.div>
                  )}

                  {/* Items List */}
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {items.map((item, idx) => (
                        <motion.div
                          layout
                          key={item.product.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
                          transition={{ duration: 0.3, delay: idx * 0.03 }}
                          className={`flex gap-3 md:gap-4 items-center p-2.5 md:p-3 rounded-xl md:rounded-2xl border border-black/[0.03] group hover:bg-gray-50/50 transition-all duration-300 shadow-sm ${item.isFree ? 'bg-red-50/20' : 'bg-white'}`}
                        >
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden shrink-0 border border-black/[0.03] shadow-sm">
                            <img src={item.product.image} className="w-full h-full object-cover" alt="" />
                          </div>

                          <div className="flex-grow min-w-0 space-y-1">
                            <span className="text-[6px] md:text-[7px] font-bold uppercase tracking-[0.1em] text-[#d82828] ">{item.product.category}</span>
                            <h3 className="text-sm md:text-sm font-bold text-black uppercase tracking-tight truncate leading-tight ">
                              {item.product.name}
                            </h3>
                            {item.isFree ? (
                               <span className="inline-block px-1.5 py-0.5 bg-[#d82828] text-white text-[7px] md:text-[8px] font-black uppercase rounded-full tracking-widest">{t("free")}</span>
                            ) : (
                               <div className="flex items-center gap-2">
                                  <span className="text-base md:text-base font-black text-gray-950">{formatCurrency(item.product.price)}</span>
                                  {item.product.originalPrice > 0 && <span className="text-[8px] md:text-[8px] text-gray-300 line-through font-bold">{formatCurrency(item.product.originalPrice)}</span>}
                               </div>
                            )}
                          </div>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="text-gray-300 hover:text-[#d82828] p-1.5 md:p-2 rounded-lg hover:bg-red-50 transition-all active:scale-90"
                          >
                            <Trash2 size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Footer: Compact & Professional */}
            {items.length > 0 && (
              <div className="p-4 md:p-5 bg-white border-t border-black/[0.03] flex flex-col gap-4 shadow-[0_-15px_40px_rgba(0,0,0,0.04)] shrink-0 pb-6 md:pb-6">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-gray-400">
                     <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] ">{t("subtotal")}</span>
                     <span className="text-sm md:text-base font-black text-gray-400">{formatCurrency(getSubtotal())}</span>
                  </div>

                  {getPromoDiscount() > 0 && (
                    <div className="flex justify-between items-center text-[#d82828]">
                       <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] ">{t("discountCoupon")}</span>
                       <span className="text-sm md:text-base font-black">- {formatCurrency(getPromoDiscount())}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/[0.05]">
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-[#d82828] ">{t("cartTotalOrder")}</span>
                    <span className="text-xl md:text-2xl font-black text-black tracking-tighter leading-none ">{formatCurrency(getTotal())}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="shimmer-effect w-full h-12 md:h-14 bg-black text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-[#d82828] transition-all duration-500 shadow-lg overflow-hidden relative active:scale-[0.98]"
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
