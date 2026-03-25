import { useCallback } from "react";
import { ChevronLeft, Zap, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/store/languageStore";

export default function Shipping() {
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

        {/* Layout do Título */}
        <div className="mb-20 text-center md:text-left">
           <div className="relative inline-block pb-2 mb-6 w-fit mx-auto md:mx-0">
             <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase text-gray-900 leading-none">
               {t("shippingTitle1")}<span className="text-[#d82828] italic">{t("shippingTitle2")}</span>
             </h1>
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "100%" }}
               transition={{ duration: 1.2, ease: "easeOut" }}
               className="absolute bottom-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 h-[5px] bg-[#d82828]"
             />
           </div>
           <p className="text-gray-500 font-normal text-[15px] md:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed mt-4">
             {t("shippingSubtitle")}
           </p>
        </div>

        {/* Informativos de Entrega (Cards Impactantes) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 text-center md:text-left">
           
           <div className="p-8 bg-[#f9f9f9] rounded-[2rem] border border-black/[0.03] shadow-md">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 mx-auto md:mx-0">
                 <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-2">{t("shippingCard1Title")}</h3>
              <p className="text-sm font-normal text-gray-500">{t("shippingCard1Desc")}</p>
           </div>

           <div className="p-8 bg-[#f9f9f9] rounded-[2rem] border border-black/[0.03] shadow-md">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 mx-auto md:mx-0">
                 <Mail size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-2">{t("shippingCard2Title")}</h3>
              <p className="text-sm font-normal text-gray-500">{t("shippingCard2Desc")}</p>
           </div>

           <div className="p-8 bg-[#f9f9f9] rounded-[2rem] border border-black/[0.03] shadow-md">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 mx-auto md:mx-0">
                 <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-2">{t("shippingCard3Title")}</h3>
              <p className="text-sm font-normal text-gray-500">{t("shippingCard3Desc")}</p>
           </div>

        </div>

        {/* Detalhes Técnicos */}
        <div className="prose prose-gray prose-lg max-w-none text-gray-700 font-medium space-y-12">
            
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("shippingSec1Title")}</h2>
              <p className="leading-relaxed">
                {t("shippingSec1Desc1")}<br />
                {t("shippingSec1Desc2")}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{t("shippingSec2Title")}</h2>
              <p className="leading-relaxed">
                {t("shippingSec2Desc")}
              </p>
            </section>

        </div>

      </div>
    </div>
  );
}
