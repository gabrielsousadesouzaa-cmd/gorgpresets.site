import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/store/languageStore";

export function FaqAccordion() {
  const { t, language } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: t("faqQuestion2"), // O que são Lightroom Presets?
      a: t("faqAnswer2")
    },
    {
      q: language === 'EN' ? "Do I need the paid Lightroom version?" : language === 'ES' ? "¿Necesito la versión de pago de Lightroom?" : "Preciso ter a versão paga do Lightroom?",
      a: language === 'EN' ? "No! Our presets perfectly work on the free mobile app." : language === 'ES' ? "¡No! Nuestros presets funcionan perfectamente en la aplicación gratis del celular." : "Não! Nossos presets foram criados para funcionar perfeitamente na versão GRATUITA do aplicativo Lightroom no seu celular."
    },
    {
      q: language === 'EN' ? "Does it work on both iOS and Android?" : language === 'ES' ? "¿Funciona en iOS y Android?" : "Funciona tanto no iPhone quanto no Android?",
      a: language === 'EN' ? "Yes, 100% compatible with any smartphone." : language === 'ES' ? "Sí, 100% compatible con cualquier smartphone." : "Sim, eles são 100% compatíveis com qualquer modelo de smartphone, basta baixar o app grátis do Lightroom."
    },
    {
      q: t("faqQuestion1"), // Como funciona a Área de Membros
      a: t("faqAnswer1")
    }
  ];

  const title = language === 'EN' ? "FREQUENTLY ASKED QUESTIONS" : language === 'ES' ? "PREGUNTAS FRECUENTES" : "PERGUNTAS FREQUENTES";

  return (
    <div className="w-full max-w-[1100px] mx-auto px-6 pt-8 pb-6 md:pt-12 md:pb-10">
      <div className="text-center mb-10 md:mb-16">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">FAQ</p>
        <h2 className="text-2xl md:text-4xl font-bold text-gray-950 uppercase tracking-tighter">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`border transition-all duration-500 rounded-[2rem] overflow-hidden ${
                isOpen ? 'border-[#d82828]/60 bg-white shadow-[0_8px_30px_rgba(216,40,40,0.12)] scale-[1.01]' : 'border-black/5 bg-white hover:border-black/20 hover:shadow-lg'
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between p-6 md:p-8 outline-none text-left"
              >
                <span className="text-[13px] md:text-[15px] font-bold text-gray-900 pr-8">
                  {faq.q}
                </span>
                <span className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-500 ${isOpen ? 'bg-[#d82828] text-white rotate-180 scale-110 shadow-lg shadow-[#d82828]/30' : 'bg-gray-100 text-gray-400'}`}>
                  {isOpen ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                </span>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 md:px-8 pb-8 pt-0 text-gray-500 text-[13px] md:text-[15px] leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
