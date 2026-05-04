import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, createContext, useContext, useRef } from "react";
import { Check } from "lucide-react";

interface ToastState {
  visible: boolean;
  image: string;
}

interface FlyToCartContextType {
  triggerAnimation: (e: React.MouseEvent | { x: number; y: number }, image: string) => void;
}

const FlyToCartContext = createContext<FlyToCartContextType | null>(null);

export function FlyToCartProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ visible: false, image: "" });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAnimation = useCallback(
    (_e: React.MouseEvent | { x: number; y: number }, image: string) => {
      // ── Toast ──
      setToast({ visible: true, image });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3500);

      // Trigger pulse on cart button immediately since there's no flight
      const event = new CustomEvent('cart-pulse');
      window.dispatchEvent(event);
    },
    []
  );

  return (
    <FlyToCartContext.Provider value={{ triggerAnimation }}>
      {children}

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            key="cart-toast"
            initial={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="
              fixed z-[9999] pointer-events-none
              top-[6.5rem] right-4 md:top-32 md:right-8
              flex items-center gap-4 bg-white/95 backdrop-blur-xl rounded-[2rem]
              shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-black/[0.04]
              px-5 py-4 w-auto max-w-[calc(100vw-2rem)] md:w-[340px]
            "
          >
            {/* Shimmer Effect */}
            <motion.div 
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-12"
            />

            <div className="relative z-10 flex items-center gap-4 w-full">
               <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-black/5 shadow-md">
                 <img src={toast.image} className="w-full h-full object-cover" alt="" />
               </div>

               <div className="flex flex-col flex-1 min-w-0">
                 <div className="flex items-center gap-1.5 mb-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 italic">
                     Sucesso
                   </span>
                 </div>
                 <h3 className="text-sm font-black text-black uppercase tracking-tight leading-none italic">
                   Preset Adicionado!
                 </h3>
                 <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                   Confira seu carrinho
                 </p>
               </div>

               <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-lg">
                 <Check size={18} strokeWidth={3} />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FlyToCartContext.Provider>
  );
}

export const useFlyToCart = () => {
  const context = useContext(FlyToCartContext);
  if (!context) throw new Error("useFlyToCart must be used within FlyToCartProvider");
  return context;
};
