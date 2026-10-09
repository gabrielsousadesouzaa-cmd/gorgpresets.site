// GORG · Área de Membros — Edge Function "members-api"
//
// Ações (POST, corpo JSON com { action }):
//   webhook        → ?action=webhook&token=...  Recebe a venda do checkout (GGCheckout,
//                    Kiwify, Hotmart, Cakto...), libera o acesso e envia o e-mail de boas-vindas.
//                    O token também pode vir no header x-secret ou Authorization: Bearer.
//   first_access   → Comprador cria a própria senha (só se tiver compra e ainda não tiver conta).
//   recover        → Envia link de redefinição de senha pelo Resend (se configurado).
//   create_member  → [produtor] Cria conta + libera produtos.
//   set_password   → [produtor] Define nova senha para um membro.
//   delete_member  → [produtor] Remove acessos e a conta do membro.
//   email_status   → [produtor] Situação da conexão com o Resend (chave e domínios).
//   email_save_key → [produtor] Salva (ou remove) a chave do Resend, depois de validar.
//   email_test     → [produtor] Envia o e-mail de boas-vindas de teste.
//
// Token do webhook e chave do Resend ficam em member_private_settings (só o
// servidor lê). Os segredos abaixo, se existirem, têm prioridade.
//
// Segredos opcionais (Supabase → Edge Functions → Secrets):
//   MEMBERS_WEBHOOK_TOKEN  opcional — substitui o token gerado no banco
//   RESEND_API_KEY         opcional — substitui a chave salva pelo Studio
//   MEMBERS_EMAIL_FROM     opcional — remetente padrão, ex: "Gorg Presets <acesso@gorgpresets.site>"
//   MEMBERS_PORTAL_URL     opcional — ex: "https://gorgpresets.site/membros"
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem por padrão.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { DEFAULT_EMAIL, type EmailSettings, joinList, renderNoticeEmail, renderWelcomeEmail } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ENV_WEBHOOK_TOKEN = Deno.env.get("MEMBERS_WEBHOOK_TOKEN") || "";
const ENV_RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ENV_EMAIL_FROM = Deno.env.get("MEMBERS_EMAIL_FROM") || "";
const PORTAL_URL = (Deno.env.get("MEMBERS_PORTAL_URL") || "https://gorgpresets.site/membros").replace(/\/$/, "");
const SITE_ORIGIN = new URL(PORTAL_URL).origin;
// Remetente de testes do Resend: só entrega para o dono da conta Resend.
const FALLBACK_FROM = "Gorg Presets <onboarding@resend.dev>";

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

async function webhookToken(): Promise<string> {
  if (ENV_WEBHOOK_TOKEN) return ENV_WEBHOOK_TOKEN;
  const { data } = await admin.from("member_private_settings").select("value").eq("key", "webhook_token").maybeSingle();
  return data?.value || "";
}

// ── Auth helpers ────────────────────────────────────────────────────
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
  // Fallback para contas criadas fora do portal.
  for (let page = 1; page <= 20; page++) {
    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !list?.users?.length) break;
    const found = list.users.find((u) => (u.email || "").toLowerCase() === email);
    if (found) return found.id;
    if (list.users.length < 1000) break;
  }
  return null;
}

async function ensureAccount(email: string, name: string, password?: string) {
  const existing = await findUserIdByEmail(email);
  if (existing) return { userId: existing, created: false as const };
  const finalPassword = password || randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: MEMBER_FLAG,
  });
  if (error || !data.user) throw new HttpError(400, error?.message || "Não foi possível criar a conta.");
  await admin.from("member_profiles").upsert({ user_id: data.user.id, email, full_name: name || "" });
  return { userId: data.user.id, created: true as const, password: finalPassword };
}

async function grant(email: string, productIds: string[], source: string, externalRef?: string) {
  if (!productIds.length) return;
  const rows = productIds.map((product_id) => ({ email, product_id, source, external_ref: externalRef || null }));
  const { error } = await admin.from("member_access").upsert(rows, { onConflict: "email,product_id" });
  if (error) throw new HttpError(500, error.message);
}

// ── E-mail (Resend) ─────────────────────────────────────────────────
async function resendKey(): Promise<{ key: string; source: "env" | "studio" | null }> {
  if (ENV_RESEND_KEY) return { key: ENV_RESEND_KEY, source: "env" };
  const { data } = await admin.from("member_private_settings").select("value").eq("key", "resend_api_key").maybeSingle();
  return data?.value ? { key: data.value, source: "studio" } : { key: "", source: null };
}

interface PortalInfo {
  brand: string;
  accent: string;
  email: EmailSettings;
}

async function portalInfo(): Promise<PortalInfo> {
  const { data } = await admin.from("member_settings").select("data").eq("id", "main").maybeSingle();
  const d = (data?.data || {}) as Record<string, unknown>;
  return {
    brand: String(d.brandName || "Gorg Presets"),
    accent: String(d.accentColor || "#d82828"),
    email: { ...DEFAULT_EMAIL, ...(d.email && typeof d.email === "object" ? (d.email as Partial<EmailSettings>) : {}) },
  };
}

const cleanName = (v: string) => v.replace(/[<>"\r\n]/g, "").trim().slice(0, 80);

function fromAddress(info: PortalInfo) {
  const address = normalizeEmail(info.email.fromEmail);
  if (isEmail(address)) return `${cleanName(info.email.fromName || info.brand) || "Gorg Presets"} <${address}>`;
  return ENV_EMAIL_FROM || FALLBACK_FROM;
}

const loginLink = (email: string) => `${PORTAL_URL}/entrar?email=${encodeURIComponent(email)}`;

type SendResult = { ok: true; id: string } | { ok: false; error: string };

/** Traduz os erros mais comuns do Resend para algo que o produtor entende. */
function resendError(status: number, body: { name?: string; message?: string }): string {
  const message = String(body?.message || "");
  if (status === 403 && /testing emails|verify a domain|own email/i.test(message)) {
    return "domínio ainda não verificado no Resend (com o remetente de teste, só o e-mail da sua conta Resend recebe)";
  }
  if (status === 403 && /domain.*not verified|not verified/i.test(message)) return "o domínio do remetente ainda não foi verificado no Resend";
  if (status === 401 || (status === 403 && /api key/i.test(message))) return "chave do Resend inválida";
  if (status === 422) return `dados recusados pelo Resend: ${message || "verifique o remetente"}`;
  if (status === 429) return "limite de envios do Resend atingido — tente mais tarde";
  return message || `erro ${status} no Resend`;
}

async function sendEmail(
  key: string,
  mail: { from: string; to: string; subject: string; html: string; text: string; replyTo?: string; idempotencyKey?: string },
): Promise<SendResult> {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "User-Agent": "gorgpresets-members/1.0",
    };
    if (mail.idempotencyKey) headers["Idempotency-Key"] = mail.idempotencyKey.slice(0, 256);
    const reply = normalizeEmail(mail.replyTo);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: mail.from,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(isEmail(reply) ? { reply_to: reply } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: resendError(res.status, body) };
    return { ok: true, id: String(body?.id || "") };
  } catch (err) {
    return { ok: false, error: `sem conexão com o Resend (${(err as Error).message})` };
  }
}

async function sendWelcome(
  key: string,
  info: PortalInfo,
  to: { email: string; name: string },
  products: string[],
  options: { password?: string; settings?: EmailSettings; idempotencyKey?: string } = {},
) {
  const settings = options.settings || info.email;
  const rendered = renderWelcomeEmail(settings, {
    brand: info.brand,
    name: to.name,
    email: to.email,
    products,
    link: loginLink(to.email),
    password: options.password,
    logoUrl: `${SITE_ORIGIN}/logo.png`,
    accent: info.accent,
  });
  return sendEmail(key, {
    from: fromAddress({ ...info, email: settings }),
    to: to.email,
    replyTo: settings.replyTo,
    idempotencyKey: options.idempotencyKey,
    ...rendered,
  });
}

// ── Leitura flexível do payload dos checkouts ───────────────────────
type Flat = Array<{ path: string; key: string; value: string }>;

function flatten(input: unknown, path = "", out: Flat = []): Flat {
  if (input === null || input === undefined) return out;
  if (Array.isArray(input)) {
    input.forEach((v, i) => flatten(v, `${path}[${i}]`, out));
  } else if (typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) flatten(v, path ? `${path}.${k}` : k, out);
  } else {
    const key = path.split(".").pop()!.replace(/\[\d+\]$/, "");
    out.push({ path: path.toLowerCase(), key: key.toLowerCase(), value: String(input) });
  }
  return out;
}

const BUYER_HINT = /(customer|buyer|client|comprador|cliente|payer|user|contact)/;

function extractSale(payload: unknown) {
  const flat = flatten(payload);
  const emails = flat.filter((f) => /e-?mail/.test(f.key) && isEmail(f.value.trim()));
  const email = normalizeEmail((emails.find((f) => BUYER_HINT.test(f.path)) || emails[0])?.value);

  const names = flat.filter((f) => /^(name|nome|full_?name|first_?name)$/.test(f.key) && f.value.length < 120);
  const name = (names.find((f) => BUYER_HINT.test(f.path)) || { value: "" }).value.trim();

  const statusValues = flat
    .filter((f) => /^(status|event|type|event_type|payment_status|order_status|webhook_event_type|trigger)$/.test(f.key))
    .map((f) => f.value.toLowerCase());
  const negative = /(unpaid|not_?paid|nao_?pago|não pago|waiting|aguardando|pending|pendente|refused|recusad|expired|expirad|incomplete|failed|falh)/;
  const refunded = statusValues.some((v) => /(refund|reembols|charge_?d?_?back|estorn|cancel|dispute)/.test(v));
  const approved = !refunded && statusValues.some((v) => /(approved|aprovad|paid|pago|complete|succeeded|confirmed)/.test(v) && !negative.test(v));

  const productRefs = new Set<string>();
  flat
    .filter((f) => /(product|produto|offer|oferta|plan|plano|item|sku|course)/.test(f.path) && /(id|code|codigo|hash|uuid|name|nome|title|titulo|sku|slug)/.test(f.key))
    .forEach((f) => f.value.trim() && productRefs.add(f.value.trim().toLowerCase()));

  const orderRef =
    flat.find((f) => /^(order_?id|transaction(_?id)?|sale_?id|payment_?id|purchase_?id)$/.test(f.key))?.value ||
    // GGCheckout: { payment: { id } }
    flat.find((f) => /^(payment|order|sale|purchase|transaction|pedido)\.id$/.test(f.path))?.value;
  return { email, name, approved, refunded, statusValues, productRefs: Array.from(productRefs), orderRef };
}

async function matchProducts(refs: string[]) {
  const { data } = await admin.from("member_products").select("id, title, slug, external_ids");
  const lowered = new Set(refs);
  return (data || []).filter(
    (p) =>
      (p.external_ids || []).some((id: string) => lowered.has(String(id).trim().toLowerCase())) ||
      lowered.has(String(p.title).toLowerCase()) ||
      lowered.has(String(p.slug).toLowerCase()),
  );
}

async function logWebhook(status: string, message: string, email: string, payload: unknown) {
  await admin.from("member_webhook_logs").insert({ status, message, email, payload });
}

function webhookSecretFrom(req: Request, url: URL) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return [url.searchParams.get("token") || "", req.headers.get("x-secret") || "", bearer].filter(Boolean);
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

  const sale = extractSale(payload);
  if (!sale.email) {
    await logWebhook("ignored", "E-mail do comprador não encontrado no payload.", "", payload);
    return json({ ok: true, ignored: "no-email" });
  }

  const products = await matchProducts(sale.productRefs);
  if (!products.length) {
    await logWebhook("unmatched", `Nenhum produto corresponde a: ${sale.productRefs.slice(0, 6).join(", ") || "—"}`, sale.email, payload);
    return json({ ok: true, ignored: "no-product" });
  }

  if (sale.refunded) {
    await admin.from("member_access").delete().eq("email", sale.email).in("product_id", products.map((p) => p.id)).eq("source", "webhook");
    await logWebhook("revoked", `Acesso removido (reembolso/cancelamento): ${products.map((p) => p.title).join(", ")}`, sale.email, payload);
    return json({ ok: true, revoked: products.length });
  }

  if (!sale.approved) {
    await logWebhook("ignored", `Status não aprovado: ${sale.statusValues.join(", ") || "—"}`, sale.email, payload);
    return json({ ok: true, ignored: "status" });
  }

  // Só as coleções que a pessoa ainda não tinha contam como novidade: assim um
  // webhook repetido (o checkout reenvia em caso de falha) não dispara outro e-mail.
  const ids = products.map((p) => p.id);
  const { data: before } = await admin.from("member_access").select("product_id").eq("email", sale.email).in("product_id", ids);
  const already = new Set((before || []).map((r) => r.product_id as string));
  const fresh = products.filter((p) => !already.has(p.id));
  await grant(sale.email, ids, "webhook", sale.orderRef);

  const titles = products.map((p) => p.title).join(", ");
  if (!fresh.length) {
    await logWebhook("granted", `Acesso já estava liberado: ${titles} · e-mail não reenviado`, sale.email, payload);
    return json({ ok: true, granted: 0 });
  }

  // Com e-mail configurado, já cria a conta e envia o acesso. Sem e-mail (ou se o
  // envio falhar), o comprador usa "Primeiro acesso" para criar a própria senha.
  let note = "";
  const [{ key }, info] = await Promise.all([resendKey(), portalInfo()]);
  if (key && info.email.enabled) {
    const account = await ensureAccount(sale.email, sale.name);
    const sent = await sendWelcome(key, info, { email: sale.email, name: sale.name }, fresh.map((p) => p.title), {
      password: account.created ? account.password : undefined,
      idempotencyKey: `welcome/${sale.orderRef || sale.email}/${fresh.map((p) => p.id).sort().join(",")}`,
    });
    if (sent.ok) {
      note = account.created ? " · conta criada e e-mail enviado" : " · e-mail enviado";
    } else {
      // Sem o e-mail a pessoa não saberia a senha: desfaz a conta nova para o "Primeiro acesso" funcionar.
      if (account.created) {
        await admin.from("member_profiles").delete().eq("user_id", account.userId);
        await admin.auth.admin.deleteUser(account.userId);
      }
      note = ` · e-mail não enviado: ${sent.error} (o comprador pode entrar pelo “Primeiro acesso”)`;
    }
  } else if (!key) {
    note = " · sem e-mail configurado (o comprador entra pelo “Primeiro acesso”)";
  }
  await logWebhook("granted", `Acesso liberado: ${fresh.map((p) => p.title).join(", ")}${note}`, sale.email, payload);
  return json({ ok: true, granted: fresh.length });
}

// ── Ações do portal ─────────────────────────────────────────────────
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
  await ensureAccount(email, name, password);
  return json({ ok: true });
}

async function recover(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const redirectTo = String(body.redirectTo || PORTAL_URL);
  const { key } = await resendKey();
  if (!key) return json({ ok: true, fallback: true });
  if (isEmail(email) && (await findUserIdByEmail(email))) {
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    const link = data?.properties?.action_link;
    if (link) {
      const info = await portalInfo();
      const rendered = renderNoticeEmail({
        brand: info.brand,
        logoUrl: `${SITE_ORIGIN}/logo.png`,
        accent: info.accent,
        eyebrow: "Segurança da conta",
        heading: "Redefina sua senha",
        message: "Recebemos um pedido para criar uma nova senha para a sua conta na Área de Membros. O link vale por 1 hora.",
        button: { label: "Criar nova senha", url: link },
        note: "Se não foi você, pode ignorar este e-mail: sua senha continua a mesma.",
      });
      const sent = await sendEmail(key, { from: fromAddress(info), to: email, replyTo: info.email.replyTo, ...rendered });
      // Se o Resend recusar (ex: domínio não verificado), o portal usa o e-mail padrão do Supabase.
      if (!sent.ok) {
        console.error("recover email failed:", sent.error);
        return json({ ok: true, fallback: true });
      }
    }
  }
  // Resposta sempre igual para não revelar quem tem conta.
  return json({ ok: true });
}

async function createMember(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").slice(0, 120);
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
  if (!isEmail(email)) throw new HttpError(400, "E-mail inválido.");
  await grant(email, productIds, "manual");
  const account = await ensureAccount(email, name, body.password ? String(body.password) : undefined);
  if (!account.created) {
    // O produtor liberou este e-mail manualmente: a conta existente passa a valer.
    await admin.auth.admin.updateUserById(account.userId, { app_metadata: MEMBER_FLAG });
    if (name) await admin.from("member_profiles").update({ full_name: name }).eq("user_id", account.userId);
  }
  let emailed = false;
  let emailError = "";
  if (body.sendEmail) {
    const [{ key }, info] = await Promise.all([resendKey(), portalInfo()]);
    if (!key) emailError = "Resend não configurado";
    else {
      const { data: rows } = productIds.length ? await admin.from("member_products").select("id, title").in("id", productIds) : { data: [] };
      const sent = await sendWelcome(key, info, { email, name }, (rows || []).map((r) => String(r.title)), {
        password: account.created ? account.password : undefined,
      });
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
  const { error } = await admin.auth.admin.updateUserById(userId, { password, app_metadata: MEMBER_FLAG });
  if (error) throw new HttpError(400, error.message);
  return json({ ok: true });
}

async function deleteMember(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const email = normalizeEmail(body.email);
  await admin.from("member_access").delete().eq("email", email);
  const userId = await findUserIdByEmail(email);
  if (userId) {
    const { data: isProducer } = await admin.from("member_admins").select("user_id").eq("user_id", userId).maybeSingle();
    if (!isProducer) await admin.auth.admin.deleteUser(userId);
  }
  return json({ ok: true });
}

// ── E-mail: conexão e teste (Studio) ────────────────────────────────
async function checkResendKey(key: string) {
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}`, "User-Agent": "gorgpresets-members/1.0" },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      const domains = (Array.isArray(body?.data) ? body.data : []).map((d: Record<string, unknown>) => ({ name: String(d.name || ""), status: String(d.status || "") }));
      return { check: "ok" as const, domains };
    }
    // Chave "Sending access": válida, mas não pode listar domínios.
    if (res.status === 401 && body?.name === "restricted_api_key") return { check: "send_only" as const, domains: null };
    return { check: "invalid" as const, domains: null };
  } catch {
    return { check: "unreachable" as const, domains: null };
  }
}

const keyHint = (key: string) => (key ? `${key.slice(0, 3)}…${key.slice(-4)}` : null);

async function emailStatus(req: Request) {
  await requireProducer(req);
  const { key, source } = await resendKey();
  if (!key) return json({ configured: false, source: null, hint: null, keyCheck: null, domains: null });
  const result = await checkResendKey(key);
  return json({ configured: true, source, hint: keyHint(key), keyCheck: result.check, domains: result.domains });
}

async function emailSaveKey(req: Request, body: Record<string, unknown>) {
  await requireProducer(req);
  const key = String(body.key || "").trim();
  if (!key) {
    await admin.from("member_private_settings").delete().eq("key", "resend_api_key");
    return emailStatus(req);
  }
  if (!/^re_[A-Za-z0-9_-]{8,}$/.test(key)) throw new HttpError(400, "Essa não parece uma chave do Resend. Ela começa com “re_”.");
  const result = await checkResendKey(key);
  if (result.check === "invalid") throw new HttpError(400, "O Resend recusou essa chave. Confira se copiou a chave inteira.");
  const { error } = await admin
    .from("member_private_settings")
    .upsert({ key: "resend_api_key", value: key, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new HttpError(500, error.message);
  return emailStatus(req);
}

async function emailTest(req: Request, body: Record<string, unknown>) {
  const producer = await requireProducer(req);
  const to = normalizeEmail(body.to) || producer.email;
  if (!isEmail(to)) throw new HttpError(400, "Informe um e-mail válido para o teste.");
  const { key } = await resendKey();
  if (!key) throw new HttpError(400, "Conecte o Resend primeiro (cole a chave da API).");
  const info = await portalInfo();
  const draft = body.settings && typeof body.settings === "object" ? (body.settings as Partial<EmailSettings>) : {};
  const settings: EmailSettings = { ...info.email, ...draft };
  const { data: sample } = await admin.from("member_products").select("title").eq("published", true).order("sort_order").limit(2);
  const products = (sample || []).map((p) => String(p.title));
  const sent = await sendWelcome(key, info, { email: to, name: producer.name || "Ana Julia" }, products.length ? products : ["Coleção de exemplo"], {
    password: body.existingAccount ? undefined : "Exemplo-7Kq2",
    settings,
  });
  if (!sent.ok) throw new HttpError(400, `Não foi possível enviar: ${sent.error}.`);
  return json({ ok: true, to, products: joinList(products) });
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
      case "create_member":
        return await createMember(req, body);
      case "set_password":
        return await setPassword(req, body);
      case "delete_member":
        return await deleteMember(req, body);
      case "email_status":
        return await emailStatus(req);
      case "email_save_key":
        return await emailSaveKey(req, body);
      case "email_test":
        return await emailTest(req, body);
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

