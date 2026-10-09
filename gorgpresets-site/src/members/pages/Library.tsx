import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Lock, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccess, useAuth, useCatalog, useProgress } from "../context/MembersContext";
import { productLessons, productProgress } from "../lib/catalog";
import { sortByOrder } from "../lib/format";
import type { Product } from "../lib/types";
import { PosterArt } from "../components/PosterArt";
import { ProgressBar, Skeleton } from "../components/ui";

type Filter = "todas" | "andamento" | "concluidas" | "novas";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "andamento", label: "Em andamento" },
  { id: "novas", label: "Não iniciadas" },
  { id: "concluidas", label: "Concluídas" },
];

export default function Library() {
  const { catalog, isLoading } = useCatalog();
  const { owned } = useAccess();
  const { map } = useProgress();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("todas");

  const items = useMemo(() => {
    const products = sortByOrder(catalog.products.filter((p) => p.published || user?.isAdmin));
    return products.map((p) => ({ product: p, owned: owned.has(p.id), stats: productProgress(productLessons(catalog, p.id), map) }));
  }, [catalog, owned, map, user?.isAdmin]);

  const mine = items.filter((i) => i.owned);
  const others = items.filter((i) => !i.owned);
  const filtered = mine.filter(({ stats }) => {
    if (filter === "andamento") return stats.done > 0 && stats.percent < 100;
    if (filter === "concluidas") return stats.total > 0 && stats.percent === 100;
    if (filter === "novas") return stats.done === 0;
    return true;
  });
  const completedLessons = mine.reduce((sum, i) => sum + i.stats.done, 0);

  return (
    <div className="ma-gutter pb-28 pt-28 md:pb-20 md:pt-36">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter md:text-6xl">Minha coleção</h1>
          <div className="mt-3 h-[3px] w-14 rounded-full bg-ma" />
          <p className="mt-5 text-white/55">Todos os seus presets e aulas, prontos para usar.</p>
        </div>
        <div className="flex gap-3">
          <Stat value={mine.length} label={mine.length === 1 ? "coleção" : "coleções"} />
          <Stat value={completedLessons} label="aulas concluídas" />
        </div>
      </div>

      <div className="ma-scroll mt-10 gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-all",
              filter === f.id ? "bg-white text-black" : "bg-white/[0.06] text-white/60 ring-1 ring-inset ring-white/10 hover:text-white",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Grid>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-[2/3]" />)}</Grid>
      ) : filtered.length ? (
        <Grid>
          {filtered.map(({ product, stats }, i) => (
            <LibraryCard key={product.id} product={product} percent={stats.percent} done={stats.done} total={stats.total} index={i} />
          ))}
        </Grid>
      ) : (
        <p className="py-20 text-center text-white/40">Nenhuma coleção neste filtro.</p>
      )}

      {others.length > 0 && (
        <section className="mt-20">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">Complete sua coleção</h2>
          <p className="mt-1 text-sm text-white/50">Estéticas que ainda não fazem parte da sua biblioteca.</p>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {others.map(({ product }) => (
              <Link key={product.id} to={`/membros/colecao/${product.slug}`} className="group relative block aspect-[2/3] overflow-hidden rounded-xl opacity-80 ring-1 ring-white/10 transition duration-500 hover:scale-[1.03] hover:opacity-100 hover:ring-white/30">
                <PosterArt product={product} />
                <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-ma backdrop-blur">
                  <ShoppingBag size={12} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">{children}</div>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[130px] rounded-2xl bg-white/[0.04] px-5 py-4 ring-1 ring-white/[0.07]">
      <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
    </div>
  );
}

function LibraryCard({ product, percent, done, total, index }: { product: Product; percent: number; done: number; total: number; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.04, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <Link to={`/membros/colecao/${product.slug}`} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-white/[0.08] transition duration-500 ease-expo group-hover:-translate-y-1.5 group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] group-hover:ring-white/25">
          <PosterArt product={product} />
          {percent === 100 && (
            <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-black shadow-lg">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
          {!product.published && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-black">
              <Lock size={10} /> Rascunho
            </span>
          )}
        </div>
        <div className="mt-3 px-0.5">
          <p className="truncate text-sm font-semibold uppercase tracking-tight text-white">{product.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar value={percent} thin />
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white/45">{total ? `${done}/${total}` : "—"}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
