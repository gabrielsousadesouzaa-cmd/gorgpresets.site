import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RailProps {
  title: string;
  subtitle?: string;
  accent?: boolean;
  action?: ReactNode;
  children: ReactNode;
}

/** Vitrine horizontal no estilo Netflix: rolagem com snap, setas no hover e bordas em degradê. */
export function Rail({ title, subtitle, accent, action, children }: RailProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 8, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.82, behavior: "smooth" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div className="ma-gutter flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className={cn("text-lg font-bold tracking-tight md:text-[22px]", accent ? "text-ma" : "text-white")}>{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-white/55 md:text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>

      <div className="group/rail relative">
        <RailArrow side="left" visible={edges.left} onClick={() => page(-1)} />
        <div ref={scroller} className="ma-scroll gap-2.5 py-5 pl-[var(--ma-gutter)] md:gap-4">
          {children}
          <span aria-hidden className="block w-[calc(var(--ma-gutter)-10px)] shrink-0 md:w-[calc(var(--ma-gutter)-16px)]" />
        </div>
        <RailArrow side="right" visible={edges.right} onClick={() => page(1)} />
      </div>
    </motion.section>
  );
}

function RailArrow({ side, visible, onClick }: { side: "left" | "right"; visible: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Anterior" : "Próximo"}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "absolute bottom-5 top-5 z-20 hidden w-[var(--ma-gutter)] items-center justify-center text-white transition-opacity duration-300 md:flex",
        side === "left" ? "left-0 bg-gradient-to-r from-black/90 to-transparent" : "right-0 bg-gradient-to-l from-black/90 to-transparent",
        visible ? "opacity-0 group-hover/rail:opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icon className="h-9 w-9 drop-shadow-lg transition-transform duration-300 hover:scale-125" strokeWidth={2.2} />
    </button>
  );
}
