import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ExternalLink, FolderDown, Info, Layers, Save, ShoppingBag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { toSlug } from "../../lib/format";
import type { Product } from "../../lib/types";
import { LandscapeArt, PosterArt } from "../../components/PosterArt";
import { Badge, Button, Card, ColorField, Field, ImageField, Input, TagInput, Textarea, Toggle, useConfirm } from "../ui";
import { useStudioAction } from "../hooks";
import { CurriculumEditor } from "../editor/CurriculumEditor";
import { MaterialsEditor } from "../editor/MaterialsEditor";

type Tab = "aulas" | "detalhes" | "materiais" | "vendas";

const TABS: Array<{ id: Tab; label: string; icon: typeof Layers }> = [
  { id: "aulas", label: "Módulos e aulas", icon: Layers },
  { id: "detalhes", label: "Capa e detalhes", icon: Info },
  { id: "materiais", label: "Materiais", icon: FolderDown },
  { id: "vendas", label: "Acesso e venda", icon: ShoppingBag },
];

export default function ProductEditor() {
  const { productId } = useParams();
  const { catalog, isLoading } = useCatalog();
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const product = catalog.products.find((p) => p.id === productId);
  const [draft, setDraft] = useState<Product | null>(null);
  const [tab, setTab] = useState<Tab>("aulas");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product && (!draft || draft.id !== product.id)) setDraft(product);
  }, [product, draft]);

  const dirty = useMemo(() => !!draft && !!product && JSON.stringify(draft) !== JSON.stringify(product), [draft, product]);

  if (!isLoading && !product) return <Navigate to="/membros/studio/colecoes" replace />;
  if (!draft || !product) return null;

  const set = (patch: Partial<Product>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  // Enquanto o endereço for o automático, ele acompanha o nome da coleção.
  const autoSlug = draft.slug.startsWith("nova-colecao") || draft.slug === toSlug(product.title);
  const setTitle = (title: string) => set(autoSlug ? { title, slug: toSlug(title) } : { title });

  const save = async () => {
    if (!draft.title.trim()) return;
    let slug = toSlug(draft.slug || draft.title);
    const taken = new Set(catalog.products.filter((p) => p.id !== draft.id).map((p) => p.slug));
    for (let i = 2; taken.has(slug); i++) slug = `${toSlug(draft.slug || draft.title)}-${i}`;
    setSaving(true);
    const saved = await run(() => repo.saveProduct({ ...draft, title: draft.title.trim(), slug }), { success: "Coleção salva" });
    setSaving(false);
    if (saved) setDraft(saved);
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Excluir “${product.title}”?`,
      text: "Módulos, aulas, materiais e os acessos dos membros a esta coleção serão apagados. Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir coleção",
      danger: true,
    });
    if (!ok) return;
    await run(() => repo.deleteProduct(product.id), { success: "Coleção excluída" });
    navigate("/membros/studio/colecoes", { replace: true });
  };

  return (
    <div className="pb-24">
      <Link to="/membros/studio/colecoes" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
        <ArrowLeft size={15} /> Coleções
      </Link>

      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/10">
            <PosterArt product={draft} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {product.published ? <Badge tone="green">Publicada</Badge> : <Badge tone="amber">Rascunho</Badge>}
              {product.isFree && <Badge tone="blue">Gratuita</Badge>}
            </div>
            <h1 className="mt-1.5 truncate text-[1.9rem] font-bold uppercase leading-none tracking-tighter md:text-[2.3rem]">{draft.title || "Sem título"}</h1>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" icon={<ExternalLink size={15} />} onClick={() => window.open(`/membros/colecao/${product.slug}`, "_blank")}>Visualizar</Button>
          <Button icon={<Save size={15} />} onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
        </div>
      </div>

      <div className="mb-8 flex gap-1 overflow-x-auto rounded-full bg-black/[0.05] p-1 [scrollbar-width:none] md:inline-flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn("relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors", tab === id ? "text-[#1d1d1f]" : "text-[#6e6e73] hover:text-[#1d1d1f]")}
          >
            {tab === id && <motion.span layoutId="studio-product-tab" className="absolute inset-0 rounded-full bg-white shadow-sm" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
            <Icon size={15} className="relative" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === "aulas" && <CurriculumEditor product={product} />}
      {tab === "materiais" && <MaterialsEditor product={product} />}

      {tab === "detalhes" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card title="Informações">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nome da coleção" className="md:col-span-2">
                  <Input value={draft.title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: SILENT LUXURY" />
                </Field>
                <Field label="Linha de apoio" hint="Aparece na capa automática e no topo da página.">
                  <Input value={draft.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="MOBILE E DESKTOP" />
                </Field>
                <Field label="Selo" hint="Opcional. Ex: NOVO, TOP 1, BÔNUS.">
                  <Input value={draft.badge} onChange={(e) => set({ badge: e.target.value.toUpperCase() })} maxLength={14} />
                </Field>
                <Field label="Descrição" className="md:col-span-2">
                  <Textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Conte o que a coleção entrega e para quem ela é." />
                </Field>
                <Field label="Endereço" hint={`/membros/colecao/${draft.slug || toSlug(draft.title)}`} className="md:col-span-2">
                  <Input value={draft.slug} onChange={(e) => set({ slug: toSlug(e.target.value) })} placeholder={toSlug(draft.title)} />
                </Field>
                <Field label="Cor da coleção" hint="Usada no cartão de vidro da capa automática e nos fundos." className="md:col-span-2">
                  <ColorField value={draft.accentColor} onChange={(accentColor) => set({ accentColor })} presets={["#1d1d1f", "#30343c", "#e3a73f", "#93644a", "#cfc6b8", "#c85bd6", "#66773f", "#3b5560"]} />
                </Field>
              </div>
            </Card>

            <Card title="Imagens" description="Sem capa enviada, o Studio gera automaticamente uma capa no estilo Gorg (foto do banner + cartão de vidro).">
              <div className="grid gap-5 md:grid-cols-[200px_1fr]">
                <ImageField label="Capa vertical (2:3)" value={draft.coverUrl} onChange={(coverUrl) => set({ coverUrl })} aspect="aspect-[2/3]" folder="capas" />
                <div className="space-y-5">
                  <ImageField label="Banner / foto de fundo (16:9)" hint="Topo da página da coleção e fundo da capa automática." value={draft.bannerUrl} onChange={(bannerUrl) => set({ bannerUrl })} folder="banners" />
                  <ImageField label="Arte do título (PNG transparente)" hint="Opcional. Substitui o nome em texto no topo da página." value={draft.logoUrl} onChange={(logoUrl) => set({ logoUrl })} aspect="aspect-[3/1]" folder="logos" dark contain />
                </div>
              </div>
            </Card>

            <Card title="Zona de perigo">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[13px] text-[#6e6e73]">Excluir apaga módulos, aulas, materiais e acessos desta coleção.</p>
                <Button variant="danger" icon={<Trash2 size={14} />} onClick={remove}>Excluir coleção</Button>
              </div>
            </Card>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-[1.6rem] bg-black p-5 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">Prévia</p>
              <div className="relative mx-auto mt-4 aspect-[2/3] w-[70%] overflow-hidden rounded-xl ring-1 ring-white/10">
                <PosterArt product={draft} />
              </div>
              <div className="relative mt-4 aspect-video overflow-hidden rounded-xl ring-1 ring-white/10">
                <LandscapeArt product={draft} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "vendas" && (
        <div className="grid max-w-3xl gap-6">
          <Card title="Publicação">
            <div className="space-y-5">
              <Toggle checked={draft.published} onChange={(published) => set({ published })} label="Coleção publicada" description="Coleções em rascunho só aparecem para você." />
              <div className="h-px bg-black/[0.06]" />
              <Toggle checked={draft.isFree} onChange={(isFree) => set({ isFree })} label="Liberada para todos os membros" description="Ideal para bônus e aulas de boas-vindas: qualquer membro logado acessa, sem precisar comprar." />
            </div>
          </Card>

          <Card title="Para quem ainda não tem" description="A coleção aparece com um cadeado e um botão de compra (upsell) para membros sem acesso.">
            <div className="grid gap-5 md:grid-cols-[1fr_180px]">
              <Field label="Link de checkout" hint="Página de pagamento desta coleção.">
                <Input value={draft.checkoutUrl} onChange={(e) => set({ checkoutUrl: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="Preço exibido">
                <Input value={draft.priceLabel} onChange={(e) => set({ priceLabel: e.target.value })} placeholder="R$ 19,90" />
              </Field>
            </div>
          </Card>

          <Card title="Liberação automática" description="Quando o checkout avisar uma venda aprovada (webhook), o acesso é liberado sozinho para o e-mail do comprador.">
            <Field label="IDs do produto na plataforma de pagamento" hint={<>Cole o ID, código ou nome do produto/oferta como aparece no checkout e aperte Enter. Veja <Link to="/membros/studio/integracoes" className="font-semibold text-[#1d1d1f] underline">Integrações</Link>.</>}>
              <TagInput value={draft.externalIds} onChange={(externalIds) => set({ externalIds })} placeholder="Ex: F3LEikOi-0" />
            </Field>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-full bg-[#1d1d1f] py-2 pl-6 pr-2 text-white shadow-2xl lg:left-[264px]"
          >
            <span className="text-[13px] font-medium">Alterações não salvas</span>
            <div className="flex gap-1.5">
              <button onClick={() => setDraft(product)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-white/70 hover:text-white">Descartar</button>
              <Button variant="accent" onClick={save} loading={saving}>Salvar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
