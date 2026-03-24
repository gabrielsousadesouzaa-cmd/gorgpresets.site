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

export default function Index() {
  const { t, language } = useLanguage();
  const { products, loading } = useProducts();
  const { settings } = useSiteSettings();
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
          <div className="w-12 h-12 border-4 border-[#d82828] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Preparando sua experiência premium...</p>
      </div>
    );
  }


  return (
    <div className="w-full max-w-[1300px] mx-auto overflow-x-hidden">
      <HeroSection />

      {/* 1. NOVIDADES EXCLUSIVAS */}
      <div id="novidades" className="scroll-mt-20 mt-8 md:mt-18">
        <ProductCarousel
          title={t("newArrivals")}
          products={newProducts}
        />
      </div>

      {/* 2. BEST SELLERS - Side by side layout */}
      <div id="bestsellers" className="scroll-mt-20">
        <ProductCarousel
          title={t("bestSellers")}
          description={t("bestSellersDesc")}
          products={bestSellers}
          isBestSeller={true}
        />
      </div>

      {/* 3. EditingBanner - Edição Descomplicada */}
      <EditingBanner />

      {/* 4. CATEGORIAS */}
      <CategoriesCarousel />

      {/* 5. A Mágica Acontece (Before / After) */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-10">
             <h2 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter mb-3">
               {language === 'EN' ? 'THE MAGIC HAPPENS' : language === 'ES' ? 'LA MAGIA SUCEDE' : 'A Mágica Acontece'}
             </h2>
             <p className="text-sm md:text-base text-gray-500 font-medium">
               {language === 'EN' 
                 ? 'Slide to see the incredible transformation in 1 click.' 
                 : language === 'ES' 
                 ? 'Desliza para ver la increíble transformación en 1 clic.' 
                 : 'Arraste para o lado e veja a transformação absurda em apenas 1 clique.'}
             </p>
          </div>
          <BeforeAfterSlider 
            beforeImage="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&blur=1" 
            afterImage="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&auto=format&fit=crop" 
          />
        </div>
      </section>

      {/* 6. TODOS OS PRESETS */}
      <div id="catalogo" className="scroll-mt-20">
        <ProductCarousel
          title={t("allPresets")}
          products={allPresets}
        />
        
        {/* Botão Ver Todos os Presets */}
        <div className="flex justify-center mt-6 md:mt-10 mb-12 px-4 shadow-sm">
          <Link 
            to="/catalog" 
            className="w-full sm:w-auto bg-[#111] text-white px-12 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-black/90 transition-all shadow-xl active:scale-95 text-center text-[15px] md:text-base border border-white/10"
          >
            {t("allPresets")}
          </Link>
        </div>
      </div>

      <div className="mt-8 mb-12 md:mb-6">
        <TestimonialsSection />
      </div>

      {/* 8. FAQ */}
      <div id="faq" className="bg-gray-50/50 scroll-mt-20">
         <FaqAccordion />
      </div>

      {/* 9. Shop The Look */}
      <ShopTheLook />

      {/* 10. Diferenciais */}
      <div className="mb-0 md:mb-0">
         <FeaturesBanner />
      </div>
    </div>
  );
}


