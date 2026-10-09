// Modelos de e-mail da Área de Membros.
//
// Arquivo sem dependências: a Edge Function usa para enviar e o Studio usa para
// mostrar a prévia ao vivo — o que o produtor vê é exatamente o que o cliente recebe.

export interface EmailSettings {
  /** Envia o e-mail automaticamente a cada compra aprovada. */
  enabled: boolean;
  fromName: string;
  /** Precisa ser de um domínio verificado no Resend (ex: acesso@gorgpresets.site). */
  fromEmail: string;
  replyTo: string;
  subject: string;
  heading: string;
  message: string;
  buttonLabel: string;
  signature: string;
}

export const DEFAULT_EMAIL: EmailSettings = {
  enabled: true,
  fromName: "Gorg Presets",
  fromEmail: "",
  replyTo: "",
  subject: "Seu acesso chegou, {primeiro_nome} ✨",
  heading: "Bem-vindo(a), {primeiro_nome}!",
  message:
    "Sua compra foi aprovada e os seus presets já estão liberados na Área de Membros.\n\nLá você baixa os arquivos e assiste às aulas que mostram, passo a passo, como instalar e usar no celular e no computador.",
  buttonLabel: "Acessar minha área",
  signature: "Com carinho,\nEquipe {marca}",
};

export const EMAIL_VARIABLES: Array<{ key: string; label: string }> = [
  { key: "{primeiro_nome}", label: "Primeiro nome" },
  { key: "{nome}", label: "Nome completo" },
  { key: "{email}", label: "E-mail" },
  { key: "{produtos}", label: "Coleções compradas" },
  { key: "{link}", label: "Link da área" },
  { key: "{marca}", label: "Sua marca" },
];

export interface WelcomeContext {
  brand: string;
  name: string;
  email: string;
  products: string[];
  /** Link do login da área de membros. */
  link: string;
  /** Senha provisória (só quando a conta acabou de ser criada). */
  password?: string;
  logoUrl?: string;
  accent?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const FONT = "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,Menlo,Consolas,monospace";

export function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const safeColor = (value?: string) => (value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#d82828");
const safeUrl = (value?: string) => (value && /^https?:\/\//i.test(value) ? value : "");

export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

/** "A", "A e B", "A, B e C". */
export function joinList(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  return `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

/** Troca as variáveis {nome}, {produtos}... Sem nome, some também a vírgula antes dele. */
export function fillVariables(text: string, ctx: WelcomeContext): string {
  let out = String(text || "");
  if (!ctx.name.trim()) out = out.replace(/,\s*\{(primeiro_nome|nome)\}/g, "");
  const values: Record<string, string> = {
    nome: ctx.name.trim(),
    primeiro_nome: firstName(ctx.name),
    email: ctx.email,
    produtos: joinList(ctx.products),
    link: ctx.link,
    marca: ctx.brand,
  };
  return out.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match)).replace(/[ \t]{2,}/g, " ");
}

function paragraphs(text: string, style: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="${style}">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const font = (size: number, weight: number, lineHeight: number, color: string, extra = "") =>
  `font-family:${FONT};font-size:${size}px;font-weight:${weight};line-height:${lineHeight};color:${color};${extra}`;

interface LayoutParts {
  brand: string;
  logoUrl?: string;
  accent?: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  bodyHtml: string;
  button?: { label: string; url: string };
  footerHtml: string;
  title: string;
}

/** Layout claro, no estilo Apple: cartão branco sobre cinza, tipografia firme e um botão. */
function layout(parts: LayoutParts): string {
  const accent = safeColor(parts.accent);
  const logo = safeUrl(parts.logoUrl);
  const buttonUrl = safeUrl(parts.button?.url);
  const brand = escapeHtml(parts.brand);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(parts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(parts.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
<tr><td align="center" style="padding:40px 14px 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td align="center" style="padding:0 0 26px;">
${
  logo
    ? `<img src="${escapeHtml(logo)}" width="104" alt="${brand}" style="display:block;width:104px;max-width:104px;height:auto;border:0;outline:none;">`
    : `<span style="${font(17, 800, 1, "#1d1d1f", "letter-spacing:-0.02em;text-transform:uppercase;")}">${brand}</span>`
}
</td></tr>
<tr><td style="background:#ffffff;border-radius:28px;padding:44px 36px 40px;">
<div style="${font(11, 700, 1, accent, "letter-spacing:0.26em;text-transform:uppercase;")}"><span style="display:inline-block;width:22px;height:2px;background:${accent};border-radius:2px;vertical-align:middle;margin-right:10px;"></span>${escapeHtml(parts.eyebrow)}</div>
<h1 style="margin:18px 0 0;${font(30, 700, 1.12, "#1d1d1f", "letter-spacing:-0.03em;")}">${escapeHtml(parts.heading)}</h1>
${parts.bodyHtml}
${
  parts.button && buttonUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr>
<td align="center" style="border-radius:999px;background:#1d1d1f;">
<a href="${escapeHtml(buttonUrl)}" target="_blank" style="display:inline-block;padding:17px 32px;border-radius:999px;${font(13, 700, 1, "#ffffff", "letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;")}">${escapeHtml(parts.button.label)}</a>
</td></tr></table>
<p style="margin:18px 0 0;${font(12, 400, 1.6, "#86868b")}">Se o botão não abrir, copie e cole no navegador:<br><a href="${escapeHtml(buttonUrl)}" style="color:#1d1d1f;text-decoration:underline;word-break:break-all;">${escapeHtml(buttonUrl)}</a></p>`
    : ""
}
</td></tr>
<tr><td style="padding:28px 20px 0;text-align:center;">${parts.footerHtml}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** E-mail de boas-vindas enviado a cada compra aprovada. */
export function renderWelcomeEmail(settings: EmailSettings, ctx: WelcomeContext): RenderedEmail {
  const accent = safeColor(ctx.accent);
  const fill = (text: string) => fillVariables(text, ctx);
  const subject = fill(settings.subject).trim() || `Seu acesso à ${ctx.brand} chegou`;
  const heading = fill(settings.heading).trim() || "Seu acesso chegou";
  const message = fill(settings.message);
  const signature = fill(settings.signature);
  const buttonLabel = fill(settings.buttonLabel).trim() || "Acessar minha área";
  const paragraph = `margin:16px 0 0;${font(16, 400, 1.62, "#424245")}`;

  const productsHtml = ctx.products.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background:#f5f5f7;border-radius:18px;">
<tr><td style="padding:20px 22px 18px;">
<div style="${font(10, 700, 1, "#86868b", "letter-spacing:0.24em;text-transform:uppercase;")}">Liberado para você</div>
${ctx.products
  .map(
    (p) =>
      `<div style="margin-top:12px;${font(15, 700, 1.3, "#1d1d1f", "letter-spacing:-0.01em;")}"><span style="color:${accent};">&#10003;</span>&nbsp;&nbsp;${escapeHtml(p)}</div>`,
  )
  .join("")}
</td></tr></table>`
    : "";

  const accessHtml = ctx.password
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border:1px solid #e8e8ed;border-radius:18px;">
<tr><td style="padding:20px 22px;">
<div style="${font(10, 700, 1, "#86868b", "letter-spacing:0.24em;text-transform:uppercase;")}">Seus dados de acesso</div>
<div style="margin-top:14px;${font(14, 400, 1.5, "#6e6e73")}">E-mail</div>
<div style="${font(16, 600, 1.4, "#1d1d1f", "word-break:break-all;")}">${escapeHtml(ctx.email)}</div>
<div style="margin-top:12px;${font(14, 400, 1.5, "#6e6e73")}">Senha provisória</div>
<div style="font-family:${MONO};font-size:18px;font-weight:700;line-height:1.4;color:#1d1d1f;letter-spacing:0.06em;">${escapeHtml(ctx.password)}</div>
<div style="margin-top:12px;${font(12, 400, 1.5, "#86868b")}">Você pode trocar a senha quando quiser em “Meu perfil”.</div>
</td></tr></table>`
    : `<p style="margin:20px 0 0;${font(14, 400, 1.6, "#6e6e73")}">Entre com <strong style="color:#1d1d1f;">${escapeHtml(ctx.email)}</strong> e a senha que você já usa. Esqueceu? Toque em “Esqueci minha senha” na tela de entrada.</p>`;

  const bodyHtml = paragraphs(message, paragraph) + productsHtml + accessHtml;
  const footerHtml =
    paragraphs(signature, `margin:0 0 10px;${font(14, 500, 1.55, "#1d1d1f")}`) +
    `<p style="margin:14px 0 0;${font(11, 400, 1.6, "#a1a1a6")}">Você recebeu este e-mail porque fez uma compra na ${escapeHtml(ctx.brand)}.</p>`;

  const html = layout({
    brand: ctx.brand,
    logoUrl: ctx.logoUrl,
    accent: ctx.accent,
    title: subject,
    preheader: ctx.products.length ? `Liberado: ${joinList(ctx.products)}` : heading,
    eyebrow: "Acesso liberado",
    heading,
    bodyHtml,
    button: { label: buttonLabel, url: ctx.link },
    footerHtml,
  });

  const text = [
    heading,
    "",
    message.trim(),
    "",
    ctx.products.length ? `Liberado para você: ${joinList(ctx.products)}` : "",
    ctx.password ? `\nSeus dados de acesso\nE-mail: ${ctx.email}\nSenha provisória: ${ctx.password}\n(Você pode trocar a senha em “Meu perfil”.)` : `\nEntre com ${ctx.email} e a senha que você já usa.`,
    "",
    `${buttonLabel}: ${ctx.link}`,
    "",
    signature.trim(),
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n")
    .trim();

  return { subject, html, text };
}

/** E-mails curtos do sistema (ex: redefinir senha), com o mesmo visual. */
export function renderNoticeEmail(parts: { brand: string; logoUrl?: string; accent?: string; eyebrow: string; heading: string; message: string; button: { label: string; url: string }; note?: string }): RenderedEmail {
  const paragraph = `margin:16px 0 0;${font(16, 400, 1.62, "#424245")}`;
  const html = layout({
    brand: parts.brand,
    logoUrl: parts.logoUrl,
    accent: parts.accent,
    title: parts.heading,
    preheader: parts.message,
    eyebrow: parts.eyebrow,
    heading: parts.heading,
    bodyHtml: paragraphs(parts.message, paragraph),
    button: parts.button,
    footerHtml: parts.note ? `<p style="margin:0;${font(11, 400, 1.6, "#a1a1a6")}">${escapeHtml(parts.note)}</p>` : "",
  });
  const text = [parts.heading, "", parts.message, "", `${parts.button.label}: ${parts.button.url}`, parts.note ? `\n${parts.note}` : ""].join("\n").trim();
  return { subject: parts.heading, html, text };
}
