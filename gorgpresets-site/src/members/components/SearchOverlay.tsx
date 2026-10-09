import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, PlayCircle, Search, X } from "lucide-react";
import { useAccess, useCatalog } from "../context/MembersContext";
import { formatDuration } from "../lib/format";
import { PosterArt } from "./PosterArt";
import { SafeImg } from "./ui";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalog } = useCatalog();
  const { owned } = useAccess();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const products = catalog.products.filter((p) => p.published);
    if (!q) return { products: products.slice(0, 6), lessons: [] };
    return {
      products: products.filter((p) => normalize(`${p.title} ${p.description} ${p.subtitle}`).includes(q)),
      lessons: catalog.lessons
        .filter((l) => l.published && normalize(`${l.title} ${l.description}`).includes(q))
        .slice(0, 8)
        .map((l) => ({ lesson: l, product: catalog.products.find((p) => p.id === l.productId)! }))
        .filter((x) => x.product),
    };
  }, [query, catalog]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/85 backdrop-blur-2xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="ma-gutter mx-auto max-w-5xl pb-24 pt-6 md:pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <div className="group relative flex-1">
                <Search className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-ma md:h-8 md:w-8" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar coleções e aulas"
                  className="w-full border-b-2 border-white/10 bg-transparent py-5 pl-10 text-2xl font-bold uppercase tracking-tighter text-white outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-white/25 focus:border-ma md:pl-14 md:text-4xl"
                />
              </div>
              <button onClick={onClose} className="rounded-full bg-white/10 p-3 text-white transition hover:rotate-90 hover:bg-white/20" aria-label="Fechar busca">
                <X size={20} />
              </button>
            </div>

            <div className="mt-10 space-y-10">
              {results.products.length > 0 && (
                <section>
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">{query ? "Coleções" : "Sugestões"}</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {results.products.map((p) => (
                      <Link key={p.id} to={`/membros/colecao/${p.slug}`} onClick={onClose} className="group relative block aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-white/10 transition duration-500 hover:scale-[1.03] hover:ring-white/30">
                        <PosterArt product={p} />
                        {!owned.has(p.id) && (
                          <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur"><Lock size={12} /></span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {results.lessons.length > 0 && (
                <section>
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Aulas</p>
                  <div className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                    {results.lessons.map(({ lesson, product }) => (
                      <Link
                        key={lesson.id}
                        to={`/membros/colecao/${product.slug}/aula/${lesson.id}`}
                        onClick={onClose}
                        className="group flex items-center gap-4 p-3 transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          <SafeImg src={lesson.thumbnailUrl || product.bannerUrl} className="h-full w-full object-cover" />
                          <PlayCircle className="absolute inset-0 m-auto h-7 w-7 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{lesson.title}</p>
                          <p className="truncate text-xs text-white/45">
                            {product.title}
                            {lesson.durationSeconds ? ` · ${formatDuration(lesson.durationSeconds)}` : ""}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {query && !results.products.length && !results.lessons.length && (
                <p className="py-16 text-center text-white/40">Nada encontrado para “{query}”.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
