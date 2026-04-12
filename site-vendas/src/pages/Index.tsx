import { Link } from "react-router-dom";
import { HeroSection } from "@/components/HeroSection";
import { ProductCarousel } from "@/components/ProductCarousel";
import { EditingBanner } from "@/components/EditingBanner";
import { CategoriesCarousel } from "@/components/CategoriesCarousel";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { FeaturesBanner } from "@/components/FeaturesBanner";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ShopTheLook } from "@/components/ShopTheLook";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/store/languageStore";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Skeleton } from "@/components/ui/skeleton";

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
              <Link to="/catalog" className="w-full sm:w-auto bg-[#111] text-white px-12 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-black/90 transition-all shadow-xl active:scale-95 text-center text-[15px] md:text-base border border-white/10">
                {t("viewFullCatalog")}
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
    <div className="w-full max-w-[1300px] mx-auto overflow-x-hidden">
      {!hiddenSections.includes('hero') && <HeroSection />}
      {(settings.homeSectionOrder.sections || [])
        .filter(sec => !hiddenSections.includes(sec))
        .map(renderSection)}
    </div>
  );
}


