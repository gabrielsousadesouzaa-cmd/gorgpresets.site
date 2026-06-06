import { useState, useEffect } from "react";
import { useLanguage } from "@/store/languageStore";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { motion, AnimatePresence } from "framer-motion";

export function AnnouncementBar() {
  const { language } = useLanguage();
  const { settings } = useSiteSettings();
  const [index, setIndex] = useState(0);

  const messages = settings.promoBar?.messages || [];

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full bg-[#D82828] border-b border-white/10 overflow-hidden"
    >
      <div className="container mx-auto text-white text-center py-2.5 h-10 md:h-12 flex items-center justify-center text-[9px] md:text-xs font-black tracking-[0.2em] uppercase relative overflow-hidden px-4">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="absolute whitespace-nowrap"
          >
            {messages[index]?.[language] || messages[index]?.['PT'] || Object.values(messages[index] || {})[0]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
