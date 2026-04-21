import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function HeroSection() {
  const { settings, loading, getLocalized, t } = useSiteSettings();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const yContent = useTransform(scrollYProgress, [0, 1], ["0%", "80%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const handleScrollDown = () => {
    if (sectionRef.current) {
      const bottom = sectionRef.current.getBoundingClientRect().bottom + window.scrollY;
      window.scrollTo({ top: bottom - 32, behavior: "smooth" });
    }
  };

  return (
    <div id="hero-section" ref={sectionRef} className="container mx-auto px-4 md:px-8 w-full mt-0 md:mt-6 mb-8 md:mb-12">
      <div className="relative h-[65vh] md:h-[75vh] w-full overflow-hidden rounded-[2.5rem] md:rounded-[3rem] shadow-2xl group">
        
        {/* Background with Parallax */}
        <motion.div 
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 -inset-y-20"
          style={{ y: yBg }}
        >
          <img 
            src={settings.hero.backgroundImage} 
            alt=""
            fetchPriority="high"
            loading="eager"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        </motion.div>

        {/* Centered Content with Parallax & Fade */}
        <motion.div 
          style={{ y: yContent, opacity }}
          className="relative h-full flex flex-col items-center justify-center text-center px-4 md:px-6"
        >
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
        </motion.div>

        {/* Scroll Down Arrow */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleScrollDown}
          className="absolute bottom-7 inset-x-0 mx-auto w-fit cursor-pointer group/arrow"
          aria-label="Ver mais"
        >
          <div className="w-11 h-11 rounded-full border-2 border-white/40 flex items-center justify-center backdrop-blur-sm bg-white/10 group-hover/arrow:border-white/80 group-hover/arrow:bg-white/20 transition-all duration-300">
            <motion.svg
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </motion.svg>
          </div>
        </motion.button>

      </div>
    </div>
  );
}
