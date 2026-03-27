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
      <section id={id} className={`pt-6 pb-4 md:pt-16 md:pb-12 w-full ${bgClass || 'bg-white'} overflow-hidden`}>
        <div className="container mx-auto px-4 md:px-8">
          {/* Container Principal com Estilo Especial */}
          <div className="bg-[#f7f7f7] rounded-[3rem] py-16 px-6 md:px-14 border border-black/[0.03]">
            
            {/* 1. CABEÇALHO: Centralizado no PC para "Arrumar os Blocos" */}
            <div className="text-center md:text-center space-y-3 mb-12 max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter">
                {title}
              </h2>
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: 48 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                className="h-1 bg-[#d82828] mx-auto mb-4" 
              />
              <p className="text-sm md:text-base text-gray-600 font-bold leading-relaxed">
                {description || t("bestSellersDesc")}
              </p>
            </div>

            {/* 2. CONTEÚDO: Grade no PC / Carrossel no Mobile (Intacto) */}
            <div className="relative w-full">
              
              {/* VERSÃO DESKTOP: Grade Fixa de 4 Colunas (Mais Organizado) */}
              <div className="hidden lg:grid grid-cols-4 gap-6">
                {products.slice(0, 4).map((product) => (
                  <div key={`bst-pc-${product.id}`} className="flex flex-col h-full">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              {/* VERSÃO MOBILE: Carrossel (INTACTO conforme solicitado - Adicionado py-10/-my-10 para evitar borda cortada) */}
              <div className="lg:hidden relative -mx-6 px-6 overflow-hidden py-10 -my-10" ref={emblaRef}>
                 <div className="flex -mx-3 px-3">
                   {products.map((product, idx) => (
                     <div
                       key={`bst-p-mob-${product.id}-${idx}`}
                       className="flex-none px-3 w-[72%] sm:w-[50%]"
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
