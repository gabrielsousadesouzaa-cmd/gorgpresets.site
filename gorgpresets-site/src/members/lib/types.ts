// Modelo de dados da Área de Membros (portal do aluno + Studio do produtor).
// Os nomes aqui são camelCase; o mapeamento para as colunas snake_case do
// Supabase fica em supabaseRepo.ts.

import type { EmailSettings } from "../../../supabase/functions/members-api/email";

export type { EmailSettings };
export type ID = string;

export interface HeroSlide {
  id: ID;
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  /** Vídeo de fundo opcional (mp4). Toca mudo em loop atrás do texto. */
  videoUrl: string;
  /** Arte de título (PNG transparente). Quando existe, substitui o texto do título. */
  logoUrl: string;
  /** `light` = fundo claro com texto escuro (como o banner atual da Gorg). */
  theme: "dark" | "light";
  ctaLabel: string;
  /** Produto aberto pelo botão principal. */
  productId: string;
  /** Link externo alternativo para o botão principal. */
  ctaUrl: string;
}

export interface FaqItem {
  id: ID;
  question: string;
  answer: string;
}

export interface PortalSettings {
  brandName: string;
  logoUrl: string;
  accentColor: string;
  heroSlides: HeroSlide[];
  heroInterval: number;
  login: {
    backgroundUrl: string;
    headline: string;
    subheadline: string;
    allowFirstAccess: boolean;
  };
  support: {
    headline: string;
    text: string;
    whatsapp: string;
    email: string;
    instagram: string;
    faq: FaqItem[];
  };
  footerText: string;
  /** E-mail de boas-vindas enviado a cada compra aprovada. */
  email: EmailSettings;
}

export interface Product {
  id: ID;
  slug: string;
  title: string;
  /** Linha curta exibida no card, ex: "MOBILE E DESKTOP". */
  subtitle: string;
  description: string;
  /** Capa vertical (2:3) usada nas vitrines. */
  coverUrl: string;
  /** Banner horizontal (16:9) usado no topo da página do produto. */
  bannerUrl: string;
  /** Arte de título opcional (PNG transparente). */
  logoUrl: string;
  accentColor: string;
  /** Selo curto no card, ex: "NOVO". */
  badge: string;
  /** Link de checkout exibido para quem ainda não tem acesso. */
  checkoutUrl: string;
  priceLabel: string;
  /** IDs do produto na plataforma de pagamento (para liberar acesso via webhook). */
  externalIds: string[];
  isFree: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Module {
  id: ID;
  productId: ID;
  title: string;
  description: string;
  sortOrder: number;
  published: boolean;
}

export interface Attachment {
  id: ID;
  name: string;
  url: string;
  size: number;
}

export interface Lesson {
  id: ID;
  productId: ID;
  moduleId: ID;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  attachments: Attachment[];
  sortOrder: number;
  published: boolean;
}

export interface Material {
  id: ID;
  productId: ID;
  name: string;
  description: string;
  url: string;
  size: number;
  sortOrder: number;
}

/**
 * - owned: produtos que o membro já tem
 * - continue: aulas em andamento ("Continuar assistindo")
 * - curated: seleção manual de produtos
 * - all: todos os produtos publicados
 * - locked: produtos que o membro ainda não tem (upsell)
 */
export type RowKind = "owned" | "continue" | "curated" | "all" | "locked";
export type CardStyle = "poster" | "ranked" | "landscape";

export interface Row {
  id: ID;
  title: string;
  subtitle: string;
  kind: RowKind;
  cardStyle: CardStyle;
  accentTitle: boolean;
  productIds: ID[];
  visible: boolean;
  sortOrder: number;
}

export interface Catalog {
  products: Product[];
  modules: Module[];
  lessons: Lesson[];
  rows: Row[];
}

export interface Progress {
  lessonId: ID;
  productId: ID;
  completed: boolean;
  position: number;
  duration: number;
  updatedAt: string;
}

export interface MemberUser {
  id: ID;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface AuthSnapshot {
  user: MemberUser | null;
  /** Usuário com 2FA ativo que ainda precisa digitar o código. */
  needsMfa: boolean;
}

export interface Grant {
  id: ID;
  email: string;
  productId: ID;
  source: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface MemberSummary {
  email: string;
  name: string;
  hasAccount: boolean;
  grants: Grant[];
  createdAt: string;
  lastSeenAt: string | null;
}

export interface WebhookLog {
  id: ID;
  receivedAt: string;
  status: string;
  message: string;
  email: string;
  payload: unknown;
}

export interface PortalStats {
  members: number;
  activeMembers7d: number;
  products: number;
  lessons: number;
  completions: number;
}

export interface AddMemberInput {
  email: string;
  name: string;
  password?: string;
  productIds: ID[];
}

/** Situação da conexão com o Resend (provedor de e-mail). */
export interface EmailStatus {
  configured: boolean;
  /** "env" = segredo no Supabase; "studio" = chave salva pelo Studio. */
  source: "env" | "studio" | null;
  hint: string | null;
  /** ok = chave completa; send_only = chave só de envio (válida); invalid; unreachable. */
  keyCheck: "ok" | "send_only" | "invalid" | "unreachable" | null;
  domains: Array<{ name: string; status: string }> | null;
}

export interface AddMemberResult {
  createdAccount: boolean;
  password?: string;
  warning?: string;
}

export interface UploadOptions {
  /** `public` para imagens; `private` para vídeos e arquivos de download. */
  visibility: "public" | "private";
  productId?: ID;
  folder: string;
  onProgress?: (percent: number) => void;
}

export type ReorderTable = "products" | "modules" | "lessons" | "rows" | "materials";
