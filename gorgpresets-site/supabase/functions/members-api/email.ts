// Modelos de e-mail da Área de Membros.
//
// Arquivo sem dependências: a Edge Function usa para enviar e o Studio usa para
// mostrar a prévia ao vivo — o que o produtor vê é exatamente o que o cliente recebe.
//
// Dois e-mails editáveis: "welcome" (acesso liberado após a compra aprovada) e
// "refund" (acesso retirado após reembolso/chargeback). Cada um pode ser editado
// no modo visual (campos no layout padrão) ou no modo código (HTML completo).

export type TemplateKind = "welcome" | "refund";

export interface EmailTemplate {
  /** Envia este e-mail automaticamente. */
  enabled: boolean;
  subject: string;
  heading: string;
  message: string;
  buttonLabel: string;
  signature: string;
  /** "visual": campos acima no layout padrão. "html": o HTML abaixo, escrito pelo produtor. */
  mode: "visual" | "html";
  html: string;
}

export interface EmailSettings {
  provider: "smtp" | "resend";
  fromName: string;
  /** No Resend, precisa ser de um domínio verificado (ex: acesso@gorgpresets.site). */
  fromEmail: string;
  replyTo: string;
  /** Cópia oculta de todos os envios (opcional). */
  bcc: string;
  welcome: EmailTemplate;
  refund: EmailTemplate;
}

export const DEFAULT_EMAIL: EmailSettings = {
  provider: "smtp",
  fromName: "Gorg Presets",
  fromEmail: "",
  replyTo: "",
  bcc: "",
  welcome: {
    enabled: true,
    subject: "Seu acesso chegou, {primeiro_nome} ✨",
    heading: "Bem-vindo(a), {primeiro_nome}!",
    message:
      "Sua compra foi aprovada e os seus presets já estão liberados na Área de Membros.\n\nLá você baixa os arquivos e assiste às aulas que mostram, passo a passo, como instalar e usar no celular e no computador.",
    buttonLabel: "Acessar minha área",
    signature: "Com carinho,\nEquipe {marca}",
    mode: "visual",
    html: "",
  },
  refund: {
    enabled: false,
    subject: "Seu acesso foi retirado, {primeiro_nome}",
    heading: "Reembolso processado",
    message:
      "Confirmamos o reembolso da sua compra e ele já foi concluído.\n\nCom isso, o seu acesso às coleções {produtos} na Área de Membros foi encerrado. Se ficou alguma dúvida ou se você acredita que houve um engano, é só falar com a gente: vamos te ajudar.",
    buttonLabel: "Falar com o suporte",
    signature: "Um abraço,\nEquipe {marca}",
    mode: "visual",
    html: "",
  },
};

/** Variáveis aceitas nos textos. As com html:true são só do modo código (blocos prontos). */
export const EMAIL_VARIABLES: Array<{ key: string; label: string; html?: boolean }> = [
  { key: "{primeiro_nome}", label: "Primeiro nome" },
  { key: "{nome}", label: "Nome completo" },
  { key: "{email}", label: "E-mail" },
  { key: "{telefone}", label: "Telefone" },
  { key: "{produtos}", label: "Coleções" },
  { key: "{pedido}", label: "Nº do pedido" },
  { key: "{senha}", label: "Senha provisória" },
  { key: "{link}", label: "Link da área" },
  { key: "{suporte}", label: "Link do suporte" },
  { key: "{marca}", label: "Sua marca" },
  { key: "{lista_produtos}", label: "Caixa das coleções", html: true },
  { key: "{bloco_acesso}", label: "Caixa de acesso", html: true },
  { key: "{botao}", label: "Botão", html: true },
  { key: "{logo}", label: "Logo", html: true },
  { key: "{cor}", label: "Cor de destaque", html: true },
];

export interface EmailContext {
  brand: string;
  name: string;
  email: string;
  products: string[];
  /** Link do login da área de membros. */
  link: string;
  /** Senha provisória (só quando a conta acabou de ser criada). */
  password?: string;
  phone?: string;
  orderId?: string;
  logoUrl?: string;
  accent?: string;
  /** Link do suporte (WhatsApp ou página): botão do e-mail de reembolso. */
  supportUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const FONT = "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,Menlo,Consolas,monospace";

const FALLBACK_SUBJECT: Record<TemplateKind, string> = {
  welcome: "Seu acesso à {marca} chegou",
  refund: "Seu acesso à {marca} foi encerrado",
};
const FALLBACK_HEADING: Record<TemplateKind, string> = { welcome: "Seu acesso chegou", refund: "Acesso encerrado" };
const FALLBACK_BUTTON: Record<TemplateKind, string> = { welcome: "Acessar minha área", refund: "Falar com o suporte" };

/** Variáveis que inserem blocos prontos (só no modo código). */
const BLOCK_KEYS = new Set(["lista_produtos", "bloco_acesso", "botao", "logo", "cor"]);

// ── Utilidades ──────────────────────────────────────────────────────
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export function escapeHtml(value: string): string {
  return str(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const safeColor = (value?: string) => {
  const color = str(value).trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#d82828";
};
const safeUrl = (value?: string) => {
  const url = str(value).trim();
  return /^https?:\/\/\S+$/i.test(url) ? url : "";
};

/** Uma linha só (sem CR/LF nem controles), com limite de tamanho. */
function oneLine(value: string, max = 200): string {
  const text = str(value)
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : text;
}

const PARTICLES = new Set(["da", "das", "de", "do", "dos", "e", "di", "du", "del", "van", "von"]);

/** Nome todo em maiúsculas ou minúsculas ganha iniciais maiúsculas ("ANA DA SILVA" → "Ana da Silva"). */
function prettyName(name: string): string {
  const clean = str(name).replace(/\s+/g, " ").trim();
  if (!/\p{L}/u.test(clean) || (clean !== clean.toUpperCase() && clean !== clean.toLowerCase())) return clean;
  return clean
    .toLowerCase()
    .split(" ")
    .map((word, i) => (i > 0 && PARTICLES.has(word) ? word : word.replace(/(^|[-'’])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase())))
    .join(" ");
}

export function firstName(name: string): string {
  return prettyName(name).split(" ")[0] || "";
}

/** "A", "A e B", "A, B e C". */
export function joinList(items: string[]): string {
  const list = (items || []).filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  return `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

/** 5511999998888 → (11) 99999-8888. Outros formatos ficam como vieram. */
function formatPhone(value?: string): string {
  const raw = str(value).trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && !digits.startsWith("55")) return raw;
  const local = (digits.length === 12 || digits.length === 13) && digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

const productList = (ctx: EmailContext) =>
  (Array.isArray(ctx.products) ? ctx.products : []).map((p) => str(p).replace(/\s+/g, " ").trim()).filter(Boolean);

// ── Variáveis ───────────────────────────────────────────────────────
function variableValues(ctx: EmailContext, kind: TemplateKind): Record<string, string> {
  const name = prettyName(ctx.name);
  return {
    nome: name,
    primeiro_nome: firstName(name),
    email: str(ctx.email).trim(),
    telefone: formatPhone(ctx.phone),
    produtos: joinList(productList(ctx)),
    pedido: str(ctx.orderId).trim(),
    // No reembolso não existe senha para mostrar.
    senha: kind === "refund" ? "" : str(ctx.password) || "a senha que você já usa",
    link: safeUrl(ctx.link),
    suporte: safeUrl(ctx.supportUrl),
    marca: str(ctx.brand).trim(),
  };
}

/**
 * Troca as variáveis. Sem `blocks` (texto): valores puros e os blocos somem.
 * Com `blocks` (HTML): valores escapados e blocos prontos inseridos.
 * Sem nome, some também a vírgula antes dele.
 */
function fill(text: string, ctx: EmailContext, kind: TemplateKind, blocks: Record<string, string> | null): string {
  let out = str(text);
  if (!prettyName(ctx.name)) {
    out = out.replace(/,\s*\{(primeiro_nome|nome)\}/gi, "").replace(/[ \t]+\{(primeiro_nome|nome)\}(?=[,.!?;:])/gi, "");
  }
  const values = variableValues(ctx, kind);
  out = out.replace(/\{(\w+)\}/g, (match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    if (BLOCK_KEYS.has(key)) return blocks && own(blocks, key) ? blocks[key] : "";
    if (!own(values, key)) return match;
    return blocks ? escapeHtml(values[key]) : values[key];
  });
  return blocks ? out : out.replace(/[ \t]{2,}/g, " ");
}

/** Troca as variáveis {nome}, {produtos}... Com html:true os valores saem escapados e os blocos prontos entram. */
export function fillVariables(text: string, ctx: EmailContext, opts: { html?: boolean; kind?: TemplateKind } = {}): string {
  const kind: TemplateKind = opts.kind === "refund" ? "refund" : "welcome";
  return fill(text, ctx, kind, opts.html ? buildBlocks(kind, ctx, FALLBACK_BUTTON[kind]) : null);
}

/** Tira as variáveis de bloco de um texto do modo visual. */
const stripBlocks = (text: string) => str(text).replace(/\{(\w+)\}/g, (match, key: string) => (BLOCK_KEYS.has(key.toLowerCase()) ? "" : match));

// ── Peças do layout ─────────────────────────────────────────────────
const font = (size: number, weight: number, lineHeight: number, color: string, extra = "") =>
  `font-family:${FONT};font-size:${size}px;font-weight:${weight};line-height:${lineHeight};color:${color};${extra}`;

const PARAGRAPH = `margin:16px 0 0;${font(16, 400, 1.62, "#424245")}`;
const SIGNATURE = `margin:0 0 10px;${font(14, 500, 1.55, "#1d1d1f")}`;
const SMALL_PRINT = `margin:14px 0 0;${font(11, 400, 1.6, "#a1a1a6")}`;
const BOX_LABEL = font(10, 700, 1, "#86868b", "letter-spacing:0.24em;text-transform:uppercase;");

function paragraphs(text: string, style: string): string {
  return str(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="${style}">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function logoHtml(brand: string, logoUrl?: string): string {
  const logo = safeUrl(logoUrl);
  const name = escapeHtml(str(brand).trim());
  return logo
    ? `<img src="${escapeHtml(logo)}" width="104" alt="${name}" style="display:block;margin:0 auto;width:104px;max-width:104px;height:auto;border:0;outline:none;">`
    : `<span style="${font(17, 800, 1, "#1d1d1f", "letter-spacing:-0.02em;text-transform:uppercase;")}">${name}</span>`;
}

function buttonHtml(label: string, url?: string): string {
  const href = safeUrl(url);
  if (!href) return "";
  const link = escapeHtml(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr>
<td align="center" style="border-radius:999px;background:#1d1d1f;">
<a href="${link}" target="_blank" style="display:inline-block;padding:17px 32px;border-radius:999px;${font(13, 700, 1, "#ffffff", "letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;")}">${escapeHtml(label)}</a>
</td></tr></table>
<p style="margin:18px 0 0;${font(12, 400, 1.6, "#86868b")}">Se o botão não abrir, copie e cole no navegador:<br><a href="${link}" style="color:#1d1d1f;text-decoration:underline;word-break:break-all;">${link}</a></p>`;
}

/** Caixa com as coleções: "Liberado para você" (welcome) ou "Acesso encerrado" (refund). */
function productsHtml(kind: TemplateKind, ctx: EmailContext, accent: string): string {
  const list = productList(ctx);
  if (!list.length) return "";
  const welcome = kind === "welcome";
  const orderId = str(ctx.orderId).trim();
  const rows = list
    .map(
      (p) =>
        `<div style="margin-top:12px;${font(15, 700, 1.3, welcome ? "#1d1d1f" : "#424245", "letter-spacing:-0.01em;")}"><span style="color:${welcome ? accent : "#a1a1a6"};">${welcome ? "&#10003;" : "&#215;"}</span>&nbsp;&nbsp;${escapeHtml(p)}</div>`,
    )
    .join("\n");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background:#f5f5f7;border-radius:18px;">
<tr><td style="padding:20px 22px 18px;">
<div style="${BOX_LABEL}">${welcome ? "Liberado para você" : "Acesso encerrado"}</div>
${rows}${!welcome && orderId ? `\n<div style="margin-top:14px;${font(12, 400, 1.5, "#86868b")}">Pedido ${escapeHtml(orderId)}</div>` : ""}
</td></tr></table>`;
}

/** Dados de acesso do welcome: senha provisória (conta nova) ou lembrete da senha atual. */
function accessHtml(ctx: EmailContext): string {
  const email = escapeHtml(str(ctx.email).trim());
  const password = str(ctx.password);
  if (!password) {
    return `<p style="margin:20px 0 0;${font(14, 400, 1.6, "#6e6e73")}">Entre com <strong style="color:#1d1d1f;">${email}</strong> e a senha que você já usa. Esqueceu? Toque em “Esqueci minha senha” na tela de entrada.</p>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border:1px solid #e8e8ed;border-radius:18px;">
<tr><td style="padding:20px 22px;">
<div style="${BOX_LABEL}">Seus dados de acesso</div>
<div style="margin-top:14px;${font(14, 400, 1.5, "#6e6e73")}">E-mail</div>
<div style="${font(16, 600, 1.4, "#1d1d1f", "word-break:break-all;")}">${email}</div>
<div style="margin-top:12px;${font(14, 400, 1.5, "#6e6e73")}">Senha provisória</div>
<div style="font-family:${MONO};font-size:18px;font-weight:700;line-height:1.4;color:#1d1d1f;letter-spacing:0.06em;">${escapeHtml(password)}</div>
<div style="margin-top:12px;${font(12, 400, 1.5, "#86868b")}">Você pode trocar a senha quando quiser em “Meu perfil”.</div>
</td></tr></table>`;
}

/** Blocos prontos ({lista_produtos}, {bloco_acesso}, {botao}, {logo}, {cor}): HTML já seguro. */
function buildBlocks(kind: TemplateKind, ctx: EmailContext, buttonLabel: string): Record<string, string> {
  const accent = safeColor(ctx.accent);
  return {
    cor: accent,
    logo: logoHtml(ctx.brand, ctx.logoUrl),
    lista_produtos: productsHtml(kind, ctx, accent),
    // Reembolso nunca mostra dados de acesso.
    bloco_acesso: kind === "welcome" ? accessHtml(ctx) : "",
    botao: buttonHtml(buttonLabel, kind === "refund" ? ctx.supportUrl : ctx.link),
  };
}

interface Frame {
  /** Tudo já em HTML seguro. */
  title: string;
  preheader: string;
  logo: string;
  accent: string;
  eyebrow: string;
  heading: string;
  body: string;
  button: string;
  footer: string;
}

/** Layout claro, no estilo Apple: cartão branco sobre cinza, tipografia firme e um botão. */
function frame(f: Frame): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${f.title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;-webkit-font-smoothing:antialiased;">
<!-- Pré-cabeçalho (aparece só na lista de e-mails) -->
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${f.preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
<tr><td align="center" style="padding:40px 14px 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<!-- Logo -->
<tr><td align="center" style="padding:0 0 26px;">
${f.logo}
</td></tr>
<!-- Cartão -->
<tr><td style="background:#ffffff;border-radius:28px;padding:44px 36px 40px;">
<div style="${font(11, 700, 1, f.accent, "letter-spacing:0.26em;text-transform:uppercase;")}"><span style="display:inline-block;width:22px;height:2px;background:${f.accent};border-radius:2px;vertical-align:middle;margin-right:10px;"></span>${f.eyebrow}</div>
<h1 style="margin:18px 0 0;${font(30, 700, 1.12, "#1d1d1f", "letter-spacing:-0.03em;")}">${f.heading}</h1>
${f.body}
${f.button}
</td></tr>
<!-- Assinatura e rodapé -->
<tr><td style="padding:28px 20px 0;text-align:center;">${f.footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Design padrão com as variáveis no lugar (ainda não preenchidas). Os textos do
 * produtor entram escapados; o resto vira bloco pronto ({botao}, {lista_produtos}...).
 */
function design(kind: TemplateKind, t: EmailTemplate, hasProducts = true): string {
  const welcome = kind === "welcome";
  const heading = stripBlocks(t.heading.trim() ? t.heading : FALLBACK_HEADING[kind]);
  return frame({
    title: escapeHtml(oneLine(stripBlocks(t.subject.trim() ? t.subject : FALLBACK_SUBJECT[kind]))),
    preheader: hasProducts ? (welcome ? "Liberado: {produtos}" : "Acesso encerrado: {produtos}") : escapeHtml(oneLine(heading)),
    logo: "{logo}",
    accent: "{cor}",
    eyebrow: welcome ? "Acesso liberado" : "Atualização do pedido",
    heading: escapeHtml(heading),
    body: [paragraphs(stripBlocks(t.message), PARAGRAPH), "{lista_produtos}", welcome ? "{bloco_acesso}" : ""].filter(Boolean).join("\n"),
    button: "{botao}",
    footer:
      paragraphs(stripBlocks(t.signature), SIGNATURE) +
      `<p style="${SMALL_PRINT}">${welcome ? "Você recebeu este e-mail porque fez uma compra na {marca}." : "Você recebeu este e-mail porque houve uma atualização em um pedido seu na {marca}."}</p>`,
  });
}

function mergeTemplate(base: EmailTemplate, ...sources: unknown[]): EmailTemplate {
  const out: EmailTemplate = { ...base };
  for (const src of sources) {
    if (!isObj(src)) continue;
    if (typeof src.enabled === "boolean") out.enabled = src.enabled;
    for (const key of ["subject", "heading", "message", "buttonLabel", "signature", "html"] as const) {
      const value = src[key];
      if (typeof value === "string") out[key] = value;
    }
    if (src.mode === "visual" || src.mode === "html") out.mode = src.mode;
  }
  return out;
}

const LEGACY_KEYS = ["enabled", "subject", "heading", "message", "buttonLabel", "signature"];

/**
 * Junta o que veio do banco com o padrão. Aceita o formato antigo plano
 * ({enabled, subject, heading...}), que vira o modelo "welcome". Tipos errados são ignorados.
 */
export function mergeEmailSettings(raw: unknown): EmailSettings {
  const d = isObj(raw) ? raw : {};
  const legacy = !isObj(d.welcome) && !isObj(d.refund) && LEGACY_KEYS.some((key) => own(d, key));
  const text = (key: "fromName" | "fromEmail" | "replyTo" | "bcc") => (typeof d[key] === "string" ? (d[key] as string) : DEFAULT_EMAIL[key]);
  return {
    // O formato antigo só enviava pelo Resend: mantém o envio funcionando.
    provider: d.provider === "smtp" || d.provider === "resend" ? d.provider : legacy ? "resend" : DEFAULT_EMAIL.provider,
    fromName: text("fromName"),
    fromEmail: text("fromEmail"),
    replyTo: text("replyTo"),
    bcc: text("bcc"),
    welcome: mergeTemplate(DEFAULT_EMAIL.welcome, legacy ? d : null, d.welcome),
    refund: mergeTemplate(DEFAULT_EMAIL.refund, d.refund),
  };
}

/** HTML do modo visual com as variáveis no lugar: ponto de partida para editar no modo código. */
export function templateToHtml(kind: TemplateKind, template: EmailTemplate): string {
  const k: TemplateKind = kind === "refund" ? "refund" : "welcome";
  return design(k, mergeTemplate(DEFAULT_EMAIL[k], template)).replace(
    /(<body[^>]*>\n)/,
    "$1<!-- Modo código: edite à vontade. As variáveis entre chaves são trocadas no envio (lista_produtos, bloco_acesso e botao viram blocos prontos). -->\n",
  );
}

/** HTML do produtor sem <html>/<body> ganha o esqueleto mínimo (UTF-8 e celular). */
function wrapDocument(html: string, subject: string): string {
  if (/<html[\s>]|<body[\s>]/i.test(html)) return html;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;">
${html}
</body>
</html>`;
}

/** Junta as linhas do texto puro sem linhas em branco repetidas. */
const joinLines = (lines: string[]) =>
  lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Monta o e-mail final (assunto, HTML e texto puro) de um dos modelos. */
export function renderEmail(kind: TemplateKind, template: EmailTemplate, ctx: EmailContext): RenderedEmail {
  const k: TemplateKind = kind === "refund" ? "refund" : "welcome";
  const t = mergeTemplate(DEFAULT_EMAIL[k], template);
  const plain = (text: string) => fill(text, ctx, k, null);

  const subjectSource = oneLine(plain(t.subject)) ? t.subject : FALLBACK_SUBJECT[k];
  const subject = oneLine(plain(subjectSource)) || FALLBACK_HEADING[k];
  const buttonLabel = oneLine(plain(t.buttonLabel), 80) || FALLBACK_BUTTON[k];
  const blocks = buildBlocks(k, ctx, buttonLabel);

  // Modo código: o HTML do produtor como está, só com as variáveis trocadas.
  if (t.mode === "html" && t.html.trim()) {
    const html = wrapDocument(fill(t.html, ctx, k, blocks), subject);
    return { subject, html, text: htmlToText(html) };
  }

  // Modo visual: o design padrão com os textos do produtor (sempre escapados).
  const heading = plain(t.heading).trim() ? t.heading : FALLBACK_HEADING[k];
  const products = productList(ctx);
  const html = fill(design(k, { ...t, subject: subjectSource, heading }, products.length > 0), ctx, k, blocks).replace(/<p style="[^"]*">\s*<\/p>\n?/g, "");

  const values = variableValues(ctx, k);
  const message = plain(t.message).trim();
  const signature = plain(t.signature).trim();
  const lines =
    k === "welcome"
      ? [
          oneLine(plain(heading), 300),
          "",
          message,
          "",
          products.length ? `Liberado para você: ${joinList(products)}` : "",
          "",
          ctx.password
            ? `Seus dados de acesso\nE-mail: ${values.email}\nSenha provisória: ${str(ctx.password)}\n(Você pode trocar a senha em “Meu perfil”.)`
            : `Entre com ${values.email} e a senha que você já usa.`,
          "",
          values.link ? `${buttonLabel}: ${values.link}` : "",
          "",
          signature,
        ]
      : [
          oneLine(plain(heading), 300),
          "",
          message,
          "",
          products.length ? `Acesso encerrado: ${joinList(products)}` : "",
          values.pedido ? `Pedido: ${values.pedido}` : "",
          "",
          values.suporte ? `${buttonLabel}: ${values.suporte}` : "",
          "",
          signature,
        ];
  return { subject, html, text: joinLines(lines) };
}

/** E-mails curtos do sistema (ex: redefinir senha), com o mesmo visual. */
export function renderNoticeEmail(parts: {
  brand: string;
  logoUrl?: string;
  accent?: string;
  eyebrow: string;
  heading: string;
  message: string;
  button: { label: string; url: string };
  note?: string;
}): RenderedEmail {
  const subject = oneLine(parts.heading) || oneLine(parts.brand) || "Aviso";
  const html = frame({
    title: escapeHtml(subject),
    preheader: escapeHtml(oneLine(parts.message, 300)),
    logo: logoHtml(parts.brand, parts.logoUrl),
    accent: safeColor(parts.accent),
    eyebrow: escapeHtml(parts.eyebrow),
    heading: escapeHtml(parts.heading),
    body: paragraphs(parts.message, PARAGRAPH),
    button: buttonHtml(parts.button.label, parts.button.url),
    footer: parts.note ? `<p style="margin:0;${font(11, 400, 1.6, "#a1a1a6")}">${escapeHtml(parts.note)}</p>` : "",
  });
  const text = joinLines([parts.heading, "", parts.message, "", `${parts.button.label}: ${parts.button.url}`, parts.note ? `\n${parts.note}` : ""]);
  return { subject, html, text };
}

// ── HTML → texto puro ───────────────────────────────────────────────
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
  ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·", laquo: "«", raquo: "»",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", sbquo: "‚", bdquo: "„",
  copy: "©", reg: "®", trade: "™", euro: "€", deg: "°", times: "×", divide: "÷",
  ordf: "ª", ordm: "º", iexcl: "¡", iquest: "¿", check: "✓", shy: "", zwj: "", zwnj: "",
};
const MARKS: Record<string, string> = { acute: "\u0301", grave: "\u0300", circ: "\u0302", tilde: "\u0303", uml: "\u0308", cedil: "\u0327", ring: "\u030a" };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      if (n < 0x20 || n === 0x7f) return n === 9 || n === 10 ? " " : "";
      return n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : match;
    }
    if (own(ENTITIES, code)) return ENTITIES[code];
    // á, Ç, õ...: letra + acento.
    const accented = /^([a-z])(acute|grave|circ|tilde|uml|cedil|ring)$/i.exec(code);
    return accented && own(MARKS, accented[2]) ? (accented[1] + MARKS[accented[2]]).normalize("NFC") : match;
  });
}

/** Protege o texto já pronto de ser decodificado de novo. */
const encodeBasic = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stripTags = (html: string) => html.replace(/<[^>]*>/g, "");

const HIDDEN_STYLE = String.raw`style\s*=\s*(?:"[^"]*display\s*:\s*none[^"]*"|'[^']*display\s*:\s*none[^']*')`;

/** Texto puro legível a partir do HTML: quebras nos blocos e links como "texto (url)". */
export function htmlToText(html: string): string {
  // Marcas internas: \u0001 = quebra de linha (div, tr, li), \u0002 = parágrafo (p, h1, table).
  let s = str(html)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script|title|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(new RegExp(String.raw`<(div|span|p|table|td|tr)\b[^>]*${HIDDEN_STYLE}[^>]*>[\s\S]*?<\/\1\s*>`, "gi"), "")
    .replace(/\s+/g, " ");

  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (_m, attrs: string, inner: string) => {
    const label = decodeEntities(stripTags(inner)).replace(/\s+/g, " ").trim();
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const url = decodeEntities((href && (href[1] ?? href[2] ?? href[3])) || "").trim();
    if (!url || url.startsWith("#") || /^javascript:/i.test(url)) return encodeBasic(label);
    const shown = url.replace(/^(mailto|tel):/i, "");
    const same = (a: string) => a.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
    if (!label || same(label) === same(shown)) return encodeBasic(label || shown);
    return `${encodeBasic(label)} (${encodeBasic(shown)})`;
  });

  s = s
    .replace(/<img\b[^>]*?\balt\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi, (_m, a?: string, b?: string) => ` ${a ?? b ?? ""} `)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\b[^>]*>/gi, "\u0002")
    .replace(/<li\b[^>]*>/gi, "\u0001• ")
    .replace(/<\/?(p|h[1-6]|table|ul|ol|blockquote|pre)\b[^>]*>/gi, "\u0002")
    .replace(/<\/?(div|tr|li|section|article|header|footer|center|dd|dt|tbody|thead)\b[^>]*>/gi, "\u0001")
    .replace(/<\/t[dh]\s*>/gi, " ");

  return decodeEntities(stripTags(s))
    .replace(/[\u200b-\u200d\u2060\ufeff\u034f\u00ad]/g, "")
    .replace(/[\u00a0\u2000-\u200a\u202f]/g, " ")
    .replace(/[ \t]*[\u0001\u0002][\u0001\u0002 \t]*/g, (run) => (run.includes("\u0002") ? "\n\n" : "\n"))
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
