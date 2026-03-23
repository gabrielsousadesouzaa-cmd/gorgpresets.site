import { useState, useCallback } from "react";
import { Plus, Minus, ChevronLeft, MessageCircle, HelpCircle, Zap, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/store/languageStore";

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`mb-4 transition-all duration-500 rounded-[2.5rem] border ${
      isOpen ? 'bg-white/80 backdrop-blur-xl border-black/10 shadow-[0_40px_100px_rgba(0,0,0,0.1)]' : 'bg-gray-50/40 backdrop-blur-md border-black/[0.03] shadow-md hover:border-black/5 hover:bg-gray-50/60 transition-all'
    }`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-6 md:p-8 text-left transition-colors group"
      >
        <h3 className={`text-base md:text-xl font-bold uppercase tracking-tighter leading-none pr-8 transition-colors ${
          isOpen ? 'text-[#d82828]' : 'text-gray-900 group-hover:text-black'
        }`}>
          {question}
        </h3>
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
          isOpen ? 'bg-[#d82828] text-white rotate-180 shadow-lg shadow-red-500/20' : 'bg-white text-gray-400 border border-black/5 group-hover:text-black'
        }`}>
           {isOpen ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 md:px-8 pb-8 pt-0">
               <div className="h-px w-full bg-black/5 mb-6" />
               <p className="text-[15px] md:text-lg text-gray-500 leading-relaxed font-medium italic">
                 {answer}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const { t } = useLanguage();

  const faqs = [
    {
       question: t("faqQuestion1"),
       answer: t("faqAnswer1"),
       icon: <Users className="text-[#d82828]" size={20} />
    },
    {
      question: t("faqQuestion2"),
      answer: t("faqAnswer2"),
      icon: <Zap className="text-[#d82828]" size={20} />
    },
    {
       question: t("feat1Title"),
       answer: t("feat1Desc"),
       icon: <Plus className="text-[#d82828]" size={20} />
    },
    {
      question: t("feat4Title"),
      answer: t("feat4Desc"),
      icon: <Plus className="text-[#d82828]" size={20} />
    },
    {
      question: t("feat3Title"),
      answer: t("feat3Desc"),
      icon: <HelpCircle className="text-[#d82828]" size={20} />
    }
  ];

  const handleBack = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-white pb-32 overflow-x-hidden">
      {/* Background Decorative - Gorg Style */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0 overflow-hidden">
         <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-[#d82828] blur-[150px] rounded-full" />
         <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-black blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 max-w-5xl pt-10 relative z-10">
        
        {/* Navigation */}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          
          {/* Header Section */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 text-[#d82828] rounded-full text-[10px] font-bold uppercase tracking-widest mb-8 border border-red-100 shadow-sm">
                <div className="w-1.5 h-1.5 bg-[#d82828] rounded-full animate-pulse" />
                {t("faqTag")}
             </div>
             
             <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase text-gray-950 leading-[1.15] md:leading-[1.1] mb-8">
               {t("faqTitle1")} <br />
               <span className="text-[#d82828] italic">{t("faqTitle2")}</span> <br />
               {t("faqTitle3")}
             </h1>
             
             <p className="text-gray-500 font-semibold text-base md:text-xl max-w-md leading-relaxed mt-4">
               {t("faqSubtitle")}
             </p>

             {/* Suporte CTA */}
             <div className="mt-14 p-10 bg-black text-white rounded-[3rem] shadow-2xl shadow-black/40 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#d82828]/20 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-[#d82828]/30 transition-all" />
                
                <h4 className="text-2xl font-bold uppercase tracking-tighter mb-2 relative z-10">{t("faqSupportTitle")}</h4>
                <p className="text-gray-400 text-sm font-semibold mb-8 relative z-10">{t("faqSupportDesc")}</p>
                
                <a 
                  href="https://wa.me/351930941144" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3 relative z-10 shadow-xl shadow-green-500/20"
                >
                  <MessageCircle size={18} fill="currentColor" /> {t("faqButtonSupport")}
                </a>
             </div>
          </div>

          {/* FAQ Accordion List */}
          <div className="lg:col-span-7">
             <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.6 }}
                  >
                    <FaqItem question={faq.question} answer={faq.answer} />
                  </motion.div>
                ))}
             </div>
             
             {/* Note */}
             <div className="mt-12 p-8 border border-dashed border-black/10 rounded-[2.5rem] flex items-center gap-6 opacity-60">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
                   <HelpCircle size={24} className="text-gray-400" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 leading-relaxed">
                  {t("faqNote")}
                </p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
