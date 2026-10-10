import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mostra o HTML de um e-mail exatamente como será (ou foi) enviado, num
 * iframe isolado (sem scripts), com a altura do conteúdo e visão de celular.
 */
export function EmailPreview({ html, subject, from, className, defaultDevice = "desktop" }: { html: string; subject?: string; from?: string; className?: string; defaultDevice?: "desktop" | "mobile" }) {
  const [device, setDevice] = useState<"desktop" | "mobile">(defaultDevice);
  const [height, setHeight] = useState(820);
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] bg-[#fbfbfd] px-4 py-3">
        <div className="min-w-0 space-y-0.5 text-[12.5px]">
          {from && (
            <p className="truncate">
              <span className="text-[#86868b]">De: </span>
              <span className="font-semibold">{from}</span>
            </p>
          )}
          {subject !== undefined && (
            <p className="truncate">
              <span className="text-[#86868b]">Assunto: </span>
              <span className="font-semibold">{subject || "—"}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 rounded-full bg-black/[0.05] p-0.5">
          {(
            [
              { id: "desktop", icon: Monitor, label: "Computador" },
              { id: "mobile", icon: Smartphone, label: "Celular" },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              aria-label={d.label}
              title={d.label}
              onClick={() => setDevice(d.id)}
              className={cn("grid h-7 w-8 place-items-center rounded-full transition", device === d.id ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]")}
            >
              <d.icon size={14} />
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[#f5f5f7]">
        <iframe
          title={subject ? `Prévia: ${subject}` : "Prévia do e-mail"}
          srcDoc={html}
          // Sem scripts; same-origin só para medir a altura do conteúdo.
          sandbox="allow-same-origin"
          onLoad={(e) => {
            const h = e.currentTarget.contentDocument?.documentElement.scrollHeight;
            if (h) setHeight(Math.min(Math.max(h, 320), 4000));
          }}
          style={{ height }}
          className={cn("mx-auto block bg-[#f5f5f7] transition-[width] duration-300", device === "mobile" ? "w-[375px] max-w-full" : "w-full")}
        />
      </div>
    </div>
  );
}
