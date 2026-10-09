// Implementação "demo" do repositório: tudo fica no localStorage deste
// navegador. Serve para conhecer/testar a área de membros antes de conectar o
// Supabase e é o que roda localmente quando não há variáveis de ambiente.
import type { MembersRepo } from "./repo";
import type {
  AuthSnapshot,
  EmailStatus,
  Grant,
  Lesson,
  Material,
  Module,
  PortalSettings,
  Product,
  Progress,
  ReorderTable,
  Row,
  WebhookLog,
} from "./types";
import { DEFAULT_SETTINGS } from "./defaults";
import { buildDemoCurriculum, buildDemoProducts, buildDemoRows, buildDemoSettings, DEMO_OWNED_IDS } from "./demoData";
import { generatePassword, normalizeEmail, uid } from "./format";

const DB_KEY = "gorg-members-demo-v3";
const SESSION_KEY = "gorg-members-demo-session";
export const DEMO_ADMIN_EMAIL = "produtor@gorgpresets.site";
export const DEMO_MEMBER_EMAIL = "ana@exemplo.com";

interface DemoMember {
  email: string;
  name: string;
  password: string;
  createdAt: string;
  lastSeenAt: string | null;
}

interface DemoDB {
  /** Chave do Resend no modo demo (nada é enviado de verdade). */
  emailKey?: string;
  settings: PortalSettings;
  products: Product[];
  modules: Module[];
  lessons: Lesson[];
  materials: Material[];
  rows: Row[];
  members: DemoMember[];
  grants: Grant[];
  progress: Record<string, Progress[]>;
  webhookLogs: WebhookLog[];
}

function seed(): DemoDB {
  const products = buildDemoProducts();
  const { modules, lessons, materials } = buildDemoCurriculum(products);
  const now = new Date().toISOString();
  const member: DemoMember = { email: DEMO_MEMBER_EMAIL, name: "Ana Julia", password: "demo", createdAt: now, lastSeenAt: now };
  const grants: Grant[] = DEMO_OWNED_IDS.map((productId) => ({
    id: uid(), email: member.email, productId, source: "manual", createdAt: now, expiresAt: null,
  }));
  // Progresso inicial para a vitrine "Continuar assistindo" já aparecer preenchida.
  const started = lessons.filter((l) => ["p-silent", "p-verao"].includes(l.productId));
  const progress: Progress[] = [
    { lessonId: started[0].id, productId: started[0].productId, completed: true, position: 154, duration: 154, updatedAt: now },
    { lessonId: started[1].id, productId: started[1].productId, completed: false, position: 230, duration: 412, updatedAt: now },
    { lessonId: started[6].id, productId: started[6].productId, completed: false, position: 70, duration: 154, updatedAt: new Date(Date.now() - 3600_000).toISOString() },
  ];
  return {
    settings: buildDemoSettings(),
    products,
    modules,
    lessons,
    materials,
    rows: buildDemoRows(),
    members: [
      member,
      { email: "bruna.costa@exemplo.com", name: "Bruna Costa", password: "demo", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), lastSeenAt: null },
    ],
    grants: [
      ...grants,
      { id: uid(), email: "bruna.costa@exemplo.com", productId: "p-feed", source: "webhook", createdAt: now, expiresAt: null },
      { id: uid(), email: "lucas@exemplo.com", productId: "p-urban", source: "webhook", createdAt: now, expiresAt: null },
    ],
    progress: { [member.email]: progress },
    webhookLogs: [
      { id: uid(), receivedAt: now, status: "granted", message: "Acesso liberado: FEED AESTHETIC", email: "bruna.costa@exemplo.com", payload: { event: "purchase.approved" } },
    ],
  };
}

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DemoDB;
  } catch {
    /* armazenamento indisponível: usa dados em memória */
  }
  return seed();
}

let db: DemoDB = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* cota cheia ou modo privado: segue em memória */
  }
}

function emailStatus(): EmailStatus {
  const key = db.emailKey || "";
  return key
    ? { configured: true, source: "studio", hint: `${key.slice(0, 3)}…${key.slice(-4)}`, keyCheck: "ok", domains: [{ name: "gorgpresets.site", status: "verified" }] }
    : { configured: false, source: null, hint: null, keyCheck: null, domains: null };
}

function sessionEmail(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setSession(email: string | null) {
  try {
    if (email) localStorage.setItem(SESSION_KEY, email);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb());
}

const isAdminEmail = (email: string) => email === DEMO_ADMIN_EMAIL || email.startsWith("admin") || email.startsWith("produtor");

function requireEmail(): string {
  const email = sessionEmail();
  if (!email) throw new Error("Sessão expirada. Entre novamente.");
  return email;
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = [...list];
  next[i] = item;
  return next;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function resetDemo() {
  db = seed();
  persist();
  listeners.forEach((cb) => cb());
}

export const localRepo: MembersRepo = {
  mode: "demo",

  async getAuth(): Promise<AuthSnapshot> {
    const email = sessionEmail();
    if (!email) return { user: null, needsMfa: false };
    const member = db.members.find((m) => m.email === email);
    return {
      user: { id: email, email, name: member?.name || (isAdminEmail(email) ? "Produtor" : ""), isAdmin: isAdminEmail(email) },
      needsMfa: false,
    };
  },

  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  async signIn(rawEmail, password) {
    const email = normalizeEmail(rawEmail);
    if (!email || !password) throw new Error("Preencha e-mail e senha.");
    let member = db.members.find((m) => m.email === email);
    if (!member) {
      // No modo demo qualquer e-mail entra; contas novas ganham a coleção de exemplo.
      member = { email, name: isAdminEmail(email) ? "Produtor" : "", password, createdAt: new Date().toISOString(), lastSeenAt: null };
      db.members.push(member);
      if (!isAdminEmail(email)) {
        DEMO_OWNED_IDS.forEach((productId) =>
          db.grants.push({ id: uid(), email, productId, source: "manual", createdAt: new Date().toISOString(), expiresAt: null }),
        );
      }
    }
    member.lastSeenAt = new Date().toISOString();
    persist();
    setSession(email);
  },

  async signOut() {
    setSession(null);
  },

  async firstAccess(rawEmail, password, name) {
    const email = normalizeEmail(rawEmail);
    const existing = db.members.find((m) => m.email === email);
    if (existing) {
      existing.password = password;
      if (name) existing.name = name;
    } else {
      db.members.push({ email, name, password, createdAt: new Date().toISOString(), lastSeenAt: null });
    }
    persist();
    await localRepo.signIn(email, password);
  },

  async requestPasswordReset() {
    /* modo demo: nada a enviar */
  },

  async updatePassword(password) {
    const member = db.members.find((m) => m.email === requireEmail());
    if (member) member.password = password;
    persist();
  },

  async updateName(name) {
    const email = requireEmail();
    const member = db.members.find((m) => m.email === email);
    if (member) member.name = name;
    persist();
    listeners.forEach((cb) => cb());
  },

  async verifyMfa() {
    /* modo demo não usa 2FA */
  },

  async getSettings() {
    return clone({ ...db.settings, email: { ...DEFAULT_SETTINGS.email, ...(db.settings.email || {}) } });
  },

  async getCatalog() {
    return clone({ products: db.products, modules: db.modules, lessons: db.lessons, rows: db.rows });
  },

  async getMyAccess() {
    const email = sessionEmail();
    if (!email) return [];
    if (isAdminEmail(email)) return db.products.map((p) => p.id);
    const now = Date.now();
    const granted = db.grants
      .filter((g) => g.email === email && (!g.expiresAt || new Date(g.expiresAt).getTime() > now))
      .map((g) => g.productId);
    const free = db.products.filter((p) => p.isFree).map((p) => p.id);
    return Array.from(new Set([...granted, ...free]));
  },

  async getMaterials(productId) {
    return clone(db.materials.filter((m) => m.productId === productId));
  },

  async getProgress() {
    const email = sessionEmail();
    return email ? clone(db.progress[email] || []) : [];
  },

  async saveProgress(progress) {
    const email = requireEmail();
    const list = db.progress[email] || [];
    const i = list.findIndex((p) => p.lessonId === progress.lessonId);
    if (i === -1) list.push(progress);
    else list[i] = progress;
    db.progress[email] = list;
    persist();
  },

  async resolveMediaUrl(url) {
    return url;
  },

  async saveSettings(settings) {
    db.settings = clone(settings);
    persist();
  },

  async saveProduct(product) {
    db.products = upsert(db.products, product);
    persist();
    return product;
  },

  async deleteProduct(id) {
    db.products = db.products.filter((p) => p.id !== id);
    db.modules = db.modules.filter((m) => m.productId !== id);
    db.lessons = db.lessons.filter((l) => l.productId !== id);
    db.materials = db.materials.filter((m) => m.productId !== id);
    db.grants = db.grants.filter((g) => g.productId !== id);
    db.rows = db.rows.map((r) => ({ ...r, productIds: r.productIds.filter((p) => p !== id) }));
    persist();
  },

  async saveModule(mod) {
    db.modules = upsert(db.modules, mod);
    persist();
    return mod;
  },

  async deleteModule(id) {
    db.modules = db.modules.filter((m) => m.id !== id);
    db.lessons = db.lessons.filter((l) => l.moduleId !== id);
    persist();
  },

  async saveLesson(lesson) {
    db.lessons = upsert(db.lessons, lesson);
    persist();
    return lesson;
  },

  async deleteLesson(id) {
    db.lessons = db.lessons.filter((l) => l.id !== id);
    persist();
  },

  async saveMaterial(material) {
    db.materials = upsert(db.materials, material);
    persist();
    return material;
  },

  async deleteMaterial(id) {
    db.materials = db.materials.filter((m) => m.id !== id);
    persist();
  },

  async saveRow(row) {
    db.rows = upsert(db.rows, row);
    persist();
    return row;
  },

  async deleteRow(id) {
    db.rows = db.rows.filter((r) => r.id !== id);
    persist();
  },

  async reorder(table: ReorderTable, ids) {
    const apply = <T extends { id: string; sortOrder: number }>(list: T[]) =>
      list.map((item) => (ids.includes(item.id) ? { ...item, sortOrder: ids.indexOf(item.id) } : item));
    if (table === "products") db.products = apply(db.products);
    if (table === "modules") db.modules = apply(db.modules);
    if (table === "lessons") db.lessons = apply(db.lessons);
    if (table === "rows") db.rows = apply(db.rows);
    if (table === "materials") db.materials = apply(db.materials);
    persist();
  },

  async listMaterialsAdmin() {
    return clone(db.materials);
  },

  async listMembers() {
    const emails = new Set([...db.members.map((m) => m.email), ...db.grants.map((g) => g.email)]);
    return Array.from(emails)
      .filter((email) => !isAdminEmail(email))
      .map((email) => {
        const member = db.members.find((m) => m.email === email);
        const grants = db.grants.filter((g) => g.email === email);
        return {
          email,
          name: member?.name || "",
          hasAccount: !!member,
          grants,
          createdAt: member?.createdAt || grants[0]?.createdAt || new Date().toISOString(),
          lastSeenAt: member?.lastSeenAt || null,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async addMember({ email: rawEmail, name, password, productIds }) {
    const email = normalizeEmail(rawEmail);
    const now = new Date().toISOString();
    let created = false;
    const finalPassword = password || generatePassword();
    let member = db.members.find((m) => m.email === email);
    if (!member) {
      member = { email, name, password: finalPassword, createdAt: now, lastSeenAt: null };
      db.members.push(member);
      created = true;
    } else if (name) {
      member.name = name;
    }
    productIds.forEach((productId) => {
      if (!db.grants.some((g) => g.email === email && g.productId === productId)) {
        db.grants.push({ id: uid(), email, productId, source: "manual", createdAt: now, expiresAt: null });
      }
    });
    persist();
    return { createdAccount: created, password: created ? finalPassword : undefined };
  },

  async setMemberAccess(rawEmail, productIds) {
    const email = normalizeEmail(rawEmail);
    const now = new Date().toISOString();
    const keep = db.grants.filter((g) => g.email !== email || productIds.includes(g.productId));
    const existing = new Set(keep.filter((g) => g.email === email).map((g) => g.productId));
    productIds.forEach((productId) => {
      if (!existing.has(productId)) keep.push({ id: uid(), email, productId, source: "manual", createdAt: now, expiresAt: null });
    });
    db.grants = keep;
    persist();
  },

  async grantAccess(rawEmail, productIds) {
    const email = normalizeEmail(rawEmail);
    const now = new Date().toISOString();
    productIds.forEach((productId) => {
      if (!db.grants.some((g) => g.email === email && g.productId === productId)) {
        db.grants.push({ id: uid(), email, productId, source: "import", createdAt: now, expiresAt: null });
      }
    });
    persist();
  },

  async removeMember(rawEmail) {
    const email = normalizeEmail(rawEmail);
    db.grants = db.grants.filter((g) => g.email !== email);
    db.members = db.members.filter((m) => m.email !== email);
    delete db.progress[email];
    persist();
  },

  async setMemberPassword(rawEmail, password) {
    const member = db.members.find((m) => m.email === normalizeEmail(rawEmail));
    if (!member) throw new Error("Este membro ainda não criou a conta.");
    member.password = password;
    persist();
  },

  async listWebhookLogs() {
    return clone(db.webhookLogs);
  },

  async getStats() {
    const weekAgo = Date.now() - 7 * 86400000;
    const members = db.members.filter((m) => !isAdminEmail(m.email));
    return {
      members: new Set(db.grants.map((g) => g.email)).size,
      activeMembers7d: members.filter((m) => m.lastSeenAt && new Date(m.lastSeenAt).getTime() > weekAgo).length,
      products: db.products.length,
      lessons: db.lessons.length,
      completions: Object.values(db.progress).flat().filter((p) => p.completed).length,
    };
  },

  async getWebhookUrl() {
    return "https://SEU-PROJETO.supabase.co/functions/v1/members-api?action=webhook&token=demo";
  },

  async rotateWebhookToken() {
    return localRepo.getWebhookUrl();
  },

  async getEmailStatus() {
    return emailStatus();
  },

  async saveEmailKey(key) {
    const value = key.trim();
    if (value && !/^re_[A-Za-z0-9_-]{8,}$/.test(value)) throw new Error("Essa não parece uma chave do Resend. Ela começa com “re_”.");
    db.emailKey = value || undefined;
    persist();
    return emailStatus();
  },

  async sendTestEmail(to) {
    if (!db.emailKey) throw new Error("Conecte o Resend primeiro (cole a chave da API).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Informe um e-mail válido para o teste.");
    await new Promise((resolve) => setTimeout(resolve, 700));
  },

  async upload(file, { onProgress }) {
    onProgress?.(30);
    // Imagens pequenas viram data URL (persistem); o resto vale só nesta sessão.
    const url = file.type.startsWith("image/") && file.size < 1_500_000 ? await readAsDataUrl(file) : URL.createObjectURL(file);
    onProgress?.(100);
    return url;
  },
};
