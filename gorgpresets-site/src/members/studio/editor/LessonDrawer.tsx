import { useEffect, useRef, useState } from "react";
import { FileUp, Link2, Paperclip, Plus, Sparkles, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Attachment, Lesson, Module } from "../../lib/types";
import { autoThumbnail, isStorageUrl, parseVideo, readVideoDuration } from "../../lib/video";
import { formatBytes, uid } from "../../lib/format";
import { VideoPlayer } from "../../components/VideoPlayer";
import { Badge, Button, Drawer, Field, IconButton, ImageField, Input, Segmented, Select, Textarea, Toggle, UploadProgress, useUploader } from "../ui";

interface LessonDrawerProps {
  lesson: Lesson | null;
  modules: Module[];
  isNew: boolean;
  onClose: () => void;
  onSave: (lesson: Lesson) => Promise<void>;
  onDelete: (lesson: Lesson) => Promise<void>;
}

export function LessonDrawer({ lesson, modules, isNew, onClose, onSave, onDelete }: LessonDrawerProps) {
  const [draft, setDraft] = useState<Lesson | null>(lesson);
  const [source, setSource] = useState<"link" | "upload">("link");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const videoUploader = useUploader();
  const fileUploader = useUploader();
  const videoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Mantém o último rascunho durante a animação de saída.
  useEffect(() => {
    if (!lesson) return;
    setDraft(lesson);
    setPreview(false);
    setSource(isStorageUrl(lesson.videoUrl) ? "upload" : "link");
  }, [lesson]);

  if (!draft) return null;

  const set = (patch: Partial<Lesson>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const video = parseVideo(draft.videoUrl);
  const minutes = Math.floor(draft.durationSeconds / 60);
  const seconds = draft.durationSeconds % 60;

  const uploadVideo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) return toast.error("Envie um arquivo de vídeo (MP4, MOV ou WEBM).");
    const duration = await readVideoDuration(file);
    const url = await videoUploader.upload(file, { visibility: "private", productId: draft.productId, folder: "videos" });
    if (url) {
      set({ videoUrl: url, durationSeconds: duration || draft.durationSeconds });
      toast.success("Vídeo enviado");
    }
  };

  const uploadAttachment = async (file?: File) => {
    if (!file) return;
    const url = await fileUploader.upload(file, { visibility: "private", productId: draft.productId, folder: "arquivos" });
    if (url) set({ attachments: [...draft.attachments, { id: uid(), name: file.name, url, size: file.size }] });
  };

  const updateAttachment = (id: string, patch: Partial<Attachment>) =>
    set({ attachments: draft.attachments.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  const save = async () => {
    if (!draft.title.trim()) return toast.error("Dê um título para a aula.");
    setSaving(true);
    try {
      const thumb = draft.thumbnailUrl || autoThumbnail(draft.videoUrl);
      await onSave({ ...draft, title: draft.title.trim(), thumbnailUrl: thumb });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={!!lesson}
      onClose={onClose}
      title={isNew ? "Nova aula" : "Editar aula"}
      description={modules.find((m) => m.id === draft.moduleId)?.title}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => onDelete(draft)}>
              Excluir
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} loading={saving} disabled={videoUploader.uploading || fileUploader.uploading}>
              {isNew ? "Criar aula" : "Salvar aula"}
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="Título da aula">
          <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex: Instalando no celular" autoFocus={isNew} />
        </Field>

        <Field label="Módulo">
          <Select value={draft.moduleId} onChange={(e) => set({ moduleId: e.target.value })}>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.title || "Módulo sem título"}</option>
            ))}
          </Select>
        </Field>

        {/* Vídeo */}
        <div className="rounded-2xl bg-[#f5f5f7] p-4 ring-1 ring-inset ring-black/[0.05]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[13px] font-bold"><Video size={16} /> Vídeo</p>
            <Segmented
              value={source}
              onChange={setSource}
              options={[
                { value: "link", label: <><Link2 size={13} /> Link</> },
                { value: "upload", label: <><Upload size={13} /> Upload</> },
              ]}
            />
          </div>

          {source === "link" ? (
            <Field label="Link do vídeo" hint="YouTube (pode ser não listado), Vimeo, Panda Video, Bunny, Google Drive, Loom, link .mp4 ou o código de incorporação.">
              <Input value={isStorageUrl(draft.videoUrl) ? "" : draft.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} placeholder="https://youtu.be/..." />
            </Field>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => videoInput.current?.click()}
                disabled={videoUploader.uploading}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-black/10 bg-white px-4 py-7 text-center transition-colors hover:border-black/25"
              >
                <FileUp size={22} className="text-[#86868b]" />
                <span className="text-[13px] font-semibold">{isStorageUrl(draft.videoUrl) ? "Trocar vídeo enviado" : "Selecionar vídeo do computador"}</span>
                <span className="text-[12px] text-[#86868b]">MP4, MOV ou WEBM · protegido, só membros com acesso assistem</span>
              </button>
              {videoUploader.uploading && <div className="mt-3"><UploadProgress value={videoUploader.progress || 0} /></div>}
              <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => void uploadVideo(e.target.files?.[0] || undefined)} />
            </div>
          )}

          {video.kind !== "none" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="green">✓ {video.provider}</Badge>
              <button type="button" onClick={() => setPreview((p) => !p)} className="text-[12px] font-semibold text-[#1d1d1f] underline-offset-2 hover:underline">
                {preview ? "Ocultar prévia" : "Pré-visualizar"}
              </button>
              <button type="button" onClick={() => set({ videoUrl: "" })} className="ml-auto text-[12px] font-semibold text-red-600 hover:underline">Remover vídeo</button>
            </div>
          )}
          {preview && video.kind !== "none" && (
            <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-black/10">
              <VideoPlayer url={draft.videoUrl} poster={draft.thumbnailUrl} />
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Duração (min)">
              <Input type="number" min={0} value={minutes || ""} placeholder="0" onChange={(e) => set({ durationSeconds: Math.max(0, Number(e.target.value) || 0) * 60 + seconds })} />
            </Field>
            <Field label="Segundos">
              <Input type="number" min={0} max={59} value={seconds || ""} placeholder="0" onChange={(e) => set({ durationSeconds: minutes * 60 + Math.min(59, Math.max(0, Number(e.target.value) || 0)) })} />
            </Field>
          </div>
        </div>

        <ImageField
          label="Miniatura (16:9)"
          hint="Opcional. Para vídeos do YouTube a miniatura é preenchida automaticamente."
          value={draft.thumbnailUrl}
          onChange={(thumbnailUrl) => set({ thumbnailUrl })}
          folder="thumbnails"
        />
        {!draft.thumbnailUrl && autoThumbnail(draft.videoUrl) && (
          <button type="button" onClick={() => set({ thumbnailUrl: autoThumbnail(draft.videoUrl) })} className="-mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-ma hover:underline">
            <Sparkles size={13} /> Usar miniatura do YouTube
          </button>
        )}

        <Field label="Descrição" hint="Aparece abaixo do vídeo. Quebras de linha são mantidas.">
          <Textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Do que se trata esta aula?" />
        </Field>

        {/* Anexos */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12px] font-semibold"><Paperclip size={14} /> Materiais da aula</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" icon={<Upload size={13} />} onClick={() => fileInput.current?.click()} disabled={fileUploader.uploading}>Arquivo</Button>
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => set({ attachments: [...draft.attachments, { id: uid(), name: "", url: "", size: 0 }] })}>Link</Button>
            </div>
          </div>
          <input ref={fileInput} type="file" className="hidden" onChange={(e) => void uploadAttachment(e.target.files?.[0] || undefined)} />
          {fileUploader.uploading && <div className="mb-2"><UploadProgress value={fileUploader.progress || 0} /></div>}
          {draft.attachments.length === 0 ? (
            <p className="rounded-xl bg-[#f5f5f7] px-4 py-4 text-center text-[12px] text-[#86868b]">PDFs, presets ou links extras desta aula.</p>
          ) : (
            <div className="space-y-2">
              {draft.attachments.map((a) => (
                <div key={a.id} className="flex items-start gap-2 rounded-xl bg-[#f5f5f7] p-2.5 ring-1 ring-inset ring-black/[0.05]">
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <Input className="h-9 bg-white text-[13px]" value={a.name} onChange={(e) => updateAttachment(a.id, { name: e.target.value })} placeholder="Nome do material" />
                    {isStorageUrl(a.url) ? (
                      <span className="flex h-9 items-center truncate px-1 text-[12px] text-[#86868b]">Arquivo protegido{a.size ? ` · ${formatBytes(a.size)}` : ""}</span>
                    ) : (
                      <Input className="h-9 bg-white text-[13px]" value={a.url} onChange={(e) => updateAttachment(a.id, { url: e.target.value })} placeholder="https://..." />
                    )}
                  </div>
                  <IconButton label="Remover" onClick={() => set({ attachments: draft.attachments.filter((x) => x.id !== a.id) })} className="hover:text-red-600">
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cn("rounded-2xl p-4 ring-1 ring-inset", draft.published ? "bg-emerald-50/60 ring-emerald-200/60" : "bg-amber-50/60 ring-amber-200/60")}>
          <Toggle
            checked={draft.published}
            onChange={(published) => set({ published })}
            label={draft.published ? "Aula publicada" : "Rascunho"}
            description={draft.published ? "Visível para quem tem acesso à coleção." : "Só você vê esta aula no Studio."}
          />
        </div>
      </div>
    </Drawer>
  );
}
