import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Paperclip, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccess, useAuth, useCatalog, useProgress } from "../context/MembersContext";
import { moduleLessons, productLessons, productModules, productProgress } from "../lib/catalog";
import type { Progress } from "../lib/types";
import { formatDuration } from "../lib/format";
import { VideoPlayer } from "../components/VideoPlayer";
import { AttachmentList } from "../components/MaterialsList";
import { Btn, BtnLink, Eyebrow, ProgressBar, SafeImg, Skeleton } from "../components/ui";

export default function LessonPage() {
  const { slug, lessonId } = useParams();
  const navigate = useNavigate();
  const { catalog, isLoading } = useCatalog();
  const { owned, loading: accessLoading } = useAccess();
  const { map: progress, save } = useProgress();
  const { user } = useAuth();

  const product = catalog.products.find((p) => p.slug === slug);
  const lessons = useMemo(() => (product ? productLessons(catalog, product.id) : []), [catalog, product]);
  const modules = useMemo(() => (product ? productModules(catalog, product.id) : []), [catalog, product]);
  const index = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[index];
  const prev = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 ? lessons[index + 1] : undefined;
  const lessonModule = modules.find((m) => m.id === lesson?.moduleId);
  const moduleNumber = modules.findIndex((m) => m.id === lesson?.moduleId) + 1;
  const stats = productProgress(lessons, progress);
  const entry = lesson ? progress.get(lesson.id) : undefined;

  // Sempre lê o progresso mais recente dentro dos callbacks do player.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Próxima aula automática: guarda o destino no momento em que a aula termina.
  const [autoNext, setAutoNext] = useState<{ lessonId: string; seconds: number } | null>(null);
  const countdown = autoNext?.seconds ?? null;
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAutoNext(null);
    if (lesson) setOpenModules((s) => new Set(s).add(lesson.moduleId));
    window.scrollTo({ top: 0 });
  }, [lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const write = useCallback(
    (patch: Partial<Progress>) => {
      if (!lesson || !product) return;
      const current = progressRef.current.get(lesson.id);
      void save({
        lessonId: lesson.id,
        productId: product.id,
        completed: current?.completed ?? false,
        position: current?.position ?? 0,
        duration: current?.duration ?? lesson.durationSeconds,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    },
    [lesson, product, save],
  );

  // Registra a abertura da aula para alimentar "Continuar assistindo".
  useEffect(() => {
    if (lesson && product && owned.has(product.id)) write({});
  }, [lesson?.id, owned.has(product?.id || "")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoNext || !product) return;
    if (autoNext.seconds <= 0) {
      setAutoNext(null);
      navigate(`/membros/colecao/${product.slug}/aula/${autoNext.lessonId}`);
      return;
    }
    const t = setTimeout(() => setAutoNext((a) => (a ? { ...a, seconds: a.seconds - 1 } : a)), 1000);
    return () => clearTimeout(t);
  }, [autoNext, product, navigate]);

  if (isLoading || accessLoading) return <LessonSkeleton />;
  if (!product || (!product.published && !user?.isAdmin)) return <Navigate to="/membros" replace />;
  if (!owned.has(product.id) || !lesson) return <Navigate to={`/membros/colecao/${product.slug}`} replace />;

  const completed = !!entry?.completed;

  const onProgress = (position: number, duration: number) => {
    const current = progressRef.current.get(lesson.id);
    write({ position, duration, completed: current?.completed || position >= duration * 0.92 });
  };

  const onEnded = () => {
    write({ completed: true });
    if (next) setAutoNext({ lessonId: next.id, seconds: 6 });
  };

  return (
    <div className="pb-28 pt-16 md:pb-16 md:pt-[72px]">
      <div className="ma-gutter flex items-center gap-2 py-4 text-[13px] text-white/55">
        <Link to={`/membros/colecao/${product.slug}`} className="inline-flex min-w-0 items-center gap-1.5 font-medium transition-colors hover:text-white">
          <ChevronLeft size={16} className="shrink-0" />
          <span className="truncate uppercase tracking-[0.12em]">{product.title}</span>
        </Link>
        {lessonModule && (
          <>
            <span className="text-white/20">/</span>
            <span className="truncate">{lessonModule.title}</span>
          </>
        )}
      </div>

      <div className="ma-gutter grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-2xl shadow-[0_30px_80px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10 md:rounded-3xl">
            <VideoPlayer
              key={lesson.id}
              url={lesson.videoUrl}
              poster={lesson.thumbnailUrl || product.bannerUrl}
              startAt={entry && !entry.completed ? entry.position : 0}
              onProgress={onProgress}
              onEnded={onEnded}
            />

            <AnimatePresence>
              {countdown !== null && next && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
                >
                  <div className="flex w-full max-w-md flex-col items-center text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Próxima aula em {countdown}s</p>
                    <div className="relative mt-5 aspect-video w-56 overflow-hidden rounded-xl ring-1 ring-white/15">
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${product.accentColor}, #0b0b0c)` }} />
                      <SafeImg src={next.thumbnailUrl || product.bannerUrl} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <p className="mt-4 text-lg font-semibold">{next.title}</p>
                    <div className="mt-6 flex gap-3">
                      <Btn onClick={() => setAutoNext((a) => (a ? { ...a, seconds: 0 } : a))} icon={<Play size={14} fill="currentColor" />}>Assistir agora</Btn>
                      <Btn variant="glass" onClick={() => setAutoNext(null)} icon={<X size={14} />}>Cancelar</Btn>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Eyebrow>
                {moduleNumber > 0 ? `Módulo ${moduleNumber} · ` : ""}Aula {index + 1} de {lessons.length}
              </Eyebrow>
              <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-[2rem] md:leading-tight">{lesson.title}</h1>
              {lesson.durationSeconds > 0 && <p className="mt-2 text-sm text-white/45">{formatDuration(lesson.durationSeconds)}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Btn
                variant={completed ? "outline" : "white"}
                onClick={() => write({ completed: !completed })}
                icon={completed ? <CircleCheck size={16} className="text-emerald-400" /> : <Check size={16} />}
                className={completed ? "text-emerald-300 ring-emerald-400/40" : undefined}
              >
                {completed ? "Concluída" : "Concluir aula"}
              </Btn>
              {prev && (
                <BtnLink variant="glass" to={`/membros/colecao/${product.slug}/aula/${prev.id}`} aria-label="Aula anterior" className="w-11 px-0">
                  <ChevronLeft size={18} />
                </BtnLink>
              )}
              {next && (
                <BtnLink variant="glass" to={`/membros/colecao/${product.slug}/aula/${next.id}`} icon={<ChevronRight size={16} />} className="flex-row-reverse">
                  Próxima
                </BtnLink>
              )}
            </div>
          </div>

          {lesson.description && (
            <div className="mt-8 rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] md:p-7">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/70">{lesson.description}</p>
            </div>
          )}

          {lesson.attachments.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
                <Paperclip size={13} /> Materiais da aula
              </p>
              <AttachmentList items={lesson.attachments} />
            </div>
          )}
        </div>

        {/* Lista de conteúdo */}
        <aside className="self-start lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.07] md:rounded-3xl">
            <div className="border-b border-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Conteúdo da coleção</p>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={stats.percent} />
                <span className="shrink-0 text-xs font-semibold tabular-nums text-white/60">
                  {stats.done}/{stats.total}
                </span>
              </div>
            </div>
            <div className="max-h-[calc(100vh-15rem)] overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
              {modules.map((m, mi) => {
                const items = moduleLessons(catalog, m.id);
                const doneCount = items.filter((l) => progress.get(l.id)?.completed).length;
                const open = openModules.has(m.id);
                return (
                  <div key={m.id} className="mb-1">
                    <button
                      onClick={() => setOpenModules((s) => {
                        const nextSet = new Set(s);
                        if (nextSet.has(m.id)) nextSet.delete(m.id);
                        else nextSet.add(m.id);
                        return nextSet;
                      })}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="text-xs font-bold tabular-nums text-ma">{String(mi + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{m.title}</span>
                        <span className="text-[11px] text-white/40">
                          {doneCount}/{items.length} concluídas
                        </span>
                      </span>
                      <ChevronDown size={16} className={cn("shrink-0 text-white/40 transition-transform duration-300", open && "rotate-180")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          {items.map((l) => {
                            const current = l.id === lesson.id;
                            const done = progress.get(l.id)?.completed;
                            return (
                              <li key={l.id}>
                                <Link
                                  to={`/membros/colecao/${product.slug}/aula/${l.id}`}
                                  className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                                    current ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
                                  )}
                                >
                                  <span className="grid h-6 w-6 shrink-0 place-items-center">
                                    {current ? (
                                      <EqualizerIcon />
                                    ) : done ? (
                                      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-black">
                                        <Check size={11} strokeWidth={3.5} />
                                      </span>
                                    ) : (
                                      <span className="h-5 w-5 rounded-full ring-1 ring-inset ring-white/25" />
                                    )}
                                  </span>
                                  <span className={cn("min-w-0 flex-1 truncate text-[13px]", current ? "font-semibold text-white" : "text-white/70")}>{l.title}</span>
                                  {l.durationSeconds > 0 && <span className="shrink-0 text-[11px] tabular-nums text-white/35">{formatDuration(l.durationSeconds)}</span>}
                                </Link>
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EqualizerIcon() {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-label="Assistindo agora">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-ma"
          style={{ animation: `ma-eq 0.9s ${i * 0.15}s ease-in-out infinite alternate`, height: "40%" }}
        />
      ))}
      <style>{`@keyframes ma-eq{0%{height:25%}100%{height:100%}}`}</style>
    </span>
  );
}

function LessonSkeleton() {
  return (
    <div className="ma-gutter grid gap-8 pt-28 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <Skeleton className="aspect-video w-full rounded-3xl" />
        <Skeleton className="mt-7 h-8 w-2/3" />
      </div>
      <Skeleton className="h-[480px] rounded-3xl" />
    </div>
  );
}
