import { useLanguage } from "@/store/languageStore";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function EditingBanner() {
  const { t } = useLanguage();
  const { settings } = useSiteSettings();

  return (
    <section className="container mx-auto px-4 md:px-8 pt-0 pb-8 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-[2.5rem] border border-black/5 shadow-xl p-8 md:p-14 flex flex-col lg:flex-row items-center gap-12"
      >
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:w-1/2 flex items-center justify-center relative w-full"
        >
            <div className="w-full max-w-[500px] aspect-[16/10] rounded-[2rem] overflow-hidden shadow-[0_30px_100px_-10px_rgba(0,0,0,0.18)] border border-black/[0.08] group">
               <img 
                 src={settings.banner.image} 
                 alt="Preview" 
                 className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
               />
            </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:w-1/2 space-y-6 text-left"
        >
           <h2 className="text-3xl md:text-5xl font-bold text-[#333] tracking-tighter leading-[1.15]">
              {t("editingTitle")} <span className="text-[#d82828] italic">{t("editingTitle2")}</span>
           </h2>
           <div className="space-y-4 text-gray-500 font-normal text-sm md:text-base leading-relaxed">
             <p>{t("editingDesc")}</p>
             <p>{t("ebDesc2")}</p>
           </div>
        </motion.div>

      </motion.div>
    </section>
  );
}
