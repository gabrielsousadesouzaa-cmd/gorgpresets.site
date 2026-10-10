// Automação do checkout no modo demonstração: mesmo fluxo da Edge Function
// (aprende produtos, libera/retira acesso, cria conta, registra e-mails),
// mas tudo no navegador e sem enviar nada de verdade.
import { mergeEmailSettings, renderEmail, renderNoticeEmail, type TemplateKind } from "../../../supabase/functions/members-api/email";
import { documentPassword, mergeAutomation } from "../../../supabase/functions/members-api/automation";
import { parseSale } from "../../../supabase/functions/members-api/sale";
import type { CheckoutItem, EmailLog, EmailProviderStatus, EmailTemplate, Grant, PortalSettings, Product, SmtpInput, WebhookLog, WebhookLogItem } from "./types";
import { generatePassword, uid } from "./format";

export interface DemoMember {
  email: string;
  name: string;
  password: string;
  createdAt: string;
  lastSeenAt: string | null;
  phone?: string;
  document?: string;
  blocked?: boolean;
  mustChangePassword?: boolean;
}

export type DemoEmailLog = EmailLog & { html: string };

export interface DemoAutomationState {
  settings: PortalSettings;
  products: Product[];
  members: DemoMember[];
  grants: Grant[];
  checkoutItems: CheckoutItem[];
  webhookLogs: WebhookLog[];
  emailLogs: DemoEmailLog[];
  emailProvider: { smtp?: SmtpInput & { password: string }; resendKey?: string };
  fixedPassword?: string;
}

const PORTAL = typeof window !== "undefined" ? `${window.location.origin}/membros` : "https://gorgpresets.site/membros";
const LOGO = typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "https://gorgpresets.site/logo.png";
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ── Envio (simulado) ────────────────────────────────────────────────
export function demoProviderStatus(state: DemoAutomationState): EmailProviderStatus {
  const email = mergeEmailSettings(state.settings.email);
  const smtp = state.emailProvider.smtp;
  const key = state.emailProvider.resendKey || "";
  return {
    provider: email.provider,
    ready: demoReady(state),
    from: { name: email.fromName || state.settings.brandName, email: email.fromEmail || smtp?.username || "onboarding@resend.dev" },
    smtp: smtp
      ? { configured: true, host: smtp.host, port: smtp.port, security: smtp.security, username: smtp.username, hasPassword: !!smtp.password }
      : { configured: false, host: "", port: 465, security: "ssl", username: "", hasPassword: false },
    resend: key
      ? { configured: true, source: "studio", hint: `${key.slice(0, 3)}…${key.slice(-4)}`, keyCheck: "ok", domains: [{ name: "gorgpresets.site", status: "verified" }] }
      : { configured: false, source: null, hint: null, keyCheck: null, domains: null },
  };
}

export function demoReady(state: DemoAutomationState): boolean {
  const email = mergeEmailSettings(state.settings.email);
  if (email.provider === "smtp") return !!state.emailProvider.smtp?.password;
  return !!state.emailProvider.resendKey && isEmail(email.fromEmail);
}

export function demoDeliver(
  state: DemoAutomationState,
  mail: { kind: string; to: string; subject: string; html: string; webhookLogId?: string | null; meta?: Record<string, unknown> },
): DemoEmailLog {
  const ready = demoReady(state);
  const provider = mergeEmailSettings(state.settings.email).provider;
  const log: DemoEmailLog = {
    id: uid(),
    createdAt: new Date().toISOString(),
    kind: mail.kind,
    to: mail.to,
    subject: mail.subject,
    status: ready ? "sent" : "failed",
    provider,
    error: ready ? "" : provider === "smtp" ? "SMTP não configurado (servidor, usuário e senha)" : "Resend sem chave ou sem e-mail do remetente",
    messageId: ready ? `demo-${uid().slice(0, 8)}` : "",
    webhookLogId: mail.webhookLogId || null,
    meta: { ...(mail.meta || {}), demo: true },
    html: mail.html,
  };
  state.emailLogs.unshift(log);
  return log;
}

export function demoRender(state: DemoAutomationState, kind: TemplateKind, template: EmailTemplate, to: { email: string; name: string; phone?: string }, products: string[], password?: string, orderId?: string) {
  const whatsapp = state.settings.support.whatsapp.replace(/\D/g, "");
  return renderEmail(kind, template, {
    brand: state.settings.brandName,
    name: to.name,
    email: to.email,
    phone: to.phone || "",
    products,
    link: `${PORTAL}/entrar?email=${encodeURIComponent(to.email)}`,
    password,
    mustChangePassword: !!password && mergeAutomation(state.settings.automation).forcePasswordChange,
    orderId,
    logoUrl: LOGO,
    accent: state.settings.accentColor,
    supportUrl: whatsapp ? `https://wa.me/${whatsapp}` : `${PORTAL}/suporte`,
  });
}

export function demoNotice(state: DemoAutomationState, to: string) {
  return renderNoticeEmail({
    brand: state.settings.brandName,
    logoUrl: LOGO,
    accent: state.settings.accentColor,
    eyebrow: "Segurança da conta",
    heading: "Redefina sua senha",
    message: "Recebemos um pedido para criar uma nova senha para a sua conta na Área de Membros. O link vale por 1 hora.",
    button: { label: "Criar nova senha", url: `${PORTAL}/entrar?email=${encodeURIComponent(to)}` },
    note: "Se não foi você, pode ignorar este e-mail: sua senha continua a mesma.",
  });
}

// ── Venda (mesmo fluxo da Edge Function) ────────────────────────────
export function processDemoSale(state: DemoAutomationState, payload: unknown, opts: { replayOf?: string; simulated?: boolean } = {}): { ok: boolean; result: Record<string, unknown> } {
  const now = new Date().toISOString();
  const sale = parseSale(payload);
  const automation = mergeAutomation(state.settings.automation);
  const emailSettings = mergeEmailSettings(state.settings.email);

  // Aprende os produtos do checkout.
  sale.items.forEach((item) => {
    const key = item.id.trim().toLowerCase();
    const row = state.checkoutItems.find((c) => c.externalId.trim().toLowerCase() === key);
    const count = sale.approved && !sale.refunded && !opts.replayOf && !opts.simulated ? 1 : 0;
    if (row) {
      if (item.title) row.title = item.title;
      if (sale.platform) row.platform = sale.platform;
      row.lastSeenAt = now;
      row.salesCount += count;
    } else {
      // Mesmo nome de uma coleção: já entra ligado (igual ao servidor).
      const sameName = item.title.trim() ? state.products.filter((p) => p.title.trim().toLowerCase() === item.title.trim().toLowerCase()).map((p) => p.id) : [];
      state.checkoutItems.unshift({ id: uid(), externalId: item.id, title: item.title, platform: sale.platform, productIds: sameName, ignored: false, email: null, salesCount: count, lastSeenAt: now, createdAt: now });
    }
  });

  const base: WebhookLog = {
    id: uid(),
    receivedAt: now,
    status: "",
    message: "",
    email: sale.email,
    payload,
    event: sale.event,
    platform: sale.platform,
    orderId: sale.orderId,
    buyerName: sale.name,
    buyerPhone: sale.phone,
    buyerDocument: sale.document,
    amount: sale.amount,
    paymentMethod: sale.paymentMethod,
    items: [],
    productIds: [],
    emailStatus: "",
    emailLogId: null,
    replayOf: opts.replayOf || null,
  };
  const finish = (patch: Partial<WebhookLog>, result: Record<string, unknown>) => {
    state.webhookLogs.unshift({ ...base, ...patch });
    return { ok: true, result };
  };

  if (!automation.enabled) return finish({ status: "paused", message: "Automação pausada: a venda foi registrada, mas nada foi alterado." }, { ignored: "paused" });
  if (!sale.email) return finish({ status: "ignored", message: "E-mail do comprador não encontrado no payload." }, { ignored: "no-email" });

  const existing = new Set(state.products.map((p) => p.id));
  const ids = new Set<string>();
  let override: EmailTemplate | null = null;
  const items: WebhookLogItem[] = sale.items.map((item) => {
    const key = item.id.trim().toLowerCase();
    const row = state.checkoutItems.find((c) => c.externalId.trim().toLowerCase() === key);
    const legacy = state.products.filter((p) => p.externalIds.some((x) => x.trim().toLowerCase() === key)).map((p) => p.id);
    const collections = row?.ignored ? [] : Array.from(new Set([...(row?.productIds || []).filter((id) => existing.has(id)), ...legacy]));
    collections.forEach((id) => ids.add(id));
    if (!override && collections.length && row?.email?.enabled) override = row.email;
    return { id: item.id, title: item.title, type: item.type, matched: collections.length > 0, ignored: !!row?.ignored, collections };
  });
  // Checkouts que não mandam a lista de produtos: casa por id/título/slug.
  const refs = new Set(sale.productRefs);
  if (!items.length)
    state.products
      .filter((p) => p.externalIds.some((x) => refs.has(x.trim().toLowerCase())) || refs.has(p.title.toLowerCase()) || refs.has(p.slug.toLowerCase()))
      .forEach((p) => ids.add(p.id));
  const productIds = Array.from(ids);
  const title = (id: string) => state.products.find((p) => p.id === id)?.title || "Coleção";
  const logged = { items, productIds };

  if (!productIds.length) {
    const pending = items.filter((i) => !i.ignored).map((i) => i.title || i.id);
    return finish({ ...logged, status: "unmatched", message: pending.length ? `Produto sem coleção ligada: ${pending.slice(0, 4).join(", ")}` : "Nenhuma coleção corresponde a esta venda." }, { ignored: "no-product" });
  }

  if (sale.refunded) {
    const allowed = sale.chargeback ? automation.revokeOnChargeback : automation.revokeOnRefund;
    if (!allowed) return finish({ ...logged, status: "ignored", message: `${sale.chargeback ? "Chargeback" : "Reembolso"} recebido, mas a retirada automática está desligada.` }, { ignored: "revoke-disabled" });
    const removed = state.grants.filter((g) => g.email === sale.email && productIds.includes(g.productId) && g.source === "webhook").map((g) => g.productId);
    state.grants = state.grants.filter((g) => !(g.email === sale.email && removed.includes(g.productId) && g.source === "webhook"));
    const patch: Partial<WebhookLog> = {
      ...logged,
      productIds: removed.length ? removed : productIds,
      status: "revoked",
      message: removed.length ? `Acesso retirado (${sale.chargeback ? "chargeback" : "reembolso"}): ${removed.map(title).join(", ")}` : "Reembolso recebido: não havia acesso liberado por venda para retirar.",
    };
    if (removed.length && emailSettings.refund.enabled) {
      const rendered = demoRender(state, "refund", emailSettings.refund, { email: sale.email, name: sale.name, phone: sale.phone }, removed.map(title), undefined, sale.orderId);
      const log = demoDeliver(state, { kind: "refund", to: sale.email, subject: rendered.subject, html: rendered.html, webhookLogId: base.id });
      patch.emailStatus = log.status;
      patch.emailLogId = log.id;
    }
    return finish(patch, { revoked: removed.length });
  }

  if (!sale.approved) return finish({ ...logged, status: "ignored", message: `Pagamento ainda não aprovado (${sale.event || sale.statusValues.join(", ") || "sem status"}).` }, { ignored: "status" });
  if (!automation.grantOnApproved) return finish({ ...logged, status: "ignored", message: "Venda aprovada, mas a liberação automática está desligada." }, { ignored: "grant-disabled" });

  const fresh = productIds.filter((id) => !state.grants.some((g) => g.email === sale.email && g.productId === id));
  fresh.forEach((productId) => state.grants.push({ id: uid(), email: sale.email, productId, source: "webhook", createdAt: now, expiresAt: null }));
  if (!fresh.length) {
    return finish({ ...logged, status: "granted", emailStatus: "skipped", message: `Acesso liberado: ${productIds.map(title).join(", ")} · já tinha acesso (sem e-mail novo)` }, { granted: 0 });
  }
  const names = fresh.map(title);
  const policyPassword = automation.passwordMode === "fixed" ? state.fixedPassword || "" : automation.passwordMode === "cpf" ? documentPassword(sale.document) : "";
  const template = (override as EmailTemplate | null) || emailSettings.welcome;
  const wantsEmail = template.enabled && demoReady(state);

  if (!wantsEmail && !policyPassword) {
    return finish({ ...logged, status: "granted", emailStatus: "skipped", message: `Acesso liberado: ${names.join(", ")} · ${template.enabled ? "e-mail não configurado" : "e-mail de boas-vindas desligado"} (o comprador entra pelo “Primeiro acesso”)` }, { granted: fresh.length });
  }

  let member = state.members.find((m) => m.email === sale.email);
  let password: string | undefined;
  if (!member) {
    password = policyPassword || generatePassword();
    member = { email: sale.email, name: sale.name, password, createdAt: now, lastSeenAt: null, phone: sale.phone, document: sale.document, mustChangePassword: automation.forcePasswordChange };
    state.members.push(member);
  } else {
    if (!member.phone && sale.phone) member.phone = sale.phone;
    if (!member.document && sale.document) member.document = sale.document;
  }

  if (!wantsEmail) {
    return finish({ ...logged, status: "granted", emailStatus: "skipped", message: `Acesso liberado: ${names.join(", ")} · ${password ? "conta criada com a senha padrão" : "conta já existia"} (sem e-mail)` }, { granted: fresh.length });
  }
  const rendered = demoRender(state, "welcome", template, { email: sale.email, name: sale.name, phone: sale.phone }, names, password, sale.orderId);
  const log = demoDeliver(state, { kind: "welcome", to: sale.email, subject: rendered.subject, html: rendered.html, webhookLogId: base.id, meta: { products: names, accountCreated: !!password } });
  return finish(
    {
      ...logged,
      status: "granted",
      emailStatus: log.status,
      emailLogId: log.id,
      message: log.status === "sent" ? `Acesso liberado: ${names.join(", ")} · ${password ? "conta criada e " : ""}e-mail enviado` : `Acesso liberado · e-mail não enviado: ${log.error}`,
    },
    { granted: fresh.length },
  );
}

/** Payload no formato do GGCheckout (usado nos exemplos e na venda de teste). */
export function ggPayload(o: { event: string; status: string; name: string; email: string; phone?: string; document?: string; orderId?: string; amount?: number; items: Array<{ id: string; title: string; type?: string }> }) {
  return {
    event: o.event,
    createdAt: new Date().toISOString(),
    customer: { name: o.name, email: o.email, document: o.document || "", phone: o.phone || "", ip: "200.0.0.1" },
    payment: { id: o.orderId || `gg-${uid().slice(0, 8)}`, method: o.event, paymentMethod: o.event.startsWith("card") ? "credit_card" : "pix", gateway: "pagouai", status: o.status, amount: o.amount ?? 19.9 },
    product: o.items[0] ? { ...o.items[0], type: o.items[0].type || "main" } : undefined,
    products: o.items.map((i, n) => ({ ...i, type: i.type || (n === 0 ? "main" : "orderbump") })),
    webhook: { id: "wh_demo", businessId: "biz_demo", events: ["pix.paid", "card.paid", "pix.refunded", "card.refunded"] },
    utm_source: "instagram",
  };
}

/** Dados de exemplo: produtos aprendidos, vendas e e-mails. */
export function seedDemoAutomation(state: DemoAutomationState) {
  const day = 86400000;
  const at = (ms: number) => new Date(Date.now() - ms).toISOString();
  state.checkoutItems = [
    { id: uid(), externalId: "p3vR1xeKMz9xYJSB4WSF", title: "FEED AESTHETIC", platform: "ggcheckout", productIds: ["p-feed"], ignored: false, email: null, salesCount: 31, lastSeenAt: at(2 * 3600_000), createdAt: at(40 * day) },
    { id: uid(), externalId: "gAW1Y7y6Pfq7w604nzmD", title: "MINIMALIST", platform: "ggcheckout", productIds: ["p-minimalist"], ignored: false, email: null, salesCount: 12, lastSeenAt: at(day), createdAt: at(40 * day) },
    { id: uid(), externalId: "CuXcJvheSCNOWap03S4b", title: "SILENT LUXURY", platform: "ggcheckout", productIds: ["p-silent"], ignored: false, email: null, salesCount: 18, lastSeenAt: at(3 * day), createdAt: at(35 * day) },
    { id: uid(), externalId: "LPvwer84jBXwsMf71RMr", title: "CARRINHO GORGPRESETS", platform: "ggcheckout", productIds: [], ignored: true, email: null, salesCount: 44, lastSeenAt: at(2 * 3600_000), createdAt: at(40 * day) },
    { id: uid(), externalId: "Tv3peoL9jcNlshW8ssS6", title: "AJUSTES EXPRESS", platform: "ggcheckout", productIds: [], ignored: false, email: null, salesCount: 3, lastSeenAt: at(30 * 60_000), createdAt: at(30 * 60_000) },
  ];
  state.webhookLogs = [];
  state.emailLogs = [];
  // Vendas de exemplo processadas pelo mesmo fluxo (com o envio "configurado" só durante o exemplo).
  const provider = state.emailProvider;
  state.emailProvider = { smtp: { host: "smtp.hostinger.com", port: 465, security: "ssl", username: "suporte@gorgpresets.com", password: "demo" } };
  const run = (payload: unknown, ago: number) => {
    processDemoSale(state, payload, { simulated: true });
    state.webhookLogs[0].receivedAt = at(ago);
    const email = state.emailLogs.find((l) => l.id === state.webhookLogs[0].emailLogId);
    if (email) email.createdAt = at(ago - 4000);
  };
  run(ggPayload({ event: "pix.generated", status: "pending", name: "Lucas Ferreira", email: "lucas@exemplo.com", phone: "5521988887777", document: "11122233344", orderId: "gg-71003", amount: 19.9, items: [{ id: "Tv3peoL9jcNlshW8ssS6", title: "AJUSTES EXPRESS" }] }), 50 * 60_000);
  run(ggPayload({ event: "pix.paid", status: "paid", name: "Lucas Ferreira", email: "lucas@exemplo.com", phone: "5521988887777", document: "11122233344", orderId: "gg-71003", amount: 19.9, items: [{ id: "Tv3peoL9jcNlshW8ssS6", title: "AJUSTES EXPRESS" }] }), 30 * 60_000);
  run(ggPayload({ event: "pix.paid", status: "paid", name: "Bruna Costa", email: "bruna.costa@exemplo.com", phone: "5511977776666", document: "22233344455", orderId: "gg-70988", amount: 39.8, items: [{ id: "LPvwer84jBXwsMf71RMr", title: "CARRINHO GORGPRESETS" }, { id: "p3vR1xeKMz9xYJSB4WSF", title: "FEED AESTHETIC" }] }), 2 * 3600_000);
  run(ggPayload({ event: "card.paid", status: "paid", name: "Marina Alves", email: "marina@exemplo.com", phone: "5531966665555", document: "33344455566", orderId: "gg-70901", amount: 19.9, items: [{ id: "gAW1Y7y6Pfq7w604nzmD", title: "MINIMALIST" }] }), day);
  run(ggPayload({ event: "card.refunded", status: "refunded", name: "Marina Alves", email: "marina@exemplo.com", orderId: "gg-70901", amount: 19.9, items: [{ id: "gAW1Y7y6Pfq7w604nzmD", title: "MINIMALIST" }] }), day / 2);
  state.emailProvider = provider;
  // Um envio que falhou, para mostrar como o erro aparece.
  const failed = state.emailLogs.find((l) => l.kind === "welcome");
  if (failed) {
    state.emailLogs.push({ ...failed, id: uid(), to: "joao.silva@exemplo.com", status: "failed", error: "usuário ou senha do SMTP recusados pelo servidor (535)", messageId: "", createdAt: at(3 * day), webhookLogId: null });
  }
  state.webhookLogs.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  state.emailLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export { isEmail as isDemoEmail };
