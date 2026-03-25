import { useLanguage } from "@/store/languageStore";
import { motion } from "framer-motion";

export function AnnouncementBar() {
  const { t } = useLanguage();
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full md:container md:mx-auto md:px-4 md:mt-2 md:mb-1"
    >
      <div className="bg-[#D82828] text-white text-center py-2 text-[10px] md:text-sm font-black tracking-[0.2em] uppercase md:rounded-full shadow-sm">
        {t("announcement")}
      </div>
    </motion.div>
  );
}
