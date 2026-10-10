import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Product } from "../lib/types";
import { hexToRgbTriplet } from "../lib/format";
import { SafeImg } from "./ui";

/**
 * Capa vertical (2:3). Se o produtor enviou uma capa pronta, ela é usada.
 * Senão, a capa é montada automaticamente no mesmo estilo das capas da Gorg:
 * foto de fundo + cartão de vidro com "Lr", nome e "MOBILE E DESKTOP".
 */
export const PosterArt = memo(function PosterArt({ product, className, brand = "GORG PRESETS" }: { product: Product; className?: string; brand?: string }) {
  const rgb = hexToRgbTriplet(product.accentColor || "#2a2a2e");
  return (
    <div className={cn("ma-poster absolute inset-0 overflow-hidden", className)} style={{ background: `linear-gradient(160deg, rgb(${rgb}) 0%, #0b0b0c 95%)` }}>
      {product.coverUrl ? (
        <SafeImg src={product.coverUrl} alt={product.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <SafeImg src={product.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
          <div
            className="absolute left-1/2 top-1/2 flex w-[64%] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[9cqw] px-[5cqw] py-[7cqw] text-center text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/35 backdrop-blur-md"
            style={{ background: `rgb(${rgb} / 0.62)` }}
          >
            <span className="text-[8.5cqw] font-bold leading-none tracking-tight">Lr</span>
            <span className="mt-[6cqw] text-[8.5cqw] font-semibold uppercase leading-[1.05] tracking-tight [text-wrap:balance]">{product.title}</span>
            {product.subtitle && <span className="mt-[2cqw] text-[4.4cqw] font-normal uppercase text-white/85">{product.subtitle}</span>}
            <span className="mt-[7cqw] text-[4.2cqw] font-semibold uppercase tracking-[0.04em]">{brand}</span>
          </div>
        </>
      )}
    </div>
  );
});

/** Arte horizontal (16:9) para vitrines em paisagem e "Continuar assistindo". */
export const LandscapeArt = memo(function LandscapeArt({ product, image, showTitle = true, className }: { product: Product; image?: string; showTitle?: boolean; className?: string }) {
  const rgb = hexToRgbTriplet(product.accentColor || "#2a2a2e");
  const src = image || product.bannerUrl || product.coverUrl;
  return (
    <div className={cn("ma-poster absolute inset-0 overflow-hidden", className)} style={{ background: `linear-gradient(135deg, rgb(${rgb}) 0%, #0b0b0c 90%)` }}>
      <SafeImg src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {showTitle && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute bottom-[6cqw] left-[6cqw] right-[6cqw]">
            {product.logoUrl ? (
              <SafeImg src={product.logoUrl} alt={product.title} className="max-h-[18cqw] max-w-[60%] object-contain object-left" />
            ) : (
              <span className="block text-[7cqw] font-bold uppercase leading-none tracking-tight text-white drop-shadow-lg">{product.title}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
});
