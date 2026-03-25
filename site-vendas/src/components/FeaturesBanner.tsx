import { Mail, CreditCard, Heart, Headset } from "lucide-react";
import { useLanguage } from "@/store/languageStore";
import { motion } from "framer-motion";

export function FeaturesBanner() {
  const { t } = useLanguage();

  const features = [
    {
      icon: <Mail strokeWidth={1.5} className="w-8 h-8 text-foreground" />,
      title: t("feat1Title" as any),
      desc: t("feat1Desc" as any)
    },
    {
      icon: <CreditCard strokeWidth={1.5} className="w-8 h-8 text-foreground" />,
      title: t("feat2Title" as any),
      desc: t("feat2Desc" as any)
    },
    {
      icon: <Heart strokeWidth={1.5} className="w-8 h-8 text-foreground" />,
      title: t("feat3Title" as any),
      desc: t("feat3Desc" as any)
    },
    {
      icon: <Headset strokeWidth={1.5} className="w-8 h-8 text-foreground" />,
      title: t("feat4Title" as any),
      desc: t("feat4Desc" as any)
    }
  ];

  return (
    <section className="w-full overflow-hidden bg-background pt-6 pb-4 md:pb-4 border-y border-border flex items-center">
      <motion.div 
        animate={{ x: [0, -1240] }}
        transition={{ 
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 30,
            ease: "linear",
          }
        }}
        className="flex whitespace-nowrap"
      >
        {/* Renderiza várias cópias para garantir que flui perfeitamente */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-16 px-8 items-center shrink-0">
            {features.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 w-[310px] whitespace-normal">
                <div className="shrink-0 relative">
                  {item.icon}
                  {/* Detalhe vermelho exigido pelo design */}
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-[15px] text-foreground mb-1.5 tracking-tight">{item.title}</h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed font-normal">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </section>
  );
}
