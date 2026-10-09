import { useState } from "react";
import { Download, ExternalLink, FileArchive, FileImage, FileText, FileVideo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRepo } from "../context/MembersContext";
import type { Attachment, Material } from "../lib/types";
import { formatBytes } from "../lib/format";

type FileLike = Pick<Material, "id" | "name" | "url" | "size"> & { description?: string };

function extensionOf(item: FileLike) {
  const fromName = item.name.match(/\.([a-z0-9]{2,4})\)?$/i)?.[1] || item.name.match(/\(\.?([a-z0-9]{2,4})\)/i)?.[1];
  const fromUrl = item.url.split("?")[0].match(/\.([a-z0-9]{2,4})$/i)?.[1];
  return (fromName || fromUrl || "").toLowerCase();
}

function iconFor(ext: string) {
  if (["zip", "rar", "7z"].includes(ext)) return FileArchive;
  if (["dng", "jpg", "jpeg", "png", "webp", "heic", "xmp"].includes(ext)) return FileImage;
  if (["mp4", "mov", "webm"].includes(ext)) return FileVideo;
  return FileText;
}

export function useDownloader() {
  const repo = useRepo();
  const [busy, setBusy] = useState<string | null>(null);
  const download = async (item: FileLike) => {
    if (!item.url || item.url === "#") {
      toast.info("Arquivo de demonstração", { description: "No portal real, o download começa aqui." });
      return;
    }
    try {
      setBusy(item.id);
      const url = await repo.resolveMediaUrl(item.url);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível baixar o arquivo.");
    } finally {
      setBusy(null);
    }
  };
  return { download, busy };
}

export function MaterialsGrid({ items }: { items: Material[] }) {
  const { download, busy } = useDownloader();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((m) => {
        const ext = extensionOf(m);
        const Icon = iconFor(ext);
        const isLink = !m.url.startsWith("storage://") && !/\.[a-z0-9]{2,4}(\?|$)/i.test(m.url) && m.url !== "#";
        return (
          <button
            key={m.id}
            onClick={() => download(m)}
            className="group flex items-center gap-4 rounded-2xl bg-white/[0.04] p-4 text-left ring-1 ring-white/[0.07] transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07] hover:ring-white/15"
          >
            <span className="relative grid h-14 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ma to-ma/60 text-white shadow-lg shadow-ma/25">
              <Icon size={20} />
              {ext && <span className="absolute -bottom-1.5 rounded-md bg-black px-1.5 py-px text-[8px] font-black uppercase tracking-wider ring-1 ring-white/15">{ext}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-white">{m.name}</span>
              <span className="mt-0.5 block truncate text-xs text-white/50">
                {[m.description, formatBytes(m.size)].filter(Boolean).join(" · ") || "Clique para baixar"}
              </span>
            </span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors group-hover:bg-white group-hover:text-black">
              {busy === m.id ? <Loader2 size={16} className="animate-spin" /> : isLink ? <ExternalLink size={16} /> : <Download size={16} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AttachmentList({ items, className }: { items: Attachment[]; className?: string }) {
  const { download, busy } = useDownloader();
  if (!items.length) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((a) => (
        <button
          key={a.id}
          onClick={() => download(a)}
          className="group flex w-full items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-left ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.08]"
        >
          <FileText size={18} className="shrink-0 text-ma" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{a.name}</span>
          {a.size > 0 && <span className="text-xs text-white/40">{formatBytes(a.size)}</span>}
          {busy === a.id ? <Loader2 size={16} className="animate-spin text-white/60" /> : <Download size={16} className="text-white/50 group-hover:text-white" />}
        </button>
      ))}
    </div>
  );
}
