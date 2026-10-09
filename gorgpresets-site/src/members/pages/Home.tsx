import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useAccess, useAuth, useCatalog, useProgress, useSettings } from "../context/MembersContext";
import { continueWatching, productLessons, productProgress } from "../lib/catalog";
import type { HeroSlide, Product, Row } from "../lib/types";
import { sortByOrder } from "../lib/format";
import { HeroCarousel } from "../components/HeroCarousel";
import { Rail } from "../components/Rail";
import { ContinueCard, LandscapeCard, PosterCard, RankedCard, POSTER_WIDTH } from "../components/Cards";
import { BtnLink, Skeleton } from "../components/ui";

const FALLBACK_ROWS: Row[] = [
  { id: "fallback-continue", title: "Continuar assistindo", subtitle: "", kind: "continue", cardStyle: "landscape", accentTitle: false, productIds: [], visible: true, sortOrder: 0 },
  { id: "fallback-owned", title: "Sua Coleção Particular", subtitle: "", kind: "owned", cardStyle: "poster", accentTitle: false, productIds: [], visible: true, sortOrder: 1 },
  { id: "fallback-locked", title: "Desbloqueie novas estéticas", subtitle: "", kind: "locked", cardStyle: "poster", accentTitle: false, productIds: [], visible: true, sortOrder: 2 },
];

export default function Home() {
  const { catalog, isLoading } = useCatalog();
  const { owned } = useAccess();
  const { list: progress, map: progressMap } = useProgress();
  const { data: settings } = useSettings();
  const { user } = useAuth();

  const products = useMemo(
    () => sortByOrder(catalog.products.filter((p) => p.published || user?.isAdmin)),
    [catalog.products, user?.isAdmin],
  );

  const percentOf = useMemo(() => {
    const cache = new Map<string, number>();
    return (p: Product) => {
      if (!cache.has(p.id)) cache.set(p.id, productProgress(productLessons(catalog, p.id), progressMap).percent);
      return cache.get(p.id)!;
    };
  }, [catalog, progressMap]);

  const slides: HeroSlide[] = useMemo(() => {
    if (settings?.heroSlides?.length) return settings.heroSlides;
    // Sem banner configurado: destaca automaticamente as coleções do membro.
    const featured = [...products.filter((p) => owned.has(p.id)), ...products.filter((p) => !owned.has(p.id))].slice(0, 3);
    return featured.map((p) => ({
      id: `auto-${p.id}`,
      eyebrow: owned.has(p.id) ? "Na sua coleção" : "Disponível para você",
      title: p.title,
      subtitle: p.description,
      imageUrl: p.bannerUrl || p.coverUrl,
      mobileImageUrl: "",
      videoUrl: "",
      logoUrl: p.logoUrl,
      theme: "dark" as const,
      ctaLabel: "",
      productId: p.id,
      ctaUrl: "",
    }));
  }, [settings?.heroSlides, products, owned]);

  const rows = useMemo(() => {
    const configured = sortByOrder(catalog.rows.filter((r) => r.visible));
    return configured.length ? configured : FALLBACK_ROWS;
  }, [catalog.rows]);

  const continueItems = useMemo(() => continueWatching(catalog, progress, owned), [catalog, progress, owned]);

  const productsFor = (row: Row): Product[] => {
    switch (row.kind) {
      case "owned":
        return products.filter((p) => owned.has(p.id));
      case "locked":
        return products.filter((p) => !owned.has(p.id));
      case "all":
        return products;
      case "curated":
        return row.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
      default:
        return [];
    }
  };

  if (isLoading) return <HomeSkeleton />;

  return (
    <div className="pb-28 md:pb-16">
      {slides.length > 0 ? (
        <HeroCarousel slides={slides} products={products} owned={owned} interval={settings?.heroInterval || 8} />
      ) : (
        <div className="h-32" />
      )}

      <div className="relative z-10 -mt-16 space-y-4 md:-mt-28 md:space-y-8">
        {rows.map((row) => {
          if (row.kind === "continue") {
            if (!continueItems.length) return null;
            return (
              <Rail key={row.id} title={row.title || "Continuar assistindo"} subtitle={row.subtitle} accent={row.accentTitle}>
                {continueItems.map((item) => (
                  <ContinueCard key={item.lesson.id} product={item.product} lesson={item.lesson} percent={item.percent} />
                ))}
              </Rail>
            );
          }
          const list = productsFor(row);
          if (!list.length) return null;
          return (
            <Rail key={row.id} title={row.title} subtitle={row.subtitle} accent={row.accentTitle}>
              {list.map((p, i) => {
                const locked = !owned.has(p.id);
                const percent = locked ? 0 : percentOf(p);
                if (row.cardStyle === "ranked") return <RankedCard key={p.id} product={p} locked={locked} percent={percent} rank={i + 1} />;
                if (row.cardStyle === "landscape") return <LandscapeCard key={p.id} product={p} locked={locked} percent={percent} />;
                return <PosterCard key={p.id} product={p} locked={locked} percent={percent} />;
              })}
            </Rail>
          );
        })}

        {!products.length && (
          <div className="ma-gutter pt-10">
            <div className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] bg-white/[0.03] px-8 py-14 text-center ring-1 ring-white/[0.07]">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ma/15 text-ma">
                <Sparkles />
              </span>
              <h2 className="mt-6 text-2xl font-bold uppercase tracking-tighter">Sua coleção está chegando</h2>
              <p className="mt-3 text-sm text-white/55">
                {user?.isAdmin
                  ? "Crie sua primeira coleção no Studio para ela aparecer aqui."
                  : "Assim que sua compra for confirmada, seus presets e aulas aparecem aqui."}
              </p>
              {user?.isAdmin ? (
                <BtnLink to="/membros/studio/colecoes" className="mt-8">Abrir Studio</BtnLink>
              ) : (
                <BtnLink to="/membros/suporte" variant="glass" className="mt-8">Falar com o suporte</BtnLink>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="pb-24">
      <Skeleton className="h-[78svh] w-full rounded-none md:h-[88vh]" />
      <div className="ma-gutter -mt-24 space-y-10">
        {[0, 1].map((r) => (
          <div key={r}>
            <Skeleton className="mb-5 h-6 w-56" />
            <div className="flex gap-4 overflow-hidden">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className={`aspect-[2/3] shrink-0 ${POSTER_WIDTH}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
