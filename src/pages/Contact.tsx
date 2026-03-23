import { useCallback } from "react";
import { ChevronLeft, MessageCircle, Mail, Clock, MapPin, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/store/languageStore";

export default function Contact() {
  const { t } = useLanguage();

  const handleBack = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-white selection:bg-[#d82828] selection:text-white pb-20">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03] z-0">
        <div className="absolute top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#d82828] blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] -right-[5%] w-[30%] h-[30%] bg-black blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 max-w-4xl pt-10 relative z-10 flex flex-col items-center">
        
        {/* Header de Navegação */}
        <div className="w-full mb-12">
          <Link 
            to="/" 
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-black transition-all group w-fit"
          >
            <div className="p-2 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
              <ChevronLeft size={16} className="translate-x-0 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{t("backToHome")}</span>
          </Link>
        </div>

        {/* Título Centralizado */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="text-center flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-[#d82828] rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-[#d82828]/10 shadow-sm">
            <div className="w-1.5 h-1.5 bg-[#d82828] rounded-full animate-pulse" />
            {t("contactTag")}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase text-gray-950 leading-[1.1] md:leading-[1.1] mb-6">
            {t("contactTitle1")} <br />
            <span className="text-[#d82828] italic">{t("contactTitle2")}</span>
          </h1>
          
          <p className="text-gray-500 font-normal text-base md:text-xl max-w-xl leading-relaxed mb-16">
            {t("contactSubtitle")}
          </p>
        </motion.div>

        {/* Canais de Contato Direto */}
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 px-4">
          
          {/* WhatsApp Card */}
          <motion.a 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            href="https://wa.me/351930941144" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center gap-5 p-10 bg-white border border-black/5 rounded-[3rem] shadow-xl hover:shadow-2xl hover:shadow-green-500/10 hover:border-green-500/20 transition-all duration-500 active:scale-[0.98] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500 pointer-events-none" />
            <div className="w-24 h-24 bg-[#25D366]/10 rounded-full flex items-center justify-center text-[#25D366] group-hover:scale-110 group-hover:bg-[#25D366]/20 transition-all duration-500 shadow-sm relative z-10">
              <MessageCircle size={40} />
            </div>
            <div className="relative z-10 mt-2">
              <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter leading-none mb-3">WhatsApp</h3>
              <p className="text-sm font-semibold text-gray-400 group-hover:text-green-600 transition-colors uppercase tracking-[0.2em]">{t("contactBadge1")}</p>
            </div>
          </motion.a>

          {/* E-mail Card */}
          <motion.a 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            href="mailto:suporte@gorgpresets.com" 
            className="group flex flex-col items-center justify-center gap-5 p-10 bg-white border border-black/5 rounded-[3rem] shadow-xl hover:shadow-2xl hover:shadow-[#d82828]/10 hover:border-[#d82828]/20 transition-all duration-500 active:scale-[0.98] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500 pointer-events-none" />
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-[#d82828] group-hover:scale-110 group-hover:bg-red-100 transition-all duration-500 shadow-sm relative z-10">
              <Mail size={40} />
            </div>
            <div className="relative z-10 mt-2">
              <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter leading-none mb-3">E-mail</h3>
              <p className="text-sm font-semibold text-gray-400 group-hover:text-[#d82828] transition-colors tracking-wide max-w-[200px] truncate mx-auto">suporte@gorgpresets.com</p>
            </div>
          </motion.a>
        </div>

        {/* Info Block Horizontal */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 bg-gray-50/80 backdrop-blur-sm border border-black/5 rounded-[2.5rem] p-8 md:p-10 w-full max-w-3xl flex flex-col md:flex-row items-center justify-evenly gap-8"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-black/5">
              <Clock size={24} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d82828] mb-1">Horário de Atendimento</span>
              <span className="text-sm font-semibold text-gray-700">SEG - SEX • 08h - 18h</span>
            </div>
          </div>
          
          <div className="hidden md:block w-[1px] h-16 bg-black/5" />
          
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-black/5">
              <MapPin size={24} />
            </div>
            <div className="flex flex-col text-left">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d82828] mb-1">Operação Super Digital</span>
               <span className="text-sm font-semibold text-gray-700">Envio Automático Mundial</span>
            </div>
          </div>
        </motion.div>

        {/* Trusted indicators */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-16 opacity-100">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#d82828]/10 flex items-center justify-center text-[#d82828] shadow-inner">
                 <Zap size={16} fill="#d82828" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-900 opacity-80">{t("contactBadge1")}</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#d82828]/10 flex items-center justify-center text-[#d82828] shadow-inner">
                <CheckCircle2 size={16} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-900 opacity-80">{t("contactBadge2")}</span>
           </div>
        </div>

      </div>
    </div>
  );
}
