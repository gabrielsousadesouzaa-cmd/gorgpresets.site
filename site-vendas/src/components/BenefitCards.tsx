import { motion } from "framer-motion";
import { Zap, ShieldCheck, Heart, Clock, Download, Smartphone } from "lucide-react";
import { useLanguage } from "@/store/languageStore";

export function BenefitCards() {
  const { t } = useLanguage();

  const benefits = [
    {
       icon: <Zap className="text-[#d82828]" size={28} />,
       title: "Entrega Imediata",
       desc: "Receba seus links de download segundos após a compra.",
       delay: 0.1
    },
    {
       icon: <ShieldCheck className="text-[#d82828]" size={28} />,
       title: "Pagamento Seguro",
       desc: "PIX ou Cartão com criptografia de ponta a ponta.",
       delay: 0.2
    },
    {
       icon: <Heart className="text-[#d82828]" size={28} />,
       title: "Satisfação Premium",
       desc: "Suporte 24/7 para garantir o feed dos seus sonhos.",
       delay: 0.3
    },
    {
       icon: <Smartphone className="text-[#d82828]" size={28} />,
       title: "Mobile & Desktop",
       desc: "Filtros compatíveis com todas as versões do Lightroom.",
       delay: 0.4
    }
  ];

  return (
    <div className="container mx-auto px-6 py-20">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: benefit.delay, duration: 0.6 }}
              className="group p-8 bg-white border border-black/5 rounded-[2.5rem] shadow-lg hover:shadow-2xl hover:border-black/10 transition-all hover:-translate-y-2 relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-[#d82828]/5 blur-3xl rounded-full translate-x-8 -translate-y-8 opacity-0 group-hover:opacity-100 transition-opacity" />
               
               <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:bg-[#d82828] group-hover:text-white transition-colors duration-500">
                  {benefit.icon}
               </div>
               
               <h3 className="text-lg font-bold uppercase tracking-tighter mb-2 relative z-10 group-hover:text-black transition-colors">
                  {benefit.title}
               </h3>
               
               <p className="text-gray-400 text-sm font-medium leading-relaxed relative z-10">
                  {benefit.desc}
               </p>
            </motion.div>
          ))}
       </div>
    </div>
  );
}
