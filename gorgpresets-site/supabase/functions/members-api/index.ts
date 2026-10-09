// GORG · Área de Membros — Edge Function "members-api"
//
// Ações (POST, corpo JSON com { action }):
//   webhook        → ?action=webhook&token=...  Recebe a venda aprovada do checkout
//                    (GGCheckout, BuckPay, Kiwify, Hotmart, Cakto...) e libera o acesso.
//   first_access   → Comprador cria a própria senha (só se tiver compra e ainda não tiver conta).
//   recover        → Envia link de redefinição de senha pelo Resend (se configurado).
//   create_member  → [produtor] Cria conta + libera produtos.
//   set_password   → [produtor] Define nova senha para um membro.
//   delete_member  → [produtor] Remove acessos e a conta do membro.
//
// Token do webhook: gerado no banco (member_private_settings) e exibido no
// Studio → Integrações. MEMBERS_WEBHOOK_TOKEN (secret) substitui, se existir.
//
// Segredos opcionais (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY         opcional — envia e-mail de boas-vindas e de recuperação
//   MEMBERS_EMAIL_FROM     opcional — ex: "Gorg Presets <acesso@gorgpresets.site>"
//   MEMBERS_PORTAL_URL     opcional — ex: "https://gorgpresets.site/membros"
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem por padrão.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ENV_WEBHOOK_TOKEN = Deno.env.get("MEMBERS_WEBHOOK_TOKEN") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const EMAIL_FROM = Deno.env.get("MEMBERS_EMAIL_FROM") || "Gorg Presets <onboarding@resend.dev>";
const PORTAL_URL = Deno.env.get("MEMBERS_PORTAL_URL") || "https://gorgpresets.site/membros";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  return res.ok;
}

function emailLayout(title: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#000;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;color:#f5f5f7">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px"><tr><td align="center">
  <table width="100%" style="max-width:520px;background:#0d0d0f;border:1px solid #222;border-radius:24px;padding:40px">
  <tr><td style="font-size:12px;letter-spacing:.3em;color:#d82828;font-weight:700;text-transform:uppercase">Gorg Presets</td></tr>
  <tr><td style="padding-top:16px;font-size:26px;font-weight:700;letter-spacing:-.02em">${title}</td></tr>
  <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#a1a1a6">${body}</td></tr>
  ${cta ? `<tr><td style="padding-top:28px"><a href="${cta.url}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding:16px 28px;border-radius:999px">${cta.label}</a></td></tr>` : ""}
  </table></td></tr></table></body></html>`;
}

async function sendWelcome(email: string, name: string, password?: string) {
  const greeting = name ? `Olá, ${name.split(" ")[0]}!` : "Olá!";
  const credentials = password
    ? `<br><br><strong style="color:#fff">E-mail:</strong> ${email}<br><strong style="color:#fff">Senha:</strong> ${password}<br><br>Você pode trocar a senha depois em “Meu perfil”.`
    : "<br><br>Entre com o mesmo e-mail da compra.";
  return sendEmail(
    email,
    "Seu acesso à Área de Membros chegou ✨",
    emailLayout(greeting, `Sua compra foi aprovada e sua coleção já está liberada na Área de Membros Gorg.${credentials}`, {
      label: "Acessar agora",
      url: PORTAL_URL,
    }),
  );
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
  const refunded = statusValues.some((v) => /(refund|reembols|chargeback|estorn|cancel|dispute)/.test(v));
  const approved = !refunded && statusValues.some((v) => /(approved|aprovad|paid|pago|complete|succeeded|confirmed)/.test(v) && !negative.test(v));

  const productRefs = new Set<string>();
  flat
    .filter((f) => /(product|produto|offer|oferta|plan|plano|item|sku|course)/.test(f.path) && /(id|code|codigo|hash|uuid|name|nome|title|titulo|sku|slug)/.test(f.key))
    .forEach((f) => f.value.trim() && productRefs.add(f.value.trim().toLowerCase()));

  const orderRef = flat.find((f) => /^(order_?id|transaction(_?id)?|sale_?id|payment_?id|purchase_?id)$/.test(f.key))?.value;
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

async function handleWebhook(req: Request, url: URL) {
  const expected = await webhookToken();
  if (!expected || !safeEqual(url.searchParams.get("token") || "", expected)) {
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

  await grant(sale.email, products.map((p) => p.id), "webhook", sale.orderRef);

  // Com e-mail configurado, já cria a conta e envia login + senha.
  // Sem e-mail, o comprador usa "Primeiro acesso" para criar a própria senha.
  let note = "";
  if (RESEND_API_KEY) {
    const account = await ensureAccount(sale.email, sale.name);
    const sent = await sendWelcome(sale.email, sale.name, account.created ? account.password : undefined);
    note = sent ? " · e-mail enviado" : " · falha ao enviar e-mail";
  }
  await logWebhook("granted", `Acesso liberado: ${products.map((p) => p.title).join(", ")}${note}`, sale.email, payload);
  return json({ ok: true, granted: products.length });
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
  if (!RESEND_API_KEY) return json({ ok: true, fallback: true });
  if (isEmail(email) && (await findUserIdByEmail(email))) {
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    const link = data?.properties?.action_link;
    if (link) {
      await sendEmail(
        email,
        "Redefina sua senha",
        emailLayout("Redefinir senha", "Recebemos um pedido para redefinir a senha da sua conta. O link vale por 1 hora.", { label: "Criar nova senha", url: link }),
      );
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
  if (body.sendEmail) emailed = await sendWelcome(email, name, account.created ? account.password : undefined);
  return json({ ok: true, createdAccount: account.created, password: account.created ? account.password : undefined, emailed });
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

