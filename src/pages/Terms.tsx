import { useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/store/languageStore";

export default function Terms() {
  const { t } = useLanguage();
  const handleBack = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-white pt-10 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        
        {/* Header de Navegação */}
        <Link 
          to="/" 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-black transition-all mb-14 group w-fit"
        >
          <ChevronLeft size={18} className="translate-x-0 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[13px] font-semibold uppercase tracking-widest">{t("back")}</span>
        </Link>

        {/* Título Principal */}
        <div className="mb-20 text-center md:text-left">
           <div className="relative inline-block pb-2 mb-6 w-fit mx-auto md:mx-0">
             <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase text-gray-900 leading-none">
               {t("termsTitle1")}<span className="text-[#d82828] italic">{t("termsTitle2")}</span>
             </h1>
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "100%" }}
               transition={{ duration: 1.2, ease: "easeOut" }}
               className="absolute bottom-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 h-[5px] bg-[#d82828]"
             />
           </div>
           <p className="text-gray-400 font-normal text-[15px] md:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed uppercase tracking-widest mt-4">
             {t("termsUpdate")}
           </p>
        </div>

        {/* Conteúdo Jurídico (Estilo Editorial Premium) */}
        <div className="prose prose-gray prose-lg max-w-none text-gray-700 font-normal space-y-12">
            
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("termsSec1Title")}</h2>
              <p className="leading-relaxed">
                {t("termsSec1Desc")}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("termsSec2Title")}</h2>
              <p className="leading-relaxed">
                {t("termsSec2Desc")}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("termsSec3Title")}</h2>
              <p className="leading-relaxed">
                {t("termsSec3Desc")}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("termsSec4Title")}</h2>
              <p className="leading-relaxed">
                {t("termsSec4Desc")}
              </p>
            </section>

            <section className="space-y-4 border-t border-black/5 pt-12">
               <p className="text-sm font-semibold text-gray-400 italic">
                 {t("termsFooterNotice")}
               </p>
            </section>

        </div>

      </div>
    </div>
  );
}
