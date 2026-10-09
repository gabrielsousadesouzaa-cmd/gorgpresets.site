// Implementação de produção do repositório: Postgres (RLS), Storage e a Edge
// Function "members-api". O esquema está em supabase/migrations/*_members_area.sql.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { MembersRepo } from "./repo";
import { SetupRequiredError } from "./repo";
import type {
  Attachment,
  AuthSnapshot,
  Grant,
  Lesson,
  Material,
  MemberSummary,
  Module,
  PortalSettings,
  Product,
  Progress,
  ReorderTable,
  Row,
  WebhookLog,
} from "./types";
import { DEFAULT_SETTINGS } from "./defaults";
import { normalizeEmail, uid } from "./format";

const metaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
const SUPABASE_URL = (metaEnv.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || "";

const PUBLIC_BUCKET = "members-public";
const PRIVATE_BUCKET = "members-private";
const FUNCTION = "members-api";

const TABLES: Record<ReorderTable, string> = {
  products: "member_products",
  modules: "member_modules",
  lessons: "member_lessons",
  rows: "member_rows",
  materials: "member_materials",
};

function client(): SupabaseClient {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

type DbRow = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    ["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code || "") ||
    /does not exist|could not find the (table|function)/i.test(error.message || "")
  );
}

function check<T>(result: { data: T; error: { code?: string; message: string } | null }): T {
  if (result.error) {
    if (isMissingTable(result.error)) throw new SetupRequiredError();
    throw new Error(result.error.message);
  }
  return result.data;
}

const translateAuthError = (message: string) => {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  if (/rate limit|too many/i.test(message)) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  if (/invalid totp|invalid code|expired/i.test(message)) return "Código inválido ou expirado.";
  if (/should be at least/i.test(message)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/same.*password|different from the old/i.test(message)) return "A nova senha precisa ser diferente da atual.";
  return message;
};

// ── Mapeamentos banco ↔ app ─────────────────────────────────────────
const toProduct = (r: DbRow): Product => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  description: r.description,
  coverUrl: r.cover_url,
  bannerUrl: r.banner_url,
  logoUrl: r.logo_url,
  accentColor: r.accent_color,
  badge: r.badge,
  checkoutUrl: r.checkout_url,
  priceLabel: r.price_label,
  externalIds: r.external_ids || [],
  isFree: r.is_free,
  published: r.published,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});
const fromProduct = (p: Product): DbRow => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  subtitle: p.subtitle,
  description: p.description,
  cover_url: p.coverUrl,
  banner_url: p.bannerUrl,
  logo_url: p.logoUrl,
  accent_color: p.accentColor,
  badge: p.badge,
  checkout_url: p.checkoutUrl,
  price_label: p.priceLabel,
  external_ids: p.externalIds,
  is_free: p.isFree,
  published: p.published,
  sort_order: p.sortOrder,
  updated_at: new Date().toISOString(),
});

const toModule = (r: DbRow): Module => ({
  id: r.id,
  productId: r.product_id,
  title: r.title,
  description: r.description,
  sortOrder: r.sort_order,
  published: r.published,
});
const fromModule = (m: Module): DbRow => ({
  id: m.id,
  product_id: m.productId,
  title: m.title,
  description: m.description,
  sort_order: m.sortOrder,
  published: m.published,
});

const toLesson = (r: DbRow): Lesson => ({
  id: r.id,
  productId: r.product_id,
  moduleId: r.module_id,
  title: r.title,
  description: r.description,
  videoUrl: r.video_url,
  thumbnailUrl: r.thumbnail_url,
  durationSeconds: r.duration_seconds,
  attachments: (Array.isArray(r.attachments) ? r.attachments : []) as Attachment[],
  sortOrder: r.sort_order,
  published: r.published,
});
const fromLesson = (l: Lesson): DbRow => ({
  id: l.id,
  product_id: l.productId,
  module_id: l.moduleId,
  title: l.title,
  description: l.description,
  video_url: l.videoUrl,
  thumbnail_url: l.thumbnailUrl,
  duration_seconds: Math.round(l.durationSeconds || 0),
  attachments: l.attachments,
  sort_order: l.sortOrder,
  published: l.published,
});

const toMaterial = (r: DbRow): Material => ({
  id: r.id,
  productId: r.product_id,
  name: r.name,
  description: r.description,
  url: r.url,
  size: Number(r.size) || 0,
  sortOrder: r.sort_order,
});
const fromMaterial = (m: Material): DbRow => ({
  id: m.id,
  product_id: m.productId,
  name: m.name,
  description: m.description,
  url: m.url,
  size: m.size,
  sort_order: m.sortOrder,
});

const toRow = (r: DbRow): Row => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  kind: r.kind,
  cardStyle: r.card_style,
  accentTitle: r.accent_title,
  productIds: r.product_ids || [],
  visible: r.visible,
  sortOrder: r.sort_order,
});
const fromRow = (r: Row): DbRow => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  kind: r.kind,
  card_style: r.cardStyle,
  accent_title: r.accentTitle,
  product_ids: r.productIds,
  visible: r.visible,
  sort_order: r.sortOrder,
});

const toProgress = (r: DbRow): Progress => ({
  lessonId: r.lesson_id,
  productId: r.product_id,
  completed: r.completed,
  position: r.position_seconds,
  duration: r.duration_seconds,
  updatedAt: r.updated_at,
});

const toGrant = (r: DbRow): Grant => ({
  id: r.id,
  email: r.email,
  productId: r.product_id,
  source: r.source,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

function mergeSettings(data: Partial<PortalSettings> | null | undefined): PortalSettings {
  const d = data || {};
  return {
    ...DEFAULT_SETTINGS,
    ...d,
    login: { ...DEFAULT_SETTINGS.login, ...(d.login || {}) },
    support: { ...DEFAULT_SETTINGS.support, ...(d.support || {}) },
    heroSlides: Array.isArray(d.heroSlides) ? d.heroSlides : [],
  };
}

// ── Edge Function ───────────────────────────────────────────────────
async function invoke<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().functions.invoke(FUNCTION, { body });
  if (error) {
    let message = "";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        if (typeof parsed?.error === "string") message = parsed.error;
      } catch {
        /* corpo não-JSON */
      }
    }
    const err = new Error(message || error.message) as Error & { unreachable?: boolean };
    // Função não publicada (404 do gateway) ou fora do ar.
    err.unreachable =
      !message && (error.name === "FunctionsFetchError" || error.name === "FunctionsRelayError" || ctx?.status === 404);
    throw err;
  }
  return data as T;
}

// ── Cache de URLs assinadas (vídeos e downloads privados) ───────────
const signedCache = new Map<string, { url: string; expires: number }>();
const SIGNED_TTL = 6 * 3600;

let adminCache: { userId: string; value: boolean } | null = null;
let touchedFor: string | null = null;

async function isAdmin(userId: string): Promise<boolean> {
  if (adminCache?.userId === userId) return adminCache.value;
  const { data, error } = await client().rpc("member_is_admin");
  if (error && isMissingTable(error)) throw new SetupRequiredError();
  const value = data === true;
  adminCache = { userId, value };
  return value;
}

function uploadWithProgress(bucket: string, path: string, file: File, token: string, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Falha no upload (${xhr.status}).`;
      try {
        const body = JSON.parse(xhr.responseText);
        message = body.message || body.error || message;
      } catch {
        /* ignore */
      }
      if (/maximum allowed size|payload too large/i.test(message) || xhr.status === 413) {
        message = "Arquivo maior que o limite do seu plano Supabase. Para vídeos grandes use YouTube (não listado), Vimeo ou Panda.";
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão durante o upload."));
    xhr.send(file);
  });
}

async function syncAccess(email: string, productIds: string[], additive: boolean) {
  const sb = client();
  const normalized = normalizeEmail(email);
  const current = (check(await sb.from("member_access").select("id, product_id").eq("email", normalized)) as DbRow[]) || [];
  const currentIds = new Set(current.map((g) => g.product_id as string));
  const toRemove = additive ? [] : current.filter((g) => !productIds.includes(g.product_id)).map((g) => g.id as string);
  const toAdd = productIds.filter((id) => !currentIds.has(id));
  if (toRemove.length) check(await sb.from("member_access").delete().in("id", toRemove));
  if (toAdd.length) {
    check(await sb.from("member_access").insert(toAdd.map((product_id) => ({ id: uid(), email: normalized, product_id, source: "manual" }))));
  }
}

export const supabaseRepo: MembersRepo = {
  mode: "supabase",

  async getAuth(): Promise<AuthSnapshot> {
    const sb = client();
    const { data } = await sb.auth.getSession();
    const session = data.session;
    if (!session) {
      adminCache = null;
      return { user: null, needsMfa: false };
    }
    const u = session.user;
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsMfa = !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2";

    const { data: producerRow } = await sb.from("member_admins").select("user_id").eq("user_id", u.id).maybeSingle();
    const admin = producerRow ? await isAdmin(u.id) : false;

    if (touchedFor !== u.id) {
      touchedFor = u.id;
      void sb.rpc("member_touch_profile", { p_name: (u.user_metadata?.full_name as string) || null });
    }
    return {
      user: {
        id: u.id,
        email: (u.email || "").toLowerCase(),
        name: (u.user_metadata?.full_name as string) || "",
        isAdmin: admin,
      },
      needsMfa: !!producerRow && needsMfa,
    };
  },

  onAuthChange(cb) {
    const { data } = client().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "MFA_CHALLENGE_VERIFIED" || event === "USER_UPDATED") {
        adminCache = null;
      }
      if (event !== "TOKEN_REFRESHED") setTimeout(cb, 0);
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const { error } = await client().auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) throw new Error(translateAuthError(error.message));
  },

  async signOut() {
    adminCache = null;
    touchedFor = null;
    signedCache.clear();
    await client().auth.signOut();
  },

  async firstAccess(email, password, name) {
    try {
      await invoke({ action: "first_access", email: normalizeEmail(email), password, name });
    } catch (err) {
      const e = err as Error & { unreachable?: boolean };
      if (e.unreachable) throw new Error("O primeiro acesso ainda não está disponível. Fale com o suporte para receber seu login.");
      throw e;
    }
    await supabaseRepo.signIn(email, password);
  },

  async requestPasswordReset(email) {
    const redirectTo = `${window.location.origin}/membros/perfil?nova-senha=1`;
    try {
      const res = await invoke<{ fallback?: boolean }>({ action: "recover", email: normalizeEmail(email), redirectTo });
      if (!res?.fallback) return;
    } catch {
      /* função indisponível: usa o e-mail padrão do Supabase */
    }
    const { error } = await client().auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
    if (error) throw new Error(translateAuthError(error.message));
  },

  async updatePassword(password) {
    const { error } = await client().auth.updateUser({ password });
    if (error) throw new Error(translateAuthError(error.message));
  },

  async updateName(name) {
    const sb = client();
    const { error } = await sb.auth.updateUser({ data: { full_name: name } });
    if (error) throw new Error(error.message);
    await sb.rpc("member_touch_profile", { p_name: name });
  },

  async verifyMfa(code) {
    const sb = client();
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) throw new Error(error.message);
    const factor = data?.totp?.find((f) => f.status === "verified");
    if (!factor) throw new Error("Nenhum autenticador encontrado para esta conta.");
    const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (verifyError) throw new Error(translateAuthError(verifyError.message));
    adminCache = null;
  },

  async getSettings() {
    const data = check(await client().from("member_settings").select("data").eq("id", "main").maybeSingle());
    return mergeSettings((data as DbRow | null)?.data);
  },

  async getCatalog() {
    const sb = client();
    const [products, modules, lessons, rows] = await Promise.all([
      sb.from("member_products").select("*").order("sort_order"),
      sb.from("member_modules").select("*").order("sort_order"),
      sb.from("member_lessons").select("*").order("sort_order"),
      sb.from("member_rows").select("*").order("sort_order"),
    ]);
    return {
      products: (check(products) as DbRow[]).map(toProduct),
      modules: (check(modules) as DbRow[]).map(toModule),
      lessons: (check(lessons) as DbRow[]).map(toLesson),
      rows: (check(rows) as DbRow[]).map(toRow),
    };
  },

  async getMyAccess() {
    const sb = client();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return [];
    if (await isAdmin(user.id)) {
      const all = check(await sb.from("member_products").select("id")) as DbRow[];
      return all.map((p) => p.id);
    }
    const now = Date.now();
    const [grants, free] = await Promise.all([
      sb.from("member_access").select("product_id, expires_at").eq("email", (user.email || "").toLowerCase()),
      sb.from("member_products").select("id").eq("is_free", true),
    ]);
    const owned = (check(grants) as DbRow[])
      .filter((g) => !g.expires_at || new Date(g.expires_at).getTime() > now)
      .map((g) => g.product_id as string);
    return Array.from(new Set([...owned, ...(check(free) as DbRow[]).map((p) => p.id as string)]));
  },

  async getMaterials(productId) {
    const data = check(await client().from("member_materials").select("*").eq("product_id", productId).order("sort_order"));
    return (data as DbRow[]).map(toMaterial);
  },

  async getProgress() {
    const sb = client();
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return [];
    const data = check(await sb.from("member_progress").select("*").eq("user_id", userId));
    return (data as DbRow[]).map(toProgress);
  },

  async saveProgress(p) {
    const { error } = await client().from("member_progress").upsert({
      lesson_id: p.lessonId,
      product_id: p.productId,
      completed: p.completed,
      position_seconds: Math.round(p.position),
      duration_seconds: Math.round(p.duration),
      updated_at: p.updatedAt,
    });
    if (error) throw new Error(error.message);
  },

  async resolveMediaUrl(url) {
    if (!url.startsWith("storage://")) return url;
    const cached = signedCache.get(url);
    if (cached && cached.expires > Date.now() + 60_000) return cached.url;
    const [, , bucket, ...rest] = url.split("/");
    const path = rest.join("/");
    const { data, error } = await client().storage.from(bucket).createSignedUrl(path, SIGNED_TTL);
    if (error || !data) throw new Error("Você não tem acesso a este arquivo.");
    signedCache.set(url, { url: data.signedUrl, expires: Date.now() + SIGNED_TTL * 1000 });
    return data.signedUrl;
  },

  async saveSettings(settings) {
    check(await client().from("member_settings").upsert({ id: "main", data: settings, updated_at: new Date().toISOString() }));
  },

  async saveProduct(product) {
    const data = check(await client().from("member_products").upsert(fromProduct(product)).select().single());
    return toProduct(data as DbRow);
  },

  async deleteProduct(id) {
    check(await client().from("member_products").delete().eq("id", id));
    const rows = check(await client().from("member_rows").select("id, product_ids").contains("product_ids", [id])) as DbRow[];
    await Promise.all(
      rows.map((r) =>
        client().from("member_rows").update({ product_ids: (r.product_ids as string[]).filter((p) => p !== id) }).eq("id", r.id),
      ),
    );
  },

  async saveModule(mod) {
    const data = check(await client().from("member_modules").upsert(fromModule(mod)).select().single());
    return toModule(data as DbRow);
  },

  async deleteModule(id) {
    check(await client().from("member_modules").delete().eq("id", id));
  },

  async saveLesson(lesson) {
    const data = check(await client().from("member_lessons").upsert(fromLesson(lesson)).select().single());
    return toLesson(data as DbRow);
  },

  async deleteLesson(id) {
    check(await client().from("member_lessons").delete().eq("id", id));
  },

  async saveMaterial(material) {
    const data = check(await client().from("member_materials").upsert(fromMaterial(material)).select().single());
    return toMaterial(data as DbRow);
  },

  async deleteMaterial(id) {
    check(await client().from("member_materials").delete().eq("id", id));
  },

  async saveRow(row) {
    const data = check(await client().from("member_rows").upsert(fromRow(row)).select().single());
    return toRow(data as DbRow);
  },

  async deleteRow(id) {
    check(await client().from("member_rows").delete().eq("id", id));
  },

  async reorder(table, ids) {
    const sb = client();
    const results = await Promise.all(ids.map((id, index) => sb.from(TABLES[table]).update({ sort_order: index }).eq("id", id)));
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  },

  async listMaterialsAdmin() {
    const data = check(await client().from("member_materials").select("*").order("sort_order"));
    return (data as DbRow[]).map(toMaterial);
  },

  async listMembers() {
    const sb = client();
    const [grantsRes, profilesRes] = await Promise.all([
      sb.from("member_access").select("*").order("created_at", { ascending: false }),
      sb.from("member_profiles").select("*"),
    ]);
    const grants = (check(grantsRes) as DbRow[]).map(toGrant);
    const profiles = check(profilesRes) as DbRow[];
    const { data: admins } = await sb.from("member_admins").select("user_id");
    const adminIds = new Set((admins || []).map((a) => a.user_id));

    const byEmail = new Map<string, MemberSummary>();
    profiles
      .filter((p) => !adminIds.has(p.user_id))
      .forEach((p) =>
        byEmail.set(p.email, {
          email: p.email,
          name: p.full_name || "",
          hasAccount: true,
          grants: [],
          createdAt: p.created_at,
          lastSeenAt: p.last_seen_at,
        }),
      );
    grants.forEach((g) => {
      const entry =
        byEmail.get(g.email) ||
        ({ email: g.email, name: "", hasAccount: false, grants: [], createdAt: g.createdAt, lastSeenAt: null } as MemberSummary);
      entry.grants.push(g);
      if (g.createdAt < entry.createdAt) entry.createdAt = g.createdAt;
      byEmail.set(g.email, entry);
    });
    return Array.from(byEmail.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async addMember({ email, name, password, productIds }) {
    const normalized = normalizeEmail(email);
    try {
      const res = await invoke<{ createdAccount: boolean; password?: string }>({
        action: "create_member",
        email: normalized,
        name,
        password: password || undefined,
        productIds,
        sendEmail: true,
      });
      return { createdAccount: res.createdAccount, password: res.password };
    } catch (err) {
      const e = err as Error & { unreachable?: boolean };
      if (!e.unreachable) throw e;
      // Sem a Edge Function: libera o acesso e o membro cria a senha no "Primeiro acesso".
      await syncAccess(normalized, productIds, true);
      return {
        createdAccount: false,
        warning: "Acesso liberado. Publique a função members-api para criar contas e enviar o login automaticamente.",
      };
    }
  },

  async setMemberAccess(email, productIds) {
    await syncAccess(email, productIds, false);
  },

  async grantAccess(email, productIds) {
    await syncAccess(email, productIds, true);
  },

  async removeMember(email) {
    const normalized = normalizeEmail(email);
    try {
      await invoke({ action: "delete_member", email: normalized });
    } catch (err) {
      const e = err as Error & { unreachable?: boolean };
      if (!e.unreachable) throw e;
      check(await client().from("member_access").delete().eq("email", normalized));
    }
  },

  async setMemberPassword(email, password) {
    await invoke({ action: "set_password", email: normalizeEmail(email), password });
  },

  async listWebhookLogs(): Promise<WebhookLog[]> {
    const data = check(await client().from("member_webhook_logs").select("*").order("received_at", { ascending: false }).limit(50));
    return (data as DbRow[]).map((r) => ({
      id: r.id,
      receivedAt: r.received_at,
      status: r.status,
      message: r.message,
      email: r.email,
      payload: r.payload,
    }));
  },

  async getStats() {
    const sb = client();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [access, active, products, lessons, completions] = await Promise.all([
      sb.from("member_access").select("email"),
      sb.from("member_profiles").select("user_id", { count: "exact", head: true }).gt("last_seen_at", weekAgo),
      sb.from("member_products").select("id", { count: "exact", head: true }),
      sb.from("member_lessons").select("id", { count: "exact", head: true }),
      sb.from("member_progress").select("lesson_id", { count: "exact", head: true }).eq("completed", true),
    ]);
    const emails = new Set(((check(access) as DbRow[]) || []).map((r) => r.email));
    return {
      members: emails.size,
      activeMembers7d: active.count || 0,
      products: products.count || 0,
      lessons: lessons.count || 0,
      completions: completions.count || 0,
    };
  },

  webhookUrl() {
    return `${SUPABASE_URL}/functions/v1/${FUNCTION}?action=webhook&token=SEU_TOKEN`;
  },

  async upload(file, { visibility, productId, folder, onProgress }) {
    const { data } = await client().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Entre novamente.");
    const safeName = file.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(-80);
    const fileName = `${uid().slice(0, 8)}-${safeName}`;
    if (visibility === "public") {
      const path = `${folder}/${fileName}`;
      await uploadWithProgress(PUBLIC_BUCKET, path, file, token, onProgress);
      return client().storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
    }
    if (!productId) throw new Error("Selecione o produto antes de enviar arquivos privados.");
    const path = `${productId}/${folder}/${fileName}`;
    await uploadWithProgress(PRIVATE_BUCKET, path, file, token, onProgress);
    return `storage://${PRIVATE_BUCKET}/${path}`;
  },
};
