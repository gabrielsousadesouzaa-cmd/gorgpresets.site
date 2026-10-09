import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, GalleryHorizontalEnd, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo, useSettings } from "../../context/MembersContext";
import { DEFAULT_SETTINGS } from "../../lib/defaults";
import { sortByOrder, uid } from "../../lib/format";
import type { FaqItem, HeroSlide, PortalSettings } from "../../lib/types";
import { SafeImg } from "../../components/ui";
import { Badge, Button, Card, ColorField, EmptyState, Field, IconButton, ImageField, Input, Modal, PageHeader, Segmented, Select, Textarea, Toggle, UploadProgress, useConfirm, useUploader } from "../ui";
import { SortableList } from "../Sortable";
import { useStudioAction } from "../hooks";

export default function AppearancePage() {
  const { data: settings } = useSettings();
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<PortalSettings | null>(null);
  const [editingSlide, setEditingSlide] = useState<{ slide: HeroSlide; isNew: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  const dirty = useMemo(() => !!draft && !!settings && JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);
  if (!draft) return null;

  const set = (patch: Partial<PortalSettings>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setLogin = (patch: Partial<PortalSettings["login"]>) => set({ login: { ...draft.login, ...patch } });
  const setSupport = (patch: Partial<PortalSettings["support"]>) => set({ support: { ...draft.support, ...patch } });

  const save = async () => {
    setSaving(true);
    await run(() => repo.saveSettings(draft), { success: "Aparência salva", scopes: ["settings"] });
    setSaving(false);
  };

  const saveSlide = (slide: HeroSlide) => {
    const exists = draft.heroSlides.some((s) => s.id === slide.id);
    set({ heroSlides: exists ? draft.heroSlides.map((s) => (s.id === slide.id ? slide : s)) : [...draft.heroSlides, slide] });
    setEditingSlide(null);
  };

  const updateFaq = (id: string, patch: Partial<FaqItem>) => setSupport({ faq: draft.support.faq.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  return (
    <div className="pb-24">
      <PageHeader
        title="Aparência"
        subtitle="Marca, banners da home, tela de login e suporte. As mudanças aparecem para todos os membros ao salvar."
        actions={<Button onClick={save} loading={saving} disabled={!dirty}>Salvar alterações</Button>}
      />

      <div className="space-y-6">
        <Card title="Marca">
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <ImageField label="Logo (versão clara, PNG)" hint="Aparece no topo da área de membros, sobre fundo escuro." value={draft.logoUrl} onChange={(logoUrl) => set({ logoUrl })} aspect="aspect-[5/2]" folder="marca" dark contain />
            <div className="space-y-5">
              <Field label="Nome da marca">
                <Input value={draft.brandName} onChange={(e) => set({ brandName: e.target.value })} />
              </Field>
              <Field label="Cor de destaque" hint="Botões de compra, barras de progresso, títulos em destaque e detalhes.">
                <ColorField value={draft.accentColor} onChange={(accentColor) => set({ accentColor })} />
              </Field>
              <Field label="Texto do rodapé">
                <Input value={draft.footerText} onChange={(e) => set({ footerText: e.target.value })} />
              </Field>
            </div>
          </div>
        </Card>

        <Card
          title="Banner principal"
          description="Os destaques que rodam no topo da home. Sem banners, a home destaca automaticamente as coleções do membro."
          actions={
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() =>
                setEditingSlide({
                  slide: { id: uid(), eyebrow: "", title: "", subtitle: "", imageUrl: "", mobileImageUrl: "", videoUrl: "", logoUrl: "", theme: "dark", ctaLabel: "", productId: "", ctaUrl: "" },
                  isNew: true,
                })
              }
            >
              Novo banner
            </Button>
          }
        >
          {draft.heroSlides.length === 0 ? (
            <EmptyState icon={<GalleryHorizontalEnd />} title="Nenhum banner" text="Crie banners com imagem ou vídeo, título e botão para uma coleção." />
          ) : (
            <SortableList
              items={draft.heroSlides.map((s, i) => ({ ...s, sortOrder: i }))}
              onReorder={(ids) => set({ heroSlides: ids.map((id) => draft.heroSlides.find((s) => s.id === id)!) })}
              className="space-y-2"
              renderItem={(slide, handle) => (
                <div className="flex items-center gap-3 rounded-2xl bg-[#f5f5f7] p-2 pr-3 ring-1 ring-inset ring-black/[0.04]">
                  {handle}
                  <div className={cn("relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl md:w-36", slide.theme === "light" ? "bg-[#efefef]" : "bg-neutral-900")}>
                    <SafeImg src={slide.imageUrl} className="absolute inset-0 h-full w-full object-cover" />
                    {slide.videoUrl && <Film size={14} className="absolute bottom-1.5 right-1.5 text-white drop-shadow" />}
                  </div>
                  <button type="button" onClick={() => setEditingSlide({ slide, isNew: false })} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[14px] font-bold uppercase tracking-tight">{slide.title || "Sem título"}</p>
                    <p className="truncate text-[12px] text-[#86868b]">{slide.subtitle || slide.eyebrow || "—"}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <Badge>{slide.theme === "light" ? "Fundo claro" : "Fundo escuro"}</Badge>
                    </div>
                  </button>
                  <IconButton label="Editar" onClick={() => setEditingSlide({ slide, isNew: false })}><Pencil size={15} /></IconButton>
                  <IconButton
                    label="Remover"
                    className="hover:text-red-600"
                    onClick={async () => {
                      if (await confirm({ title: "Remover este banner?", confirmLabel: "Remover", danger: true })) set({ heroSlides: draft.heroSlides.filter((s) => s.id !== slide.id) });
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              )}
            />
          )}
          <div className="mt-5 max-w-xs">
            <Field label="Tempo de cada banner (segundos)">
              <Input type="number" min={4} max={30} value={draft.heroInterval} onChange={(e) => set({ heroInterval: Math.max(4, Number(e.target.value) || 8) })} />
            </Field>
          </div>
        </Card>

        <Card title="Tela de login">
          <div className="grid gap-6 md:grid-cols-[320px_1fr]">
            <ImageField label="Imagem de fundo" hint="Opcional. Sem imagem, o fundo usa um degradê com a cor da marca." value={draft.login.backgroundUrl} onChange={(backgroundUrl) => setLogin({ backgroundUrl })} folder="login" />
            <div className="space-y-5">
              <Field label="Título">
                <Input value={draft.login.headline} onChange={(e) => setLogin({ headline: e.target.value })} />
              </Field>
              <Field label="Texto">
                <Textarea value={draft.login.subheadline} onChange={(e) => setLogin({ subheadline: e.target.value })} className="min-h-[80px]" />
              </Field>
              <Toggle
                checked={draft.login.allowFirstAccess}
                onChange={(allowFirstAccess) => setLogin({ allowFirstAccess })}
                label="Permitir “Primeiro acesso”"
                description="O comprador cria a própria senha usando o e-mail da compra. Desative se preferir enviar o login por e-mail."
              />
            </div>
          </div>
        </Card>

        <Card title="Suporte" description="Conteúdo da página de suporte da área de membros.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Título">
              <Input value={draft.support.headline} onChange={(e) => setSupport({ headline: e.target.value })} />
            </Field>
            <Field label="WhatsApp (com DDD e país)" hint="Ex: 5511999999999">
              <Input value={draft.support.whatsapp} onChange={(e) => setSupport({ whatsapp: e.target.value })} inputMode="tel" />
            </Field>
            <Field label="Texto" className="md:col-span-2">
              <Textarea value={draft.support.text} onChange={(e) => setSupport({ text: e.target.value })} className="min-h-[80px]" />
            </Field>
            <Field label="E-mail de suporte">
              <Input value={draft.support.email} onChange={(e) => setSupport({ email: e.target.value })} type="email" />
            </Field>
            <Field label="Instagram">
              <Input value={draft.support.instagram} onChange={(e) => setSupport({ instagram: e.target.value })} placeholder="gorgpresets" />
            </Field>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold">Perguntas frequentes</p>
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setSupport({ faq: [...draft.support.faq, { id: uid(), question: "", answer: "" }] })}>Pergunta</Button>
            </div>
            {draft.support.faq.length === 0 ? (
              <p className="rounded-2xl bg-[#f5f5f7] py-6 text-center text-[13px] text-[#86868b]">Nenhuma pergunta ainda.</p>
            ) : (
              <SortableList
                items={draft.support.faq.map((f, i) => ({ ...f, sortOrder: i }))}
                onReorder={(ids) => setSupport({ faq: ids.map((id) => draft.support.faq.find((f) => f.id === id)!) })}
                className="space-y-2"
                renderItem={(f, handle) => (
                  <div className="flex items-start gap-2 rounded-2xl bg-[#f5f5f7] p-3 ring-1 ring-inset ring-black/[0.04]">
                    <div className="pt-1.5">{handle}</div>
                    <div className="flex-1 space-y-2">
                      <Input className="bg-white font-semibold" value={f.question} onChange={(e) => updateFaq(f.id, { question: e.target.value })} placeholder="Pergunta" />
                      <Textarea className="min-h-[70px] bg-white" value={f.answer} onChange={(e) => updateFaq(f.id, { answer: e.target.value })} placeholder="Resposta" />
                    </div>
                    <IconButton label="Remover pergunta" className="mt-1.5 hover:text-red-600" onClick={() => setSupport({ faq: draft.support.faq.filter((x) => x.id !== f.id) })}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                )}
              />
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={async () => {
              if (await confirm({ title: "Restaurar a aparência padrão?", text: "Marca, login e suporte voltam ao padrão. Os banners são mantidos.", confirmLabel: "Restaurar" }))
                setDraft({ ...DEFAULT_SETTINGS, heroSlides: draft.heroSlides });
            }}
          >
            Restaurar padrão
          </Button>
        </div>
      </div>

      <SlideModal state={editingSlide} onClose={() => setEditingSlide(null)} onSave={saveSlide} />

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
              <button onClick={() => setDraft(settings || null)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-white/70 hover:text-white">Descartar</button>
              <Button variant="accent" onClick={save} loading={saving}>Salvar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlideModal({ state, onClose, onSave }: { state: { slide: HeroSlide; isNew: boolean } | null; onClose: () => void; onSave: (s: HeroSlide) => void }) {
  const { catalog } = useCatalog();
  const [draft, setDraft] = useState<HeroSlide | null>(null);
  const { upload, progress, uploading } = useUploader();
  const videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state) setDraft(state.slide);
  }, [state]);

  const set = (patch: Partial<HeroSlide>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const light = draft?.theme === "light";

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="lg"
      title={state?.isNew ? "Novo banner" : "Editar banner"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => draft && onSave(draft)} disabled={uploading}>{state?.isNew ? "Adicionar banner" : "Aplicar"}</Button>
        </>
      }
    >
      {draft && (
        <div className="space-y-6">
          {/* Prévia */}
          <div className={cn("relative aspect-[21/9] overflow-hidden rounded-2xl", light ? "bg-[#efefef]" : "bg-neutral-950")}>
            <SafeImg src={draft.imageUrl} className="absolute inset-0 h-full w-full object-cover" />
            <div className={cn("absolute inset-0", light ? "bg-gradient-to-r from-white/70 to-transparent" : "bg-gradient-to-r from-black/80 via-black/30 to-transparent")} />
            <div className="absolute inset-y-0 left-0 flex w-2/3 flex-col justify-center p-5 md:p-8">
              {draft.eyebrow && <p className={cn("text-[8px] font-bold uppercase tracking-[0.3em] md:text-[9px]", light ? "text-ma" : "text-white/80")}>{draft.eyebrow}</p>}
              {draft.logoUrl && <SafeImg src={draft.logoUrl} className="mt-2 max-h-10 w-auto max-w-[60%] object-contain object-left" />}
              <p className={cn("mt-1 text-lg font-semibold uppercase leading-none tracking-tight md:text-3xl", light ? "text-black" : "text-white")}>{draft.title || "Título do banner"}</p>
              {draft.subtitle && <p className={cn("mt-2 line-clamp-2 text-[10px] md:text-xs", light ? "text-black/60" : "text-white/70")}>{draft.subtitle}</p>}
              <span className={cn("mt-3 w-fit rounded-full px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.14em]", light ? "bg-ma text-white" : "bg-white text-black")}>
                {draft.ctaLabel || "Assistir agora"}
              </span>
            </div>
          </div>

          <Field label="Tema">
            <Segmented value={draft.theme} onChange={(theme) => set({ theme })} options={[{ value: "dark", label: "Fundo escuro" }, { value: "light", label: "Fundo claro" }]} />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Texto acima do título" hint="Ex: COLEÇÃO EM DESTAQUE">
              <Input value={draft.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} />
            </Field>
            <Field label="Título">
              <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="Texto" className="md:col-span-2">
              <Textarea value={draft.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="min-h-[70px]" />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_180px]">
            <ImageField label="Imagem (desktop, 16:9 ou mais larga)" value={draft.imageUrl} onChange={(imageUrl) => set({ imageUrl })} folder="banners" />
            <ImageField label="Imagem (celular, opcional)" value={draft.mobileImageUrl} onChange={(mobileImageUrl) => set({ mobileImageUrl })} aspect="aspect-[9/14]" folder="banners" />
          </div>

          <ImageField label="Arte do título (PNG transparente, opcional)" value={draft.logoUrl} onChange={(logoUrl) => set({ logoUrl })} aspect="aspect-[4/1]" folder="banners" dark={!light} contain />

          <Field label="Vídeo de fundo (opcional)" hint="MP4 curto e leve (até ~15 MB). Toca mudo em loop atrás do texto.">
            <div className="flex gap-2">
              <Input value={draft.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} placeholder="https://.../video.mp4" />
              <Button
                variant="secondary"
                icon={<Upload size={14} />}
                onClick={() => videoInput.current?.click()}
                loading={uploading}
              >
                Enviar
              </Button>
            </div>
            {uploading && <div className="mt-2"><UploadProgress value={progress || 0} /></div>}
            <input
              ref={videoInput}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await upload(file, { visibility: "public", folder: "hero-videos" });
                if (url) set({ videoUrl: url });
              }}
            />
          </Field>

          <div className="grid gap-5 rounded-2xl bg-[#f5f5f7] p-4 md:grid-cols-3">
            <Field label="Texto do botão">
              <Input className="bg-white" value={draft.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Assistir agora" />
            </Field>
            <Field label="Abrir coleção">
              <Select className="bg-white" value={draft.productId} onChange={(e) => set({ productId: e.target.value, ctaUrl: e.target.value ? "" : draft.ctaUrl })}>
                <option value="">— Nenhuma —</option>
                {sortByOrder(catalog.products).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="Ou link externo">
              <Input className="bg-white" value={draft.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="https://..." disabled={!!draft.productId} />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  );
}
