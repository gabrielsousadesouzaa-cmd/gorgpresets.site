import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, FolderDown, History, Info, Layers, Link2, Loader2, Package, PackagePlus, RefreshCw, Save, ShoppingBag, Trash2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { relativeDate, toSlug } from "../../lib/format";
import type { CheckoutItem, Product } from "../../lib/types";
import { LandscapeArt, PosterArt } from "../../components/PosterArt";
import { Badge, Button, Card, ColorField, Field, IconButton, ImageField, Input, Select, Textarea, Toggle, useConfirm } from "../ui";
import { useStudioAction, useStudioQuery } from "../hooks";
import { blankCheckoutItem } from "../components/MapItemModal";
import { toast } from "sonner";
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

          <CheckoutLinksCard
            product={product}
            isFree={draft.isFree}
            onLegacyConverted={(externalIds) => setDraft((d) => (d ? { ...d, externalIds } : d))}
          />
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

// ── Acesso e venda: produtos do checkout que liberam esta coleção ────
const sameId = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function CheckoutLinksCard({ product, isFree, onLegacyConverted }: { product: Product; isFree: boolean; onLegacyConverted: (externalIds: string[]) => void }) {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const query = useStudioQuery("checkout-items", () => repo.listCheckoutItems());
  const [pick, setPick] = useState("");
  const [newId, setNewId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const items = query.data || [];
  const linked = items.filter((i) => i.productIds.includes(product.id));
  const available = items.filter((i) => !i.productIds.includes(product.id));
  const groups = [
    { label: "Sem coleção", list: available.filter((i) => !i.ignored && i.productIds.length === 0) },
    { label: "Já liberam outras coleções", list: available.filter((i) => !i.ignored && i.productIds.length > 0) },
    { label: "Ignorados", list: available.filter((i) => i.ignored) },
  ].filter((g) => g.list.length > 0);
  const legacy = Array.from(new Set(product.externalIds.map((x) => x.trim()).filter(Boolean)));
  const name = (item: CheckoutItem) => item.title || item.externalId;

  const link = (item: CheckoutItem) =>
    run(() => repo.saveCheckoutItem({ ...item, ignored: false, productIds: Array.from(new Set([...item.productIds, product.id])) }), {
      success: `“${name(item)}” agora libera esta coleção`,
      scopes: ["studio"],
    });

  const linkPicked = async () => {
    const item = items.find((i) => i.id === pick);
    if (!item) return;
    setBusy("pick");
    const saved = await link(item);
    setBusy(null);
    if (saved) setPick("");
  };

  const addNew = async () => {
    const externalId = newId.trim();
    if (!externalId) return;
    const existing = items.find((i) => sameId(i.externalId, externalId));
    if (existing?.productIds.includes(product.id)) {
      toast.info("Esse ID já libera esta coleção.");
      return;
    }
    setBusy("new");
    const saved = existing
      ? await link(existing)
      : await run(() => repo.saveCheckoutItem({ ...blankCheckoutItem(externalId, product.title, ""), productIds: [product.id] }), {
          success: "Produto do checkout adicionado",
          scopes: ["studio"],
        });
    setBusy(null);
    if (saved) setNewId("");
  };

  const unlink = async (item: CheckoutItem) => {
    const ok = await confirm({
      title: `Desligar “${name(item)}”?`,
      text: "As próximas vendas deste produto deixam de liberar esta coleção. Quem já comprou continua com acesso.",
      confirmLabel: "Desligar",
      danger: true,
    });
    if (!ok) return;
    setBusy(item.id);
    await run(() => repo.saveCheckoutItem({ ...item, productIds: item.productIds.filter((id) => id !== product.id) }), { success: "Produto desligado desta coleção", scopes: ["studio"] });
    setBusy(null);
  };

  // IDs do formato antigo (na própria coleção) viram produtos do checkout ligados a ela.
  const convertLegacy = async () => {
    setBusy("legacy");
    const done = await run(
      async () => {
        const current = await repo.listCheckoutItems();
        for (const externalId of legacy) {
          const existing = current.find((i) => sameId(i.externalId, externalId));
          if (!existing) await repo.saveCheckoutItem({ ...blankCheckoutItem(externalId, product.title, ""), productIds: [product.id] });
          else if (!existing.productIds.includes(product.id) || existing.ignored)
            await repo.saveCheckoutItem({ ...existing, ignored: false, productIds: Array.from(new Set([...existing.productIds, product.id])) });
        }
        await repo.saveProduct({ ...product, externalIds: [] });
        return true;
      },
      { success: legacy.length === 1 ? "ID convertido em produto do checkout" : `${legacy.length} IDs convertidos em produtos do checkout`, scopes: ["catalog", "studio"] },
    );
    setBusy(null);
    if (done) onLegacyConverted([]);
  };

  return (
    <Card
      title="Produtos do checkout que liberam esta coleção"
      description="Quando alguém comprar um destes produtos, o acesso a esta coleção é liberado sozinho para o e-mail da compra."
    >
      {isFree && (
        <p className="mb-5 rounded-2xl bg-sky-50 px-4 py-3 text-[12.5px] leading-relaxed text-sky-900 ring-1 ring-inset ring-sky-200/70">
          Esta coleção já está liberada para todos os membros. Ligar um produto do checkout ainda serve para criar a conta de quem compra e enviar o e-mail de acesso.
        </p>
      )}

      {query.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#f5f5f7] py-8 text-[13px] text-[#86868b]">
          <Loader2 size={15} className="animate-spin" /> Carregando produtos do checkout…
        </div>
      ) : query.error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-red-50 px-5 py-6 text-center ring-1 ring-inset ring-red-200/70">
          <p className="text-[13px] text-red-800">Não foi possível carregar os produtos do checkout: {(query.error as Error).message}</p>
          <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={() => query.refetch()}>Tentar de novo</Button>
        </div>
      ) : (
        <>
          {linked.length ? (
            <ul className="space-y-2">
              {linked.map((item) => {
                const others = item.productIds.filter((id) => id !== product.id).length;
                return (
                  <li key={item.id} className={cn("flex items-center gap-3 rounded-2xl bg-[#f5f5f7] p-3 pr-2 ring-1 ring-inset ring-black/[0.04]", busy === item.id && "opacity-60")}>
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", item.ignored ? "bg-amber-100 text-amber-700" : "bg-[#1d1d1f] text-white")}>
                      <Package size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{item.title || "Sem nome"}</p>
                      <p className="truncate font-mono text-[11.5px] text-[#86868b]" title={item.externalId}>{item.externalId}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge>{item.salesCount} {item.salesCount === 1 ? "venda" : "vendas"}</Badge>
                        {others > 0 && <Badge tone="blue">+{others} {others === 1 ? "coleção" : "coleções"}</Badge>}
                        {item.email?.enabled && <Badge tone="blue">E-mail próprio</Badge>}
                        {item.ignored && <Badge tone="amber">Ignorado: não libera</Badge>}
                      </div>
                    </div>
                    <span className="hidden shrink-0 text-[11px] text-[#a1a1a6] sm:block" title={item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString("pt-BR") : undefined}>
                      {item.lastSeenAt ? `visto ${relativeDate(item.lastSeenAt)}` : "ainda não recebido"}
                    </span>
                    <IconButton label={`Desligar ${name(item)} desta coleção`} onClick={() => unlink(item)} disabled={busy === item.id} className="hover:text-red-600">
                      <Unlink size={15} />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-black/[0.08] px-5 py-8 text-center">
              <Package className="mx-auto h-7 w-7 text-[#c7c7cc]" />
              <p className="mt-2 text-[14px] font-semibold">Nenhum produto do checkout libera esta coleção</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[#86868b]">Escolha um produto que o checkout já enviou ou adicione o ID abaixo.</p>
            </div>
          )}

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Ligar um produto já conhecido" hint={available.length ? "Produtos que já chegaram pelo webhook ou foram cadastrados." : "Nenhum outro produto do checkout por enquanto."}>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!available.length} aria-label="Produto do checkout">
                    <option value="">{available.length ? "Escolha um produto…" : "Nenhum disponível"}</option>
                    {groups.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.list.map((i) => (
                          <option key={i.id} value={i.id}>
                            {name(i)}
                            {i.title ? ` · ${i.externalId}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </div>
                <Button onClick={linkPicked} disabled={!pick} loading={busy === "pick"} icon={<Link2 size={14} />}>Ligar</Button>
              </div>
            </Field>
            <Field label="Adicionar um ID novo" hint="Exatamente como o checkout envia. No GGCheckout, é o ID do link de compra.">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addNew();
                }}
              >
                <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Ex: gAW1Y7y6Pfq7w604nzmD" className="min-w-0 flex-1 font-mono" aria-label="ID do produto no checkout" />
                <Button type="submit" variant="secondary" disabled={!newId.trim()} loading={busy === "new"} icon={<PackagePlus size={14} />}>Adicionar</Button>
              </form>
            </Field>
          </div>

          {legacy.length > 0 && (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200/70">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] font-bold text-amber-900">
                    <History size={15} /> IDs antigos
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-amber-800/90">
                    Cadastrados no formato anterior. Continuam liberando o acesso, mas como produtos do checkout você vê as vendas, usa e-mail próprio e gerencia tudo em Automações.
                  </p>
                </div>
                <Button size="sm" variant="secondary" className="shrink-0 self-start" icon={<RefreshCw size={13} />} loading={busy === "legacy"} onClick={convertLegacy}>
                  Converter em produto do checkout
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {legacy.map((id) => (
                  <code key={id} className="max-w-full truncate rounded-lg bg-white px-2.5 py-1 font-mono text-[12px] text-amber-950 ring-1 ring-inset ring-amber-200">
                    {id}
                  </code>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Link to="/membros/studio/automacoes#produtos" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1d1d1f] hover:underline">
        Ver todos os produtos do checkout em Automações <ArrowRight size={14} />
      </Link>
    </Card>
  );
}
