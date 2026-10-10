// Modo "Editar página": o produtor edita a home direto no portal, vendo o mesmo
// layout dos membros. Cada mudança é salva na hora. Este arquivo só é baixado
// quando o produtor liga o modo de edição.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Eye, EyeOff, ImagePlus, LayoutDashboard, Loader2, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, useRefreshPortal, useRepo } from "../../context/MembersContext";
import { blankRow, blankSlide } from "../../lib/defaults";
import { uid } from "../../lib/format";
import type { Catalog, CardStyle, HeroSlide, PortalSettings, Product, Row, RowKind } from "../../lib/types";
import type { HomeModel } from "../../pages/Home";
import { HeroCarousel } from "../../components/HeroCarousel";
import { Rail } from "../../components/Rail";
import { ContinueCard, LANDSCAPE_WIDTH, POSTER_WIDTH, RowProductCard } from "../../components/Cards";
import { ConfirmProvider, useConfirm } from "../ui";
import { RowModal } from "../pages/Rows";
import { SlideModal } from "../pages/Appearance";

const KIND_LABEL: Record<RowKind, string> = {
  curated: "Seleção manual",
  owned: "Automática · coleções que o membro comprou",
  continue: "Automática · aulas em andamento",
  locked: "Automática · coleções que o membro ainda não tem",
  all: "Automática · todo o catálogo",
};

export default function HomeEditor(props: { model: HomeModel; onExit: () => void }) {
  return (
    <ConfirmProvider>
      <Editor {...props} />
    </ConfirmProvider>
  );
}

function Editor({ model, onExit }: { model: HomeModel; onExit: () => void }) {
  const repo = useRepo();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refresh = useRefreshPortal();
  const confirm = useConfirm();
  const { products, owned, percentOf, slides, customSlides, rows, continueItems } = model;

  const [pending, setPending] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [rowModal, setRowModal] = useState<{ row: Row; isNew: boolean; insertAt?: number } | null>(null);
  const [slideModal, setSlideModal] = useState<{ slide: HeroSlide; isNew: boolean; index?: number } | null>(null);

  const slideIndex = Math.max(0, Math.min(heroIndex, slides.length - 1));
  const catalogKey = ["ma", "catalog", user?.id];

  useEffect(() => {
    toast("Modo de edição ligado", { id: "ma-edit-mode", description: "Clique nos títulos para editar. Tudo é salvo na hora e aparece para os membros." });
  }, []);

  /** Salva no servidor e recarrega os dados. Devolve undefined se der erro. */
  const persist = useCallback(
    async <T,>(fn: () => Promise<T>, options: { success?: string; scopes?: string[] } = {}): Promise<T | undefined> => {
      setPending((n) => n + 1);
      try {
        const result = await fn();
        if (options.success) toast.success(options.success);
        return result;
      } catch (err) {
        toast.error((err as Error).message || "Não foi possível salvar. Tente de novo.");
        return undefined;
      } finally {
        await refresh(...(options.scopes || ["catalog"])).catch(() => undefined);
        setPending((n) => n - 1);
      }
    },
    [refresh],
  );

  // Atualização otimista: a tela muda na hora e o servidor confirma em seguida.
  const patchRows = (fn: (list: Row[]) => Row[]) => {
    void queryClient.cancelQueries({ queryKey: catalogKey });
    queryClient.setQueryData<Catalog>(catalogKey, (c) => (c ? { ...c, rows: fn(c.rows) } : c));
  };

  // ── Seções ────────────────────────────────────────────────────────
  const updateRow = (row: Row, patch: Partial<Row>, success?: string) => {
    const next = { ...row, ...patch };
    patchRows((list) => list.map((r) => (r.id === row.id ? next : r)));
    return persist(() => repo.saveRow(next), { success });
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const ids = rows.map((r) => r.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    patchRows((list) => list.map((r) => ({ ...r, sortOrder: ids.indexOf(r.id) })));
    void persist(() => repo.reorder("rows", ids));
  };

  const removeRow = async (row: Row) => {
    const ok = await confirm({
      title: `Excluir a seção “${row.title}”?`,
      text: "Ela sai da página inicial de todos os membros. As coleções não são apagadas.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    patchRows((list) => list.filter((r) => r.id !== row.id));
    void persist(() => repo.deleteRow(row.id), { success: "Seção excluída" });
  };

  const saveRowFromModal = async (row: Row) => {
    const state = rowModal;
    if (!state) return;
    if (!state.isNew) {
      patchRows((list) => list.map((r) => (r.id === row.id ? row : r)));
      if (await persist(() => repo.saveRow(row), { success: "Seção salva" })) setRowModal(null);
      return;
    }
    const at = Math.min(state.insertAt ?? rows.length, rows.length);
    const created = await persist(
      async () => {
        const saved = await repo.saveRow({ ...row, sortOrder: at });
        const ids = rows.map((r) => r.id);
        ids.splice(at, 0, saved.id);
        await repo.reorder("rows", ids);
        return saved;
      },
      { success: "Seção adicionada" },
    );
    if (created) setRowModal(null);
  };

  const curatedList = (row: Row) => row.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);

  const moveProduct = (row: Row, id: string, dir: -1 | 1) => {
    const ids = curatedList(row).map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void updateRow(row, { productIds: ids });
  };

  const removeProduct = (row: Row, id: string) => void updateRow(row, { productIds: row.productIds.filter((p) => p !== id) });

  // ── Banners ───────────────────────────────────────────────────────
  const saveSlides = (heroSlides: HeroSlide[], success?: string) => {
    const current = queryClient.getQueryData<PortalSettings>(["ma", "settings"]) || model.settings;
    const next = { ...current, heroSlides };
    queryClient.setQueryData(["ma", "settings"], next);
    return persist(
      async () => {
        await repo.saveSettings(next);
        return true;
      },
      { success, scopes: ["settings"] },
    );
  };

  // Banners automáticos viram banners fixos na primeira edição, para nenhum sumir.
  const editableSlides = () => (customSlides ? slides : slides.map((s) => ({ ...s, id: uid() })));

  const openEditSlide = () => {
    const slide = slides[slideIndex];
    if (slide) setSlideModal({ slide: customSlides ? slide : { ...slide, id: uid() }, isNew: false, index: slideIndex });
  };

  const saveSlideFromModal = async (slide: HeroSlide) => {
    const state = slideModal;
    if (!state) return;
    const base = editableSlides();
    const next = state.isNew ? [...base, slide] : base.map((s, i) => (i === state.index ? slide : s));
    const focus = state.isNew ? next.length - 1 : state.index ?? 0;
    if (await saveSlides(next, state.isNew ? "Banner adicionado" : "Banner salvo")) {
      setHeroIndex(focus);
      setSlideModal(null);
    }
  };

  const moveSlide = (dir: -1 | 1) => {
    const target = slideIndex + dir;
    if (!customSlides || target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[slideIndex], next[target]] = [next[target], next[slideIndex]];
    setHeroIndex(target);
    void saveSlides(next);
  };

  const removeSlide = async () => {
    const slide = slides[slideIndex];
    if (!customSlides || !slide) return;
    const ok = await confirm({
      title: "Remover este banner?",
      text: slides.length === 1 ? "Sem banners, a home volta a destacar as coleções automaticamente." : "Os outros banners continuam no ar.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    if (await saveSlides(slides.filter((s) => s.id !== slide.id), "Banner removido")) setHeroIndex(Math.max(0, slideIndex - 1));
  };

  const openNewSlide = () => setSlideModal({ slide: blankSlide(), isNew: true });
  const openNewRow = (insertAt: number) => setRowModal({ row: blankRow(insertAt), isNew: true, insertAt });

  const heroControls = (
    <div className="absolute right-[var(--ma-gutter)] top-[76px] z-30 md:top-28">
      <div className="ma-glass flex items-center gap-0.5 rounded-full p-1 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15 sm:pl-4">
        <span className="mr-1 hidden text-[10px] font-bold uppercase tracking-[0.18em] text-white/75 sm:inline">
          Banner {slideIndex + 1}/{slides.length}
          {!customSlides && <span className="text-white/45"> · automático</span>}
        </span>
        {customSlides && slides.length > 1 && (
          <>
            <ToolButton label="Mover banner para a esquerda" onClick={() => moveSlide(-1)} disabled={slideIndex === 0}>
              <ChevronLeft size={16} />
            </ToolButton>
            <ToolButton label="Mover banner para a direita" onClick={() => moveSlide(1)} disabled={slideIndex === slides.length - 1}>
              <ChevronRight size={16} />
            </ToolButton>
          </>
        )}
        <button
          type="button"
          onClick={openEditSlide}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/85 md:h-9"
        >
          <Pencil size={13} />
          {customSlides ? "Editar" : "Personalizar"}
        </button>
        <ToolButton label="Novo banner" onClick={openNewSlide}>
          <Plus size={16} />
        </ToolButton>
        {customSlides && (
          <ToolButton label="Remover banner" onClick={removeSlide} danger>
            <Trash2 size={15} />
          </ToolButton>
        )}
      </div>
    </div>
  );

  const renderCards = (row: Row): ReactNode => {
    if (row.kind === "continue") {
      if (!continueItems.length) return <InfoCard style="landscape" title="Aulas em andamento" text="Aparece para cada membro assim que ele começa a assistir uma aula." />;
      return continueItems.map((item) => (
        <EditCard key={item.lesson.id}>
          <ContinueCard product={item.product} lesson={item.lesson} percent={item.percent} />
        </EditCard>
      ));
    }

    if (row.kind === "curated") {
      const list = curatedList(row);
      return (
        <>
          {list.map((p, i) => {
            const locked = !owned.has(p.id);
            return (
              <EditCard
                key={p.id}
                controls={
                  <>
                    <ToolButton small label="Mover para a esquerda" onClick={() => moveProduct(row, p.id, -1)} disabled={i === 0}>
                      <ChevronLeft size={15} />
                    </ToolButton>
                    <ToolButton small label="Mover para a direita" onClick={() => moveProduct(row, p.id, 1)} disabled={i === list.length - 1}>
                      <ChevronRight size={15} />
                    </ToolButton>
                    <ToolButton small label="Tirar desta seção" onClick={() => removeProduct(row, p.id)} danger>
                      <X size={15} />
                    </ToolButton>
                  </>
                }
              >
                <RowProductCard style={row.cardStyle} product={p} locked={locked} percent={locked ? 0 : percentOf(p)} rank={i + 1} />
              </EditCard>
            );
          })}
          <AddCard
            style={row.cardStyle}
            label={list.length ? "Adicionar coleção" : "Escolher coleções"}
            text={list.length ? undefined : "Esta seção ainda está vazia e não aparece para os membros."}
            onClick={() => setRowModal({ row, isNew: false })}
          />
        </>
      );
    }

    // Seções automáticas: prévia com todo o catálogo (cada membro vê a própria versão).
    if (!products.length) return <InfoCard style={row.cardStyle} title="Sem coleções" text="Crie e publique coleções no Studio para preencher esta seção." />;
    return products.map((p, i) => (
      <EditCard key={p.id}>
        <RowProductCard style={row.cardStyle} product={p} locked={row.kind === "locked"} percent={row.kind === "locked" ? 0 : percentOf(p)} rank={i + 1} />
      </EditCard>
    ));
  };

  return (
    <div className="pb-48 md:pb-36">
      {slides.length > 0 ? (
        <HeroCarousel
          slides={slides}
          products={products}
          owned={owned}
          interval={model.settings.heroInterval || 8}
          autoPlay={false}
          index={slideIndex}
          onIndexChange={setHeroIndex}
          overlay={heroControls}
        />
      ) : (
        <div className="ma-gutter pb-24 pt-28 md:pt-36">
          <button
            type="button"
            onClick={openNewSlide}
            className="flex h-[38vh] w-full flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-white/20 bg-white/[0.02] text-white/60 transition hover:border-white/45 hover:text-white"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
              <ImagePlus />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Adicionar banner principal</span>
          </button>
        </div>
      )}

      <div className={cn("relative z-10 space-y-1 md:space-y-2", slides.length > 0 && "-mt-16 md:-mt-28")}>
        {rows.length === 0 && (
          <div className="ma-gutter">
            <div className="rounded-[2rem] bg-white/[0.03] px-6 py-10 text-center ring-1 ring-white/[0.07]">
              <p className="text-lg font-bold uppercase tracking-tight">Nenhuma seção ainda</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                Sem seções, os membros veem “Sua Coleção Particular”, “Continuar assistindo” e “Desbloqueie novas estéticas” automaticamente.
              </p>
              <button type="button" onClick={() => openNewRow(0)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-black">
                <Plus size={15} /> Adicionar seção
              </button>
            </div>
          </div>
        )}

        {rows.map((row, index) => (
          <div key={row.id}>
            <div className={cn("group/row relative py-1 transition-opacity", !row.visible && "opacity-50 hover:opacity-100")}>
              <span aria-hidden className="pointer-events-none absolute inset-x-1.5 inset-y-0 rounded-[28px] border border-dashed border-white/[0.07] transition-colors group-hover/row:border-white/20 md:inset-x-3" />
              <Rail
                title={row.title}
                heading={
                  <div className="flex w-full min-w-0 flex-col gap-2 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <InlineText
                        label="Título da seção"
                        value={row.title}
                        required
                        placeholder="Título da seção"
                        onCommit={(title) => void updateRow(row, { title })}
                        className={cn("text-lg font-bold tracking-tight md:text-[22px]", row.accentTitle ? "text-ma" : "text-white")}
                      />
                      <InlineText
                        label="Subtítulo da seção"
                        value={row.subtitle}
                        placeholder="Adicionar subtítulo…"
                        onCommit={(subtitle) => void updateRow(row, { subtitle })}
                        className="mt-0.5 text-[13px] text-white/55 md:text-sm"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Chip>{KIND_LABEL[row.kind]}</Chip>
                        {!row.visible && (
                          <Chip tone="amber">
                            <EyeOff size={11} /> Oculta para os membros
                          </Chip>
                        )}
                      </div>
                    </div>
                    <div className="order-first flex shrink-0 items-center gap-0.5 self-end rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10 backdrop-blur sm:order-none sm:self-auto">
                      <ToolButton label="Subir seção" onClick={() => moveRow(index, -1)} disabled={index === 0}>
                        <ArrowUp size={15} />
                      </ToolButton>
                      <ToolButton label="Descer seção" onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1}>
                        <ArrowDown size={15} />
                      </ToolButton>
                      <ToolButton
                        label={row.visible ? "Ocultar dos membros" : "Mostrar para os membros"}
                        onClick={() => void updateRow(row, { visible: !row.visible }, row.visible ? "Seção oculta para os membros" : "Seção visível para os membros")}
                      >
                        {row.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </ToolButton>
                      <ToolButton label="Configurar seção" onClick={() => setRowModal({ row, isNew: false })}>
                        <Settings2 size={15} />
                      </ToolButton>
                      <ToolButton label="Excluir seção" onClick={() => removeRow(row)} danger>
                        <Trash2 size={15} />
                      </ToolButton>
                    </div>
                  </div>
                }
              >
                {renderCards(row)}
              </Rail>
            </div>
            <InsertGap onClick={() => openNewRow(index + 1)} />
          </div>
        ))}
      </div>

      {/* Barra do modo de edição */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-3 md:bottom-6"
      >
        <div className="ma-glass pointer-events-auto flex max-w-full items-center gap-1 rounded-full p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] ring-1 ring-white/15">
          <span className="flex items-center gap-2 pl-2.5 pr-1.5 text-[11px] font-semibold text-white/70" aria-live="polite">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />}
            <span className="hidden lg:inline">{pending ? "Salvando…" : "Modo edição · salvo automaticamente"}</span>
            <span className="sr-only lg:hidden">{pending ? "Salvando" : "Tudo salvo"}</span>
          </span>
          <DockButton onClick={() => openNewRow(rows.length)} icon={<Plus size={15} />}>
            Seção
          </DockButton>
          <DockButton onClick={openNewSlide} icon={<ImagePlus size={15} />}>
            Banner
          </DockButton>
          <Link
            to="/membros/studio"
            className="hidden h-9 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <LayoutDashboard size={15} /> Studio
          </Link>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white/85"
          >
            <Check size={15} strokeWidth={2.6} /> Concluir
          </button>
        </div>
      </motion.div>

      <RowModal state={rowModal} products={products} onClose={() => setRowModal(null)} onSave={saveRowFromModal} />
      <SlideModal state={slideModal} onClose={() => setSlideModal(null)} onSave={saveSlideFromModal} saveLabel={slideModal?.isNew ? "Adicionar banner" : "Salvar banner"} />
    </div>
  );
}

// ── Peças da interface ───────────────────────────────────────────────

/** Texto editável no lugar: Enter salva, Esc desfaz. */
function InlineText({ value, placeholder, onCommit, className, required, label }: { value: string; placeholder: string; onCommit: (value: string) => void; className?: string; required?: boolean; label: string }) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  return (
    <input
      aria-label={label}
      title="Clique para editar"
      value={draft}
      placeholder={placeholder}
      size={Math.max((draft || placeholder).length + 2, 6)}
      onFocus={() => (focused.current = true)}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        focused.current = false;
        const next = draft.trim();
        if (cancelled.current || (required && !next) || next === value) {
          cancelled.current = false;
          setDraft(value);
          return;
        }
        onCommit(next);
      }}
      className={cn(
        "-mx-2 block max-w-full cursor-text rounded-lg bg-transparent px-2 py-0.5 outline-none ring-1 ring-transparent transition placeholder:font-normal placeholder:text-white/30 hover:bg-white/[0.05] hover:ring-white/10 focus:bg-white/[0.08] focus:ring-white/25",
        className,
      )}
    />
  );
}

/** Card dentro do editor: não navega ao clicar e mostra controles no hover. */
function EditCard({ children, controls }: { children: ReactNode; controls?: ReactNode }) {
  return (
    <div className="group/edit relative">
      {children}
      <div aria-hidden className="absolute inset-0 z-20 cursor-default" />
      {controls && (
        <div className="absolute inset-x-0 bottom-3 z-30 flex justify-center opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover/edit:opacity-100 md:focus-within:opacity-100">
          <div className="ma-glass flex items-center gap-0.5 rounded-full p-1 ring-1 ring-white/15">{controls}</div>
        </div>
      )}
    </div>
  );
}

function cardBox(style: CardStyle) {
  return style === "landscape" ? cn("aspect-video", LANDSCAPE_WIDTH) : cn("aspect-[2/3]", POSTER_WIDTH);
}

function AddCard({ style, label, text, onClick }: { style: CardStyle; label: string; text?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-center text-white/60 transition hover:border-white/50 hover:bg-white/[0.05] hover:text-white md:rounded-2xl",
        cardBox(style),
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
        <Plus size={18} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      {text && <span className="max-w-[16rem] text-[11px] leading-snug text-white/40">{text}</span>}
    </button>
  );
}

function InfoCard({ style, title, text }: { style: CardStyle; title: string; text: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center md:rounded-2xl", cardBox(style))}>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">{title}</span>
      <span className="max-w-[18rem] text-[12px] leading-snug text-white/40">{text}</span>
    </div>
  );
}

function InsertGap({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/gap relative flex h-9 items-center justify-center md:h-10">
      <span aria-hidden className="absolute inset-x-[var(--ma-gutter)] top-1/2 h-px bg-white/0 transition-colors group-hover/gap:bg-white/15" />
      <button
        type="button"
        onClick={onClick}
        className="relative inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45 ring-1 ring-white/10 transition hover:text-white hover:ring-white/30 focus-visible:opacity-100 md:opacity-0 md:group-hover/gap:opacity-100"
      >
        <Plus size={12} /> Adicionar seção aqui
      </button>
    </div>
  );
}

function ToolButton({ label, onClick, disabled, danger, small, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; small?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-30",
        small ? "h-7 w-7" : "h-8 w-8 md:h-9 md:w-9",
        danger && "hover:bg-red-500/20 hover:text-red-300",
      )}
    >
      {children}
    </button>
  );
}

function DockButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80 transition hover:bg-white/10 hover:text-white sm:px-3.5"
    >
      {icon}
      {children}
    </button>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone?: "amber" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        tone === "amber" ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/25" : "bg-white/[0.06] text-white/50 ring-1 ring-white/10",
      )}
    >
      {children}
    </span>
  );
}
