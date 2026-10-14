import { useEffect, useRef, useState } from "react";
import { FileText, FolderDown, Link2, Lock, Pencil, Trash2, Upload } from "lucide-react";
import { useRepo } from "../../context/MembersContext";
import { blankMaterial } from "../../lib/defaults";
import { formatBytes, sortByOrder } from "../../lib/format";
import { isStorageUrl } from "../../lib/video";
import type { Material, Product } from "../../lib/types";
import { Button, EmptyState, Field, IconButton, Input, Modal, UploadProgress, useConfirm, useUploader } from "../ui";
import { SortableList } from "../Sortable";
import { useAllMaterials, useStudioAction } from "../hooks";

export function MaterialsEditor({ product }: { product: Product }) {
  const { data: all } = useAllMaterials();
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const { upload, progress, uploading } = useUploader();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Material | null>(null);
  const items = sortByOrder((all || []).filter((m) => m.productId === product.id));

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let order = items.length;
    for (const file of Array.from(files)) {
      const url = await upload(file, { visibility: "private", productId: product.id, folder: "materiais" });
      if (!url) continue;
      const name = file.name.replace(/\.[^.]+$/, "");
      await run(() => repo.saveMaterial({ ...blankMaterial(product.id, order++), name, url, size: file.size }), { success: `“${name}” enviado` });
    }
  };

  const remove = async (m: Material) => {
    const ok = await confirm({ title: `Remover “${m.name}”?`, text: "O arquivo deixa de aparecer para os membros.", confirmLabel: "Remover", danger: true });
    if (ok) await run(() => repo.deleteMaterial(m.id), { success: "Material removido" });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Materiais para download</h2>
          <p className="text-[13px] text-[#86868b]">Os presets (.DNG / .XMP), PDFs e bônus da coleção. Arquivos enviados aqui são protegidos — só quem tem acesso baixa.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Link2 size={15} />} onClick={() => setEditing({ ...blankMaterial(product.id, items.length) })}>Adicionar link</Button>
          <Button icon={<Upload size={15} />} onClick={() => fileInput.current?.click()} loading={uploading}>Enviar arquivos</Button>
        </div>
      </div>
      <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }} />
      {uploading && <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]"><UploadProgress value={progress || 0} /></div>}

      {items.length === 0 ? (
        <EmptyState
          icon={<FolderDown />}
          title="Nenhum material ainda"
          text="Envie os arquivos dos presets ou cole um link (Google Drive, Dropbox...)."
          action={<Button icon={<Upload size={15} />} onClick={() => fileInput.current?.click()}>Enviar arquivos</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-[1.4rem] bg-white shadow-sm ring-1 ring-black/[0.05]">
          <SortableList
            items={items}
            onReorder={(ids) => run(() => repo.reorder("materials", ids), { success: "Ordem salva" })}
            className="divide-y divide-black/[0.05]"
            itemClassName="bg-white"
            renderItem={(m, handle) => (
              <div className="flex items-center gap-3 px-3 py-3 md:px-4">
                {handle}
                <span className="grid h-11 w-10 shrink-0 place-items-center rounded-xl bg-ma text-white shadow-sm">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{m.name || "Sem nome"}</p>
                  <p className="flex items-center gap-1.5 truncate text-[12px] text-[#86868b]">
                    {isStorageUrl(m.url) ? <><Lock size={11} /> Arquivo protegido</> : <><Link2 size={11} /> Link externo</>}
                    {m.size > 0 && ` · ${formatBytes(m.size)}`}
                    {m.description && ` · ${m.description}`}
                  </p>
                </div>
                <IconButton label="Editar" onClick={() => setEditing(m)}><Pencil size={15} /></IconButton>
                <IconButton label="Remover" onClick={() => remove(m)} className="hover:text-red-600"><Trash2 size={15} /></IconButton>
              </div>
            )}
          />
        </div>
      )}

      <MaterialModal material={editing} onClose={() => setEditing(null)} onSave={async (m) => {
        const saved = await run(() => repo.saveMaterial(m), { success: "Material salvo" });
        if (saved) setEditing(null);
      }} />
    </div>
  );
}

function MaterialModal({ material, onClose, onSave }: { material: Material | null; onClose: () => void; onSave: (m: Material) => Promise<void> }) {
  const [draft, setDraft] = useState<Material | null>(material);
  useEffect(() => {
    if (material) setDraft(material);
  }, [material]);
  const set = (patch: Partial<Material>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const protectedFile = !!draft && isStorageUrl(draft.url);
  return (
    <Modal
      open={!!material}
      onClose={onClose}
      size="sm"
      title={material?.name ? "Editar material" : "Novo material"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!draft?.name.trim() || !draft?.url.trim()} onClick={() => draft && onSave({ ...draft, name: draft.name.trim() })}>Salvar</Button>
        </>
      }
    >
      {draft && (
        <div className="space-y-5">
          <Field label="Nome">
            <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex: Presets Mobile (.DNG)" autoFocus />
          </Field>
          <Field label="Descrição curta" hint="Opcional. Ex: “Para Lightroom Mobile — iPhone e Android”.">
            <Input value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          {protectedFile ? (
            <p className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-4 py-3 text-[13px] text-[#6e6e73]"><Lock size={14} /> Arquivo enviado e protegido{draft.size ? ` · ${formatBytes(draft.size)}` : ""}</p>
          ) : (
            <Field label="Link" hint="Google Drive, Dropbox, WeTransfer ou qualquer link de download.">
              <Input value={draft.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." />
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}
