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
  /** A conta nova terá de criar uma senha própria no primeiro acesso (troca obrigatória). */
  mustChangePassword?: boolean;
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
/** Todas as variáveis conhecidas, sem as chaves. */
const KNOWN_KEYS = new Set(EMAIL_VARIABLES.map((v) => v.key.slice(1, -1)));

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

/** #rrggbb (aceita #rgb); qualquer outra coisa vira a cor padrão. */
const safeColor = (value?: string) => {
  const color = str(value).trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(color)) return color;
  if (/^#[0-9a-f]{3}$/.test(color)) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  return "#d82828";
};

/** Só http(s), com domínio, sem espaços, controles nem "usuário@" antes do domínio (golpe clássico). */
const safeUrl = (value?: string) => {
  const url = str(value).trim();
  return /^https?:\/\/[^\s/?#\\@]+(?:[/?#]\S*)?$/i.test(url) && !/[\u0000-\u001f\u007f-\u009f]/.test(url) ? url : "";
};

/** Controles e caracteres invisíveis de direção/largura zero (mantém ZWJ/ZWNJ, usados nos emojis). */
const INVISIBLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u0084\u0086-\u009f\u00ad\u200b\u200e\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;

/** Uma linha só (sem CR/LF, controles nem caracteres invisíveis), com limite de tamanho. */
function oneLine(value: unknown, max = 200): string {
  const text = str(value)
    .replace(/[\t\n\r\u0085\u2028\u2029]+/g, " ")
    .replace(INVISIBLE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : text;
}

const PARTICLES = new Set(["da", "das", "de", "do", "dos", "e", "di", "du", "del", "van", "von"]);

/**
 * Nome todo em maiúsculas ou minúsculas ganha iniciais maiúsculas ("ANA DA SILVA" → "Ana da Silva").
 * Nome sem letras (".", "-") ou que é um e-mail (checkout que repete o e-mail no nome) conta como vazio.
 */
function prettyName(name: string): string {
  const clean = oneLine(name, 120);
  if (!/\p{L}/u.test(clean) || /^\S+@\S+\.\S+$/.test(clean)) return "";
  const titled =
    clean !== clean.toUpperCase() && clean !== clean.toLowerCase()
      ? clean
      : clean
          .toLowerCase()
          .split(" ")
          .map((word, i) => (i > 0 && PARTICLES.has(word) ? word : word.replace(/(^|[-'’])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase())))
          .join(" ");
  // "ana Julia" → "Ana Julia": nome não começa com minúscula.
  return titled.replace(/^\p{Ll}/u, (ch) => ch.toUpperCase());
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
  const raw = oneLine(value, 40);
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && !digits.startsWith("55")) return raw;
  const local = (digits.length === 12 || digits.length === 13) && digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

const productList = (ctx: EmailContext) => (Array.isArray(ctx.products) ? ctx.products : []).map((p) => oneLine(p)).filter(Boolean);

/** Só conta como senha se tiver algo além de espaços. */
const hasPassword = (ctx: EmailContext) => str(ctx.password).trim() !== "";

// ── Variáveis ───────────────────────────────────────────────────────
function variableValues(ctx: EmailContext, kind: TemplateKind): Record<string, string> {
  const name = prettyName(ctx.name);
  return {
    nome: name,
    primeiro_nome: firstName(name),
    email: oneLine(ctx.email, 254),
    telefone: formatPhone(ctx.phone),
    produtos: joinList(productList(ctx)),
    pedido: oneLine(ctx.orderId, 80),
    // No reembolso não existe senha para mostrar.
    senha: kind === "refund" ? "" : hasPassword(ctx) ? str(ctx.password) : "a senha que você já usa",
    link: safeUrl(ctx.link),
    suporte: safeUrl(ctx.supportUrl),
    marca: oneLine(ctx.brand, 80),
  };
}

/** "{{ nome }}", "{ Nome }" e "{NOME}" viram "{nome}" (só as variáveis conhecidas; o resto fica igual). */
function normalizeVariables(text: string): string {
  return str(text).replace(/\{\{[ \t]*(\w+)[ \t]*\}\}|\{[ \t]*(\w+)[ \t]*\}/g, (match, a?: string, b?: string) => {
    const key = (a ?? b ?? "").toLowerCase();
    return KNOWN_KEYS.has(key) ? `{${key}}` : match;
  });
}

/**
 * Troca as variáveis. Sem `blocks` (texto): valores puros e os blocos somem.
 * Com `blocks` (HTML): valores escapados e blocos prontos inseridos.
 * Sem nome, some também a vírgula ou o espaço em volta dele.
 */
function fill(text: string, ctx: EmailContext, kind: TemplateKind, blocks: Record<string, string> | null, opts: { subject?: boolean } = {}): string {
  let out = normalizeVariables(text);
  if (!prettyName(ctx.name)) {
    out = out
      // "Olá, {nome}!" → "Olá!"
      .replace(/,[ \t]*\{(?:primeiro_nome|nome)\}/g, "")
      // "Oi {nome}!" e "Oi {nome}" no fim da linha → "Oi!" e "Oi"
      .replace(/(^|[^ \t])[ \t]+\{(?:primeiro_nome|nome)\}(?=[,.!?;:<]|[ \t]*$)/gm, "$1")
      // "{primeiro_nome}, seu acesso chegou" → "Seu acesso chegou"
      .replace(/(^|>)([ \t]*)\{(?:primeiro_nome|nome)\}[ \t]*[,;:]?[ \t]*(\p{Ll})?/gmu, (_m, pre: string, indent: string, ch?: string) => pre + indent + (ch ? ch.toUpperCase() : ""));
  }
  const values = variableValues(ctx, kind);
  // A senha nunca vai no assunto: ele aparece em notificações e na lista de e-mails.
  if (opts.subject) values.senha = "";
  out = out.replace(/\{(\w+)\}/g, (match, key: string) => {
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
const stripBlocks = (text: string) => normalizeVariables(text).replace(/\{(\w+)\}/g, (match, key: string) => (BLOCK_KEYS.has(key) ? "" : match));

// ── Peças do layout ─────────────────────────────────────────────────
const font = (size: number, weight: number, lineHeight: number, color: string, extra = "") =>
  `font-family:${FONT};font-size:${size}px;font-weight:${weight};line-height:${lineHeight};color:${color};${extra}`;

const PARAGRAPH = `margin:16px 0 0;${font(16, 400, 1.62, "#424245")}`;
const SIGNATURE = `margin:0 0 10px;${font(14, 500, 1.55, "#1d1d1f")}`;
const SMALL_PRINT = `margin:14px 0 0;${font(11, 400, 1.6, "#a1a1a6")}`;
const BOX_LABEL = font(10, 700, 1, "#86868b", "letter-spacing:0.24em;text-transform:uppercase;");

/** Espaço vertical que funciona até no Outlook (que ignora margin em tabelas). */
const spacer = (px: number) => `<div style="height:${px}px;line-height:${px}px;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</div>`;

/** Texto com parágrafos (linha em branco) e quebras simples (Enter). Aceita CRLF. */
function paragraphs(text: string, style: string): string {
  return str(text)
    .replace(/\r\n?/g, "\n")
    .split(/\n(?:[ \t]*\n)+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="${style}">${escapeHtml(p).replace(/[ \t]*\n[ \t]*/g, "<br>")}</p>`)
    .join("\n");
}

function logoHtml(brand: string, logoUrl?: string): string {
  const logo = safeUrl(logoUrl);
  const name = escapeHtml(oneLine(brand, 80));
  if (!logo) return `<span style="${font(17, 800, 1, "#1d1d1f", "letter-spacing:-0.02em;text-transform:uppercase;")}">${name}</span>`;
  // Fundo igual ao da página: some no modo claro. No modo escuro forçado (Gmail, Outlook) o
  // degradê não é invertido, então o logo escuro continua visível. O alt tem o estilo do
  // logo em texto para quando as imagens estão bloqueadas.
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:6px 12px;border-radius:14px;background-color:#f5f5f7;background-image:linear-gradient(#f5f5f7,#f5f5f7);">
<img src="${escapeHtml(logo)}" width="104" alt="${name}" style="display:block;width:104px;max-width:104px;height:auto;border:0;outline:none;text-decoration:none;${font(17, 800, 1.2, "#1d1d1f")}">
</td></tr></table>`;
}

function buttonHtml(label: string, url?: string): string {
  const href = safeUrl(url);
  if (!href) return "";
  const link = escapeHtml(href);
  // mso-padding-alt: o Outlook ignora padding no <a>, então a célula ganha o espaço.
  return `${spacer(32)}<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#1d1d1f" style="border-radius:999px;background-color:#1d1d1f;mso-padding-alt:17px 32px;">
<a href="${link}" target="_blank" style="display:inline-block;padding:17px 32px;border-radius:999px;${font(13, 700, 1, "#ffffff", "letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;")}">${escapeHtml(label)}</a>
</td></tr></table>
<p style="margin:18px 0 0;${font(12, 400, 1.6, "#86868b")}">Se o botão não abrir, copie e cole no navegador:<br><a href="${link}" target="_blank" style="color:#1d1d1f;text-decoration:underline;word-break:break-all;">${link}</a></p>`;
}

/** Caixa com as coleções: "Liberado para você" (welcome) ou "Acesso encerrado" (refund). */
function productsHtml(kind: TemplateKind, ctx: EmailContext, accent: string): string {
  const list = productList(ctx);
  if (!list.length) return "";
  const welcome = kind === "welcome";
  const orderId = oneLine(ctx.orderId, 80);
  const rows = list
    .map(
      (p) =>
        `<div style="margin-top:12px;${font(15, 700, 1.3, welcome ? "#1d1d1f" : "#424245", "letter-spacing:-0.01em;")}"><span aria-hidden="true" style="color:${welcome ? accent : "#a1a1a6"};">${welcome ? "&#10003;" : "&#215;"}</span>&nbsp;&nbsp;${escapeHtml(p)}</div>`,
    )
    .join("\n");
  return `${spacer(28)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f7" style="background-color:#f5f5f7;border-radius:18px;">
<tr><td style="padding:20px 22px 18px;">
<div style="${BOX_LABEL}">${welcome ? "Liberado para você" : "Acesso encerrado"}</div>
${rows}${!welcome && orderId ? `\n<div style="margin-top:14px;${font(12, 400, 1.5, "#86868b")}">Pedido ${escapeHtml(orderId)}</div>` : ""}
</td></tr></table>`;
}

const PASSWORD_NOTE = (ctx: EmailContext) =>
  ctx.mustChangePassword ? "No primeiro acesso, você vai criar uma senha só sua." : "Você pode trocar a senha quando quiser em “Meu perfil”.";

/** Dados de acesso do welcome: senha provisória (conta nova) ou lembrete da senha atual. */
function accessHtml(ctx: EmailContext): string {
  const email = escapeHtml(oneLine(ctx.email, 254));
  if (!hasPassword(ctx)) {
    return `<p style="margin:20px 0 0;${font(14, 400, 1.6, "#6e6e73")}">Entre com <strong style="color:#1d1d1f;">${email}</strong> e a senha que você já usa. Esqueceu? Toque em “Esqueci minha senha” na tela de entrada.</p>`;
  }
  return `${spacer(14)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e8ed;border-radius:18px;">
<tr><td style="padding:20px 22px;">
<div style="${BOX_LABEL}">Seus dados de acesso</div>
<div style="margin-top:14px;${font(14, 400, 1.5, "#6e6e73")}">E-mail</div>
<div style="${font(16, 600, 1.4, "#1d1d1f", "word-break:break-all;")}">${email}</div>
<div style="margin-top:12px;${font(14, 400, 1.5, "#6e6e73")}">Senha provisória</div>
<div class="mono" style="font-family:${MONO};font-size:18px;font-weight:700;line-height:1.4;color:#1d1d1f;letter-spacing:0.06em;word-break:break-all;">${escapeHtml(str(ctx.password))}</div>
<div style="margin-top:12px;${font(12, 400, 1.5, "#86868b")}">${PASSWORD_NOTE(ctx)}</div>
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

/** Caracteres invisíveis depois do pré-cabeçalho: a lista de e-mails não puxa o resto do texto. */
const PREHEADER_FILLER = "&#8199;&#65279;&#847;".repeat(30);

/**
 * Layout claro, no estilo Apple: cartão branco sobre cinza, tipografia firme e um botão.
 * Só tabelas e estilos inline; a tabela fantasma [if mso] segura os 560px no Outlook,
 * que ignora max-width.
 */
function frame(f: Frame): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${f.title}</title>
<!--[if mso]><style>table,td,div,p,a,span,h1{font-family:Arial,Helvetica,sans-serif !important;}.mono{font-family:Consolas,'Courier New',monospace !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;-webkit-font-smoothing:antialiased;word-spacing:normal;">
<!-- Pré-cabeçalho (aparece só na lista de e-mails) -->
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${f.preheader}${PREHEADER_FILLER}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f7" style="background-color:#f5f5f7;">
<tr><td align="center" style="padding:40px 14px 48px;">
<!--[if mso]><table role="presentation" align="center" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<!-- Logo -->
<tr><td align="center" style="padding:0 0 26px;">
${f.logo}
</td></tr>
<!-- Cartão -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:28px;padding:44px 36px 40px;">
<div style="${font(11, 700, 1, f.accent, "letter-spacing:0.26em;text-transform:uppercase;")}"><span aria-hidden="true" style="display:inline-block;width:22px;height:2px;background-color:${f.accent};border-radius:2px;vertical-align:middle;margin-right:10px;"></span>${f.eyebrow}</div>
<h1 style="margin:18px 0 0;${font(30, 700, 1.12, "#1d1d1f", "letter-spacing:-0.03em;")}">${f.heading}</h1>
${f.body}
${f.button}
</td></tr>
<!-- Assinatura e rodapé -->
<tr><td align="center" style="padding:28px 20px 0;text-align:center;">${f.footer}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
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
  // O título da página repete o assunto, então também não leva a senha.
  const title = stripBlocks(t.subject.trim() ? t.subject : FALLBACK_SUBJECT[kind]).replace(/\{senha\}/g, "");
  return frame({
    title: escapeHtml(oneLine(title)),
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
      // CRLF (colado do Windows ou vindo da API) vira \n nos textos; o HTML fica como veio.
      if (typeof value === "string") out[key] = key === "html" ? value : value.replace(/\r\n?/g, "\n");
    }
    if (src.mode === "visual" || src.mode === "html") out.mode = src.mode;
  }
  return out;
}

const LEGACY_KEYS = ["enabled", "subject", "heading", "message", "buttonLabel", "signature"];

/**
 * Junta o que veio do banco com o padrão. Aceita o formato antigo plano
 * ({enabled, subject, heading...}), que vira o modelo "welcome", e JSON em texto.
 * Tipos errados são ignorados.
 */
export function mergeEmailSettings(raw: unknown): EmailSettings {
  let input = raw;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      input = null;
    }
  }
  const d = isObj(input) ? input : {};
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

/** HTML do produtor sem <html>/<head>/<body> ganha o esqueleto mínimo (UTF-8 e celular). */
function wrapDocument(html: string, subject: string): string {
  if (/<(?:html|head|body)[\s>]/i.test(html)) return html;
  const body = html.replace(/^\s*<!doctype[^>]*>\s*/i, "");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;">
${body}
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
  const subjectOf = (text: string) => oneLine(fill(text, ctx, k, null, { subject: true }));

  // Assunto vazio (ou só variáveis vazias) usa o padrão; sem marca, um padrão sem ela.
  const fallbackSubject = oneLine(ctx.brand) ? FALLBACK_SUBJECT[k] : FALLBACK_HEADING[k];
  const subjectSource = subjectOf(t.subject) ? t.subject : fallbackSubject;
  const subject = subjectOf(subjectSource) || FALLBACK_HEADING[k];
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
          hasPassword(ctx)
            ? `Seus dados de acesso\nE-mail: ${values.email}\nSenha provisória: ${str(ctx.password)}\n(${PASSWORD_NOTE(ctx)})`
            : `Entre com ${values.email} e a senha que você já usa. Esqueceu? Toque em “Esqueci minha senha” na tela de entrada.`,
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
  const url = safeUrl(parts.button?.url);
  const label = oneLine(parts.button?.label, 80);
  const html = frame({
    title: escapeHtml(subject),
    preheader: escapeHtml(oneLine(parts.message, 300)),
    logo: logoHtml(parts.brand, parts.logoUrl),
    accent: safeColor(parts.accent),
    eyebrow: escapeHtml(oneLine(parts.eyebrow)),
    heading: escapeHtml(oneLine(parts.heading, 300)),
    body: paragraphs(parts.message, PARAGRAPH),
    button: buttonHtml(label, url),
    footer: parts.note ? paragraphs(parts.note, `margin:0;${font(11, 400, 1.6, "#a1a1a6")}`) : "",
  });
  // Link fora de http(s) não vai nem no HTML nem no texto.
  const text = joinLines([oneLine(parts.heading, 300), "", str(parts.message).replace(/\r\n?/g, "\n").trim(), "", url ? `${label}: ${url}` : "", parts.note ? `\n${str(parts.note).trim()}` : ""]);
  return { subject, html, text };
}

// ── HTML → texto puro ───────────────────────────────────────────────
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
  ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·", laquo: "«", raquo: "»",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", sbquo: "‚", bdquo: "„",
  copy: "©", reg: "®", trade: "™", euro: "€", deg: "°", times: "×", divide: "÷",
  ordf: "ª", ordm: "º", iexcl: "¡", iquest: "¿", check: "✓", shy: "", zwj: "\u200d", zwnj: "",
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

/** Atributos de uma etiqueta, respeitando aspas (um ">" dentro de alt="..." não fecha a etiqueta). */
const ATTRS = String.raw`(?:[^<>"']|"[^"]*"|'[^']*')*`;
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** Valor de um atributo (sem confundir href com data-href). */
function attrValue(attrs: string, name: string): string | null {
  const m = new RegExp(String.raw`(?:^|[\s"'/])${name}\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+))`, "i").exec(attrs);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}

const isHiddenTag = (attrs: string) =>
  /display\s*:\s*none/i.test(attrValue(attrs, "style") || "") || /(?:^|\s)hidden(?=[\s=/]|$)/i.test(attrs.replace(/"[^"]*"|'[^']*'/g, '""'));

/** Tira os elementos escondidos (display:none, hidden) com tudo o que têm dentro, inclusive aninhados. */
function dropHidden(html: string): string {
  const open = new RegExp(String.raw`<([a-z][a-z0-9]*)\b(${ATTRS})>`, "gi");
  let out = "";
  let last = 0;
  for (let m = open.exec(html); m; m = open.exec(html)) {
    if (!isHiddenTag(m[2])) continue;
    const name = m[1].toLowerCase();
    let end = open.lastIndex;
    if (!VOID_TAGS.has(name)) {
      const pair = new RegExp(String.raw`<(\/?)${name}\b${ATTRS}>`, "gi");
      pair.lastIndex = end;
      let depth = 1;
      for (let p = pair.exec(html); p; p = pair.exec(html)) {
        depth += p[1] ? -1 : 1;
        if (!depth) {
          end = pair.lastIndex;
          break;
        }
      }
      // Sem fechamento: tira só a etiqueta (melhor sobrar texto do que sumir tudo).
    }
    out += html.slice(last, m.index);
    last = end;
    open.lastIndex = end;
  }
  return out + html.slice(last);
}

/** Protege o texto já pronto de ser decodificado de novo. */
const encodeBasic = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Só o que é etiqueta de verdade: "compras < R$ 50" e "a <3 b" continuam no texto. */
const TAG_RE = new RegExp(String.raw`<\/?[a-z][a-z0-9-]*${ATTRS}>|<![^<>]*>|<\?[^<>]*>`, "gi");
const stripTags = (html: string) => html.replace(TAG_RE, "");
const tags = (names: string, closing = true) => new RegExp(String.raw`<${closing ? "\\/?" : ""}(?:${names})\b${ATTRS}>`, "gi");

/**
 * Uma sequência de marcas vira uma ou duas quebras de linha, como o navegador mostraria:
 * <br> no fim de um bloco não soma linha; <br> sozinho num bloco é uma linha vazia.
 */
function lineBreaks(run: string): string {
  const marks = run.replace(/[ \t]/g, "");
  if (marks.includes("\u0002")) return "\n\n";
  let lines = marks.includes("\u0001") ? 1 : 0;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i] === "\u0003" && !(i === 0 && marks[1] === "\u0001")) lines++;
  }
  return lines >= 2 ? "\n\n" : "\n";
}

/** Texto puro legível a partir do HTML: quebras nos blocos e links como "texto (url)". */
export function htmlToText(html: string): string {
  // Marcas internas: \u0001 = quebra de linha (div, tr, li), \u0002 = parágrafo (p, h1, table), \u0003 = <br>.
  let s = str(html)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script|title|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, "");
  s = dropHidden(s).replace(/\s+/g, " ");

  // Imagens viram o texto alternativo (antes dos links: um logo com link vira "Marca (url)").
  s = s.replace(new RegExp(String.raw`<img\b(${ATTRS})>`, "gi"), (_m, attrs: string) => {
    const alt = (attrValue(attrs, "alt") || "").trim();
    return alt ? ` ${alt.replace(/</g, "&lt;").replace(/>/g, "&gt;")} ` : " ";
  });

  s = s.replace(new RegExp(String.raw`<a\b(${ATTRS})>((?:(?!<a\b)[\s\S])*?)<\/a\s*>`, "gi"), (_m, attrs: string, inner: string) => {
    const label = decodeEntities(stripTags(inner)).replace(/\s+/g, " ").trim();
    const url = decodeEntities(attrValue(attrs, "href") || "").trim();
    if (!url || url.startsWith("#") || /^javascript:/i.test(url)) return encodeBasic(label);
    const shown = url.replace(/^(mailto|tel):/i, "");
    const same = (a: string) => a.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
    if (!label || same(label) === same(shown)) return encodeBasic(label || shown);
    return `${encodeBasic(label)} (${encodeBasic(shown)})`;
  });

  s = s
    .replace(tags("br", false), "\u0003")
    .replace(tags("hr", false), "\u0002")
    .replace(tags("li", false), "\u0001• ")
    .replace(tags("p|h[1-6]|table|ul|ol|blockquote|pre|dl"), "\u0002")
    .replace(tags("div|tr|li|section|article|header|footer|nav|main|aside|figure|figcaption|address|center|dd|dt|tbody|thead|tfoot"), "\u0001")
    .replace(/<\/t[dh]\s*>/gi, " ");

  return decodeEntities(stripTags(s))
    .replace(/[\u200b\u200c\u2060\ufeff\u034f\u00ad]/g, "")
    .replace(/[\u00a0\u2000-\u200a\u202f]/g, " ")
    .replace(/[ \t]*[\u0001-\u0003][\u0001-\u0003 \t]*/g, lineBreaks)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
