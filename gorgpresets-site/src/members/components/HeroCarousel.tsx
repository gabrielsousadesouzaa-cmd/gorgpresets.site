import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Play, ShoppingBag, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeroSlide, Product } from "../lib/types";
import { Btn, SafeImg } from "./ui";

interface HeroCarouselProps {
  slides: HeroSlide[];
  products: Product[];
  owned: Set<string>;
  interval: number;
  /** Troca automática dos banners (desligada no modo de edição). */
  autoPlay?: boolean;
  /** Índice controlado por fora (modo de edição). */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Controles extras sobre o banner (modo de edição). */
  overlay?: ReactNode;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroCarousel({ slides, products, owned, interval, autoPlay = true, index: controlledIndex, onIndexChange, overlay }: HeroCarouselProps) {
  const [innerIndex, setInnerIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [muted, setMuted] = useState(true);
  const touchX = useRef<number | null>(null);
  const navigate = useNavigate();
  const count = slides.length;
  const index = Math.max(0, Math.min(controlledIndex ?? innerIndex, count - 1));
  const slide = slides[index];
  const seconds = Math.max(4, interval || 8);
  const paused = hovered || !autoPlay;

  const go = useCallback(
    (next: number) => {
      const target = ((next % count) + count) % count;
      if (onIndexChange) onIndexChange(target);
      else setInnerIndex(target);
    },
    [count, onIndexChange],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setTimeout(() => go(index + 1), seconds * 1000);
    return () => clearTimeout(t);
  }, [index, paused, count, seconds, go]);

  if (!slide) return null;

  const product = products.find((p) => p.id === slide.productId);
  const isLocked = !!product && !owned.has(product.id);
  const light = slide.theme === "light";

  const primary = () => {
    if (slide.ctaUrl) {
      window.open(slide.ctaUrl, "_blank", "noopener");
      return;
    }
    if (product) navigate(`/membros/colecao/${product.slug}${isLocked ? "" : "?play=1"}`);
  };

  return (
    <section
      className="relative h-[78svh] min-h-[540px] w-full overflow-hidden md:h-[88vh] md:max-h-[920px] md:min-h-[600px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
          className={cn("absolute inset-0", light ? "bg-[#efefef]" : "bg-neutral-950")}
        >
          {/* Fundo: vídeo > imagem > degradê da marca */}
          <div className="ma-kenburns absolute inset-0">
            {slide.videoUrl ? (
              <video
                key={slide.videoUrl}
                src={slide.videoUrl}
                poster={slide.imageUrl || undefined}
                autoPlay
                muted={muted}
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <picture>
                {slide.mobileImageUrl && <source media="(max-width: 767px)" srcSet={slide.mobileImageUrl} />}
                <SafeImg src={slide.imageUrl} alt="" loading="eager" className="h-full w-full object-cover" />
              </picture>
            )}
            {!slide.imageUrl && !slide.videoUrl && !light && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgb(var(--ma-accent)/0.35),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(255,255,255,0.06),transparent_50%)]" />
            )}
          </div>

          {/* Véus para leitura do texto e transição para o preto da página */}
          {light ? (
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/10 to-transparent" />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/70 to-transparent md:h-56" />
        </motion.div>
      </AnimatePresence>

      {/* Conteúdo */}
      <div className="ma-gutter relative z-10 flex h-full flex-col justify-end pb-32 md:justify-center md:pb-24 md:pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial="hidden"
            animate="show"
            exit="exit"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
              exit: { opacity: 0, transition: { duration: 0.25 } },
            }}
            className="max-w-[640px]"
          >
            {slide.eyebrow && (
              <motion.span variants={item} className={cn("mb-4 inline-flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.3em] md:mb-5 md:text-[11px]", light ? "text-ma" : "text-white/85")}>
                <span className="h-[2px] w-6 rounded-full bg-ma" />
                {slide.eyebrow}
              </motion.span>
            )}

            <motion.div variants={item}>
              {slide.logoUrl ? (
                <SafeImg src={slide.logoUrl} alt={slide.title} loading="eager" className="mb-5 max-h-24 w-auto max-w-[78%] object-contain object-left md:mb-7 md:max-h-36" />
              ) : null}
              {slide.title && (
                <h1
                  className={cn(
                    "font-semibold uppercase leading-[0.98] tracking-[-0.035em] [text-wrap:balance]",
                    slide.logoUrl ? "text-3xl md:text-5xl" : "text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[5.4rem]",
                    light ? "text-black" : "text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.35)]",
                  )}
                >
                  {slide.title}
                </h1>
              )}
            </motion.div>

            {slide.subtitle && (
              <motion.p variants={item} className={cn("mt-5 max-w-xl text-[15px] leading-relaxed md:mt-6 md:text-lg", light ? "text-black/70" : "text-white/80")}>
                {slide.subtitle}
              </motion.p>
            )}

            {(product || slide.ctaUrl) && (
              <motion.div variants={item} className="mt-7 flex flex-wrap items-center gap-3 md:mt-9">
                <Btn
                  size="lg"
                  variant={isLocked ? "accent" : light ? "accent" : "white"}
                  onClick={primary}
                  icon={isLocked ? <ShoppingBag size={16} /> : <Play size={16} fill="currentColor" />}
                >
                  {slide.ctaLabel || (isLocked ? "Desbloquear" : "Assistir agora")}
                </Btn>
                {product && (
                  <Btn
                    size="lg"
                    variant={light ? "outline" : "glass"}
                    className={light ? "text-black ring-black/20 hover:bg-black/5 hover:ring-black/40" : undefined}
                    onClick={() => navigate(`/membros/colecao/${product.slug}`)}
                    icon={<Info size={16} />}
                  >
                    Mais informações
                  </Btn>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controles: indicadores com progresso (estilo Apple TV) + som do vídeo */}
      <div className="ma-gutter absolute inset-x-0 bottom-[84px] z-20 flex items-center justify-between md:bottom-[148px]">
        <div className="flex items-center gap-2">
          {count > 1 &&
            slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i)}
                aria-label={`Destaque ${i + 1}`}
                className={cn(
                  "relative h-[5px] overflow-hidden rounded-full transition-all duration-500 ease-expo",
                  i === index ? "w-10 md:w-12" : "w-[5px] hover:w-4",
                  light ? "bg-black/20" : "bg-white/30",
                )}
              >
                {i === index &&
                  (autoPlay ? (
                    <span
                      key={`${s.id}-${paused}`}
                      className={cn("ma-fill absolute inset-0 rounded-full", light ? "bg-black" : "bg-white")}
                      style={{ animationDuration: `${seconds}s`, animationPlayState: paused ? "paused" : "running" }}
                    />
                  ) : (
                    <span className={cn("absolute inset-0 rounded-full", light ? "bg-black" : "bg-white")} />
                  ))}
              </button>
            ))}
        </div>
        {slide.videoUrl && (
          <button
            onClick={() => setMuted((m) => !m)}
            className="grid h-10 w-10 place-items-center rounded-full text-white ring-1 ring-white/40 transition hover:bg-white/10"
            aria-label={muted ? "Ativar som" : "Desativar som"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </div>

      {overlay}
    </section>
  );
}

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};
