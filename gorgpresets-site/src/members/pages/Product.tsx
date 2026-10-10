import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Download, FolderDown, Layers, Lock, MessageCircle, Play, PlayCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccess, useAuth, useCatalog, useMaterials, useProgress } from "../context/MembersContext";
import { lessonPercent, moduleLessons, productLessons, productModules, productProgress, resumeLesson, totalDuration } from "../lib/catalog";
import { formatDuration } from "../lib/format";
import { Btn, BtnLink, ProgressBar, SafeImg, Skeleton } from "../components/ui";
import { MaterialsGrid } from "../components/MaterialsList";
import { PosterArt } from "../components/PosterArt";

type Tab = "aulas" | "materiais" | "sobre";

export default function ProductPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { catalog, isLoading } = useCatalog();
  const { owned } = useAccess();
  const { map: progress } = useProgress();
  const { user } = useAuth();

  const product = catalog.products.find((p) => p.slug === slug);
  const locked = product ? !owned.has(product.id) : true;
  const modules = useMemo(() => (product ? productModules(catalog, product.id) : []), [catalog, product]);
  const lessons = useMemo(() => (product ? productLessons(catalog, product.id) : []), [catalog, product]);
  const stats = productProgress(lessons, progress);
  const resume = resumeLesson(lessons, progress);
  const materials = useMaterials(product?.id, !locked);

  const [tab, setTab] = useState<Tab>("aulas");
  const [moduleId, setModuleId] = useState<string | null>(null);

  useEffect(() => {
    setModuleId(null);
    setTab("aulas");
  }, [slug]);

  useEffect(() => {
    if (!moduleId && modules.length) setModuleId((resume && resume.moduleId) || modules[0].id);
  }, [modules, resume, moduleId]);

  // Vindo do botão "Assistir" do banner: abre direto a aula certa.
  useEffect(() => {
    if (params.get("play") && product && resume && !locked) {
      navigate(`/membros/colecao/${product.slug}/aula/${resume.id}`, { replace: true });
    } else if (params.get("play")) {
      setParams({}, { replace: true });
    }
  }, [params, product, resume, locked, navigate, setParams]);

  if (isLoading) return <ProductSkeleton />;
  if (!product || (!product.published && !user?.isAdmin)) return <Navigate to="/membros" replace />;

  const activeModule = modules.find((m) => m.id === moduleId) || modules[0];
  const activeLessons = activeModule ? moduleLessons(catalog, activeModule.id) : [];
  const started = stats.done > 0 || lessons.some((l) => (progress.get(l.id)?.position || 0) > 3);
  const resumeIndex = resume ? lessons.indexOf(resume) + 1 : 0;

  const unlock = () => {
    if (product.checkoutUrl) window.open(product.checkoutUrl, "_blank", "noopener");
    else navigate("/membros/suporte");
  };

  return (
    <div className="pb-28 md:pb-20">
      {/* ── Billboard ───────────────────────────────────────────── */}
      <section className="relative min-h-[640px] overflow-hidden md:h-[86vh] md:max-h-[880px]">
        <div className="absolute inset-0">
          <div className="ma-kenburns absolute inset-0" style={{ background: `linear-gradient(135deg, ${product.accentColor} 0%, #050505 85%)` }}>
            <SafeImg src={product.bannerUrl || product.coverUrl} alt="" loading="eager" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40" />
        </div>

        <div className="ma-gutter relative z-10 flex min-h-[640px] flex-col pb-10 pt-20 md:h-full md:pb-16 md:pt-24">
          <Link to="/membros" className="inline-flex w-fit items-center gap-2 rounded-full py-2 pr-3 text-[13px] font-medium text-white/70 transition-colors hover:text-white">
            <ArrowLeft size={16} /> Voltar
          </Link>

          <div className="mt-auto flex items-end justify-between gap-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl flex-1"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] ring-1 ring-inset backdrop-blur-md",
                  locked ? "bg-ma/15 text-white ring-ma/50" : "bg-white/10 text-white ring-white/20",
                )}
              >
                {locked ? <Lock size={12} /> : <Check size={12} />}
                {locked ? "Ainda não faz parte da sua coleção" : "Na sua coleção"}
              </span>

              {product.logoUrl ? (
                <SafeImg src={product.logoUrl} alt={product.title} loading="eager" className="mt-6 max-h-28 w-auto max-w-[80%] object-contain object-left md:max-h-36" />
              ) : (
                <h1 className="mt-5 text-5xl font-semibold uppercase leading-[0.95] tracking-[-0.04em] [text-wrap:balance] md:text-7xl lg:text-8xl">{product.title}</h1>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-white/65">
                {product.subtitle && <span className="uppercase tracking-[0.14em] text-white/85">{product.subtitle}</span>}
                <Dot />
                <span>{modules.length} {modules.length === 1 ? "módulo" : "módulos"}</span>
                {!locked && lessons.length > 0 && (
                  <>
                    <Dot />
                    <span>{lessons.length} {lessons.length === 1 ? "aula" : "aulas"}</span>
                    {totalDuration(lessons) > 0 && (
                      <>
                        <Dot />
                        <span>{formatDuration(totalDuration(lessons))}</span>
                      </>
                    )}
                  </>
                )}
              </div>

              {!locked && lessons.length > 0 && (
                <div className="mt-5 flex max-w-sm items-center gap-3">
                  <ProgressBar value={stats.percent} />
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-white/70">{stats.percent}% concluído</span>
                </div>
              )}

              {product.description && <p className="mt-5 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-white/75 md:line-clamp-4 md:text-base">{product.description}</p>}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {locked ? (
                  <>
                    <Btn size="lg" variant="accent" onClick={unlock} icon={<ShoppingBag size={16} />}>
                      {product.priceLabel ? `Desbloquear · ${product.priceLabel}` : "Desbloquear coleção"}
                    </Btn>
                    <BtnLink size="lg" variant="glass" to="/membros/suporte" icon={<MessageCircle size={16} />}>
                      Já comprei
                    </BtnLink>
                  </>
                ) : (
                  <>
                    {resume && (
                      <BtnLink size="lg" to={`/membros/colecao/${product.slug}/aula/${resume.id}`} icon={<Play size={16} fill="currentColor" />}>
                        {started ? `Continuar · Aula ${resumeIndex}` : "Começar agora"}
                      </BtnLink>
                    )}
                    <Btn size="lg" variant="glass" onClick={() => { setTab("materiais"); document.getElementById("conteudo")?.scrollIntoView({ behavior: "smooth" }); }} icon={<FolderDown size={16} />}>
                      Downloads
                    </Btn>
                  </>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative hidden aspect-[2/3] w-[260px] shrink-0 overflow-hidden rounded-2xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15 lg:block xl:w-[300px]"
            >
              <PosterArt product={product} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Conteúdo ────────────────────────────────────────────── */}
      <section id="conteudo" className="ma-gutter relative z-10 scroll-mt-24">
        <div className="flex items-center gap-1 border-b border-white/10">
          {(["aulas", "materiais", "sobre"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("relative px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors md:px-5", tab === t ? "text-white" : "text-white/45 hover:text-white/80")}
            >
              {t === "aulas" ? "Aulas" : t === "materiais" ? "Materiais" : "Sobre"}
              {tab === t && <motion.span layoutId="ma-product-tab" className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-ma" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pt-8"
          >
            {tab === "aulas" &&
              (locked ? (
                <LockedModules modules={modules} onUnlock={unlock} priceLabel={product.priceLabel} />
              ) : modules.length === 0 ? (
                <Empty icon={<Layers />} text="As aulas desta coleção estão sendo preparadas." />
              ) : (
                <div>
                  {modules.length > 1 && (
                    <div className="ma-scroll -mx-[var(--ma-gutter)] mb-8 gap-2 px-[var(--ma-gutter)]">
                      {modules.map((m, i) => {
                        const count = moduleLessons(catalog, m.id).length;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setModuleId(m.id)}
                            className={cn(
                              "rounded-full px-5 py-2.5 text-left text-[13px] font-semibold transition-all duration-300",
                              m.id === activeModule?.id ? "bg-white text-black" : "bg-white/[0.06] text-white/70 ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-white",
                            )}
                          >
                            <span className="mr-2 opacity-50">{String(i + 1).padStart(2, "0")}</span>
                            {m.title}
                            <span className="ml-2 text-[11px] font-medium opacity-50">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeModule && (
                    <div className="mb-6 max-w-3xl">
                      <h2 className="text-2xl font-bold uppercase tracking-tighter md:text-3xl">{activeModule.title}</h2>
                      <div className="mt-2 h-[3px] w-10 rounded-full bg-ma" />
                      {activeModule.description && <p className="mt-4 text-sm text-white/55 md:text-[15px]">{activeModule.description}</p>}
                    </div>
                  )}

                  <ol className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                    {activeLessons.map((lesson, i) => {
                      const pct = lessonPercent(lesson, progress);
                      const done = progress.get(lesson.id)?.completed;
                      return (
                        <li key={lesson.id}>
                          <Link to={`/membros/colecao/${product.slug}/aula/${lesson.id}`} className="group flex items-center gap-4 p-3 transition-colors hover:bg-white/[0.04] md:gap-6 md:p-5">
                            <span className="hidden w-6 shrink-0 text-center text-lg font-semibold tabular-nums text-white/30 md:block">{i + 1}</span>
                            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 sm:w-44 md:w-56">
                              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${product.accentColor}, #0b0b0c)` }} />
                              <SafeImg src={lesson.thumbnailUrl || product.bannerUrl} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                              <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/40">
                                <PlayCircle className="h-10 w-10 text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                              </span>
                              {pct > 0 && (
                                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                                  <div className="h-full bg-ma" style={{ width: `${pct}%` }} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="text-[15px] font-semibold leading-snug text-white md:text-base">
                                  <span className="mr-1.5 text-white/40 md:hidden">{i + 1}.</span>
                                  {lesson.title}
                                </h3>
                                <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-white/45">
                                  {done && (
                                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-black">
                                      <Check size={12} strokeWidth={3.5} />
                                    </span>
                                  )}
                                  {lesson.durationSeconds > 0 && formatDuration(lesson.durationSeconds)}
                                </span>
                              </div>
                              {lesson.description && (
                                <div className="hidden sm:block">
                                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/50">{lesson.description}</p>
                                </div>
                              )}
                              {lesson.attachments.length > 0 && (
                                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/40">
                                  <Download size={12} /> {lesson.attachments.length} {lesson.attachments.length === 1 ? "material" : "materiais"}
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                    {activeLessons.length === 0 && <li className="p-8 text-center text-sm text-white/40">Nenhuma aula neste módulo ainda.</li>}
                  </ol>
                </div>
              ))}

            {tab === "materiais" &&
              (locked ? (
                <LockedModules modules={[]} onUnlock={unlock} priceLabel={product.priceLabel} message="Os arquivos desta coleção ficam disponíveis assim que ela for desbloqueada." />
              ) : materials.isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1].map((i) => <Skeleton key={i} className="h-[88px]" />)}
                </div>
              ) : materials.data?.length ? (
                <MaterialsGrid items={materials.data} />
              ) : (
                <Empty icon={<FolderDown />} text="Nenhum arquivo para download nesta coleção." />
              ))}

            {tab === "sobre" && (
              <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Sobre a coleção</h2>
                  <div className="mt-2 h-[3px] w-10 rounded-full bg-ma" />
                  <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-white/70">{product.description || "—"}</p>
                </div>
                {modules.length > 0 && (
                  <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/[0.07]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">O que tem dentro</p>
                    <ul className="mt-4 space-y-4">
                      {modules.map((m, i) => (
                        <li key={m.id} className="flex gap-4">
                          <span className="text-sm font-bold tabular-nums text-ma">{String(i + 1).padStart(2, "0")}</span>
                          <div>
                            <p className="text-sm font-semibold text-white">{m.title}</p>
                            {m.description && <p className="mt-0.5 text-[13px] text-white/50">{m.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-white/30" />;
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/[0.02] py-16 text-center text-white/45 ring-1 ring-white/[0.06]">
      <span className="text-white/30 [&>svg]:h-10 [&>svg]:w-10">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function LockedModules({ modules, onUnlock, priceLabel, message }: { modules: { id: string; title: string; description: string }[]; onUnlock: () => void; priceLabel: string; message?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {modules.length > 0 && (
        <ol className="divide-y divide-white/[0.06] self-start overflow-hidden rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
          {modules.map((m, i) => (
            <li key={m.id} className="flex items-center gap-5 p-5">
              <span className="text-lg font-semibold tabular-nums text-white/25">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white/85">{m.title}</p>
                {m.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-white/45">{m.description}</p>}
              </div>
              <Lock size={16} className="shrink-0 text-white/35" />
            </li>
          ))}
        </ol>
      )}
      <div className={cn("relative overflow-hidden rounded-2xl p-7 ring-1 ring-ma/30", modules.length === 0 && "lg:col-span-2 lg:max-w-xl")}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--ma-accent)/0.35),transparent_65%)]" />
        <div className="relative">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ma text-white shadow-lg shadow-ma/40">
            <Lock size={20} />
          </span>
          <h3 className="mt-5 text-xl font-bold uppercase tracking-tighter">Desbloqueie esta coleção</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{message || "Acesso vitalício a todas as aulas, presets para celular e computador e atualizações futuras."}</p>
          <Btn variant="accent" size="lg" className="mt-6 w-full" onClick={onUnlock} icon={<ShoppingBag size={16} />}>
            {priceLabel ? `Desbloquear · ${priceLabel}` : "Desbloquear agora"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div>
      <Skeleton className="h-[86vh] w-full rounded-none" />
      <div className="ma-gutter mt-10 space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  );
}
