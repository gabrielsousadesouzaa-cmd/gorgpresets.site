import { Link } from "react-router-dom";
import { HeroSection } from "@/components/HeroSection";
import { ProductCarousel } from "@/components/ProductCarousel";
import { EditingBanner } from "@/components/EditingBanner";
import { CategoriesCarousel } from "@/components/CategoriesCarousel";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/store/languageStore";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { lazy, Suspense } from "react";
import { PageTransition } from "@/components/PageTransition";

// Componentes pesados carregados sob demanda
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const FaqAccordion = lazy(() => import("@/components/FaqAccordion").then(m => ({ default: m.FaqAccordion })));
const ShopTheLook = lazy(() => import("@/components/ShopTheLook").then(m => ({ default: m.ShopTheLook })));
const BeforeAfterSlider = lazy(() => import("@/components/BeforeAfterSlider").then(m => ({ default: m.BeforeAfterSlider })));
const FeaturesBanner = lazy(() => import("@/components/FeaturesBanner").then(m => ({ default: m.FeaturesBanner })));

export default function Index() {
  const { t, language } = useLanguage();
  const { products, loading: productsLoading } = useProducts();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const order = settings.homeSectionOrder;

  // Helpers: usa ordem manual se existir, senao usa filtros padrao
  const resolveSection = (savedIds: string[], defaultFilter: (p: any) => boolean, limit = 6) => {
    if (savedIds && savedIds.length > 0) {
      return savedIds.map(id => products.find(p => p.id === id)).filter(Boolean) as any[];
    }
    return products.filter(defaultFilter).slice(0, limit);
  };

  const newProducts     = resolveSection(order.newArrivals,  p => p.isNew, 6);
  const bestSellers     = resolveSection(order.bestSellers,  p => p.isBestseller, 4);
  const allPresets      = resolveSection(order.allPresets,   () => true, 6);

  if (productsLoading || settingsLoading) {
    return (
      <div className="w-full max-w-[1350px] mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10 md:space-y-16 animate-in fade-in duration-500">
          {/* Skeleton Hero */}
          <div className="w-full">
            <Skeleton className="w-full h-[65vh] md:h-[70vh] rounded-[2.5rem] md:rounded-[3rem]" />
          </div>
          
          {/* Skeleton Products Row */}
          <div className="space-y-8">
            <div className="flex flex-col items-center md:items-start space-y-3">
              <Skeleton className="w-[280px] h-10 md:h-12 rounded-xl" />
              <Skeleton className="w-[180px] h-4 rounded-lg hidden md:block" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="w-full aspect-[4/5] rounded-[1.5rem] md:rounded-[2rem]" />
                  <div className="space-y-2 px-1">
                    <Skeleton className="w-full h-5 rounded-md" />
                    <Skeleton className="w-2/3 h-4 rounded-md opacity-60" />
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    );
  }


  const renderSection = (id: string) => {
    switch (id) {
      case 'novidades':
        return (
          <div key={id} id="novidades" className="scroll-mt-20 mt-4 md:mt-6">
            <ProductCarousel title={t("newArrivals")} products={newProducts} />
          </div>
        );
      case 'bestsellers':
        return (
          <div key={id} id="bestsellers" className="scroll-mt-20">
            <ProductCarousel title={t("bestSellers")} description={t("bestSellersDesc")} products={bestSellers} isBestSeller={true} />
          </div>
        );
      case 'banner':
        return <div key={id}><EditingBanner /></div>;
      case 'categorias':
        return <div key={id}><CategoriesCarousel /></div>;
      case 'magica':
        return (
          <section key={id} className="py-8 md:py-12 bg-white">
            <div className="container mx-auto px-6 max-w-5xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-4xl font-bold text-gray-950 uppercase tracking-tighter mb-3">
                  {language === 'EN' ? 'THE MAGIC HAPPENS' : language === 'ES' ? 'LA MAGIA SUCEDE' : 'A Mágica Acontece'}
                </h2>
                <p className="text-sm md:text-base text-gray-500 font-medium">
                  {language === 'EN' ? 'Slide to see the incredible transformation in 1 click.' : language === 'ES' ? 'Desliza para ver la increíble transformación en 1 clic.' : 'Arraste para o lado e veja a transformação absurda em apenas 1 clique.'}
                </p>
              </div>
              <BeforeAfterSlider beforeImage={settings.magic.beforeUrl} afterImage={settings.magic.afterUrl} />
            </div>
          </section>
        );
      case 'catalogo':
        return (
          <div key={id} id="catalogo" className="scroll-mt-20">
            <ProductCarousel title={t("allPresets")} products={allPresets} />
            <div className="flex justify-center mt-6 md:mt-10 mb-12 px-4 shadow-sm">
              <Link
                to="/catalog"
                className="group w-[90%] sm:w-auto mx-auto flex items-center justify-center gap-2 md:gap-3 overflow-hidden rounded-full bg-[#111] px-6 py-3.5 md:px-10 md:py-5 transition-all duration-700 ease-out hover:px-8 md:hover:px-[4.5rem] hover:gap-4 md:hover:gap-6 hover:bg-black shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              >
                <span className="text-[11px] md:text-sm font-black uppercase tracking-[0.2em] text-white transition-all duration-700 ease-out group-hover:tracking-[0.25em] md:group-hover:tracking-[0.35em]">
                  {t("viewFullCatalog")}
                </span>
                
                <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/10 transition-all duration-700 ease-out group-hover:bg-white group-hover:scale-110 shrink-0">
                  <svg
                    className="w-3 h-3 md:w-4 md:h-4 text-white group-hover:text-black transition-colors duration-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
        );
      case 'testimonials':
        return <div key={id} className="mt-8 mb-4 md:mb-2"><TestimonialsSection /></div>;
      case 'faq':
        return <div key={id} id="faq" className="bg-gray-50/50 scroll-mt-20"><FaqAccordion /></div>;
      case 'mosaico':
        return <div key={id}><ShopTheLook /></div>;
      case 'features':
        return <div key={id} className="mb-0 md:mb-0"><FeaturesBanner /></div>;
      default:
        return null;
    }
  };

  const hiddenSections = settings.homeSectionOrder.hiddenSections || [];

  return (
    <PageTransition>
      <div className="w-full max-w-[1300px] mx-auto overflow-x-hidden">
        {!hiddenSections.includes('hero') && <HeroSection />}
        <Suspense fallback={<div className="h-40 flex items-center justify-center"><Skeleton className="w-full h-32 rounded-3xl" /></div>}>
          {(settings.homeSectionOrder.sections || [])
            .filter(sec => !hiddenSections.includes(sec))
            .map(renderSection)}
        </Suspense>
      </div>
    </PageTransition>
  );
}
