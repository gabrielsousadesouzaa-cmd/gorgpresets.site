import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, createContext, useContext, useRef } from "react";
import { Check } from "lucide-react";

interface ParticleInstance {
  id: number;
  startX: number;
  startY: number;
  image: string;
}

interface ToastState {
  visible: boolean;
  image: string;
}

interface FlyToCartContextType {
  triggerAnimation: (e: React.MouseEvent | { x: number; y: number }, image: string) => void;
}

const FlyToCartContext = createContext<FlyToCartContextType | null>(null);

export function FlyToCartProvider({ children }: { children: React.ReactNode }) {
  const [particles, setParticles] = useState<ParticleInstance[]>([]);
  const [toast, setToast] = useState<ToastState>({ visible: false, image: "" });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAnimation = useCallback(
    (e: React.MouseEvent | { x: number; y: number }, image: string) => {
      const startX = "clientX" in e ? e.clientX : e.x;
      const startY = "clientY" in e ? e.clientY : e.y;

      // ── Flying particle ──
      const id = Date.now();
      setParticles((prev) => [...prev, { id, startX, startY, image }]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, 1200);

      // ── Toast (single global, reset timer on repeat clicks) ──
      setToast({ visible: true, image });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
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
            initial={{ opacity: 0, x: 40, scale: 0.93 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="
              fixed z-[9999] pointer-events-none
              top-20 right-3
              md:top-20 md:right-6
              flex items-center gap-3 bg-white rounded-2xl
              shadow-[0_8px_50px_rgba(0,0,0,0.16)] border border-black/[0.06]
              px-4 py-3.5 w-[270px] md:w-[310px]
            "
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-black/5 shadow-sm">
              <img src={toast.image} className="w-full h-full object-cover" alt="" />
            </div>

            {/* Text */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#d82828] leading-none mb-1">
                ✓ Adicionado
              </span>
              <span className="text-[12px] font-black text-gray-950 uppercase tracking-tight leading-tight">
                Produto no carrinho!
              </span>
              <span className="text-[9px] font-semibold text-gray-400 mt-0.5 leading-none">
                Toque no 🛒 para finalizar
              </span>
            </div>

            {/* Check bubble */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
              className="w-9 h-9 rounded-full bg-black flex items-center justify-center shrink-0 shadow-lg"
            >
              <Check size={15} className="text-white" strokeWidth={3} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLYING PARTICLES ── */}
      <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <FlyParticle key={p.id} particle={p} />
          ))}
        </AnimatePresence>
      </div>
    </FlyToCartContext.Provider>
  );
}

export const useFlyToCart = () => {
  const context = useContext(FlyToCartContext);
  if (!context) throw new Error("useFlyToCart must be used within FlyToCartProvider");
  return context;
};

function FlyParticle({ particle }: { particle: ParticleInstance }) {
  const cartBtn = document.getElementById("main-cart-button");
  const rect = cartBtn?.getBoundingClientRect();

  const targetX = rect ? rect.left + rect.width / 2 - 20 : window.innerWidth - 70;
  const targetY = rect ? rect.top + rect.height / 2 - 20 : 30;

  const midX = (particle.startX + targetX) / 2 - 20;
  const midY = Math.min(particle.startY, targetY) - 140;

  return (
    <motion.div
      initial={{ x: particle.startX - 20, y: particle.startY - 20, scale: 1, opacity: 0.9 }}
      animate={{
        x: [particle.startX - 20, midX, targetX],
        y: [particle.startY - 20, midY, targetY],
        scale: [1, 1.05, 0.15],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 0.85,
        ease: [0.25, 0.46, 0.45, 0.94],
        times: [0, 0.5, 1],
      }}
      className="fixed w-10 h-10 rounded-full overflow-hidden border-2 border-[#d82828]
                 shadow-[0_0_16px_rgba(216,40,40,0.5)] bg-white z-[9998]"
      style={{ position: "fixed" }}
    >
      <img src={particle.image} className="w-full h-full object-cover" alt="" />
    </motion.div>
  );
}
