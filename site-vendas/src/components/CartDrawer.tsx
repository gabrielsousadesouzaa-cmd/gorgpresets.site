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
    await trackCheckoutClick(productNames);
    
    // 1. Obter a URL base do checkout (Atualizado para V2 conforme solicitado)
    let baseUrl = settings.integration.checkoutBaseUrl;
    
    // Fallback prioritário para o link v2 funcional
    if (!baseUrl || baseUrl === "" || baseUrl.includes('/s/') || baseUrl.includes('/v5/')) {
      baseUrl = "https://checkout.gorgpresets.com/checkout/v2/gRcT1osCycxdAJSbMWyN";
    }

    // 2. Coletar IDs de todos os produtos no carrinho
    const ggProductIds = items
      .map(item => {
        if (item.product.ggCheckoutId && item.product.ggCheckoutId.trim() !== "") {
          return item.product.ggCheckoutId.trim();
        }
        const url = item.product.checkoutUrl;
        if (!url) return null;
        const parts = url.split("?")[0].split("/").filter(Boolean);
        return parts[parts.length - 1];
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
          className="fixed inset-0 z-[3000] flex items-center justify-end p-0 overflow-hidden"
        >
          {/* Backdrop com Blur Premium */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="absolute inset-0 bg-black/40 backdrop-blur-md" 
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="relative w-[92%] h-[90vh] md:h-[90vh] md:max-w-6xl rounded-[2.5rem] bg-white shadow-[0_30px_120px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden border-none mx-auto"
          >
            {/* Close Button Mobile - Minimalist */}
            <button
              onClick={closeCart}
              className="absolute top-4 right-4 z-[210] p-4 text-gray-400 hover:text-black md:hidden active:scale-90"
            >
              <X size={24} strokeWidth={1.5} />
            </button>

            {/* Content Section */}
            <div className="flex-grow flex flex-col h-full bg-white relative min-w-0">
              <div className="px-6 py-6 md:px-10 md:py-8 flex items-center justify-between border-b border-black/[0.03]">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={22} className="text-black" strokeWidth={1.5} />
                  <h2 className="text-lg md:text-xl font-bold text-black uppercase tracking-tighter">
                    {t("cartMyPresets")}
                  </h2>
                  <span className="bg-black text-white text-[9px] px-2.5 py-1 rounded-full font-bold">
                    {items.length}
                  </span>
                </div>

                {/* Close button Desktop */}
                <button
                  onClick={closeCart}
                  className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-all"
                >
                  {t("cartContinue")} <X size={15} strokeWidth={2} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar space-y-6 md:space-y-10 pb-28">
                {/* Promo Banner Minimalista */}
                {items.length > 0 && (
                  <motion.div
                    className="bg-black text-white rounded-3xl p-5 md:p-6 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <Zap size={18} className="text-[#d82828]" fill="currentColor" />
                      <div>
                        <h4 className="text-[12px] font-bold uppercase tracking-widest mb-1">{t("cartPromoTitle")}</h4>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest">
                          {items.length % 3 === 0
                            ? t("cartPromoWin").replace("{n}", Math.floor(items.length / 3).toString())
                            : t("cartPromoMiss").replace("{n}", (3 - (items.length % 3)).toString())}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 px-6 text-center">
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">
                      {t("emptyCart")}
                    </p>
                    <button
                      onClick={closeCart}
                      className="px-8 py-4 border border-black text-black rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                      {t("cartExplore")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-6">
                    {items.map((item, idx) => (
                      <motion.div
                        key={item.product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex gap-4 md:gap-6 items-center p-3 md:p-4 rounded-3xl border border-black/[0.03] group ${item.isFree ? 'bg-red-50/20' : 'bg-white'}`}
                      >
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl overflow-hidden shrink-0 border border-black/[0.03]">
                          <img src={item.product.image} className="w-full h-full object-cover" alt="" />
                        </div>

                        <div className="flex-grow min-w-0">
                          <h3 className="text-[14px] md:text-16px font-bold text-black uppercase tracking-tighter truncate leading-tight">
                            {item.product.name}
                          </h3>
                          {item.isFree && (
                            <span className="text-[8px] font-bold text-[#d82828] uppercase tracking-widest">
                              {t("free")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-5">
                          <div className="text-right">
                            {item.isFree ? (
                              <span className="text-sm md:text-lg font-black text-[#d82828]">{formatCurrency(0)}</span>
                            ) : (
                              <span className="text-sm md:text-lg font-black text-black">{formatCurrency(item.product.price)}</span>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 p-2.5 rounded-full transition-all border border-black/5"
                          >
                            <Trash2 size={18} strokeWidth={2} />
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {/* Upsell Sugestão - Menos chamativo, mais integrado */}
                    {upsellProduct && (
                      <div className="p-4 md:p-5 rounded-3xl border border-black/[0.03] bg-gray-50/50 flex items-center justify-between gap-4 mt-8">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0 border border-white shadow-sm">
                            <img src={upsellProduct.image} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-[#d82828]/10 text-[#d82828] text-[7px] font-black uppercase tracking-widest rounded-md">
                                {t("cartUpsell")}
                              </span>
                            </div>
                            <p className="font-bold text-[12px] md:text-[13px] text-black uppercase tracking-tight truncate leading-tight mb-0.5">
                              {upsellProduct.name}
                            </p>
                            <p className="text-[11px] font-bold text-gray-400">{formatCurrency(upsellProduct.price)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => addItem(upsellProduct)}
                          className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-[#d82828] transition-all active:scale-95 shadow-lg shadow-black/5 shrink-0"
                        >
                          <Plus size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Minimalista (Resumo e Botão) */}
              {items.length > 0 && (
                <div className="p-6 md:p-10 bg-white border-t border-black/[0.03] flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("cartTotalOrder")}</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-black tracking-tighter">{formatCurrency(getTotal())}</span>
                      {getSavings() > 0 && (
                        <span className="text-xs font-bold text-green-600">(-{formatCurrency(getSavings())})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex gap-2 items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      <ShieldCheck size={14} className="text-green-500" />
                      {t("cartSecure").split('.')[0]}
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="w-full md:w-72 h-16 bg-black text-white rounded-full font-bold text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:translate-y-[-2px] transition-all shadow-xl active:scale-95"
                    >
                      {t("checkout")} <Zap size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
