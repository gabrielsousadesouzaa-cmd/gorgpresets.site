import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, History, Layers3, LayoutGrid, Library, Lock, Pencil, Plus, Rows3, Search, Trash2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { blankRow } from "../../lib/defaults";
import { sortByOrder } from "../../lib/format";
import type { CardStyle, Product, Row, RowKind } from "../../lib/types";
import { PosterArt } from "../../components/PosterArt";
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Toggle, useConfirm } from "../ui";
import { SortableList } from "../Sortable";
import { useStudioAction } from "../hooks";

const KINDS: Array<{ id: RowKind; label: string; text: string; icon: typeof Library }> = [
  { id: "curated", label: "Seleção manual", text: "Você escolhe quais coleções e em que ordem.", icon: LayoutGrid },
  { id: "owned", label: "Coleção do membro", text: "Mostra automaticamente o que cada membro já tem.", icon: Library },
  { id: "continue", label: "Continuar assistindo", text: "Aulas em andamento de cada membro.", icon: History },
  { id: "locked", label: "Ainda não tem (upsell)", text: "Coleções que o membro pode desbloquear.", icon: Lock },
  { id: "all", label: "Todas as coleções", text: "Todo o catálogo publicado.", icon: Layers3 },
];

const STYLES: Array<{ id: CardStyle; label: string; preview: JSX.Element }> = [
  {
    id: "poster",
    label: "Pôster",
    preview: (
      <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className="h-9 w-6 rounded-[3px] bg-current opacity-80" />)}</div>
    ),
  },
  {
    id: "ranked",
    label: "Top 10",
    preview: (
      <div className="flex items-end gap-1">
        {[1, 2, 3].map((i) => (
          <span key={i} className="flex items-end">
            <span className="-mr-1 text-[22px] font-black leading-none opacity-40">{i}</span>
            <span className="h-9 w-5 rounded-[3px] bg-current opacity-80" />
          </span>
        ))}
      </div>
    ),
  },
  {
    id: "landscape",
    label: "Paisagem",
    preview: <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-6 w-10 rounded-[3px] bg-current opacity-80" />)}</div>,
  },
];

export default function RowsPage() {
  const { catalog } = useCatalog();
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ row: Row; isNew: boolean } | null>(null);
  const rows = sortByOrder(catalog.rows);
  const products = sortByOrder(catalog.products);

  const remove = async (row: Row) => {
    const ok = await confirm({ title: `Excluir a vitrine “${row.title}”?`, confirmLabel: "Excluir", danger: true });
    if (ok) await run(() => repo.deleteRow(row.id), { success: "Vitrine excluída" });
  };

  return (
    <div>
      <PageHeader
        title="Vitrines da home"
        subtitle="As fileiras horizontais da página inicial, no estilo Netflix. Arraste para definir a ordem."
        actions={<Button icon={<Plus size={16} />} onClick={() => setEditing({ row: { ...blankRow(rows.length), title: "Nova vitrine" }, isNew: true })}>Nova vitrine</Button>}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<Rows3 />} title="Nenhuma vitrine" text="Sem vitrines, a home mostra “Sua coleção” e “Desbloqueie” automaticamente." />
      ) : (
        <SortableList
          items={rows}
          onReorder={(ids) => run(() => repo.reorder("rows", ids), { success: "Ordem salva" })}
          className="space-y-3"
          renderItem={(row, handle) => {
            const kind = KINDS.find((k) => k.id === row.kind)!;
            const picked = row.kind === "curated" ? row.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[] : [];
            return (
              <Card padded={false} className={cn(!row.visible && "opacity-60")}>
                <div className="flex items-center gap-3 px-3 py-4 md:px-5">
                  {handle}
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5f5f7]">
                    <kind.icon size={18} />
                  </span>
                  <button type="button" onClick={() => setEditing({ row, isNew: false })} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("truncate text-[15px] font-bold tracking-tight", row.accentTitle && "text-ma")}>{row.title}</p>
                      <Badge>{kind.label}</Badge>
                      <Badge tone="dark">{STYLES.find((s) => s.id === row.cardStyle)?.label}</Badge>
                    </div>
                    {row.subtitle && <p className="mt-0.5 truncate text-[12px] text-[#86868b]">{row.subtitle}</p>}
                  </button>
                  {picked.length > 0 && (
                    <div className="hidden items-center -space-x-3 md:flex">
                      {picked.slice(0, 5).map((p) => (
                        <span key={p.id} className="relative block aspect-[2/3] w-8 overflow-hidden rounded-md ring-2 ring-white">
                          <PosterArt product={p} />
                        </span>
                      ))}
                      {picked.length > 5 && <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f5f5f7] text-[11px] font-bold ring-2 ring-white">+{picked.length - 5}</span>}
                    </div>
                  )}
                  <IconButton label={row.visible ? "Ocultar" : "Mostrar"} onClick={() => run(() => repo.saveRow({ ...row, visible: !row.visible }), { success: row.visible ? "Vitrine oculta" : "Vitrine visível" })}>
                    {row.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </IconButton>
                  <IconButton label="Editar" onClick={() => setEditing({ row, isNew: false })}><Pencil size={15} /></IconButton>
                  <IconButton label="Excluir" onClick={() => remove(row)} className="hover:text-red-600"><Trash2 size={15} /></IconButton>
                </div>
              </Card>
            );
          }}
        />
      )}

      <RowModal
        state={editing}
        products={products}
        onClose={() => setEditing(null)}
        onSave={async (row) => {
          const saved = await run(() => repo.saveRow(row), { success: "Vitrine salva" });
          if (saved) setEditing(null);
        }}
      />
    </div>
  );
}

function RowModal({ state, products, onClose, onSave }: { state: { row: Row; isNew: boolean } | null; products: Product[]; onClose: () => void; onSave: (row: Row) => Promise<void> }) {
  const [draft, setDraft] = useState<Row | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state) {
      setDraft(state.row);
      setQuery("");
    }
  }, [state]);

  const set = (patch: Partial<Row>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const toggleProduct = (id: string) =>
    draft && set({ productIds: draft.productIds.includes(id) ? draft.productIds.filter((p) => p !== id) : [...draft.productIds, id] });

  const filtered = products.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="lg"
      title={state?.isNew ? "Nova vitrine" : "Editar vitrine"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={saving}
            disabled={!draft?.title.trim()}
            onClick={async () => {
              if (!draft) return;
              setSaving(true);
              await onSave({ ...draft, title: draft.title.trim() });
              setSaving(false);
            }}
          >
            Salvar vitrine
          </Button>
        </>
      }
    >
      {draft && (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Título">
              <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex: Top 10 em Alta" autoFocus />
            </Field>
            <Field label="Subtítulo" hint="Opcional.">
              <Input value={draft.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Ex: Acompanhe os presets mais adquiridos" />
            </Field>
          </div>

          <Field label="O que mostrar">
            <div className="grid gap-2 sm:grid-cols-2">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => set({ kind: k.id, cardStyle: k.id === "continue" ? "landscape" : draft.cardStyle })}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset transition",
                    draft.kind === k.id ? "bg-[#1d1d1f] text-white ring-[#1d1d1f]" : "bg-[#f5f5f7] ring-black/[0.05] hover:ring-black/15",
                  )}
                >
                  <k.icon size={18} className={cn("mt-0.5 shrink-0", draft.kind === k.id ? "text-ma" : "text-[#6e6e73]")} />
                  <span>
                    <span className="block text-[13px] font-bold">{k.label}</span>
                    <span className={cn("mt-0.5 block text-[12px] leading-snug", draft.kind === k.id ? "text-white/60" : "text-[#86868b]")}>{k.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </Field>

          {draft.kind !== "continue" && (
            <Field label="Estilo dos cards">
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => set({ cardStyle: s.id })}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl px-3 py-4 ring-1 ring-inset transition",
                      draft.cardStyle === s.id ? "bg-[#1d1d1f] text-white ring-[#1d1d1f]" : "bg-[#f5f5f7] text-[#1d1d1f] ring-black/[0.05] hover:ring-black/15",
                    )}
                  >
                    <span className="flex h-10 items-end">{s.preview}</span>
                    <span className="text-[12px] font-bold">{s.label}</span>
                  </button>
                ))}
              </div>
            </Field>
          )}

          {draft.kind === "curated" && (
            <Field label={`Coleções (${draft.productIds.length} selecionadas — a ordem segue os cliques)`}>
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1a6]" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar coleção" className="pl-10" />
              </div>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {filtered.map((p) => {
                  const position = draft.productIds.indexOf(p.id);
                  const selected = position !== -1;
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProduct(p.id)} className="group text-left">
                      <span className={cn("relative block aspect-[2/3] overflow-hidden rounded-xl ring-2 transition", selected ? "ring-ma" : "ring-transparent opacity-70 hover:opacity-100")}>
                        <PosterArt product={p} />
                        {selected && (
                          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ma text-[11px] font-bold text-white shadow">
                            {draft.cardStyle === "ranked" ? position + 1 : <Check size={13} strokeWidth={3} />}
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 block truncate text-[11px] font-semibold">{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          <div className="space-y-4 rounded-2xl bg-[#f5f5f7] p-4">
            <Toggle checked={draft.accentTitle} onChange={(accentTitle) => set({ accentTitle })} label="Título em destaque" description="Título na cor da marca, como “Top 10 em Alta”." />
            <Toggle checked={draft.visible} onChange={(visible) => set({ visible })} label="Visível na home" />
          </div>

          {draft.cardStyle === "ranked" && draft.kind === "curated" && (
            <p className="flex items-center gap-2 text-[12px] text-[#86868b]"><Trophy size={14} /> No estilo Top 10 os números seguem a ordem de seleção.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
