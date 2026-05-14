import { ShoppingCart } from "lucide-react";
import { useCart } from "../store/cartStore";
import { AnimatePresence, motion } from "framer-motion";

export function FloatingCartButton() {
  const { items, openCart, isOpen } = useCart();

  // Se o carrinho estiver aberto ou não houver itens, não mostra o botão flutuante
  if (items.length === 0 || isOpen) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={openCart}
        className="fixed bottom-10 right-6 md:bottom-12 md:right-8 z-[2000] w-12 h-12 md:w-14 md:h-14 bg-white text-[#d82828] rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex items-center justify-center hover:bg-gray-50 transition-colors duration-300 border border-black/5"
      >
        <ShoppingCart size={18} className="md:w-5 md:h-5" strokeWidth={2.5} />
        
        {/* Badge Flutuante */}
        <div className="absolute -top-1 -right-1 bg-[#d82828] border-2 border-white text-white text-[9px] md:text-[10px] font-black w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-sm">
          {items.length}
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
