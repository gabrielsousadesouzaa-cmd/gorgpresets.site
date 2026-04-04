import { motion } from "framer-motion";
import { useLanguage } from "@/store/languageStore";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function HeroSection() {
  const { settings, loading, getLocalized, t } = useSiteSettings();

  return (
    <div className="container mx-auto px-4 md:px-8 w-full mt-0 md:mt-6 mb-8 md:mb-12">
      <div className="relative h-[65vh] md:h-[75vh] w-full overflow-hidden rounded-[2.5rem] md:rounded-[3rem] shadow-2xl group">
        
        {/* Collage Background */}
        <motion.div 
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${settings.hero.backgroundImage}")` }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        </motion.div>

        {/* Centered Content */}
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 md:px-6">
          <div className="max-w-4xl text-white mt-32 md:mt-32">
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-6xl lg:text-[5.2rem] font-semibold tracking-tight mb-6 leading-[1.15] uppercase drop-shadow-2xl px-4"
            >
              {loading ? "" : (getLocalized(settings.hero.title) || (t("heroTitle1") + " " + t("heroTitle2")))}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-2xl text-white/95 mb-8 max-w-3xl mx-auto font-normal drop-shadow-lg p-2"
            >
              {loading ? "" : (getLocalized(settings.hero.subtitle) || t("heroSubtitle"))}
            </motion.p>
          </div>
        </div>

      </div>
    </div>
  );
}

