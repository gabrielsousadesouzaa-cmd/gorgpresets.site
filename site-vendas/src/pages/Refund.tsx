import { useCallback } from "react";
import { ChevronLeft, RefreshCcw, ShieldCheck, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/store/languageStore";

export default function Refund() {
  const { t } = useLanguage();
  const handleBack = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-white pb-32 overflow-x-hidden relative">
      {/* Background Decorative - Gorg Style */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 overflow-hidden">
         <div className="absolute top-[10%] -left-[10%] w-[60%] h-[60%] bg-[#d82828] blur-[180px] rounded-full" />
         <div className="absolute bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-black blur-[150px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 max-w-5xl pt-10 relative z-10">
        
        {/* Header de Navegação */}
        <Link 
          to="/" 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-black transition-all mb-16 group w-fit"
        >
          <div className="p-2.5 rounded-full bg-gray-50 border border-black/5 shadow-md group-hover:bg-gray-100 transition-all">
             <ChevronLeft size={16} className="translate-x-0 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t("backToHome")}</span>
        </Link>

        {/* Layout do Título */}
        <div className="mb-20 text-center md:text-left">
           <div className="relative inline-block pb-2 mb-6 w-fit mx-auto md:mx-0">
             <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase text-gray-900 leading-none">
               {t("refundTitle1")}<span className="text-[#d82828] italic">{t("refundTitle2")}</span>
             </h1>
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "100%" }}
               transition={{ duration: 1.2, ease: "easeOut" }}
               className="absolute bottom-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 h-[5px] bg-[#d82828]"
             />
           </div>
           <p className="text-gray-500 font-normal text-[15px] md:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed mt-4">
             {t("refundSubtitle")}
           </p>
        </div>

        {/* Garantias (Cards Impactantes) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 text-center md:text-left">
           
           <div className="p-8 bg-[#f9f9f9] rounded-[2rem] border border-black/[0.03] shadow-md">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 mx-auto md:mx-0">
                 <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-2">{t("refundCard1Title")}</h3>
              <p className="text-sm font-normal text-gray-500">{t("refundCard1Desc")}</p>
           </div>

           <div className="p-8 bg-[#f9f9f9] rounded-[2rem] border border-black/[0.03] shadow-md">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 mx-auto md:mx-0">
                 <RefreshCcw size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-2">{t("refundCard2Title")}</h3>
              <p className="text-sm font-normal text-gray-500">{t("refundCard2Desc")}</p>
           </div>

           <div className="p-8 bg-[#f9f9f9] rounded-[2rem] border border-black/[0.03] shadow-md">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 mx-auto md:mx-0">
                 <Heart size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-2">{t("refundCard3Title")}</h3>
              <p className="text-sm font-normal text-gray-500">{t("refundCard3Desc")}</p>
           </div>

        </div>

        {/* Regulamentações */}
        <div className="prose prose-gray prose-lg max-w-none text-gray-700 font-normal space-y-12">
            
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("refundSec1Title")}</h2>
              <p className="leading-relaxed">
                {t("refundSec1Desc")}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("refundSec2Title")}</h2>
              <p className="leading-relaxed">
                {t("refundSec2Desc")}
              </p>
            </section>

        </div>

      </div>
    </div>
  );
}
