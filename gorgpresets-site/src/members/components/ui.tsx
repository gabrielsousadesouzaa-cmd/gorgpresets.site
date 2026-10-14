import { forwardRef, useState, type ButtonHTMLAttributes, type ImgHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "../lib/format";

type Variant = "white" | "glass" | "accent" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  white: "bg-white text-black hover:bg-white/85 shadow-[0_8px_30px_-10px_rgba(255,255,255,0.35)]",
  glass: "ma-glass-light text-white ring-1 ring-inset ring-white/20 hover:bg-white/20",
  accent: "bg-ma text-white hover:brightness-110 shadow-[0_10px_30px_-10px_rgb(var(--ma-accent)/0.7)]",
  ghost: "text-white/80 hover:text-white hover:bg-white/10",
  outline: "text-white ring-1 ring-inset ring-white/25 hover:ring-white/60 hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[10px] gap-1.5",
  md: "h-11 px-6 text-[11px] gap-2",
  lg: "h-12 md:h-14 px-7 md:px-9 text-[11px] md:text-xs gap-2.5",
};

const base =
  "inline-flex items-center justify-center rounded-full font-bold uppercase tracking-[0.14em] whitespace-nowrap select-none transition-all duration-300 ease-expo active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = "white", size = "md", loading, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface BtnLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function BtnLink({ variant = "white", size = "md", icon, className, children, ...props }: BtnLinkProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-6 w-6 animate-spin text-white/60", className)} />;
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-5">
        <img src="/members/mark-white.png" alt="" className="h-12 w-auto animate-pulse opacity-90" />
        <div className="h-[3px] w-24 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-[ma-loader_1.1s_ease-in-out_infinite] rounded-full bg-ma" />
        </div>
      </div>
      <style>{`@keyframes ma-loader{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

export function ProgressBar({ value, className, thin }: { value: number; className?: string; thin?: boolean }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-white/15", thin ? "h-[3px]" : "h-1.5", className)}>
      <div
        className="h-full rounded-full bg-ma transition-[width] duration-700 ease-expo"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Título de seção no padrão da loja: caixa alta, tracking apertado e barra vermelha. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-ma", className)}>
      <span className="h-[2px] w-5 rounded-full bg-ma" />
      {children}
    </span>
  );
}

const AVATAR_COLORS = ["#d82828", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#6366f1"];

export function Avatar({ name, email, size = 36, className }: { name: string; email?: string; size?: number; className?: string }) {
  const seed = (name || email || "M").split("").reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0);
  const color = AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-1 ring-white/20", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(140deg, ${color}, ${color}99)` }}
      aria-hidden
    >
      {initials(name, email)}
    </span>
  );
}

/** <img> que some silenciosamente se a imagem falhar (o fundo do pai assume). */
export function SafeImg({ src, className, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;
  return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} loading="lazy" decoding="async" {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ma-skeleton rounded-xl", className)} />;
}

export function DarkField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-white/40">{hint}</span>}
    </label>
  );
}

export const darkInput =
  "h-12 w-full rounded-xl bg-white/[0.06] px-4 text-[15px] text-white outline-none ring-1 ring-inset ring-white/10 transition placeholder:text-white/30 focus:bg-white/[0.08] focus:ring-2 focus:ring-ma";
