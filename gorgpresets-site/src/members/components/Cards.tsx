import { memo } from "react";
import { Link } from "react-router-dom";
import { Check, Play, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lesson, Product } from "../lib/types";
import { formatDuration } from "../lib/format";
import { LandscapeArt, PosterArt } from "./PosterArt";
import { ProgressBar } from "./ui";

export const POSTER_WIDTH = "w-[40vw] sm:w-[27vw] md:w-[21vw] lg:w-[17vw] 2xl:w-[14.5vw]";
export const RANKED_WIDTH = "w-[54vw] sm:w-[37vw] md:w-[29vw] lg:w-[23.5vw] 2xl:w-[20vw]";
export const LANDSCAPE_WIDTH = "w-[74vw] sm:w-[45vw] md:w-[33vw] lg:w-[26vw] 2xl:w-[21vw]";

const cardBase =
  "group/card relative block overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/[0.07] transition duration-500 ease-expo will-change-transform hover:z-10 hover:scale-[1.045] hover:ring-white/25 hover:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:rounded-2xl";

interface ProductCardProps {
  product: Product;
  locked: boolean;
  percent?: number;
  className?: string;
}

function CardBadges({ product, locked }: { product: Product; locked: boolean }) {
  return (
    <>
      {(product.badge || !product.published) && (
        <span
          className={cn(
            "absolute left-2.5 top-2.5 z-10 rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] shadow-lg md:left-3 md:top-3 md:text-[10px]",
            product.published ? "bg-ma text-white" : "bg-amber-400 text-black",
          )}
        >
          {product.published ? product.badge : "Rascunho"}
        </span>
      )}
      {locked && (
        <span className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-ma ring-1 ring-white/10 backdrop-blur-md md:right-3 md:top-3">
          <ShoppingBag size={15} strokeWidth={2.4} />
        </span>
      )}
    </>
  );
}

function HoverInfo({ locked, percent, label }: { locked: boolean; percent?: number; label?: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 translate-y-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-10 opacity-0 transition duration-500 ease-expo group-hover/card:translate-y-0 group-hover/card:opacity-100 md:p-4 md:pt-12">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", locked ? "bg-ma text-white" : "bg-white text-black")}>
          {locked ? <ShoppingBag size={14} /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
        </span>
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          {label || (locked ? "Desbloquear" : percent ? "Continuar" : "Assistir")}
        </span>
      </div>
      {!locked && !!percent && percent < 100 && <ProgressBar value={percent} thin className="mt-3" />}
    </div>
  );
}

export const PosterCard = memo(function PosterCard({ product, locked, percent, className }: ProductCardProps) {
  return (
    <Link to={`/membros/colecao/${product.slug}`} className={cn(cardBase, "aspect-[2/3]", POSTER_WIDTH, className)} aria-label={product.title}>
      <PosterArt product={product} />
      <CardBadges product={product} locked={locked} />
      <HoverInfo locked={locked} percent={percent} />
      {!locked && !!percent && (
        <div className="absolute inset-x-0 bottom-0 z-[5] h-[3px] bg-white/15 transition-opacity group-hover/card:opacity-0">
          <div className="h-full bg-ma" style={{ width: `${percent}%` }} />
        </div>
      )}
    </Link>
  );
});

export const RankedCard = memo(function RankedCard({ product, locked, percent, rank }: ProductCardProps & { rank: number }) {
  return (
    <div className={cn("relative flex items-end", RANKED_WIDTH)}>
      <span className="ma-rank -mr-[9%] w-[46%] shrink-0 text-right text-[30vw] sm:text-[20vw] md:text-[16vw] lg:text-[13vw] 2xl:text-[11vw]" aria-hidden>
        {rank}
      </span>
      <PosterCard product={product} locked={locked} percent={percent} className="w-[63%] sm:w-[63%] md:w-[63%] lg:w-[63%] 2xl:w-[63%]" />
    </div>
  );
});

export const LandscapeCard = memo(function LandscapeCard({ product, locked, percent, className }: ProductCardProps) {
  return (
    <Link to={`/membros/colecao/${product.slug}`} className={cn(cardBase, "aspect-video", LANDSCAPE_WIDTH, className)} aria-label={product.title}>
      <LandscapeArt product={product} />
      <CardBadges product={product} locked={locked} />
      <HoverInfo locked={locked} percent={percent} label={locked && product.priceLabel ? `Desbloquear · ${product.priceLabel}` : undefined} />
    </Link>
  );
});

export const ContinueCard = memo(function ContinueCard({ product, lesson, percent }: { product: Product; lesson: Lesson; percent: number }) {
  return (
    <Link to={`/membros/colecao/${product.slug}/aula/${lesson.id}`} className={cn("group/card block", LANDSCAPE_WIDTH)}>
      <div className={cn(cardBase, "aspect-video w-full")}>
        <LandscapeArt product={product} image={lesson.thumbnailUrl} showTitle={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-white/90 text-black opacity-0 shadow-2xl transition duration-500 group-hover/card:scale-100 group-hover/card:opacity-100 md:h-14 md:w-14">
          <Play size={20} className="ml-0.5" fill="currentColor" />
        </span>
        {lesson.durationSeconds > 0 && (
          <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            {formatDuration(lesson.durationSeconds)}
          </span>
        )}
        <div className="absolute inset-x-3 bottom-2">
          <ProgressBar value={Math.max(percent, 3)} thin />
        </div>
      </div>
      <div className="mt-3 px-0.5">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{product.title}</p>
        <p className="mt-1 truncate text-sm font-semibold text-white/90 transition-colors group-hover/card:text-white">{lesson.title}</p>
      </div>
    </Link>
  );
});

export function CompletedMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-black", className)}>
      <Check size={12} strokeWidth={3.5} />
    </span>
  );
}
