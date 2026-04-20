import React, { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/store/languageStore";

export interface HeroSettings {
  backgroundImage: string;
  title: Record<string, string> | string;
  subtitle: Record<string, string> | string;
}

export interface BannerSettings {
  image: string;
}

export interface PromoBarSettings {
  PT: string;
  EN: string;
  ES: string;
}

export interface MagicSettings {
  beforeUrl: string;
  afterUrl: string;
}

export interface Testimonial {
  name: string;
  role: string;
  content: string | Record<string, string>;
  image: string;
}

export interface ShopTheLookItem {
  id: string;
  src: string;
  presetName: string;
  productId: string;
}

export interface HomeSectionOrder {
  sections: string[];
  hiddenSections?: string[];
  newArrivals: string[];
  bestSellers: string[];
  allPresets: string[];
}

export interface IntegrationSettings {
  checkoutBaseUrl: string;
  isCartEnabled: boolean;
  gateway: 'buckpay' | 'ggcheckout' | 'ironpay';
}

export interface SiteSettings {
  hero: HeroSettings;
  banner: BannerSettings;
  testimonials: Testimonial[];
  homeSectionOrder: HomeSectionOrder;
  integration: IntegrationSettings;
  shopTheLook: ShopTheLookItem[];
  promoBar: PromoBarSettings;
  magic: MagicSettings;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    backgroundImage: "", 
    title: { PT: "", EN: "", ES: "" },
    subtitle: { PT: "", EN: "", ES: "" },
  },
  banner: {
    image: "", 
  },
  testimonials: [
    { name: "Mariana Silva", role: "Influenciadora", content: { PT: "Fiquei impressionada com a diferença! O feed ficou super organizado e lindo." }, image: "https://api.dicebear.com/7.x/notionists/svg?seed=Mariana&backgroundColor=transparent" },
    { name: "Lucas Fernandes", role: "Fotógrafo Amador", content: { PT: "Achei bem fácil de usar. Não manjo nada de edição de foto, mas agora é só colocar o filtro." }, image: "https://api.dicebear.com/7.x/notionists/svg?seed=Lucas&backgroundColor=transparent" },
    { name: "Carolina Costa", role: "Criadora de Conteúdo", content: { PT: "Finalmente consegui deixar meu feed organizado! Economizo horas que passava editando." }, image: "https://api.dicebear.com/7.x/notionists/svg?seed=Carolina&backgroundColor=transparent" },
    { name: "Amanda Pereira", role: "Travel Blogger", content: { PT: "Os presets salvaram minhas fotos da viagem! Um visual muito estético." }, image: "https://api.dicebear.com/7.x/notionists/svg?seed=Amanda&backgroundColor=transparent" },
  ],
  homeSectionOrder: {
    sections: ['novidades', 'bestsellers', 'banner', 'categorias', 'magica', 'catalogo', 'testimonials', 'faq', 'mosaico', 'features'],
    hiddenSections: [],
    newArrivals: [],
    bestSellers: [],
    allPresets: [],
  },
  integration: {
    checkoutBaseUrl: "https://ggcheckout.app/s/F3LEikOi-0/cart",
    isCartEnabled: true,
    gateway: 'buckpay',
  },
  shopTheLook: [
    { id: "1", src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80", presetName: "VERÃO", productId: "1" },
    { id: "2", src: "https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=500&q=80", presetName: "LASH GLOW", productId: "3" },
    { id: "3", src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=80", presetName: "URBAN", productId: "2" },
    { id: "4", src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80", presetName: "RETRO", productId: "4" },
    { id: "5", src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&q=80", presetName: "MINIMAL", productId: "5" },
    { id: "6", src: "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500&q=80", presetName: "MOODY", productId: "6" },
  ],
  promoBar: {
    PT: "LEVE 3, PAGUE 2: ADICIONE 3 PRESETS E GANHE 1.",
    EN: "BUY 2, GET 1 FREE: ADD 3 PRESETS AND GET 1.",
    ES: "LLEVA 3, PAGA 2: AÑADE 3 PRESETS Y LLEVATE 1."
  },
  magic: {
    beforeUrl: "", 
    afterUrl: "", 
  }
};

const SiteSettingsContext = createContext<{ settings: SiteSettings; loading: boolean } | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      if (!supabase) { setLoading(false); return; }
      try {
        const [settingsRes, magicRes] = await Promise.all([
          supabase.from("site_settings").select("*"),
          supabase.from("sales_settings").select("*").eq("id", "main").single()
        ]);

        const merged = { ...DEFAULT_SETTINGS };

        if (settingsRes.data) {
          for (const row of settingsRes.data) {
            if (row.key === "hero" && row.value) merged.hero = { ...merged.hero, ...row.value };
            if (row.key === "banner" && row.value) merged.banner = { ...merged.banner, ...row.value };
            if (row.key === "testimonials" && row.value) merged.testimonials = row.value;
            if (row.key === "homeSectionOrder" && row.value) {
              merged.homeSectionOrder = { ...merged.homeSectionOrder, ...row.value };
              // Recover missing sections that exist in defaults but not in db (like new features as 'bundles')
              const dbSections = row.value.sections || [];
              const missingSections = DEFAULT_SETTINGS.homeSectionOrder.sections.filter(s => !dbSections.includes(s));
              if (missingSections.length > 0) {
                merged.homeSectionOrder.sections = [...dbSections, ...missingSections];
              }
            }
            if (row.key === "integration" && row.value) merged.integration = { ...merged.integration, ...row.value };
            if (row.key === "shopTheLook" && row.value) merged.shopTheLook = row.value;
            if (row.key === "promoBar" && row.value) merged.promoBar = { ...merged.promoBar, ...row.value };
          }
        }

        if (magicRes.data) {
          merged.magic = {
            beforeUrl: magicRes.data.magic_before_url || merged.magic.beforeUrl,
            afterUrl: magicRes.data.magic_after_url || merged.magic.afterUrl
          };
        }

        setSettings(merged);
      } catch (e) {
        console.error("Settings fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  const { language, t } = useLanguage();

  const getLocalized = (val: any) => {
    if (!val) return "";
    if (typeof val === 'object' && val !== null) {
      return val[language] || val['PT'] || Object.values(val)[0] || "";
    }
    return val;
  };

  if (context === undefined) {
    return { settings: DEFAULT_SETTINGS, loading: true, getLocalized, t };
  }
  return { ...context, getLocalized, t };
}

export async function saveSetting(key: string, value: any) {
  if (!supabase) return;
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}
