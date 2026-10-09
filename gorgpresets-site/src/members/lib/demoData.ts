// Conteúdo de exemplo do modo demonstração. Espelha as coleções reais da Gorg
// para que o portal já nasça com cara de produto pronto.
import type { Lesson, Material, Module, PortalSettings, Product, Row } from "./types";
import { DEFAULT_SETTINGS } from "./defaults";

const img = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=${w}`;
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/";

interface DemoProductSeed {
  id: string;
  title: string;
  accent: string;
  photo: string;
  description: string;
  badge?: string;
  owned?: boolean;
}

const SEEDS: DemoProductSeed[] = [
  { id: "p-verao", title: "VERÃO", accent: "#e3a73f", photo: "photo-1499793983690-e29da59ef1c2", owned: true,
    description: "Tons dourados, pele iluminada e azul turquesa. A estética de férias perfeita para praia, piscina e golden hour." },
  { id: "p-urban", title: "URBAN", accent: "#30343c", photo: "photo-1514933651103-005eec06c04b", owned: true,
    description: "Contraste cinematográfico e sombras profundas para fotos de cidade, noite e street style." },
  { id: "p-silent", title: "SILENT LUXURY", accent: "#1d1d1f", photo: "photo-1515378791036-0648a3ef77b2", owned: true, badge: "TOP 1",
    description: "O visual discreto e sofisticado das maiores referências: pretos ricos, brancos limpos e textura de revista." },
  { id: "p-portrait", title: "PORTRAIT", accent: "#93644a", photo: "photo-1534528741775-53994a69daeb", owned: true,
    description: "Pele natural, tons quentes e profundidade de estúdio para retratos que parecem feitos por fotógrafo profissional." },
  { id: "p-space", title: "MINIMALIST SPACE", accent: "#cfc6b8", photo: "photo-1513364776144-60967b0f800f", owned: true,
    description: "Paleta neutra, bege e off-white para casas, interiores e fotos de lifestyle com sensação de calma." },
  { id: "p-feed", title: "FEED AESTHETIC", accent: "#c85bd6", photo: "photo-1517841905240-472988babdf9", badge: "NOVO",
    description: "Cores vibrantes e harmônicas para um feed que chama atenção e mantém a identidade em todas as fotos." },
  { id: "p-minimalist", title: "MINIMALIST", accent: "#9a9a9e", photo: "photo-1544005313-94ddf0286df2",
    description: "Cinzas suaves e brancos limpos. Simplicidade elegante para quem ama um feed clean." },
  { id: "p-europa", title: "EUROPA", accent: "#8c8670", photo: "photo-1476514525535-07fb3b4ae5f1",
    description: "A luz das viagens pela Europa: tons de filme, céu suave e cores de cartão-postal." },
  { id: "p-deep", title: "DEEP BLACK", accent: "#38383b", photo: "photo-1518173946687-a4c8892bbd9f",
    description: "Monocromático profundo com pretos densos para uma estética misteriosa e marcante." },
  { id: "p-oldmoney", title: "OLD MONEY", accent: "#66773f", photo: "photo-1524504388940-b1c1722653e1",
    description: "Verdes elegantes, tons terrosos e acabamento clássico. O estilo atemporal do quiet luxury." },
  { id: "p-fitness", title: "FITNESS", accent: "#3b5560", photo: "photo-1517404215738-15263e9f9178",
    description: "Definição, contraste e energia para fotos de treino, academia e lifestyle fitness." },
  { id: "p-luts", title: "LUTS CINEMÁTICOS", accent: "#a5502c", photo: "photo-1492691527719-9d1e07e534b4",
    description: "As mesmas cores dos presets, agora nos seus vídeos: LUTs para CapCut, Premiere e DaVinci Resolve." },
  { id: "p-templates", title: "TEMPLATES STORIES", accent: "#5b4b8a", photo: "photo-1558655146-9f40138edfeb", badge: "EXTRA",
    description: "Modelos editáveis no Canva para stories, destaques e posts com a identidade da sua marca." },
];

export const DEMO_OWNED_IDS = SEEDS.filter((s) => s.owned).map((s) => s.id);

export function buildDemoProducts(): Product[] {
  return SEEDS.map((s, i) => ({
    id: s.id,
    slug: s.id.replace(/^p-/, ""),
    title: s.title,
    subtitle: "MOBILE E DESKTOP",
    description: s.description,
    coverUrl: "",
    bannerUrl: img(s.photo),
    logoUrl: "",
    accentColor: s.accent,
    badge: s.badge || "",
    checkoutUrl: "https://gorgpresets.site/catalog",
    priceLabel: "R$ 19,90",
    externalIds: [],
    isFree: false,
    published: true,
    sortOrder: i,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

const LESSON_PLAN: Array<{ module: string; description: string; lessons: Array<[string, string, number]> }> = [
  {
    module: "Comece por aqui",
    description: "Tudo o que você precisa para instalar e começar a usar em minutos.",
    lessons: [
      ["Boas-vindas à coleção", "Um tour rápido pelo que você vai encontrar e como tirar o máximo da coleção.", 154],
      ["Instalando no celular (Lightroom Mobile)", "Passo a passo para importar os arquivos .DNG e salvar como predefinições no app gratuito.", 412],
      ["Instalando no computador (Lightroom Desktop)", "Como importar os arquivos .XMP no Lightroom Classic e no Lightroom CC.", 365],
    ],
  },
  {
    module: "Aplicando como um profissional",
    description: "Os ajustes finos que fazem toda a diferença no resultado final.",
    lessons: [
      ["Ajustando exposição e temperatura", "Cada foto tem uma luz diferente. Aprenda os dois ajustes que resolvem 90% dos casos.", 538],
      ["Pele natural em qualquer luz", "Como corrigir tons de pele sem perder a estética do preset.", 446],
      ["Criando um feed harmônico", "Organize suas fotos para um feed com identidade e consistência.", 621],
    ],
  },
];

const SAMPLE_FILES = ["ForBiggerBlazes.mp4", "ForBiggerEscapes.mp4", "ForBiggerFun.mp4", "ForBiggerJoyrides.mp4", "ForBiggerMeltdowns.mp4"];
const THUMBS = [
  "photo-1542038784456-1ea8e935640e",
  "photo-1502126324834-38f8e02d7160",
  "photo-1504198453319-5ce911bafcde",
  "photo-1516244754848-0ca5ec869502",
  "photo-1506667523932-e919e61831a1",
  "photo-1512436991641-6745cdb1723f",
];

export function buildDemoCurriculum(products: Product[]): { modules: Module[]; lessons: Lesson[]; materials: Material[] } {
  const modules: Module[] = [];
  const lessons: Lesson[] = [];
  const materials: Material[] = [];
  products.forEach((p) => {
    let n = 0;
    LESSON_PLAN.forEach((plan, mi) => {
      const moduleId = `${p.id}-m${mi + 1}`;
      modules.push({ id: moduleId, productId: p.id, title: plan.module, description: plan.description, sortOrder: mi, published: true });
      plan.lessons.forEach(([title, description, duration], li) => {
        lessons.push({
          id: `${moduleId}-l${li + 1}`,
          productId: p.id,
          moduleId,
          title,
          description,
          videoUrl: SAMPLE_VIDEO + SAMPLE_FILES[n % SAMPLE_FILES.length],
          thumbnailUrl: img(THUMBS[n % THUMBS.length], 800),
          durationSeconds: duration,
          attachments: li === 1 ? [{ id: `${moduleId}-a1`, name: "Guia de instalação (PDF)", url: "#", size: 1_240_000 }] : [],
          sortOrder: li,
          published: true,
        });
        n++;
      });
    });
    materials.push(
      { id: `${p.id}-mat1`, productId: p.id, name: `${p.title} · Mobile (.DNG)`, description: "Para Lightroom Mobile — iPhone e Android", url: "#", size: 18_400_000, sortOrder: 0 },
      { id: `${p.id}-mat2`, productId: p.id, name: `${p.title} · Desktop (.XMP)`, description: "Para Lightroom Classic e Lightroom CC", url: "#", size: 64_000, sortOrder: 1 },
    );
  });
  return { modules, lessons, materials };
}

export function buildDemoRows(): Row[] {
  const curated = (id: string, title: string, subtitle: string, productIds: string[], sortOrder: number, cardStyle: Row["cardStyle"] = "poster"): Row => ({
    id, title, subtitle, kind: "curated", cardStyle, accentTitle: cardStyle === "ranked", productIds, visible: true, sortOrder,
  });
  return [
    { id: "row-owned", title: "Sua Coleção Particular", subtitle: "Seus presets adquiridos, prontos para usar.", kind: "owned", cardStyle: "poster", accentTitle: false, productIds: [], visible: true, sortOrder: 0 },
    { id: "row-continue", title: "Continuar assistindo", subtitle: "", kind: "continue", cardStyle: "landscape", accentTitle: false, productIds: [], visible: true, sortOrder: 1 },
    curated("row-top", "Top 10 em Alta", "Acompanhe os presets mais adquiridos.",
      ["p-silent", "p-feed", "p-minimalist", "p-europa", "p-portrait", "p-verao", "p-oldmoney", "p-urban", "p-deep", "p-fitness"], 2, "ranked"),
    curated("row-business", "Para o seu Negócio", "Presets estratégicos para elevar o valor da sua marca e serviços.",
      ["p-portrait", "p-space", "p-feed", "p-fitness", "p-minimalist"], 3),
    curated("row-elite", "Coleção Elite", "O segredo por trás do visual clean e caro das maiores referências.",
      ["p-silent", "p-oldmoney", "p-deep", "p-minimalist", "p-space"], 4),
    curated("row-destinos", "Destinos em Alta", "As cores dos lugares mais desejados e instagramáveis do mundo.",
      ["p-europa", "p-verao", "p-urban", "p-oldmoney"], 5),
    curated("row-originais", "Originais GORG", "A harmonia perfeita entre a sua arte e a edição de alta performance.",
      ["p-silent", "p-urban", "p-deep", "p-portrait", "p-feed"], 6),
    curated("row-extras", "Extras", "Expanda suas possibilidades com recursos que vão além da fotografia",
      ["p-luts", "p-templates"], 7),
    { id: "row-locked", title: "Desbloqueie novas estéticas", subtitle: "Coleções que ainda não fazem parte da sua biblioteca", kind: "locked", cardStyle: "landscape", accentTitle: false,
      productIds: [], visible: true, sortOrder: 8 },
  ];
}

export function buildDemoSettings(): PortalSettings {
  return {
    ...DEFAULT_SETTINGS,
    heroSlides: [
      {
        id: "hero-1",
        eyebrow: "Coleção em destaque",
        title: "Silent Luxury",
        subtitle: "O visual discreto e sofisticado das maiores referências — agora a um toque de distância.",
        imageUrl: img("photo-1515378791036-0648a3ef77b2", 2400),
        mobileImageUrl: "",
        videoUrl: "",
        logoUrl: "",
        theme: "dark",
        ctaLabel: "Assistir agora",
        productId: "p-silent",
        ctaUrl: "",
      },
      {
        id: "hero-2",
        eyebrow: "Presets exclusivos",
        title: "Em um só lugar.",
        subtitle: "Eleve os padrões das suas fotos em poucos cliques, com os nossos presets exclusivos.",
        imageUrl: "",
        mobileImageUrl: "",
        videoUrl: "",
        logoUrl: "/logo.png",
        theme: "light",
        ctaLabel: "Explorar coleção",
        productId: "p-verao",
        ctaUrl: "",
      },
      {
        id: "hero-3",
        eyebrow: "Novo",
        title: "Feed Aesthetic",
        subtitle: "Cores vibrantes e harmônicas para um feed com identidade em todas as fotos.",
        imageUrl: img("photo-1517841905240-472988babdf9", 2400),
        mobileImageUrl: "",
        videoUrl: "",
        logoUrl: "",
        theme: "dark",
        ctaLabel: "Conhecer",
        productId: "p-feed",
        ctaUrl: "",
      },
    ],
    support: {
      ...DEFAULT_SETTINGS.support,
      whatsapp: "5511999999999",
      email: "suporte@gorgpresets.site",
      instagram: "gorgpresets",
      faq: [
        { id: "faq-1", question: "Preciso pagar pelo Lightroom?", answer: "Não. Os presets funcionam no Lightroom Mobile gratuito (iPhone e Android). No computador, use o Lightroom Classic ou CC." },
        { id: "faq-2", question: "Como instalo os presets no celular?", answer: "Abra a coleção, baixe o arquivo Mobile (.DNG) em Materiais e siga a aula “Instalando no celular”. Leva menos de 3 minutos." },
        { id: "faq-3", question: "Meu acesso expira?", answer: "Não. Depois de liberado, o acesso à coleção é vitalício, incluindo atualizações." },
        { id: "faq-4", question: "Comprei e não apareceu na minha conta", answer: "Confira se entrou com o mesmo e-mail usado na compra. Se continuar, chame o suporte no WhatsApp com o comprovante." },
      ],
    },
  };
}
