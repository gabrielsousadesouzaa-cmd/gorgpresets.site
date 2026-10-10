// GORG · Área de Membros — Edge Function "members-api"
//
// Webhook (POST ?action=webhook&token=...; o token também vale no header
// x-secret ou Authorization: Bearer): lê a venda de qualquer checkout
// (GGCheckout, Hotmart, Kiwify...), aprende os produtos, libera ou retira o
// acesso, cria a conta e envia o e-mail. Tudo fica no histórico.
//
// Ações (POST, corpo JSON com { action }):
//   first_access, recover, password_changed       → portal (comprador)
//   create_member, set_password, delete_member,
//   send_reset, resend_access, set_blocked,
//   update_member                                  → [produtor] membros
//   email_status, email_save_provider,
//   email_test_connection, email_test, email_resend → [produtor] e-mails
//   automation_status, automation_save_password,
//   webhook_replay, webhook_simulate               → [produtor] automação
//
// Segredos ficam em member_private_settings (só o servidor lê): token do
// webhook, chave do Resend, SMTP e senha padrão. Segredos opcionais do
// Supabase têm prioridade: MEMBERS_WEBHOOK_TOKEN, RESEND_API_KEY,
// MEMBERS_EMAIL_FROM, MEMBERS_PORTAL_URL.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { type EmailContext, type EmailSettings, type EmailTemplate, escapeHtml, htmlToText, mergeEmailSettings, renderEmail, renderNoticeEmail, type TemplateKind } from "./email.ts";
import { parseSale, type ParsedSale } from "./sale.ts";
import { checkResendKey, type MailMessage, type MailResult, sendViaResend, sendViaSmtp, type SmtpConfig, verifySmtp } from "./mailer.ts";
import { type AutomationSettings, documentPassword, mergeAutomation } from "./automation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ENV_WEBHOOK_TOKEN = Deno.env.get("MEMBERS_WEBHOOK_TOKEN") || "";
const ENV_RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ENV_EMAIL_FROM = Deno.env.get("MEMBERS_EMAIL_FROM") || "";
const PORTAL_URL = (Deno.env.get("MEMBERS_PORTAL_URL") || "https://gorgpresets.site/membros").replace(/\/$/, "");
const SITE_ORIGIN = new URL(PORTAL_URL).origin;
const LOGO_URL = `${SITE_ORIGIN}/logo.png`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const normalizeEmail = (v: unknown) => String(v || "").trim().toLowerCase();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function randomPassword(length = 10) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Contas criadas pela área de membros recebem esta marca (só o servidor grava
// app_metadata). As regras do banco só liberam compras para contas marcadas.
const MEMBER_FLAG = { gorg_member: true };

// ── Configuração ────────────────────────────────────────────────────
async function privateGet(key: string): Promise<string> {
  const { data } = await admin.from("member_private_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string) || "";
}

async function privateSet(key: string, value: string) {
  const { error } = await admin.from("member_private_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new HttpError(500, error.message);
}

async function privateDelete(key: string) {
  await admin.from("member_private_settings").delete().eq("key", key);
}

async function webhookToken(): Promise<string> {
  return ENV_WEBHOOK_TOKEN || (await privateGet("webhook_token"));
}

interface Config {
  brand: string;
  accent: string;
  supportUrl: string;
  email: EmailSettings;
  automation: AutomationSettings;
  smtp: SmtpConfig | null;
  resendKey: string;
  resendSource: "env" | "studio" | null;
  fixedPassword: string;
}

function parseSmtp(raw: string): SmtpConfig | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d?.host || !d?.port) return null;
    const security = d.security === "starttls" || d.security === "none" ? d.security : "ssl";
    return { host: String(d.host), port: Number(d.port), security, username: String(d.username || ""), password: String(d.password || "") };
  } catch {
    return null;
  }
}

async function loadConfig(): Promise<Config> {
  const [{ data: settingsRow }, { data: secrets }] = await Promise.all([
    admin.from("member_settings").select("data").eq("id", "main").maybeSingle(),
    admin.from("member_private_settings").select("key, value").in("key", ["resend_api_key", "smtp", "fixed_password"]),
  ]);
  const d = (settingsRow?.data || {}) as Record<string, unknown>;
  const secret = (key: string) => String((secrets || []).find((s) => s.key === key)?.value || "");
  const support = (d.support && typeof d.support === "object" ? d.support : {}) as Record<string, unknown>;
  const whatsapp = String(support.whatsapp || "").replace(/\D/g, "");
  const studioKey = secret("resend_api_key");
  return {
    brand: String(d.brandName || "Gorg Presets"),
    accent: String(d.accentColor || "#d82828"),
    supportUrl: whatsapp ? `https://wa.me/${whatsapp}` : `${PORTAL_URL}/suporte`,
    email: mergeEmailSettings(d.email),
    automation: mergeAutomation(d.automation),
    smtp: parseSmtp(secret("smtp")),
    resendKey: ENV_RESEND_KEY || studioKey,
    resendSource: ENV_RESEND_KEY ? "env" : studioKey ? "studio" : null,
    fixedPassword: secret("fixed_password"),
  };
}

// ── E-mail: envio e registro ────────────────────────────────────────
const cleanName = (v: string) => v.replace(/[<>"\r\n]/g, "").trim().slice(0, 80);

function senderAddress(config: Config): { name: string; email: string } {
  const name = cleanName(config.email.fromName || config.brand) || "Gorg Presets";
  const fromEmail = normalizeEmail(config.email.fromEmail);
  if (isEmail(fromEmail)) return { name, email: fromEmail };
  if (config.email.provider === "smtp" && config.smtp && isEmail(normalizeEmail(config.smtp.username))) {
    return { name, email: normalizeEmail(config.smtp.username) };
  }
  const env = ENV_EMAIL_FROM.match(/<([^>]+)>/)?.[1] || ENV_EMAIL_FROM;
  return { name, email: isEmail(normalizeEmail(env)) ? normalizeEmail(env) : "onboarding@resend.dev" };
}

/** Pronto para enviar? (SMTP completo, ou Resend com chave e remetente do domínio.) */
function mailerReady(config: Config): boolean {
  if (config.email.provider === "smtp") {
    const s = config.smtp;
    return !!s && !!s.host && !!s.port && !!s.username && !!s.password;
  }
  return !!config.resendKey && isEmail(normalizeEmail(config.email.fromEmail));
}

const bccList = (config: Config) =>
  config.email.bcc
    .split(/[,;\s]+/)
    .map(normalizeEmail)
    .filter(isEmail)
    .slice(0, 5);

interface Delivery {
  ok: boolean;
  transient: boolean;
  error: string;
  logId: string | null;
}

async function deliver(
  config: Config,
  mail: { kind: string; to: string; subject: string; html: string; text: string; webhookLogId?: string | null; idempotencyKey?: string; meta?: Record<string, unknown> },
): Promise<Delivery> {
  const provider = config.email.provider;
  let result: MailResult;
  if (!mailerReady(config)) {
    result = {
      ok: false,
      transient: false,
      error: provider === "smtp" ? "SMTP não configurado (servidor, usuário e senha)" : "Resend sem chave ou sem e-mail do remetente",
    };
  } else {
    const message: MailMessage = {
      from: senderAddress(config),
      to: mail.to,
      bcc: bccList(config),
      replyTo: normalizeEmail(config.email.replyTo) || undefined,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      idempotencyKey: mail.idempotencyKey,
    };
    try {
      result = provider === "smtp" ? await sendViaSmtp(config.smtp!, message) : await sendViaResend(config.resendKey, message);
    } catch (err) {
      result = { ok: false, transient: true, error: (err as Error).message || "falha inesperada no envio" };
    }
  }
  const { data } = await admin
    .from("member_email_logs")
    .insert({
      kind: mail.kind,
      to_email: mail.to,
      subject: mail.subject,
      status: result.ok ? "sent" : "failed",
      provider,
      error: result.ok ? "" : result.error,
      message_id: result.ok ? result.id : "",
      html: mail.html,
      webhook_log_id: mail.webhookLogId || null,
      meta: mail.meta || {},
    })
    .select("id")
    .single();
  return { ok: result.ok, transient: result.ok ? false : result.transient, error: result.ok ? "" : result.error, logId: (data?.id as string) || null };
}

const loginLink = (email: string) => `${PORTAL_URL}/entrar?email=${encodeURIComponent(email)}`;

function emailContext(config: Config, to: { email: string; name: string; phone?: string }, products: string[], extra: Partial<EmailContext> = {}): EmailContext {
  return {
    brand: config.brand,
    name: to.name,
    email: to.email,
    phone: to.phone || "",
    products,
    link: loginLink(to.email),
    logoUrl: LOGO_URL,
    accent: config.accent,
    supportUrl: config.supportUrl,
    ...extra,
  };
}

// ── Contas ──────────────────────────────────────────────────────────
async function requireProducer(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) throw new HttpError(401, "Não autenticado.");
  // Usa o JWT do próprio usuário para respeitar a regra de 2FA de member_is_admin().
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await asUser.rpc("member_is_admin");
  if (error || data !== true) throw new HttpError(403, "Apenas o produtor pode fazer isso.");
  const { data: who } = await asUser.auth.getUser();
  return { email: normalizeEmail(who?.user?.email), name: String(who?.user?.user_metadata?.full_name || "") };
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await admin.from("member_profiles").select("user_id").eq("email", email).maybeSingle();
  if (data?.user_id) return data.user_id;
  // Contas criadas fora do portal.
  for (let page = 1; page <= 20; page++) {
    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !list?.users?.length) break;
    const found = list.users.find((u) => (u.email || "").toLowerCase() === email);
    if (found) return found.id;
    if (list.users.length < 1000) break;
  }
  return null;
}

async function isProducerAccount(userId: string) {
  const { data } = await admin.from("member_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

interface AccountResult {
  userId: string;
  created: boolean;
  password?: string;
}

async function ensureAccount(
  email: string,
  name: string,
  opts: { password?: string; mustChange?: boolean; phone?: string; document?: string } = {},
): Promise<AccountResult> {
  const existing = await findUserIdByEmail(email);
  if (existing) {
    // Completa telefone/CPF que o checkout trouxe, sem sobrescrever o que já existe.
    if (opts.phone || opts.document) {
      const { data: profile } = await admin.from("member_profiles").select("phone, document").eq("user_id", existing).maybeSingle();
      if (profile) {
        const patch: Record<string, string> = {};
        if (opts.phone && !profile.phone) patch.phone = opts.phone;
        if (opts.document && !profile.document) patch.document = opts.document;
        if (Object.keys(patch).length) await admin.from("member_profiles").update(patch).eq("user_id", existing);
      }
    }
    return { userId: existing, created: false };
  }
  const password = opts.password || randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: { ...MEMBER_FLAG, must_change_password: !!opts.mustChange },
  });
  if (error || !data.user) throw new HttpError(400, error?.message || "Não foi possível criar a conta.");
  await admin.from("member_profiles").upsert({
    user_id: data.user.id,
    email,
    full_name: name || "",
    phone: opts.phone || "",
    document: opts.document || "",
    must_change_password: !!opts.mustChange,
  });
  return { userId: data.user.id, created: true, password };
}

async function removeAccount(userId: string) {
  await admin.from("member_profiles").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

async function setMustChange(userId: string, value: boolean) {
  await admin.auth.admin.updateUserById(userId, { app_metadata: { ...MEMBER_FLAG, must_change_password: value } });
  await admin.from("member_profiles").update({ must_change_password: value }).eq("user_id", userId);
}

async function grantManual(email: string, productIds: string[], source: string, externalRef?: string) {
  if (!productIds.length) return;
  const rows = productIds.map((product_id) => ({ email, product_id, source, external_ref: externalRef || null }));
  const { error } = await admin.from("member_access").upsert(rows, { onConflict: "email,product_id" });
  if (error) throw new HttpError(500, error.message);
}

async function productTitles(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await admin.from("member_products").select("id, title").in("id", ids);
  return new Map((data || []).map((p) => [p.id as string, String(p.title)]));
}

// ── Webhook ─────────────────────────────────────────────────────────
interface TrackedItem {
  external_key: string;
  product_ids: string[];
  ignored: boolean;
  email: Partial<EmailTemplate> | null;
}

interface LoggedItem {
  id: string;
  title: string;
  type: string;
  matched: boolean;
  ignored: boolean;
  collections: string[];
}

async function matchCollections(sale: ParsedSale, tracked: TrackedItem[]) {
  const { data: products } = await admin.from("member_products").select("id, title, slug, external_ids");
  const all = products || [];
  const existing = new Set(all.map((p) => p.id as string));
  const refs = new Set(sale.productRefs);
  const ids = new Set<string>();
  let override: EmailTemplate | null = null;

  const items: LoggedItem[] = sale.items.map((item) => {
    const key = item.id.trim().toLowerCase();
    const row = tracked.find((t) => t.external_key === key);
    const fromTable = row && !row.ignored ? (row.product_ids || []).filter((id) => existing.has(id)) : [];
    // Compatibilidade: IDs informados direto na coleção.
    const legacy = all.filter((p) => ((p.external_ids as string[]) || []).some((x) => String(x).trim().toLowerCase() === key)).map((p) => p.id as string);
    const collections = Array.from(new Set([...fromTable, ...(row?.ignored ? [] : legacy)]));
    collections.forEach((id) => ids.add(id));
    if (!override && collections.length && row?.email && (row.email as EmailTemplate).enabled) {
      override = mergeEmailSettings({ welcome: row.email }).welcome;
    }
    return { id: item.id, title: item.title, type: item.type, matched: collections.length > 0, ignored: !!row?.ignored, collections };
  });

  // Checkouts que não mandam a lista de produtos: casa por id/título/slug.
  if (!items.length) all
    .filter(
      (p) =>
        ((p.external_ids as string[]) || []).some((x) => refs.has(String(x).trim().toLowerCase())) ||
        refs.has(String(p.title).toLowerCase()) ||
        refs.has(String(p.slug).toLowerCase()),
    )
    .forEach((p) => ids.add(p.id as string));

  return { productIds: Array.from(ids), items, override: override as EmailTemplate | null };
}

async function insertLog(row: Record<string, unknown>): Promise<string | null> {
  const { data } = await admin.from("member_webhook_logs").insert(row).select("id").single();
  return (data?.id as string) || null;
}

async function updateLog(id: string | null, patch: Record<string, unknown>) {
  if (id) await admin.from("member_webhook_logs").update(patch).eq("id", id);
}

function eventLabel(sale: ParsedSale) {
  return sale.event || sale.statusValues.join(", ") || "sem status";
}

/** Processa uma venda (webhook real ou reprocessamento pelo Studio). */
async function processSale(payload: unknown, headers: Record<string, string>, opts: { replayOf?: string; simulated?: boolean } = {}) {
  const config = await loadConfig();
  const sale = parseSale(payload, headers);
  const base = {
    email: sale.email,
    payload,
    event: sale.event,
    platform: sale.platform,
    order_id: sale.orderId,
    buyer_name: sale.name,
    buyer_phone: sale.phone,
    buyer_document: sale.document,
    amount: sale.amount,
    payment_method: sale.paymentMethod,
    replay_of: opts.replayOf || null,
  };

  // Aprende os produtos do checkout em qualquer evento (conta a venda só se aprovada).
  let tracked: TrackedItem[] = [];
  if (sale.items.length) {
    const { data } = await admin.rpc("member_track_items", {
      p_items: sale.items.map((i) => ({ id: i.id, title: i.title })),
      p_platform: sale.platform,
      p_count: sale.approved && !sale.refunded && !opts.replayOf && !opts.simulated,
    });
    tracked = (data || []) as TrackedItem[];
  }

  if (!config.automation.enabled) {
    await insertLog({ ...base, status: "paused", message: "Automação pausada: a venda foi registrada, mas nada foi alterado." });
    return json({ ok: true, ignored: "paused" });
  }
  if (!sale.email) {
    await insertLog({ ...base, status: "ignored", message: "E-mail do comprador não encontrado no payload." });
    return json({ ok: true, ignored: "no-email" });
  }

  const match = await matchCollections(sale, tracked);
  const logged = { ...base, items: match.items, product_ids: match.productIds };
  if (!match.productIds.length) {
    const pending = match.items.filter((i) => !i.ignored).map((i) => i.title || i.id);
    await insertLog({
      ...logged,
      status: "unmatched",
      message: pending.length ? `Produto sem coleção ligada: ${pending.slice(0, 4).join(", ")}` : "Nenhuma coleção corresponde a esta venda.",
    });
    return json({ ok: true, ignored: "no-product" });
  }
  const titles = await productTitles(match.productIds);
  const names = (ids: string[]) => ids.map((id) => titles.get(id) || "Coleção");

  // ── Reembolso / chargeback ──
  if (sale.refunded) {
    const allowed = sale.chargeback ? config.automation.revokeOnChargeback : config.automation.revokeOnRefund;
    if (!allowed) {
      await insertLog({ ...logged, status: "ignored", message: `${sale.chargeback ? "Chargeback" : "Reembolso"} recebido, mas a retirada automática está desligada.` });
      return json({ ok: true, ignored: "revoke-disabled" });
    }
    const { data: removed } = await admin
      .from("member_access")
      .delete()
      .eq("email", sale.email)
      .in("product_id", match.productIds)
      .eq("source", "webhook")
      .select("product_id");
    const removedIds = (removed || []).map((r) => r.product_id as string);
    const logId = await insertLog({
      ...logged,
      product_ids: removedIds.length ? removedIds : match.productIds,
      status: "revoked",
      message: removedIds.length
        ? `Acesso retirado (${sale.chargeback ? "chargeback" : "reembolso"}): ${names(removedIds).join(", ")}`
        : "Reembolso recebido: não havia acesso liberado por venda para retirar.",
    });
    if (removedIds.length && config.email.refund.enabled) {
      const rendered = renderEmail("refund", config.email.refund, emailContext(config, { email: sale.email, name: sale.name, phone: sale.phone }, names(removedIds), { orderId: sale.orderId }));
      const sent = await deliver(config, { kind: "refund", to: sale.email, ...rendered, webhookLogId: logId, idempotencyKey: `refund/${sale.orderId || sale.email}/${removedIds.sort().join(",")}` });
      await updateLog(logId, { email_status: sent.ok ? "sent" : "failed", email_log_id: sent.logId });
    }
    return json({ ok: true, revoked: removedIds.length });
  }

  if (!sale.approved) {
    await insertLog({ ...logged, status: "ignored", message: `Pagamento ainda não aprovado (${eventLabel(sale)}).` });
    return json({ ok: true, ignored: "status" });
  }
  if (!config.automation.grantOnApproved) {
    await insertLog({ ...logged, status: "ignored", message: "Venda aprovada, mas a liberação automática está desligada." });
    return json({ ok: true, ignored: "grant-disabled" });
  }

  // ── Venda aprovada ──
  // Acessos novos entram com notified_at nulo; os que já existiam ficam como estão.
  const { error: grantError } = await admin.from("member_access").upsert(
    match.productIds.map((product_id) => ({ email: sale.email, product_id, source: "webhook", external_ref: sale.orderId || null, notified_at: null })),
    { onConflict: "email,product_id", ignoreDuplicates: true },
  );
  if (grantError) throw new HttpError(500, grantError.message);

  const logId = await insertLog({ ...logged, status: "granted", message: `Acesso liberado: ${names(match.productIds).join(", ")}` });

  // Espera um pouco para juntar compras seguidas (carrinho, order bump) num só e-mail.
  if (config.automation.batchSeconds > 0 && !opts.replayOf && !opts.simulated) await sleep(config.automation.batchSeconds * 1000);

  // "Reserva" os acessos ainda sem e-mail. Se outra notificação já reservou, não repete.
  const { data: claimedRows } = await admin
    .from("member_access")
    .update({ notified_at: new Date().toISOString() })
    .eq("email", sale.email)
    .is("notified_at", null)
    .select("product_id");
  const claimed = (claimedRows || []).map((r) => r.product_id as string);
  if (!claimed.length) {
    await updateLog(logId, { email_status: "skipped", message: `Acesso liberado: ${names(match.productIds).join(", ")} · já tinha acesso (sem e-mail novo)` });
    return json({ ok: true, granted: 0 });
  }
  const unclaim = () => admin.from("member_access").update({ notified_at: null }).eq("email", sale.email).in("product_id", claimed);
  const claimedTitles = await productTitles(claimed);
  const claimedNames = claimed.map((id) => claimedTitles.get(id) || "Coleção");

  const automation = config.automation;
  const policyPassword = automation.passwordMode === "fixed" ? config.fixedPassword : automation.passwordMode === "cpf" ? documentPassword(sale.document) : "";
  const template = match.override || config.email.welcome;
  const wantsEmail = template.enabled && mailerReady(config);

  // Sem e-mail e sem senha conhecida, a conta não é criada: o comprador usa o "Primeiro acesso".
  if (!wantsEmail && !policyPassword) {
    await updateLog(logId, {
      email_status: "skipped",
      message: `Acesso liberado: ${claimedNames.join(", ")} · ${template.enabled ? "e-mail não configurado" : "e-mail de boas-vindas desligado"} (o comprador entra pelo “Primeiro acesso”)`,
    });
    return json({ ok: true, granted: claimed.length });
  }

  let account: AccountResult;
  try {
    account = await ensureAccount(sale.email, sale.name, {
      password: policyPassword || undefined,
      mustChange: automation.forcePasswordChange,
      phone: sale.phone,
      document: sale.document,
    });
  } catch (err) {
    await unclaim();
    await updateLog(logId, { status: "error", message: `Acesso liberado, mas a conta não foi criada: ${(err as Error).message}. O checkout vai reenviar.` });
    return json({ ok: false, error: "account" }, 500);
  }

  if (!wantsEmail) {
    await updateLog(logId, {
      email_status: "skipped",
      message: `Acesso liberado: ${claimedNames.join(", ")} · ${account.created ? "conta criada com a senha padrão" : "conta já existia"} (sem e-mail)`,
    });
    return json({ ok: true, granted: claimed.length });
  }

  const rendered = renderEmail(
    "welcome",
    template,
    emailContext(config, { email: sale.email, name: sale.name, phone: sale.phone }, claimedNames, {
      password: account.created ? account.password : undefined,
      orderId: sale.orderId,
    }),
  );
  const sent = await deliver(config, {
    kind: "welcome",
    to: sale.email,
    ...rendered,
    webhookLogId: logId,
    idempotencyKey: `welcome/${sale.orderId || sale.email}/${[...claimed].sort().join(",")}`,
    meta: { products: claimedNames, accountCreated: account.created },
  });

  if (sent.ok) {
    await updateLog(logId, {
      email_status: "sent",
      email_log_id: sent.logId,
      message: `Acesso liberado: ${claimedNames.join(", ")} · ${account.created ? "conta criada e " : ""}e-mail enviado`,
    });
    return json({ ok: true, granted: claimed.length });
  }

  if (sent.transient) {
    // Falha temporária: desfaz a conta nova e pede para o checkout reenviar.
    if (account.created) await removeAccount(account.userId);
    await unclaim();
    await updateLog(logId, { email_status: "failed", email_log_id: sent.logId, message: `Acesso liberado · e-mail não enviado: ${sent.error} (o checkout vai tentar de novo)` });
    return json({ ok: false, error: "email-temporary" }, 503);
  }
  // Falha definitiva: sem senha conhecida, a conta nova é desfeita para o "Primeiro acesso" funcionar.
  if (account.created && !policyPassword) await removeAccount(account.userId);
  await updateLog(logId, {
    email_status: "failed",
    email_log_id: sent.logId,
    message: `Acesso liberado · e-mail não enviado: ${sent.error}${policyPassword ? "" : " (o comprador pode entrar pelo “Primeiro acesso”)"}`,
  });
  return json({ ok: true, granted: claimed.length, email: "failed" });
}

function webhookSecretFrom(req: Request, url: URL) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return [url.searchParams.get("token") || "", req.headers.get("x-secret") || "", bearer].filter(Boolean);
}

/** Cabeçalhos úteis para reconhecer a plataforma (nunca os de autenticação). */
function safeHeaders(req: Request) {
  const out: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "authorization" || k === "x-secret" || k === "cookie" || k === "apikey") return;
    if (k.startsWith("x-") || k === "user-agent") out[k] = value.slice(0, 200);
  });
  return out;
}

async function handleWebhook(req: Request, url: URL) {
  const expected = await webhookToken();
  if (!expected || !webhookSecretFrom(req, url).some((candidate) => safeEqual(candidate, expected))) {
    throw new HttpError(401, "Token inválido.");
  }
  const raw = await req.text();
  let payload: unknown = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = Object.fromEntries(new URLSearchParams(raw));
  }
  return processSale(payload, safeHeaders(req));
}

// ── Portal (comprador) ──────────────────────────────────────────────
async function firstAccess(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const name = String(body.name || "").slice(0, 120);
  if (!isEmail(email)) throw new HttpError(400, "E-mail inválido.");
  if (password.length < 6) throw new HttpError(400, "A senha precisa ter pelo menos 6 caracteres.");

  const { data: settings } = await admin.from("member_settings").select("data").eq("id", "main").maybeSingle();
  if (settings?.data?.login?.allowFirstAccess === false) throw new HttpError(403, "Primeiro acesso desativado. Use o login enviado por e-mail.");

  const { count } = await admin.from("member_access").select("id", { count: "exact", head: true }).eq("email", email);
  if (!count) throw new HttpError(404, "Não encontramos nenhuma compra com este e-mail. Use o mesmo e-mail do pagamento.");

  if (await findUserIdByEmail(email)) throw new HttpError(409, "Você já tem uma conta. Entre com sua senha ou use “Esqueci minha senha”.");
  await ensureAccount(email, name, { password });
  return json({ ok: true });
}

async function recover(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const redirectTo = String(body.redirectTo || `${PORTAL_URL}/perfil?nova-senha=1`);
  const config = await loadConfig();
  // Sem envio próprio configurado, o portal usa o e-mail padrão do Supabase.
  // A resposta não depende do e-mail informado (não revela quem tem conta).
  if (!mailerReady(config)) return json({ ok: true, fallback: true });
  if (!isEmail(email)) return json({ ok: true, fallback: false });

  const [perEmail, global] = await Promise.all([
    admin.rpc("member_rate_hit", { p_key: `recover:${email}`, p_window_seconds: 900, p_max: 3 }),
    admin.rpc("member_rate_hit", { p_key: "recover:all", p_window_seconds: 3600, p_max: 60 }),
  ]);
  if (perEmail.data === false || global.data === false) return json({ ok: true, fallback: false });

  const userId = await findUserIdByEmail(email);
  if (userId) {
    const { data: profile } = await admin.from("member_profiles").select("blocked").eq("user_id", userId).maybeSingle();
    if (!profile?.blocked) await sendRecoveryLink(config, email, redirectTo, "reset");
  }
  return json({ ok: true, fallback: false });
}

async function sendRecoveryLink(config: Config, email: string, redirectTo: string, kind: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
  const link = data?.properties?.action_link;
  if (error || !link) return { ok: false, transient: false, error: error?.message || "não foi possível gerar o link", logId: null } as Delivery;
  const rendered = renderNoticeEmail({
    brand: config.brand,
    logoUrl: LOGO_URL,
    accent: config.accent,
    eyebrow: "Segurança da conta",
    heading: "Redefina sua senha",
    message: "Recebemos um pedido para criar uma nova senha para a sua conta na Área de Membros. O link vale por 1 hora.",
    button: { label: "Criar nova senha", url: link },
    note: "Se não foi você, pode ignorar este e-mail: sua senha continua a mesma.",
  });
  // O link é de uso único: o registro guarda a versão sem o link.
  const delivery = await deliver(config, { kind, to: email, ...rendered });
  if (delivery.logId) {
    const safe = [link, escapeHtml(link)].reduce((html, value) => html.split(value).join(`${PORTAL_URL}/entrar`), rendered.html);
    await admin.from("member_email_logs").update({ html: safe }).eq("id", delivery.logId);
  }
  return delivery;
}

/** O membro trocou a senha obrigatória: libera o conteúdo. */
async function passwordChanged(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) throw new HttpError(401, "Não autenticado.");
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data } = await asUser.auth.getUser();
  if (!data?.user) throw new HttpError(401, "Sessão expirada. Entre de novo.");
  await setMustChange(data.user.id, false);
  return json({ ok: true });
}

// ── Membros (produtor) ──────────────────────────────────────────────
async function createMember(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").slice(0, 120);
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
  if (!isEmail(email)) throw new HttpError(400, "E-mail inválido.");
  await grantManual(email, productIds, "manual");
  const config = await loadConfig();
  const account = await ensureAccount(email, name, {
    password: body.password ? String(body.password) : undefined,
    mustChange: config.automation.forcePasswordChange && !body.password,
  });
  if (!account.created) {
    // O produtor liberou este e-mail manualmente: a conta existente passa a valer.
    await admin.auth.admin.updateUserById(account.userId, { app_metadata: MEMBER_FLAG });
    if (name) await admin.from("member_profiles").update({ full_name: name }).eq("user_id", account.userId);
  }
  let emailed = false;
  let emailError = "";
  if (body.sendEmail) {
    if (!mailerReady(config)) emailError = "envio de e-mail não configurado";
    else {
      const titles = await productTitles(productIds);
      const rendered = renderEmail("welcome", config.email.welcome, emailContext(config, { email, name }, productIds.map((id) => titles.get(id) || "Coleção"), {
        password: account.created ? account.password : undefined,
      }));
      const sent = await deliver(config, { kind: "access", to: email, ...rendered, meta: { manual: true } });
      emailed = sent.ok;
      if (!sent.ok) emailError = sent.error;
    }
  }
  return json({ ok: true, createdAccount: account.created, password: account.created ? account.password : undefined, emailed, emailError });
}

async function setPassword(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (password.length < 6) throw new HttpError(400, "A senha precisa ter pelo menos 6 caracteres.");
  const userId = await findUserIdByEmail(email);
  if (!userId) throw new HttpError(404, "Este membro ainda não tem conta.");
  const mustChange = !!body.forceChange;
  const { error } = await admin.auth.admin.updateUserById(userId, { password, app_metadata: { ...MEMBER_FLAG, must_change_password: mustChange } });
  if (error) throw new HttpError(400, error.message);
  await admin.from("member_profiles").update({ must_change_password: mustChange }).eq("user_id", userId);
  return json({ ok: true });
}

async function deleteMember(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  await admin.from("member_access").delete().eq("email", email);
  const userId = await findUserIdByEmail(email);
  if (userId && !(await isProducerAccount(userId))) await removeAccount(userId);
  return json({ ok: true });
}

async function sendReset(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  const config = await loadConfig();
  if (!mailerReady(config)) throw new HttpError(400, "Configure o envio de e-mail em Studio → E-mails primeiro.");
  if (!(await findUserIdByEmail(email))) throw new HttpError(404, "Este membro ainda não tem conta.");
  const sent = await sendRecoveryLink(config, email, `${PORTAL_URL}/perfil?nova-senha=1`, "reset");
  if (!sent.ok) throw new HttpError(400, `Não foi possível enviar: ${sent.error}.`);
  return json({ ok: true });
}

/** Gera uma senha nova e envia o e-mail de acesso com todas as coleções do membro. */
async function resendAccess(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) throw new HttpError(400, "E-mail inválido.");
  const config = await loadConfig();
  const { data: grants } = await admin.from("member_access").select("product_id").eq("email", email);
  const productIds = (grants || []).map((g) => g.product_id as string);
  if (!productIds.length) throw new HttpError(400, "Este e-mail ainda não tem nenhuma coleção liberada.");

  const password = body.password ? String(body.password) : randomPassword();
  if (password.length < 6) throw new HttpError(400, "A senha precisa ter pelo menos 6 caracteres.");
  const mustChange = config.automation.forcePasswordChange;
  const { data: profile } = await admin.from("member_profiles").select("user_id, full_name, phone").eq("email", email).maybeSingle();
  let userId = (profile?.user_id as string) || (await findUserIdByEmail(email));
  let name = String(profile?.full_name || "");
  if (userId) {
    if (await isProducerAccount(userId)) throw new HttpError(400, "Esta é a conta do produtor.");
    const { error } = await admin.auth.admin.updateUserById(userId, { password, app_metadata: { ...MEMBER_FLAG, must_change_password: mustChange } });
    if (error) throw new HttpError(400, error.message);
    await admin.from("member_profiles").update({ must_change_password: mustChange }).eq("user_id", userId);
  } else {
    const created = await ensureAccount(email, String(body.name || ""), { password, mustChange });
    userId = created.userId;
    name = String(body.name || "");
  }

  let emailed = false;
  let emailError = "";
  if (mailerReady(config)) {
    const titles = await productTitles(productIds);
    const rendered = renderEmail("welcome", config.email.welcome, emailContext(config, { email, name, phone: String(profile?.phone || "") }, productIds.map((id) => titles.get(id) || "Coleção"), { password }));
    const sent = await deliver(config, { kind: "access", to: email, ...rendered, meta: { manual: true } });
    emailed = sent.ok;
    emailError = sent.error;
  } else {
    emailError = "envio de e-mail não configurado";
  }
  await admin.from("member_access").update({ notified_at: new Date().toISOString() }).eq("email", email).is("notified_at", null);
  return json({ ok: true, password, emailed, emailError });
}

async function setBlocked(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  const blocked = !!body.blocked;
  const userId = await findUserIdByEmail(email);
  if (!userId) throw new HttpError(404, "Este membro ainda não tem conta.");
  if (await isProducerAccount(userId)) throw new HttpError(400, "A conta do produtor não pode ser bloqueada.");
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? "876000h" : "none",
    app_metadata: { ...MEMBER_FLAG, blocked },
  });
  if (error) throw new HttpError(400, error.message);
  await admin.from("member_profiles").update({ blocked }).eq("user_id", userId);
  return json({ ok: true });
}

async function updateMember(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  const newEmail = normalizeEmail(body.newEmail || email);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : null;
  if (!isEmail(newEmail)) throw new HttpError(400, "Novo e-mail inválido.");
  const userId = await findUserIdByEmail(email);
  if (userId && (await isProducerAccount(userId))) throw new HttpError(400, "Edite a conta do produtor pelo painel da loja.");

  if (newEmail !== email) {
    if (await findUserIdByEmail(newEmail)) throw new HttpError(409, "Já existe uma conta com o novo e-mail.");
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, { email: newEmail, email_confirm: true });
      if (error) throw new HttpError(400, error.message);
      await admin.from("member_profiles").update({ email: newEmail }).eq("user_id", userId);
    }
    // Leva os acessos para o novo e-mail (sem duplicar os que ele já tinha).
    const { data: grants } = await admin.from("member_access").select("product_id, source, external_ref, expires_at, created_at").eq("email", email);
    if (grants?.length) {
      const { error } = await admin.from("member_access").upsert(
        grants.map((g) => ({ ...g, email: newEmail })),
        { onConflict: "email,product_id", ignoreDuplicates: true },
      );
      if (error) throw new HttpError(500, error.message);
      await admin.from("member_access").delete().eq("email", email);
    }
  }
  if (name !== null && userId) {
    await admin.auth.admin.updateUserById(userId, { user_metadata: { full_name: name } });
    await admin.from("member_profiles").update({ full_name: name }).eq("user_id", userId);
  }
  return json({ ok: true, email: newEmail });
}

// ── E-mails (produtor) ──────────────────────────────────────────────
const keyHint = (key: string) => (key ? `${key.slice(0, 3)}…${key.slice(-4)}` : null);

async function emailStatus(req: Request) {
  await requireProducer(req);
  return json(await buildEmailStatus(await loadConfig()));
}

async function buildEmailStatus(config: Config) {
  const resendCheck = config.resendKey ? await checkResendKey(config.resendKey) : null;
  return {
    provider: config.email.provider,
    ready: mailerReady(config),
    from: senderAddress(config),
    smtp: config.smtp
      ? { configured: true, host: config.smtp.host, port: config.smtp.port, security: config.smtp.security, username: config.smtp.username, hasPassword: !!config.smtp.password }
      : { configured: false, host: "", port: 465, security: "ssl", username: "", hasPassword: false },
    resend: {
      configured: !!config.resendKey,
      source: config.resendSource,
      hint: keyHint(config.resendKey),
      keyCheck: resendCheck?.check || null,
      domains: resendCheck?.domains || null,
    },
  };
}

function readSmtpInput(raw: Record<string, unknown>, current: SmtpConfig | null): SmtpConfig {
  const host = String(raw.host || "").trim().replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
  const port = Number(raw.port);
  const security = raw.security === "starttls" || raw.security === "none" ? raw.security : "ssl";
  const username = String(raw.username || "").trim();
  const password = typeof raw.password === "string" && raw.password ? raw.password : current?.password || "";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) throw new HttpError(400, "Servidor SMTP inválido (ex: smtp.hostinger.com).");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new HttpError(400, "Porta SMTP inválida.");
  if (port === 25 || port === 587) throw new HttpError(400, "As portas 25 e 587 são bloqueadas no servidor. Use a 465 com SSL.");
  if (!username) throw new HttpError(400, "Informe o usuário do SMTP (normalmente o próprio e-mail).");
  if (!password) throw new HttpError(400, "Informe a senha do SMTP.");
  return { host, port, security, username, password };
}

async function emailSaveProvider(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const config = await loadConfig();

  if (body.smtp === null) await privateDelete("smtp");
  else if (body.smtp && typeof body.smtp === "object") {
    const smtp = readSmtpInput(body.smtp as Record<string, unknown>, config.smtp);
    if (!body.skipVerify) {
      const check = await verifySmtp(smtp);
      if (!check.ok) throw new HttpError(400, `O servidor recusou a conexão: ${check.error}.`);
    }
    await privateSet("smtp", JSON.stringify(smtp));
  }

  if (body.resendKey === null || body.resendKey === "") await privateDelete("resend_api_key");
  else if (typeof body.resendKey === "string") {
    const key = body.resendKey.trim();
    if (!/^re_[A-Za-z0-9_-]{8,}$/.test(key)) throw new HttpError(400, "Essa não parece uma chave do Resend. Ela começa com “re_”.");
    const check = await checkResendKey(key);
    if (check.check === "invalid") throw new HttpError(400, "O Resend recusou essa chave. Confira se copiou a chave inteira.");
    await privateSet("resend_api_key", key);
  }
  return json(await buildEmailStatus(await loadConfig()));
}

async function emailTestConnection(req: Request) {
  await requireProducer(req);
  const config = await loadConfig();
  if (config.email.provider === "smtp") {
    if (!config.smtp) throw new HttpError(400, "Salve os dados do SMTP primeiro.");
    const check = await verifySmtp(config.smtp);
    return json(check.ok ? { ok: true, message: `Conectado a ${config.smtp.host}:${config.smtp.port} e autenticado.` } : { ok: false, message: check.error });
  }
  if (!config.resendKey) throw new HttpError(400, "Salve a chave do Resend primeiro.");
  const check = await checkResendKey(config.resendKey);
  const messages = { ok: "Chave válida.", send_only: "Chave válida (só envio).", invalid: "O Resend recusou a chave.", unreachable: "Não foi possível falar com o Resend agora." };
  return json({ ok: check.check === "ok" || check.check === "send_only", message: messages[check.check] });
}

async function emailTest(req: Request, body: Record<string, unknown>) {
  const producer = await requireProducer(req);
  const to = normalizeEmail(body.to) || producer.email;
  if (!isEmail(to)) throw new HttpError(400, "Informe um e-mail válido para o teste.");
  const config = await loadConfig();
  // O teste usa o que está na tela, mesmo antes de salvar.
  if (body.settings && typeof body.settings === "object") config.email = mergeEmailSettings({ ...config.email, ...(body.settings as object) });
  const kind: TemplateKind = body.kind === "refund" ? "refund" : "welcome";
  const template = body.template && typeof body.template === "object" ? mergeEmailSettings({ [kind]: body.template })[kind] : config.email[kind];
  const { data: sample } = await admin.from("member_products").select("title").eq("published", true).order("sort_order").limit(2);
  const products = (sample || []).map((p) => String(p.title));
  const rendered = renderEmail(
    kind,
    template,
    emailContext(config, { email: to, name: producer.name || "Ana Julia", phone: "5511999999999" }, products.length ? products : ["Coleção de exemplo"], {
      password: kind === "welcome" && !body.existingAccount ? "Exemplo-7Kq2" : undefined,
      orderId: "TESTE-123",
    }),
  );
  const sent = await deliver(config, { kind: "test", to, ...rendered, meta: { template: kind } });
  if (!sent.ok) throw new HttpError(400, `Não foi possível enviar: ${sent.error}.`);
  return json({ ok: true, to });
}

async function emailResend(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const id = String(body.id || "");
  const { data: log } = await admin.from("member_email_logs").select("*").eq("id", id).maybeSingle();
  if (!log) throw new HttpError(404, "Registro de e-mail não encontrado.");
  if (log.kind === "reset") throw new HttpError(400, "Links de senha não são reenviados: envie um novo pela tela de Membros.");
  const to = normalizeEmail(body.to) || String(log.to_email);
  if (!isEmail(to)) throw new HttpError(400, "E-mail inválido.");
  const config = await loadConfig();
  const html = String(log.html || "");
  const sent = await deliver(config, { kind: String(log.kind), to, subject: String(log.subject), html, text: htmlToText(html), webhookLogId: log.webhook_log_id, meta: { resendOf: id } });
  if (!sent.ok) throw new HttpError(400, `Não foi possível reenviar: ${sent.error}.`);
  return json({ ok: true });
}

// ── Automação (produtor) ────────────────────────────────────────────
async function automationStatus(req: Request) {
  await requireProducer(req);
  return json({ hasFixedPassword: !!(await privateGet("fixed_password")) });
}

async function automationSavePassword(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    await privateDelete("fixed_password");
    return json({ hasFixedPassword: false });
  }
  if (password.length < 6) throw new HttpError(400, "A senha padrão precisa ter pelo menos 6 caracteres.");
  await privateSet("fixed_password", password);
  return json({ hasFixedPassword: true });
}

async function webhookReplay(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const id = String(body.id || "");
  const { data: log } = await admin.from("member_webhook_logs").select("id, payload").eq("id", id).maybeSingle();
  if (!log) throw new HttpError(404, "Evento não encontrado.");
  const response = await processSale(log.payload, {}, { replayOf: log.id as string });
  const result = await response.json().catch(() => ({}));
  return json({ ok: response.ok, result });
}

/** Venda de teste (formato do GGCheckout) para conferir todo o fluxo pelo Studio. */
async function webhookSimulate(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) throw new HttpError(400, "Informe um e-mail válido para a venda de teste.");
  const ids = Array.isArray(body.items) ? body.items.map(String).slice(0, 10) : [];
  if (!ids.length) throw new HttpError(400, "Escolha pelo menos um produto do checkout.");
  const { data: rows } = await admin.from("member_checkout_items").select("external_id, title").in("id", ids);
  if (!rows?.length) throw new HttpError(404, "Produtos do checkout não encontrados.");
  const refund = body.event === "refunded";
  const products = rows.map((r, i) => ({ id: String(r.external_id), type: i === 0 ? "main" : "orderbump", title: String(r.title || "") }));
  const payload = {
    event: refund ? "pix.refunded" : "pix.paid",
    createdAt: new Date().toISOString(),
    test: true,
    customer: {
      name: String(body.name || "Cliente Teste").slice(0, 120),
      email,
      document: String(body.document || "").replace(/\D/g, "").slice(0, 14),
      phone: String(body.phone || "").replace(/\D/g, "").slice(0, 15),
    },
    payment: { id: `teste-${crypto.randomUUID().slice(0, 8)}`, method: refund ? "pix.refunded" : "pix.paid", paymentMethod: "pix", status: refund ? "refunded" : "paid", amount: 0 },
    product: products[0],
    products,
  };
  const response = await processSale(payload, { "x-gorg-simulated": "1" }, { simulated: true });
  const result = await response.json().catch(() => ({}));
  return json({ ok: response.ok, result });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = new URL(req.url);
  try {
    if (url.searchParams.get("action") === "webhook") return await handleWebhook(req, url);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    switch (body.action) {
      case "first_access":
        return await firstAccess(body);
      case "recover":
        return await recover(body);
      case "password_changed":
        return await passwordChanged(req);
      case "create_member":
        return await createMember(req, body);
      case "set_password":
        return await setPassword(req, body);
      case "delete_member":
        return await deleteMember(req, body);
      case "send_reset":
        return await sendReset(req, body);
      case "resend_access":
        return await resendAccess(req, body);
      case "set_blocked":
        return await setBlocked(req, body);
      case "update_member":
        return await updateMember(req, body);
      case "email_status":
        return await emailStatus(req);
      case "email_save_provider":
        return await emailSaveProvider(req, body);
      case "email_test_connection":
        return await emailTestConnection(req);
      case "email_test":
        return await emailTest(req, body);
      case "email_resend":
        return await emailResend(req, body);
      case "automation_status":
        return await automationStatus(req);
      case "automation_save_password":
        return await automationSavePassword(req, body);
      case "webhook_replay":
        return await webhookReplay(req, body);
      case "webhook_simulate":
        return await webhookSimulate(req, body);
      default:
        return json({ error: "Ação desconhecida." }, 400);
    }
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    if (status === 500) console.error(err);
    return json({ error: message }, status);
  }
});
