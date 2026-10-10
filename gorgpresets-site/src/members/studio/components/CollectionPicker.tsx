import { useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "../../lib/types";
import { PosterArt } from "../../components/PosterArt";
import { Input } from "../ui";

/** Grade de coleções (capas) com seleção múltipla e busca. */
export function CollectionPicker({ products, value, onChange, columns = "grid-cols-3 sm:grid-cols-5" }: { products: Product[]; value: string[]; onChange: (ids: string[]) => void; columns?: string }) {
  const [query, setQuery] = useState("");
  const filtered = products.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1a6]" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar coleção" className="pl-10" />
        </div>
        <div className="flex gap-1.5 text-[12px] font-semibold">
          <button type="button" onClick={() => onChange(Array.from(new Set([...value, ...filtered.map((p) => p.id)])))} className="rounded-full px-3 py-2 text-[#1d1d1f] hover:bg-black/[0.05]">
            Selecionar todas
          </button>
          <button type="button" onClick={() => onChange(value.filter((id) => !filtered.some((p) => p.id === id)))} className="rounded-full px-3 py-2 text-[#6e6e73] hover:bg-black/[0.05]">
            Desmarcar
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#86868b]">Nenhuma coleção encontrada.</p>
      ) : (
        <div className={cn("grid gap-2.5", columns)}>
          {filtered.map((p) => {
            const selected = value.includes(p.id);
            return (
              <button key={p.id} type="button" onClick={() => toggle(p.id)} className="group text-left" aria-pressed={selected}>
                <span className={cn("relative block aspect-[2/3] overflow-hidden rounded-xl ring-2 transition", selected ? "ring-ma" : "ring-transparent opacity-70 hover:opacity-100")}>
                  <PosterArt product={p} />
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ma text-white shadow">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block truncate text-[11px] font-semibold">{p.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
