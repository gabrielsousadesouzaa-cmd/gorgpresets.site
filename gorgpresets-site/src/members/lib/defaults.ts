import type { Lesson, Material, Module, PortalSettings, Product, Row } from "./types";
import { uid } from "./format";

export const BRAND_RED = "#d82828";

export const DEFAULT_SETTINGS: PortalSettings = {
  brandName: "Gorg Presets",
  logoUrl: "/members/logo-white.png",
  accentColor: BRAND_RED,
  heroSlides: [],
  heroInterval: 8,
  login: {
    backgroundUrl: "",
    headline: "Sua coleção, em um só lugar.",
    subheadline: "Entre para acessar seus presets, aulas e materiais exclusivos.",
    allowFirstAccess: true,
  },
  support: {
    headline: "Estamos aqui para ajudar",
    text: "Dúvidas sobre instalação, acesso ou pagamento? Fale com a nossa equipe — respondemos rapidinho.",
    whatsapp: "",
    email: "",
    instagram: "",
    faq: [],
  },
  footerText: "© Gorg Presets. Todos os direitos reservados.",
};

export function blankProduct(sortOrder = 0): Product {
  return {
    id: uid(),
    slug: "",
    title: "",
    subtitle: "MOBILE E DESKTOP",
    description: "",
    coverUrl: "",
    bannerUrl: "",
    logoUrl: "",
    accentColor: "#2a2a2e",
    badge: "",
    checkoutUrl: "",
    priceLabel: "",
    externalIds: [],
    isFree: false,
    published: true,
    sortOrder,
    createdAt: new Date().toISOString(),
  };
}

export function blankModule(productId: string, sortOrder = 0): Module {
  return { id: uid(), productId, title: "", description: "", sortOrder, published: true };
}

export function blankLesson(productId: string, moduleId: string, sortOrder = 0): Lesson {
  return {
    id: uid(),
    productId,
    moduleId,
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    durationSeconds: 0,
    attachments: [],
    sortOrder,
    published: true,
  };
}

export function blankRow(sortOrder = 0): Row {
  return {
    id: uid(),
    title: "",
    subtitle: "",
    kind: "curated",
    cardStyle: "poster",
    accentTitle: false,
    productIds: [],
    visible: true,
    sortOrder,
  };
}

export function blankMaterial(productId: string, sortOrder = 0): Material {
  return { id: uid(), productId, name: "", description: "", url: "", size: 0, sortOrder };
}
