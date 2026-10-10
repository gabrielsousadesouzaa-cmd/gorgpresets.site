// Implementação "demo" do repositório: tudo fica no localStorage deste
// navegador. Serve para conhecer/testar a área de membros antes de conectar o
// Supabase e é o que roda localmente quando não há variáveis de ambiente.
import type { MembersRepo } from "./repo";
import type {
  AuthSnapshot,
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
import { mergeEmailSettings } from "../../../supabase/functions/members-api/email";
import { mergeAutomation } from "../../../supabase/functions/members-api/automation";
import { demoDeliver, demoNotice, demoProviderStatus, demoReady, demoRender, ggPayload, processDemoSale, seedDemoAutomation, type DemoAutomationState, type DemoMember } from "./demoAutomation";
import { buildDemoCurriculum, buildDemoProducts, buildDemoRows, buildDemoSettings, DEMO_OWNED_IDS } from "./demoData";
import { generatePassword, normalizeEmail, uid } from "./format";

const DB_KEY = "gorg-members-demo-v4";
const SESSION_KEY = "gorg-members-demo-session";
export const DEMO_ADMIN_EMAIL = "produtor@gorgpresets.site";
export const DEMO_MEMBER_EMAIL = "ana@exemplo.com";

interface DemoDB extends DemoAutomationState {
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
  const state: DemoDB = {
    settings: buildDemoSettings(),
    products,
    modules,
    lessons,
    materials,
    rows: buildDemoRows(),
    members: [member],
    grants,
    progress: { [member.email]: progress },
    webhookLogs: [],
    checkoutItems: [],
    emailLogs: [],
    emailProvider: {},
  };
  seedDemoAutomation(state);
  return state;
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

const demoEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function memberOf(email: string) {
  return db.members.find((m) => m.email === email);
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
      user: {
        id: email,
        email,
        name: member?.name || (isAdminEmail(email) ? "Produtor" : ""),
        isAdmin: isAdminEmail(email),
        mustChangePassword: !isAdminEmail(email) && !!member?.mustChangePassword,
      },
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
    if (member.blocked) throw new Error("Seu acesso está bloqueado. Fale com o suporte.");
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

  async completePasswordChange(password) {
    if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    const member = db.members.find((m) => m.email === requireEmail());
    if (member) {
      if (member.password === password) throw new Error("A nova senha precisa ser diferente da atual.");
      member.password = password;
      member.mustChangePassword = false;
    }
    persist();
    listeners.forEach((cb) => cb());
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
    return clone({ ...db.settings, email: mergeEmailSettings(db.settings.email), automation: mergeAutomation(db.settings.automation) });
  },

  async getCatalog() {
    return clone({ products: db.products, modules: db.modules, lessons: db.lessons, rows: db.rows });
  },

  async getMyAccess() {
    const email = sessionEmail();
    if (!email) return [];
    if (isAdminEmail(email)) return db.products.map((p) => p.id);
    const me = memberOf(email);
    if (me?.blocked || me?.mustChangePassword) return [];
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
          phone: member?.phone || "",
          document: member?.document || "",
          blocked: !!member?.blocked,
          mustChangePassword: !!member?.mustChangePassword,
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

  async setMemberPassword(rawEmail, password, forceChange) {
    const member = db.members.find((m) => m.email === normalizeEmail(rawEmail));
    if (!member) throw new Error("Este membro ainda não criou a conta.");
    if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    member.password = password;
    member.mustChangePassword = !!forceChange;
    persist();
  },

  async sendPasswordReset(rawEmail) {
    const email = normalizeEmail(rawEmail);
    if (!demoReady(db)) throw new Error("Configure o envio de e-mail em Studio → E-mails primeiro.");
    if (!memberOf(email)) throw new Error("Este membro ainda não tem conta.");
    const notice = demoNotice(db, email);
    demoDeliver(db, { kind: "reset", to: email, subject: notice.subject, html: notice.html });
    persist();
  },

  async resendAccess(rawEmail) {
    const email = normalizeEmail(rawEmail);
    const productIds = db.grants.filter((g) => g.email === email).map((g) => g.productId);
    if (!productIds.length) throw new Error("Este e-mail ainda não tem nenhuma coleção liberada.");
    const automation = mergeAutomation(db.settings.automation);
    const password = generatePassword();
    let member = memberOf(email);
    if (!member) {
      member = { email, name: "", password, createdAt: new Date().toISOString(), lastSeenAt: null };
      db.members.push(member);
    }
    member.password = password;
    member.mustChangePassword = automation.forcePasswordChange;
    let emailed = false;
    let emailError = "envio de e-mail não configurado";
    if (demoReady(db)) {
      const titles = productIds.map((id) => db.products.find((p) => p.id === id)?.title || "Coleção");
      const rendered = demoRender(db, "welcome", mergeEmailSettings(db.settings.email).welcome, { email, name: member.name, phone: member.phone }, titles, password);
      const log = demoDeliver(db, { kind: "access", to: email, subject: rendered.subject, html: rendered.html, meta: { manual: true } });
      emailed = log.status === "sent";
      emailError = log.error;
    }
    persist();
    return { password, emailed, emailError };
  },

  async setMemberBlocked(rawEmail, blocked) {
    const member = memberOf(normalizeEmail(rawEmail));
    if (!member) throw new Error("Este membro ainda não tem conta.");
    member.blocked = blocked;
    persist();
  },

  async updateMember(rawEmail, patch) {
    const email = normalizeEmail(rawEmail);
    const next = normalizeEmail(patch.newEmail || email);
    if (!demoEmail(next)) throw new Error("Novo e-mail inválido.");
    if (next !== email && memberOf(next)) throw new Error("Já existe uma conta com o novo e-mail.");
    const member = memberOf(email);
    if (member) {
      member.email = next;
      if (typeof patch.name === "string") member.name = patch.name.trim();
    }
    if (next !== email) {
      db.grants = db.grants
        .map((g) => (g.email === email ? { ...g, email: next } : g))
        .filter((g, i, all) => all.findIndex((x) => x.email === g.email && x.productId === g.productId) === i);
      if (db.progress[email]) {
        db.progress[next] = db.progress[email];
        delete db.progress[email];
      }
    }
    persist();
    return next;
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

  async listCheckoutItems() {
    return clone(db.checkoutItems);
  },

  async saveCheckoutItem(item) {
    const externalId = item.externalId.trim();
    if (!externalId) throw new Error("Informe o ID do produto no checkout.");
    if (db.checkoutItems.some((c) => c.id !== item.id && c.externalId.trim().toLowerCase() === externalId.toLowerCase())) {
      throw new Error("Já existe um produto do checkout com esse ID.");
    }
    const saved = { ...item, externalId, title: item.title.trim() };
    db.checkoutItems = upsert(db.checkoutItems, saved);
    persist();
    return clone(saved);
  },

  async deleteCheckoutItem(id) {
    db.checkoutItems = db.checkoutItems.filter((c) => c.id !== id);
    persist();
  },

  async getAutomationStatus() {
    return { hasFixedPassword: !!db.fixedPassword };
  },

  async saveFixedPassword(password) {
    if (password && password.length < 6) throw new Error("A senha padrão precisa ter pelo menos 6 caracteres.");
    db.fixedPassword = password || undefined;
    persist();
    return { hasFixedPassword: !!db.fixedPassword };
  },

  async simulateSale(input) {
    const email = normalizeEmail(input.email);
    if (!demoEmail(email)) throw new Error("Informe um e-mail válido para a venda de teste.");
    const items = db.checkoutItems.filter((c) => input.items.includes(c.id));
    if (!items.length) throw new Error("Escolha pelo menos um produto do checkout.");
    const refund = input.event === "refunded";
    const result = processDemoSale(
      db,
      ggPayload({
        event: refund ? "pix.refunded" : "pix.paid",
        status: refund ? "refunded" : "paid",
        name: input.name || "Cliente Teste",
        email,
        phone: input.phone,
        document: input.document,
        amount: 0,
        items: items.map((c) => ({ id: c.externalId, title: c.title })),
      }),
      { simulated: true },
    );
    persist();
    return result;
  },

  async listWebhookLogs(filter = {}) {
    const term = (filter.search || "").trim().toLowerCase();
    return clone(
      db.webhookLogs
        .filter((l) => !filter.status || l.status === filter.status)
        .filter((l) => !filter.before || l.receivedAt < filter.before)
        .filter((l) => !term || [l.email, l.buyerName, l.orderId].some((v) => v.toLowerCase().includes(term)))
        .slice(0, filter.limit || 50),
    );
  },

  async replayWebhook(id) {
    const log = db.webhookLogs.find((l) => l.id === id);
    if (!log) throw new Error("Evento não encontrado.");
    const result = processDemoSale(db, log.payload, { replayOf: id });
    persist();
    return result;
  },

  async clearWebhookLogs() {
    db.webhookLogs = [];
    persist();
  },

  async listEmailLogs(filter = {}) {
    const term = (filter.search || "").trim().toLowerCase();
    return clone(
      db.emailLogs
        .filter((l) => !filter.status || l.status === filter.status)
        .filter((l) => !filter.kind || l.kind === filter.kind)
        .filter((l) => !filter.before || l.createdAt < filter.before)
        .filter((l) => !term || l.to.toLowerCase().includes(term) || l.subject.toLowerCase().includes(term))
        .slice(0, filter.limit || 50)
        .map(({ html: _html, ...log }) => log),
    );
  },

  async getEmailHtml(id) {
    return db.emailLogs.find((l) => l.id === id)?.html || "";
  },

  async resendEmail(id, to) {
    const log = db.emailLogs.find((l) => l.id === id);
    if (!log) throw new Error("Registro de e-mail não encontrado.");
    if (log.kind === "reset") throw new Error("Links de senha não são reenviados: envie um novo pela tela de Membros.");
    const target = normalizeEmail(to || log.to);
    const sent = demoDeliver(db, { kind: log.kind, to: target, subject: log.subject, html: log.html, webhookLogId: log.webhookLogId, meta: { resendOf: id } });
    persist();
    if (sent.status === "failed") throw new Error(`Não foi possível reenviar: ${sent.error}.`);
  },

  async clearEmailLogs() {
    db.emailLogs = [];
    persist();
  },

  async getEmailStatus() {
    return demoProviderStatus(db);
  },

  async saveEmailProvider(input) {
    if (input.smtp === null) db.emailProvider.smtp = undefined;
    else if (input.smtp) {
      const host = input.smtp.host.trim().replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) throw new Error("Servidor SMTP inválido (ex: smtp.hostinger.com).");
      if (input.smtp.port === 25 || input.smtp.port === 587) throw new Error("As portas 25 e 587 são bloqueadas no servidor. Use a 465 com SSL.");
      if (!input.smtp.username.trim()) throw new Error("Informe o usuário do SMTP (normalmente o próprio e-mail).");
      const password = input.smtp.password || db.emailProvider.smtp?.password || "";
      if (!password) throw new Error("Informe a senha do SMTP.");
      if (!input.skipVerify && password === "errada") throw new Error("O servidor recusou a conexão: usuário ou senha do SMTP recusados pelo servidor (535).");
      db.emailProvider.smtp = { host, port: input.smtp.port, security: input.smtp.security, username: input.smtp.username.trim(), password };
    }
    if (input.resendKey === null || input.resendKey === "") db.emailProvider.resendKey = undefined;
    else if (typeof input.resendKey === "string") {
      if (!/^re_[A-Za-z0-9_-]{8,}$/.test(input.resendKey.trim())) throw new Error("Essa não parece uma chave do Resend. Ela começa com “re_”.");
      db.emailProvider.resendKey = input.resendKey.trim();
    }
    persist();
    return demoProviderStatus(db);
  },

  async testEmailConnection() {
    const status = demoProviderStatus(db);
    if (status.provider === "smtp") {
      if (!status.smtp.configured) return { ok: false, message: "Salve os dados do SMTP primeiro." };
      return { ok: true, message: `Conectado a ${status.smtp.host}:${status.smtp.port} e autenticado (demonstração).` };
    }
    return status.resend.configured ? { ok: true, message: "Chave válida (demonstração)." } : { ok: false, message: "Salve a chave do Resend primeiro." };
  },

  async sendTestEmail({ to, kind, template, settings, existingAccount }) {
    const target = normalizeEmail(to);
    if (!demoEmail(target)) throw new Error("Informe um e-mail válido para o teste.");
    const saved = db.settings.email;
    db.settings.email = mergeEmailSettings(settings);
    try {
      if (!demoReady(db)) throw new Error("Não foi possível enviar: configure o envio de e-mail primeiro.");
      const products = db.products.filter((p) => p.published).slice(0, 2).map((p) => p.title);
      const rendered = demoRender(db, kind, template, { email: target, name: "Ana Julia", phone: "5511999999999" }, products, kind === "welcome" && !existingAccount ? "Exemplo-7Kq2" : undefined, "TESTE-123");
      demoDeliver(db, { kind: "test", to: target, subject: rendered.subject, html: rendered.html, meta: { template: kind } });
    } finally {
      db.settings.email = saved;
      persist();
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  async upload(file, { onProgress }) {
    onProgress?.(30);
    // Imagens pequenas viram data URL (persistem); o resto vale só nesta sessão.
    const url = file.type.startsWith("image/") && file.size < 1_500_000 ? await readAsDataUrl(file) : URL.createObjectURL(file);
    onProgress?.(100);
    return url;
  },
};
