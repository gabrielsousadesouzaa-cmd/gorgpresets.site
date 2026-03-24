import { useCallback } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Product } from "@/data/products";
import { ProductCard } from "./ProductCard";
import { useLanguage } from "@/store/languageStore";

interface ProductCarouselProps {
  title: string;
  description?: string;
  products: Product[];
  id?: string;
  isBestSeller?: boolean;
  bgClass?: string;
}

export function ProductCarousel({
  title,
  description,
  products,
  id,
  isBestSeller = false,
  bgClass = "",
}: ProductCarouselProps) {
  const { t } = useLanguage();

  // Configurações específicas para cada tipo de carrossel
  // Configurações específicas para cada tipo de carrossel
  const emblaOptions = isBestSeller 
    ? { 
        align: "start" as const, 
        loop: false, 
        dragFree: false, 
        containScroll: "trimSnaps" as const, 
        watchDrag: true,
        breakpoints: {
          '(min-width: 1024px)': { 
            align: "start" as const, 
            loop: false, 
            dragFree: true, 
            containScroll: "trimSnaps" as const, 
          }
        }
      }
    : { 
        align: "start" as const, 
        loop: false,
        dragFree: true,
        containScroll: "trimSnaps" as const 
      };

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!products || products.length === 0) return null;
  
  if (isBestSeller) {
    return (
      <section id={id} className={`pt-6 pb-4 md:pt-12 md:pb-8 w-full ${bgClass || 'bg-white'} overflow-hidden`}>
        <div className="container mx-auto px-4 md:px-8">
          <div className="bg-[#f7f7f7] rounded-[2.5rem] py-16 px-0 md:p-14 flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-center overflow-hidden">
            
            {/* Esquerda: Título/Desc (Mobile: Centralizado e no Topo) */}
            <div className="w-full lg:w-1/4 text-center lg:text-left space-y-3 pb-4 lg:pb-0 px-6 md:px-0 flex-shrink-0">
              <h2 className="text-2xl md:text-3xl font-bold text-[#333] uppercase tracking-tight">
                {title}
              </h2>
              <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed max-w-sm mx-auto lg:mx-0">
                {description || t("bestSellersDesc")}
              </p>

              {/* Setas (Somente PC - REATIVADAS POR PEDIDO DO USER) */}
              <div className="hidden lg:flex gap-3 pt-6">
                 <button onClick={scrollPrev} className="bg-white hover:bg-black hover:text-white text-black p-3 rounded-full shadow-lg transition-all border border-black/5 active:scale-95"><ChevronLeft  size={20}/></button>
                 <button onClick={scrollNext} className="bg-white hover:bg-black hover:text-white text-black p-3 rounded-full shadow-lg transition-all border border-black/5 active:scale-95"><ChevronRight size={20}/></button>
              </div>
            </div>

            {/* Direita: Carrossel Best Seller Unificado */}
            <div className="w-full lg:w-3/4 relative min-w-0">
              <div 
                className="overflow-hidden py-16 -my-16 px-6 -mx-6" 
                ref={emblaRef}
              >
                <div className="flex -mx-3 px-3">
                  {/* Loop único para Mobile e Desktop */}
                  {products.map((product, idx) => (
                    <div
                      key={`bst-p-${product.id}-${idx}`}
                      className={`flex-none px-3 w-[72%] sm:w-[50%] lg:w-[33.33%] transition-transform duration-300 ${idx >= 6 ? 'hidden lg:block' : ''}`}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Seção Padrão (Fundo Branco, Título no Topo, Alinhado à Esquerda)
  return (
    <section id={id} className={`pt-4 pb-16 w-full ${bgClass} overflow-hidden`}>
      <div className="container mx-auto px-4 md:px-8">
        {/* Título Centralizado com Linha Vermelha */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center justify-center text-center mb-10"
        >
          <div className="relative inline-block">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-[#333] pb-1">
              {title}
            </h2>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "80%" }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-[3px] bg-[#d82828] mx-auto"
            />
          </div>
        </motion.div>

        {/* Carrossel Original Centralizado no Container com Setas nas Laterais */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="w-full relative group"
        >
          {/* Setas Flutuantes (Somente Desktop e se houver mais de 4 produtos) */}
          {products.length > 4 && (
            <div className="hidden lg:block">
              <button 
                onClick={scrollPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-white hover:bg-black hover:text-white text-black p-4 rounded-full shadow-2xl border border-black/5 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
              <button 
                onClick={scrollNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-white hover:bg-black hover:text-white text-black p-4 rounded-full shadow-2xl border border-black/5 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={24} strokeWidth={2.5} />
              </button>
            </div>
          )}

          <div className="overflow-hidden py-12 -my-12 px-6 -mx-6" ref={emblaRef}>
            <div className="flex -mx-3 px-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex-none px-3 w-[66%] sm:w-[50%] md:w-[33.33%] lg:w-[25%]"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
