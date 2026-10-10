// Kit de interface do Studio: tema claro no estilo Apple, com a identidade do
// painel da loja (preto, vermelho #d82828, cantos generosos).
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, Copy, ImagePlus, Link2, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRepo } from "../context/MembersContext";
import type { UploadOptions } from "../lib/types";

// ── Botões ──────────────────────────────────────────────────────────
type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
const btnVariants: Record<Variant, string> = {
  primary: "bg-[#1d1d1f] text-white hover:bg-black shadow-sm",
  accent: "bg-ma text-white hover:brightness-110 shadow-[0_8px_20px_-8px_rgb(var(--ma-accent)/0.6)]",
  secondary: "bg-white text-[#1d1d1f] ring-1 ring-inset ring-black/10 hover:bg-[#fafafa] hover:ring-black/20 shadow-sm",
  ghost: "text-[#1d1d1f]/70 hover:bg-black/[0.05] hover:text-[#1d1d1f]",
  danger: "bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
        size === "sm" ? "h-8 px-3.5 text-[12px]" : "h-10 px-5 text-[13px]",
        btnVariants[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ to, variant = "primary", size = "md", icon, className, children }: { to: string; variant?: Variant; size?: "sm" | "md"; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 active:scale-[0.97]",
        size === "sm" ? "h-8 px-3.5 text-[12px]" : "h-10 px-5 text-[13px]",
        btnVariants[variant],
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.06] hover:text-[#1d1d1f]", className)}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Estrutura ───────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-[2rem] font-bold uppercase leading-none tracking-tighter text-[#1d1d1f] md:text-[2.6rem]">{title}</h1>
        <div className="mt-3 h-[3px] w-10 rounded-full bg-ma" />
        {subtitle && <p className="mt-4 max-w-2xl text-[15px] text-[#6e6e73]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className, padded = true }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-[1.6rem] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_30px_-12px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.05]", className)}>
      {(title || actions) && (
        <header className={cn("flex items-start justify-between gap-4", padded ? "px-6 pt-6 md:px-7 md:pt-7" : "px-6 py-5")}>
          <div className="min-w-0">
            {title && <h2 className="text-[17px] font-bold tracking-tight text-[#1d1d1f]">{title}</h2>}
            {description && <p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children && <div className={cn(padded && "p-6 md:p-7", padded && (title || actions) && "pt-5 md:pt-5")}>{children}</div>}
    </section>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[1.6rem] border-2 border-dashed border-black/[0.08] px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ma/10 text-ma">{icon}</span>
      <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-[#6e6e73]">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "green" | "amber" | "red" | "blue" | "dark"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-black/[0.05] text-[#6e6e73]",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70",
    red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/70",
    blue: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70",
    dark: "bg-[#1d1d1f] text-white",
  };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

// ── Formulários ─────────────────────────────────────────────────────
export function Field({ label, hint, children, className, aside }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <div className={cn("block", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[#1d1d1f]">{label}</span>
        {aside}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-[#86868b]">{hint}</p>}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl bg-[#f5f5f7] px-3.5 text-[14px] text-[#1d1d1f] outline-none ring-1 ring-inset ring-black/[0.06] transition placeholder:text-[#a1a1a6] focus:bg-white focus:ring-2 focus:ring-[#1d1d1f] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "min-h-[110px] resize-y py-3 leading-relaxed", className)} {...props} />;
});

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputBase, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean }) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50", checked ? "bg-[#34c759]" : "bg-black/[0.12]")}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 35 }}
        className={cn("absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]", checked ? "right-[2px]" : "left-[2px]")}
      />
    </button>
  );
  if (!label) return control;
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#1d1d1f]">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-[#86868b]">{description}</p>}
      </div>
      {control}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }>; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-full bg-black/[0.05] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors",
            value === o.value ? "text-[#1d1d1f]" : "text-[#6e6e73] hover:text-[#1d1d1f]",
          )}
        >
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-full bg-white shadow-sm" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
          <span className="relative flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ColorField({ value, onChange, presets = ["#d82828", "#1d1d1f", "#e3a73f", "#93644a", "#66773f", "#3b5560", "#c85bd6", "#0a84ff"] }: { value: string; onChange: (v: string) => void; presets?: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn("grid h-8 w-8 place-items-center rounded-full ring-2 ring-offset-2 transition", value.toLowerCase() === c ? "ring-[#1d1d1f]" : "ring-transparent hover:ring-black/15")}
          style={{ background: c }}
          aria-label={c}
        >
          {value.toLowerCase() === c && <Check size={14} className="text-white mix-blend-difference" />}
        </button>
      ))}
      <label className="relative flex h-9 items-center gap-2 rounded-full bg-[#f5f5f7] pl-1 pr-3 ring-1 ring-inset ring-black/[0.06]">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="ma-color h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
          className="w-[72px] bg-transparent text-[13px] font-medium uppercase text-[#1d1d1f] outline-none"
          maxLength={7}
        />
      </label>
    </div>
  );
}

/** Campo de lista de palavras (ex: IDs externos): digite e aperte Enter. */
export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...value, ...parts])));
    setDraft("");
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl bg-[#f5f5f7] p-1.5 ring-1 ring-inset ring-black/[0.06] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1d1d1f]">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-lg bg-white py-1 pl-2.5 pr-1 text-[12px] font-medium shadow-sm ring-1 ring-black/[0.06]">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="grid h-5 w-5 place-items-center rounded text-[#86868b] hover:bg-black/5 hover:text-black" aria-label={`Remover ${tag}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="h-8 min-w-[140px] flex-1 bg-transparent px-2 text-[14px] outline-none placeholder:text-[#a1a1a6]"
      />
    </div>
  );
}

// ── Upload ──────────────────────────────────────────────────────────
export function useUploader() {
  const repo = useRepo();
  const [progress, setProgress] = useState<number | null>(null);
  const upload = useCallback(
    async (file: File, options: Omit<UploadOptions, "onProgress">) => {
      setProgress(0);
      try {
        return await repo.upload(file, { ...options, onProgress: setProgress });
      } catch (err) {
        toast.error((err as Error).message || "Falha no upload");
        return null;
      } finally {
        setProgress(null);
      }
    },
    [repo],
  );
  return { upload, progress, uploading: progress !== null };
}

export function UploadProgress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.08]">
        <div className="h-full rounded-full bg-[#1d1d1f] transition-[width] duration-300" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-[12px] font-semibold tabular-nums text-[#6e6e73]">{value}%</span>
    </div>
  );
}

/** Imagem com upload, colar link e prévia. */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  aspect = "aspect-video",
  folder = "images",
  dark,
  contain,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: string;
  folder?: string;
  dark?: boolean;
  contain?: boolean;
}) {
  const { upload, progress, uploading } = useUploader();
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie um arquivo de imagem (JPG, PNG ou WEBP).");
    const url = await upload(file, { visibility: "public", folder });
    if (url) onChange(url);
  };

  return (
    <Field
      label={label}
      hint={hint}
      aside={
        <button type="button" onClick={() => setLinkMode((v) => !v)} className="flex items-center gap-1 text-[11px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
          <Link2 size={12} /> {linkMode ? "Enviar arquivo" : "Colar link"}
        </button>
      }
    >
      {linkMode ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "group relative w-full overflow-hidden rounded-2xl ring-1 ring-inset transition",
            aspect,
            dark ? "bg-[#111]" : "bg-[#f5f5f7]",
            dragOver ? "ring-2 ring-ma" : "ring-black/[0.06]",
          )}
        >
          {value ? (
            <>
              <img src={value} alt="" className={cn("absolute inset-0 h-full w-full", contain ? "object-contain p-4" : "object-cover")} />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} icon={<Upload size={13} />}>Trocar</Button>
                <Button size="sm" variant="danger" onClick={() => onChange("")} icon={<Trash2 size={13} />}>Remover</Button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors", dark ? "text-white/50 hover:text-white/80" : "text-[#86868b] hover:text-[#1d1d1f]")}>
              <ImagePlus size={22} />
              <span className="px-3 text-center text-[12px] font-medium">Arraste ou clique para enviar</span>
            </button>
          )}
          {uploading && (
            <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/95 p-2.5 shadow-lg">
              <UploadProgress value={progress || 0} />
            </div>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0] || undefined)} />
    </Field>
  );
}

// ── Diálogos ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="ma-studio fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn("relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white text-[#1d1d1f] shadow-2xl sm:rounded-[1.75rem]", widths[size])}
          >
            <header className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                {description && <p className="mt-0.5 text-[13px] text-[#6e6e73]">{description}</p>}
              </div>
              <IconButton label="Fechar" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fbfbfd] px-6 py-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="ma-studio fixed inset-0 z-[200]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[600px] flex-col bg-white text-[#1d1d1f] shadow-2xl sm:rounded-l-[1.75rem]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-6 py-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight">{title}</h2>
                {description && <p className="mt-0.5 text-[13px] text-[#6e6e73]">{description}</p>}
              </div>
              <IconButton label="Fechar" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && <footer className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] bg-[#fbfbfd] px-6 py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2.5">
            {state?.danger && <AlertTriangle size={18} className="text-red-500" />}
            {state?.title}
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>Cancelar</Button>
            <Button variant={state?.danger ? "accent" : "primary"} onClick={() => close(true)} autoFocus>
              {state?.confirmLabel || "Confirmar"}
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-[#6e6e73]">{state?.text}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      icon={copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
    >
      {copied ? "Copiado" : label}
    </Button>
  );
}
