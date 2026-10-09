import { useEffect, useState } from "react";
import { ChevronDown, Eye, EyeOff, Layers, Paperclip, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { moduleLessons, productModules, totalDuration } from "../../lib/catalog";
import { blankLesson, blankModule } from "../../lib/defaults";
import { formatDuration } from "../../lib/format";
import { autoThumbnail, parseVideo } from "../../lib/video";
import type { Lesson, Module, Product } from "../../lib/types";
import { SafeImg } from "../../components/ui";
import { Badge, Button, EmptyState, Field, IconButton, Input, Modal, Textarea, Toggle, useConfirm } from "../ui";
import { SortableList } from "../Sortable";
import { useStudioAction } from "../hooks";
import { LessonDrawer } from "./LessonDrawer";

export function CurriculumEditor({ product }: { product: Product }) {
  const { catalog } = useCatalog();
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const modules = productModules(catalog, product.id, true);

  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson; isNew: boolean } | null>(null);
  const [editingModule, setEditingModule] = useState<{ module: Module; isNew: boolean } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saveModule = async (mod: Module, isNew: boolean) => {
    if (!mod.title.trim()) return;
    const saved = await run(() => repo.saveModule({ ...mod, title: mod.title.trim() }), { success: isNew ? "Módulo criado" : "Módulo salvo" });
    if (saved) setEditingModule(null);
  };

  const deleteModule = async (mod: Module) => {
    const count = moduleLessons(catalog, mod.id, true).length;
    const ok = await confirm({
      title: `Excluir “${mod.title}”?`,
      text: count ? `As ${count} aulas deste módulo também serão excluídas. Essa ação não pode ser desfeita.` : "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir módulo",
      danger: true,
    });
    if (ok) await run(() => repo.deleteModule(mod.id), { success: "Módulo excluído" });
  };

  const saveLesson = async (lesson: Lesson) => {
    const original = catalog.lessons.find((l) => l.id === lesson.id);
    let next = lesson;
    if (original && original.moduleId !== lesson.moduleId) {
      next = { ...lesson, sortOrder: moduleLessons(catalog, lesson.moduleId, true).length };
    }
    const saved = await run(() => repo.saveLesson(next), { success: editingLesson?.isNew ? "Aula criada" : "Aula salva" });
    if (saved) setEditingLesson(null);
  };

  const deleteLesson = async (lesson: Lesson) => {
    const ok = await confirm({ title: `Excluir “${lesson.title || "esta aula"}”?`, text: "O progresso dos membros nesta aula também será apagado.", confirmLabel: "Excluir aula", danger: true });
    if (!ok) return;
    await run(() => repo.deleteLesson(lesson.id), { success: "Aula excluída" });
    setEditingLesson(null);
  };

  const newModule = () => setEditingModule({ module: { ...blankModule(product.id, modules.length), title: `Módulo ${modules.length + 1}` }, isNew: true });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Módulos e aulas</h2>
          <p className="text-[13px] text-[#86868b]">Arraste pelas alças para reorganizar. Clique em uma aula para editar o vídeo, a descrição e os materiais.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={newModule}>Novo módulo</Button>
      </div>

      {modules.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title="Comece pelo primeiro módulo"
          text="Módulos agrupam as aulas — ex: “Comece por aqui”, “Instalação”, “Ajustes avançados”."
          action={<Button icon={<Plus size={16} />} onClick={newModule}>Criar módulo</Button>}
        />
      ) : (
        <SortableList
          items={modules}
          onReorder={(ids) => run(() => repo.reorder("modules", ids), { success: "Ordem dos módulos salva" })}
          className="space-y-3"
          renderItem={(mod, handle, index) => {
            const lessons = moduleLessons(catalog, mod.id, true);
            const isCollapsed = collapsed.has(mod.id);
            return (
              <div className="overflow-hidden rounded-[1.4rem] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-14px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.05]">
                <div className="flex items-center gap-2 px-3 py-3 md:px-4">
                  {handle}
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1d1d1f] text-[12px] font-bold tabular-nums text-white">{String(index + 1).padStart(2, "0")}</span>
                  <button type="button" onClick={() => toggleCollapse(mod.id)} className="min-w-0 flex-1 px-1 text-left">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-bold tracking-tight">{mod.title || "Módulo sem título"}</span>
                      {!mod.published && <Badge tone="amber">Rascunho</Badge>}
                    </span>
                    <span className="block truncate text-[12px] text-[#86868b]">
                      {lessons.length} {lessons.length === 1 ? "aula" : "aulas"}
                      {totalDuration(lessons) > 0 ? ` · ${formatDuration(totalDuration(lessons))}` : ""}
                      {mod.description ? ` · ${mod.description}` : ""}
                    </span>
                  </button>
                  <IconButton label="Editar módulo" onClick={() => setEditingModule({ module: mod, isNew: false })}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton label={mod.published ? "Ocultar módulo" : "Publicar módulo"} onClick={() => run(() => repo.saveModule({ ...mod, published: !mod.published }), { success: mod.published ? "Módulo oculto" : "Módulo publicado" })}>
                    {mod.published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </IconButton>
                  <IconButton label="Excluir módulo" onClick={() => deleteModule(mod)} className="hover:text-red-600">
                    <Trash2 size={15} />
                  </IconButton>
                  <IconButton label={isCollapsed ? "Expandir" : "Recolher"} onClick={() => toggleCollapse(mod.id)}>
                    <ChevronDown size={16} className={cn("transition-transform", isCollapsed && "-rotate-90")} />
                  </IconButton>
                </div>

                {!isCollapsed && (
                  <div className="border-t border-black/[0.05] bg-[#fbfbfd] px-2 py-2 md:px-3">
                    <SortableList
                      items={lessons}
                      onReorder={(ids) => run(() => repo.reorder("lessons", ids), { success: "Ordem das aulas salva" })}
                      className="space-y-1"
                      renderItem={(lesson, lessonHandle, i) => (
                        <LessonRow
                          lesson={lesson}
                          number={i + 1}
                          handle={lessonHandle}
                          accent={product.accentColor}
                          onEdit={() => setEditingLesson({ lesson, isNew: false })}
                          onDelete={() => deleteLesson(lesson)}
                        />
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingLesson({ lesson: blankLesson(product.id, mod.id, lessons.length), isNew: true })}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/[0.08] py-3 text-[13px] font-semibold text-[#6e6e73] transition-colors hover:border-black/20 hover:bg-white hover:text-[#1d1d1f]"
                    >
                      <Plus size={15} /> Adicionar aula
                    </button>
                  </div>
                )}
              </div>
            );
          }}
        />
      )}

      <LessonDrawer
        lesson={editingLesson?.lesson || null}
        isNew={!!editingLesson?.isNew}
        modules={modules}
        onClose={() => setEditingLesson(null)}
        onSave={saveLesson}
        onDelete={deleteLesson}
      />

      <ModuleModal state={editingModule} onClose={() => setEditingModule(null)} onSave={saveModule} />
    </div>
  );
}

function LessonRow({ lesson, number, handle, accent, onEdit, onDelete }: { lesson: Lesson; number: number; handle: React.ReactNode; accent: string; onEdit: () => void; onDelete: () => void }) {
  const video = parseVideo(lesson.videoUrl);
  const thumb = lesson.thumbnailUrl || autoThumbnail(lesson.videoUrl);
  return (
    <div className="group flex items-center gap-2 rounded-xl bg-white px-1.5 py-1.5 ring-1 ring-black/[0.04] transition-shadow hover:shadow-sm md:gap-3 md:px-2">
      {handle}
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-lg md:w-28" style={{ background: `linear-gradient(135deg, ${accent}, #111)` }}>
          <SafeImg src={thumb} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/10">
            <Play size={16} className="text-white drop-shadow" fill="currentColor" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">
            <span className="mr-1.5 text-[#a1a1a6]">{number}.</span>
            {lesson.title || "Aula sem título"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#86868b]">
            {video.kind === "none" ? <Badge tone="red">Sem vídeo</Badge> : <span>{video.provider}</span>}
            {lesson.durationSeconds > 0 && <span>· {formatDuration(lesson.durationSeconds)}</span>}
            {lesson.attachments.length > 0 && (
              <span className="flex items-center gap-0.5">· <Paperclip size={11} /> {lesson.attachments.length}</span>
            )}
            {!lesson.published && <Badge tone="amber">Rascunho</Badge>}
          </div>
        </div>
      </button>
      <IconButton label="Editar aula" onClick={onEdit} className="hidden sm:grid">
        <Pencil size={14} />
      </IconButton>
      <IconButton label="Excluir aula" onClick={onDelete} className="opacity-60 hover:text-red-600 group-hover:opacity-100">
        <Trash2 size={14} />
      </IconButton>
    </div>
  );
}

function ModuleModal({ state, onClose, onSave }: { state: { module: Module; isNew: boolean } | null; onClose: () => void; onSave: (m: Module, isNew: boolean) => Promise<void> }) {
  const [draft, setDraft] = useState<Module | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state) setDraft(state.module);
  }, [state]);

  const set = (patch: Partial<Module>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={state?.isNew ? "Novo módulo" : "Editar módulo"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={saving}
            disabled={!draft?.title.trim()}
            onClick={async () => {
              if (!draft || !state) return;
              setSaving(true);
              await onSave(draft, state.isNew);
              setSaving(false);
            }}
          >
            {state?.isNew ? "Criar módulo" : "Salvar"}
          </Button>
        </>
      }
    >
      {draft && (
        <div className="space-y-5">
          <Field label="Nome do módulo">
            <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} autoFocus placeholder="Ex: Comece por aqui" />
          </Field>
          <Field label="Descrição" hint="Opcional. Aparece acima da lista de aulas.">
            <Textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} className="min-h-[80px]" />
          </Field>
          <Toggle checked={draft.published} onChange={(published) => set({ published })} label="Publicado" description="Módulos ocultos não aparecem para os membros." />
        </div>
      )}
    </Modal>
  );
}
