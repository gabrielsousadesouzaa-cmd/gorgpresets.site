import { motion } from "framer-motion";
import { Product } from "@/data/products";
import { useCart } from "@/store/cartStore";
import { useCurrency } from "@/store/currencyStore";
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/store/languageStore";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Zap } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { settings } = useSiteSettings();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  }, [addItem, product]);



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col bg-white rounded-[2rem] border border-black/5 shadow-lg hover:shadow-2xl transition-shadow duration-500 h-full"
    >

      {/* Badge de Desconto - Calculado automaticamente */}
      {(product.originalPrice && product.originalPrice > product.price && product.price > 0) ? (() => {
        const discountPct = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        return discountPct > 0 ? (
          <div className="absolute top-4 left-4 z-20 bg-[#d82828] text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-0.5 shadow-lg shadow-red-500/20">
            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            {discountPct}%
          </div>
        ) : null;
      })() : null}

      {/* Imagem do Produto */}
      <Link to={`/product/${product.id}`} className="p-4 block relative">
        <div className="aspect-square w-full rounded-[1.5rem] overflow-hidden bg-gray-50 relative">
          <img
            src={product.image || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e"}
            alt={product.name}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://images.unsplash.com/photo-1542038784456-1ea8e935640e";
            }}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {/* Overlay suave no hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
        </div>
      </Link>

      {/* Informações */}
      <div className="px-4 pb-4 md:px-6 md:pb-6 pt-0 flex flex-col flex-grow">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-[15px] md:text-[15px] font-bold mb-2 md:mb-3 tracking-tight text-gray-950 uppercase line-clamp-1 leading-tight">{product.name}</h3>
        </Link>

        <div className="flex flex-col gap-0.5 mb-4 md:mb-6">
          <div className="flex items-baseline gap-1.5 md:gap-2">
            <span className="text-xl md:text-2xl font-bold text-[#d82828]">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[10px] md:text-xs font-semibold text-gray-300 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
          <div className="text-[9px] md:text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            ou 12x de <span className="text-gray-900">{formatCurrency(product.price / 12)}</span>
          </div>
        </div>

        {/* Botões de Ação - Responsivos */}
        <div className="flex flex-col gap-1.5 md:gap-2 mt-auto">
          {settings.integration.isCartEnabled ? (
            <button
              onClick={handleAddToCart}
              className={`w-full py-4 md:py-4 rounded-full font-bold text-[11px] md:text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${isAdded ? 'bg-green-500 text-white' : 'bg-[#d82828] text-white hover:bg-black hover:shadow-xl'
                }`}
            >
              {isAdded ? "ADICIONADO!" : "ADD AO CARRINHO"}
            </button>
          ) : (
            <Link
              to={`/product/${product.id}`}
              className="w-full py-4 md:py-4 rounded-full font-bold text-[11px] md:text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 bg-[#d82828] text-white hover:bg-black hover:shadow-xl"
            >
              <Zap size={14} fill="currentColor" /> {t("viewDetails")}
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
