import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Instagram, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/store/languageStore";

import { useSiteSettings } from "@/hooks/useSiteSettings";

export function ShopTheLook() {
  const { language } = useLanguage();
  const { settings } = useSiteSettings();
  const feedImages = settings.shopTheLook || [];
  
  const title = language === 'EN' ? "SHOP OUR INSTAGRAM" : language === 'ES' ? "COMPRA EN INSTAGRAM" : "Siga nosso Instagram";
  const handle = "@gorgpresets";

  return (
    <section className="py-12 md:py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6 text-center mb-8 md:mb-12">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-4 text-[#d82828]">
             <Instagram size={36} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter mb-2">
            {title}
          </h2>
          <a href="https://instagram.com/gorgpresets" target="_blank" rel="noopener noreferrer" className="text-sm md:text-base font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
            {handle}
          </a>
        </motion.div>
      </div>

      {/* Grid estilo Instagram Mosaico */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-1 md:gap-2 px-1 md:px-4 max-w-[1800px] mx-auto">
        {feedImages.map((img, index) => (
           <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
           >
             <Link 
               to={`/product/${img.productId}`} 
               className="relative group aspect-square overflow-hidden rounded-md md:rounded-[2rem] block"
             >
                {/* Imagem de Alta Qualidade */}
                <img 
                  src={img.src} 
                  alt={img.presetName} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  loading="lazy"
                />
                
                {/* Ícone fixo no canto para Mobile (Bem simples) */}
                <div className="absolute top-2 right-2 md:hidden bg-white/90 p-1.5 rounded-full shadow-sm text-black">
                   <ShoppingBag size={12} strokeWidth={2.5} />
                </div>

                {/* Overlay de Vidro (Glass) que aparece SÓ no Hover do Computador */}
                <div className="hidden md:flex absolute inset-0 bg-black/0 group-hover:bg-black/50 backdrop-blur-[2px] transition-all duration-500 opacity-0 group-hover:opacity-100 flex-col items-center justify-center p-4">
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    whileHover={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <Instagram className="text-white/80 mb-3" size={28} strokeWidth={1.5} />
                    <span className="bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] px-4 py-2.5 rounded-full shadow-2xl flex items-center justify-center gap-2 transform transition-transform active:scale-95">
                       <ShoppingBag size={14} strokeWidth={2.5} /> 
                       Eu Quero
                    </span>
                  </motion.div>
                </div>
             </Link>
           </motion.div>
        ))}
      </div>
    </section>
  );
}
