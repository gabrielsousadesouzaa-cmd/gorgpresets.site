import { motion } from "framer-motion";
import { DownloadCloud, Sparkles, Smartphone } from "lucide-react";
import { useLanguage } from "@/store/languageStore";

export function InstallationGuide() {
  const { language } = useLanguage();

  const isPT = language === 'PT';
  const isEN = language === 'EN';

  const sectionTitle = isPT ? "Extremamente Fácil de Usar" : isEN ? "Extremely Easy to Use" : "Extremadamente Fácil de Usar";
  const subtitle = isPT 
    ? "Esqueça computadores ou horas editando. Tudo é feito pelo celular em segundos." 
    : isEN 
    ? "Forget computers or hours editing. Everything is done on mobile in seconds." 
    : "Olvida los ordenadores o las horas de edición. Todo se hace en el móvil en segundos.";

  const steps = [
    {
      icon: <Smartphone size={28} strokeWidth={1.5} />,
      title: isPT ? "1. App Gratuito" : isEN ? "1. Free App" : "1. App Gratis",
      desc: isPT ? "Baixe o Adobe Lightroom Mobile. É 100% gratuito e seguro." : isEN ? "Download Adobe Lightroom Mobile. It's 100% free and safe." : "Descarga Adobe Lightroom Mobile. Es 100% gratis y seguro."
    },
    {
      icon: <DownloadCloud size={28} strokeWidth={1.5} />,
      title: isPT ? "2. Importe o Preset" : isEN ? "2. Import Preset" : "2. Importa el Preset",
      desc: isPT ? "Você recebe o link no email e instala o preset na sua galeria com apenas 1 clique." : isEN ? "You get the link by email and install the preset to your gallery with just 1 click." : "Recibes el enlace por email e instalas el preset en tu galería con solo 1 clic."
    },
    {
      icon: <Sparkles size={28} strokeWidth={1.5} />,
      title: isPT ? "3. Copie e Arrase!" : isEN ? "3. Copy & Shine!" : "3. ¡Copia y Brilla!",
      desc: isPT ? "Abra sua foto crua, cole as nossas configurações mágicas e poste!" : isEN ? "Open your raw photo, paste our magic settings and post!" : "Abre tu foto cruda, pega nuestra configuración mágica y ¡publica!"
    }
  ];

  return (
    <div className="bg-[#fafafa] rounded-[2rem] border border-black/5 p-8 md:p-12 mt-12 mb-4 overflow-hidden relative">
      <div className="text-center mb-10 relative z-10">
         <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-950 mb-3">{sectionTitle}</h3>
         <p className="text-xs md:text-sm text-gray-500 font-medium max-w-sm mx-auto leading-relaxed">{subtitle}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative z-10">
        {/* Linha conectora fluida visível apenas no PC */}
        <div className="hidden md:block absolute top-[36px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#d82828]/20 to-transparent" />
        
        {steps.map((step, idx) => (
           <motion.div 
             key={idx}
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, delay: idx * 0.15 }}
             className="flex flex-col items-center text-center relative"
           >
             <div className="w-[72px] h-[72px] bg-white rounded-[1.25rem] flex items-center justify-center text-[#d82828] shadow-xl shadow-black/5 border border-black/5 mb-6 relative hover:scale-105 transition-transform duration-300">
               <span className="absolute -top-3 -right-3 w-7 h-7 bg-black text-white text-[11px] font-black rounded-full flex items-center justify-center border-4 border-[#fafafa] shadow-sm">{idx + 1}</span>
               {step.icon}
             </div>
             <h4 className="text-sm md:text-[15px] font-bold uppercase tracking-tight text-gray-900 mb-2.5">{step.title}</h4>
             <p className="text-[12px] text-gray-500 leading-relaxed max-w-[220px] mx-auto opacity-90">{step.desc}</p>
           </motion.div>
        ))}
      </div>
      
      {/* Decoração sutil de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#d82828]/[0.02] blur-[80px] rounded-full translate-x-32 -translate-y-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/[0.02] blur-[80px] rounded-full -translate-x-32 translate-y-32 pointer-events-none" />
    </div>
  );
}
