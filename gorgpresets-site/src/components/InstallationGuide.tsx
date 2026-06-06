import { motion } from "framer-motion";
import { DownloadCloud, Sparkles, Smartphone } from "lucide-react";
import { useLanguage } from "@/store/languageStore";

export function InstallationGuide() {
  const { t } = useLanguage();

  const sectionTitle = t("guideTitle" as any);
  const subtitle = t("guideSubtitle" as any);

  const steps = [
    {
      icon: <Smartphone size={28} strokeWidth={1.5} />,
      title: t("step1Title" as any),
      desc: t("step1Desc" as any)
    },
    {
      icon: <DownloadCloud size={28} strokeWidth={1.5} />,
      title: t("step2Title" as any),
      desc: t("step2Desc" as any)
    },
    {
      icon: <Sparkles size={28} strokeWidth={1.5} />,
      title: t("step3Title" as any),
      desc: t("step3Desc" as any)
    }
  ];

  return (
    <div className="bg-[#fafafa] rounded-[2rem] border border-black/5 p-6 md:p-12 mt-6 md:mt-12 mb-4 overflow-hidden relative">
      <div className="text-center mb-6 md:mb-10 relative z-10">
         <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-gray-950 mb-3">{sectionTitle}</h3>
         <p className="text-[10px] md:text-sm text-gray-500 font-medium max-w-[280px] md:max-w-sm mx-auto leading-relaxed">{subtitle}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 relative z-10">
        {/* Linha conectora fluida visível apenas no PC */}
        <div className="hidden md:block absolute top-[36px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#d82828]/20 to-transparent" />
        
        {steps.map((step, idx) => (
           <motion.div 
             key={idx}
             initial={{ opacity: 0, y: 15 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, delay: idx * 0.15 }}
             className="flex flex-col items-center text-center relative"
           >
             <div className="w-14 h-14 md:w-[72px] md:h-[72px] bg-white rounded-xl md:rounded-[1.25rem] flex items-center justify-center text-[#d82828] shadow-xl shadow-black/5 border border-black/5 mb-4 md:mb-6 relative">
               <span className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#fafafa] shadow-sm">{idx + 1}</span>
               {step.icon}
             </div>
             <h4 className="text-xs md:text-[15px] font-bold uppercase tracking-tight text-gray-900 mb-2">{step.title}</h4>
             <p className="text-[11px] text-gray-400 leading-relaxed max-w-[200px] mx-auto">{step.desc}</p>
           </motion.div>
        ))}
      </div>
      
      {/* Decoração sutil de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#d82828]/[0.02] blur-[80px] rounded-full translate-x-32 -translate-y-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/[0.02] blur-[80px] rounded-full -translate-x-32 translate-y-32 pointer-events-none" />
    </div>
  );
}
