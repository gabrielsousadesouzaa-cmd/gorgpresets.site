// Envio de e-mail da Área de Membros: SMTP (sem bibliotecas) e API do Resend.
//
// Arquivo sem dependências e sem tipos do Deno: roda na Edge Function e também
// compila no front. No Supabase as portas 25 e 587 são bloqueadas — use 465
// (SSL direto, ex: smtp.hostinger.com) ou 2525 com STARTTLS.

export type MailProvider = "smtp" | "resend";

export interface SmtpConfig {
  host: string;
  port: number;
  /** "ssl" = SSL direto (465); "starttls" = conexão comum que vira TLS (2525); "none" = sem criptografia. */
  security: "ssl" | "starttls" | "none";
  username: string;
  password: string;
}

export interface MailMessage {
  from: { name: string; email: string };
  to: string;
  /** Cópias ocultas: vão só no envelope (RCPT TO), nunca nos cabeçalhos. */
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  /** Mesma chave = mesmo envio no Resend; no SMTP, mesma chave + mesmo conteúdo = mesmo Message-ID. */
  idempotencyKey?: string;
}

export type MailResult = { ok: true; id: string } | { ok: false; error: string; transient: boolean };

/** Conexão mínima (a de Deno.connect/connectTls já tem esse formato). */
export interface SmtpSocket {
  read(p: Uint8Array): Promise<number | null>;
  write(p: Uint8Array): Promise<number>;
  close(): void;
}

export interface SmtpTransport {
  connect(o: { hostname: string; port: number; tls: boolean }): Promise<SmtpSocket>;
  startTls(s: SmtpSocket, hostname: string): Promise<SmtpSocket>;
}

/** Em que passo da conversa SMTP o erro aconteceu. */
export type SmtpStage = "connect" | "greeting" | "ehlo" | "starttls" | "auth" | "mail" | "rcpt" | "data" | "message";

const CRLF = "\r\n";
const USER_AGENT = "gorgpresets-members/1.0";
const DEFAULT_TIMEOUT = 20_000;
const MAX_TIMER = 2_147_483_647; // acima disso o setTimeout dispara na hora
const MAX_BCC = 20;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ── Utilidades ──────────────────────────────────────────────────────

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64(bytes: Uint8Array): string {
  const out: string[] = [];
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out.push(B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63]);
  }
  if (bytes.length - i === 1) {
    const n = bytes[i] << 16;
    out.push(`${B64[n >> 18]}${B64[(n >> 12) & 63]}==`);
  } else if (bytes.length - i === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out.push(`${B64[n >> 18]}${B64[(n >> 12) & 63]}${B64[(n >> 6) & 63]}=`);
  }
  return out.join("");
}

const b64 = (value: string) => base64(encoder.encode(value));
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** SHA-256 em hex; "" se o crypto.subtle não existir. */
async function sha256Hex(value: string): Promise<string> {
  try {
    return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
  } catch {
    return "";
  }
}

/** Uma linha só: sem CR/LF, tabs ou caracteres de controle (anti header injection). */
const oneLine = (value: unknown) =>
  String(value ?? "")
    .replace(/[\s\u0000-\u001f\u007f]+/g, " ")
    .trim();

const short = (value: unknown, max = 160) => {
  const text = oneLine(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const errText = (err: unknown) => short(err instanceof Error ? err.message || err.name : err);

const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/** Endereço numa linha só (aceita "<a@b.com>"). Sobrou espaço no meio = inválido. */
const cleanAddress = (value: unknown) => oneLine(value).replace(/^<([^<>]*)>$/, "$1").trim();

const isAddress = (value: string) => value.length <= 254 && EMAIL_RE.test(value);

function domainOf(address: string): string {
  const at = address.lastIndexOf("@");
  return at > 0 ? address.slice(at + 1).toLowerCase() : "";
}

/** Cópias ocultas válidas, sem repetir o destinatário principal. */
function bccList(list: string[] | undefined, to: string): string[] {
  const seen = new Set([to.toLowerCase()]);
  const out: string[] = [];
  for (const raw of list || []) {
    const address = cleanAddress(raw);
    if (!isAddress(address) || seen.has(address.toLowerCase())) continue;
    seen.add(address.toLowerCase());
    out.push(address);
  }
  return out.slice(0, MAX_BCC);
}

// ── MIME ────────────────────────────────────────────────────────────

const ASCII = /^[\x20-\x7e]*$/;

/**
 * RFC 2047: palavras =?UTF-8?B?...?= de até 75 caracteres, sem partir caracteres UTF-8,
 * e cada linha com palavra codificada em até 76 caracteres. `used` = o que a 1ª linha já ocupa.
 */
function encodedWords(value: string, used: number): string[] {
  const words: string[] = [];
  let chunk: number[] = [];
  // 12 de moldura + 4 caracteres de base64 a cada 3 bytes. Linhas seguintes: " " + 45 bytes = 73.
  let max = Math.max(12, Math.floor((76 - used - 12) / 4) * 3);
  const flush = () => {
    if (chunk.length) words.push(`=?UTF-8?B?${base64(Uint8Array.from(chunk))}?=`);
    chunk = [];
    max = 45;
  };
  for (const char of value) {
    const bytes = encoder.encode(char);
    if (chunk.length + bytes.length > max) flush();
    for (const b of bytes) chunk.push(b);
  }
  flush();
  return words;
}

/** Cabeçalho de texto livre (Subject): ASCII dobra nos espaços; com acento vira RFC 2047. */
function textHeader(name: string, value: string): string {
  const text = oneLine(value);
  if (!text) return `${name}:`;
  const words = text.split(" ");
  if (ASCII.test(text) && !text.includes("=?") && words.every((w) => w.length <= 900)) {
    const lines: string[] = [];
    let line = `${name}:`;
    for (const word of words) {
      if (line.length + 1 + word.length > 78 && line.length > name.length + 1) {
        lines.push(line);
        line = "";
      }
      line += ` ${word}`;
    }
    lines.push(line);
    return lines.join(CRLF);
  }
  return `${name}: ${encodedWords(text, name.length + 2).join(`${CRLF} `)}`;
}

/** "Nome" <email>, com o nome codificado quando tem acento. `used` = tamanho de "From: ". */
function mailbox(name: unknown, email: string, used: number): string {
  const text = Array.from(oneLine(name)).slice(0, 120).join("");
  if (!text) return email;
  if (ASCII.test(text) && !text.includes("=?")) {
    const phrase = /^[A-Za-z0-9!#$%&'*+\-\/=?^_`{|}~ ]+$/.test(text) ? text : `"${text.replace(/(["\\])/g, "\\$1")}"`;
    return `${phrase} <${email}>`;
  }
  const words = encodedWords(text, used);
  const last = (words.length === 1 ? used : 1) + words[words.length - 1].length;
  // O endereço só fica na linha da última palavra se ela continuar com até 76 caracteres.
  const gap = last + email.length + 3 <= 76 ? " " : `${CRLF} `;
  return `${words.join(`${CRLF} `)}${gap}<${email}>`;
}

/** Texto canônico de e-mail: toda quebra de linha vira CRLF. */
const crlf = (value: unknown) => String(value ?? "").replace(/\r\n|\r|\n/g, CRLF);

/** Base64 em linhas de 76 caracteres. */
const base64Lines = (value: string) => (b64(value).match(/.{1,76}/g) || []).join(CRLF);

/** Data no formato RFC 5322 (sempre em UTC). */
function mailDate(date: Date): string {
  const valid = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return valid.toUTCString().replace(/GMT$/, "+0000");
}

/** FNV-1a: só para tirar um boundary estável do Message-ID. */
function fnv(value: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Mensagem completa (cabeçalhos + multipart/alternative em base64), com CRLF.
 * Bcc nunca entra aqui. Exportado para testes.
 */
export function buildMime(msg: MailMessage, o: { messageId: string; date: Date }): string {
  const fromEmail = cleanAddress(msg.from?.email);
  const replyTo = cleanAddress(msg.replyTo);
  const id = oneLine(o.messageId).replace(/[<>\s]/g, "");
  const headers = [
    `From: ${mailbox(msg.from?.name, fromEmail, 6)}`,
    `To: ${cleanAddress(msg.to)}`,
    ...(isAddress(replyTo) ? [`Reply-To: ${replyTo}`] : []),
    textHeader("Subject", msg.subject),
    `Date: ${mailDate(o.date)}`,
    `Message-ID: <${id}>`,
    "MIME-Version: 1.0",
  ];
  const part = (type: string, body: string) => [`Content-Type: ${type}; charset=UTF-8`, "Content-Transfer-Encoding: base64", "", base64Lines(body)];
  const parts: string[][] = [];
  const text = crlf(msg.text);
  const html = crlf(msg.html);
  if (text || !html) parts.push(part("text/plain", text));
  if (html) parts.push(part("text/html", html));

  if (parts.length === 1) return [...headers, ...parts[0]].join(CRLF) + CRLF;

  const boundary = `=_gorg_${fnv(id, 0x811c9dc5)}${fnv(id, 0x5bd1e995)}`;
  const lines = [...headers, `Content-Type: multipart/alternative; boundary="${boundary}"`, ""];
  for (const p of parts) lines.push(`--${boundary}`, ...p);
  lines.push(`--${boundary}--`);
  return lines.join(CRLF) + CRLF;
}

/** Ponto no começo de linha vira ".." (RFC 5321 §4.5.2). Exportado para testes. */
export function dotStuff(data: string): string {
  return data.replace(/(^|\r\n)\./g, "$1..");
}

async function makeMessageId(msg: MailMessage, to: string, domain: string): Promise<string> {
  const host = /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(domain) ? domain : "localhost";
  const key = oneLine(msg.idempotencyKey);
  // Mesma chave e MESMO conteúdo → mesmo Message-ID (o Gmail descarta a cópia repetida).
  // Conteúdo diferente (ex: senha nova no reenvio) ganha outro ID para não ser descartado.
  const stable = key ? [key, to, oneLine(msg.subject), String(msg.html ?? ""), String(msg.text ?? "")].join("\u0000") : "";
  let local = stable ? (await sha256Hex(stable)).slice(0, 32) : "";
  if (!local) local = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `${local}@${host}`;
}

// ── SMTP ────────────────────────────────────────────────────────────

class SmtpError extends Error {
  transient: boolean;
  constructor(message: string, transient: boolean) {
    super(message);
    this.name = "SmtpError";
    this.transient = transient;
  }
}

interface Reply {
  code: number;
  text: string;
  lines: string[];
}

/** Traduz a resposta do servidor SMTP para o produtor. */
export function smtpErrorMessage(code: number, serverText = "", stage: SmtpStage = "message"): string {
  const detail = serverText ? ` (${code} ${short(serverText)})` : ` (${code})`;
  if (code === 535 || code === 534) return "usuário ou senha do SMTP recusados pelo servidor";
  if (code === 538 || (code === 530 && stage === "auth")) return "o servidor exige conexão segura antes do login — use SSL (465) ou STARTTLS";
  if (code === 530) return `o servidor exige login — preencha usuário e senha do SMTP${detail}`;
  if (code === 421) return `o servidor SMTP está indisponível no momento — tente de novo em alguns minutos${detail}`;
  if (code === 454 && stage === "auth") return `o servidor não conseguiu validar o login agora — tente de novo${detail}`;
  if (code >= 400 && code < 500) return `o servidor SMTP recusou temporariamente — tente de novo em alguns minutos${detail}`;
  if (code === 552) return `mensagem grande demais para o servidor${detail}`;
  if (code >= 500) {
    if (stage === "greeting") return `o servidor SMTP recusou a conexão${detail}`;
    if (stage === "starttls") return `o servidor recusou o STARTTLS${detail}`;
    if (stage === "auth") return `o servidor recusou o login${detail}`;
    if (stage === "mail") return `remetente recusado pelo servidor — use como remetente o mesmo e-mail da conta SMTP${detail}`;
    if (stage === "rcpt") return `destinatário recusado pelo servidor — confira o e-mail${detail}`;
    if (stage === "data" || stage === "message") return `mensagem recusada pelo servidor${detail}`;
    return `o servidor SMTP respondeu com erro${detail}`;
  }
  return `resposta inesperada do servidor SMTP${detail}`;
}

const replyError = (r: Reply, stage: SmtpStage) => new SmtpError(smtpErrorMessage(r.code, r.text, stage), r.code >= 400 && r.code < 500);

/** Erros de rede/TLS vindos do transporte. Rede = transitório; SSL/certificado = configuração. */
function networkError(err: unknown, cfg: SmtpConfig, stage: SmtpStage): SmtpError {
  if (err instanceof SmtpError) return err;
  const raw = errText(err);
  const where = `${oneLine(cfg.host)}:${cfg.port}`;
  if (/refused|ECONNREFUSED/i.test(raw)) return new SmtpError(`conexão recusada por ${where} — confira o host e a porta`, true);
  if (/lookup|ENOTFOUND|EAI_AGAIN|dns|name or service|nodename|no such host/i.test(raw)) {
    return new SmtpError(`servidor ${oneLine(cfg.host)} não encontrado — confira o host (ex: smtp.hostinger.com)`, true);
  }
  // Conexão que cai (inclusive no meio do TLS, ex: servidor lotado) é transitória.
  if (/reset|ECONNRESET|EPIPE|broken pipe|aborted|unreachable|timed out|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|\beof\b|close_notify|disconnected|closed/i.test(raw)) {
    return new SmtpError(`a conexão com ${where} caiu (${raw})`, true);
  }
  if (/certificate|cert_|self.signed|unknownissuer|expired|hostname|altname/i.test(raw)) {
    return new SmtpError(`certificado SSL inválido em ${oneLine(cfg.host)} — confira o host (${raw})`, false);
  }
  if (/tls|ssl|handshake|corrupt|wrong version|alert|packet length|InvalidContentType|incompatible/i.test(raw) && (stage === "connect" || stage === "starttls")) {
    return new SmtpError(`não foi possível abrir a conexão segura com ${where} — confira se a porta usa SSL direto (465) ou STARTTLS (${raw})`, false);
  }
  return new SmtpError(`falha de conexão com ${where} (${raw})`, true);
}

/** Problemas de configuração que nem precisam conectar. */
function smtpConfigProblem(cfg: SmtpConfig): string | null {
  const host = oneLine(cfg?.host);
  if (!host) return "informe o servidor SMTP (ex: smtp.hostinger.com)";
  if (/[\s\/:@]/.test(host)) return "servidor SMTP inválido — use só o nome, ex: smtp.hostinger.com";
  const port = Number(cfg.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return "porta do SMTP inválida";
  if (port === 25 || port === 587) return `a porta ${port} é bloqueada no Supabase — use a porta 465 (SSL)`;
  if (cfg.security !== "ssl" && cfg.security !== "starttls" && cfg.security !== "none") return "segurança do SMTP inválida — use SSL, STARTTLS ou nenhuma";
  if (port === 465 && cfg.security !== "ssl") return "a porta 465 usa SSL direto — escolha a segurança SSL";
  if (!oneLine(cfg.username) && cfg.password) return "informe o usuário do SMTP (normalmente o próprio e-mail)";
  if (oneLine(cfg.username) && !cfg.password) return "informe a senha do SMTP";
  return null;
}

/** EHLO com o domínio da conta (ex: gorgpresets.com); sem domínio, um endereço literal. */
function ehloName(address: string): string {
  const domain = domainOf(address);
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain) ? domain : "[127.0.0.1]";
}

function parseExtensions(lines: string[]): Map<string, string> {
  const ext = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const m = /^([A-Za-z0-9-]+)[ =]?(.*)$/.exec(line.trim());
    if (!m) continue;
    const key = m[1].toUpperCase();
    const value = m[2].trim();
    ext.set(key, key === "AUTH" && ext.has("AUTH") ? `${ext.get("AUTH")} ${value}` : value);
  }
  return ext;
}

function safeClose(sock: SmtpSocket | null) {
  try {
    sock?.close();
  } catch {
    // já fechada
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/** Uma conversa SMTP com prazo total: estourou, fecha a conexão. */
class SmtpClient {
  cfg: SmtpConfig;
  transport: SmtpTransport;
  seconds: number;
  sock: SmtpSocket | null = null;
  buf: Uint8Array = new Uint8Array(0);
  ext: Map<string, string> = new Map();
  stage: SmtpStage = "connect";
  timedOut = false;
  timer: ReturnType<typeof setTimeout> | undefined;
  expired: Promise<never>;

  constructor(cfg: SmtpConfig, transport: SmtpTransport, timeoutMs: number) {
    this.cfg = cfg;
    this.transport = transport;
    this.seconds = Math.max(1, Math.round(timeoutMs / 1000));
    this.expired = new Promise<never>((_, reject) => {
      this.timer = setTimeout(() => {
        this.timedOut = true;
        reject(this.timeoutError());
        this.close();
      }, timeoutMs);
    });
    this.expired.catch(() => undefined);
  }

  timeoutError(): SmtpError {
    const hint = this.stage === "connect" || this.stage === "greeting" ? " — confira o host, a porta e a segurança (SSL/STARTTLS)" : "";
    return new SmtpError(`o servidor SMTP não respondeu a tempo (${this.seconds}s)${hint}`, true);
  }

  guard<T>(p: Promise<T>): Promise<T> {
    return Promise.race([p, this.expired]);
  }

  /** Espera o transporte; se o prazo já estourou, fecha o que chegar atrasado. */
  async attach(pending: Promise<SmtpSocket>): Promise<void> {
    pending.then((s) => this.timedOut && safeClose(s), () => undefined);
    this.sock = await this.guard(pending);
    this.buf = new Uint8Array(0);
    // O Deno só faz o handshake TLS na 1ª leitura: força aqui para erro de SSL sair como erro de conexão.
    const secure = this.sock as SmtpSocket & { handshake?: () => Promise<unknown> };
    if (typeof secure.handshake === "function") await this.guard(secure.handshake());
  }

  alive(): SmtpSocket {
    if (!this.sock) throw this.timedOut ? this.timeoutError() : new SmtpError("a conexão com o servidor SMTP foi fechada", true);
    return this.sock;
  }

  async write(data: string): Promise<void> {
    let bytes = encoder.encode(data);
    let idle = 0;
    while (bytes.length) {
      const n = await this.guard(this.alive().write(bytes));
      if (n > 0) {
        bytes = bytes.subarray(n);
        idle = 0;
      } else if (++idle > 50) {
        throw new SmtpError("o servidor SMTP parou de receber dados", true);
      }
    }
  }

  async readLine(): Promise<string> {
    let idle = 0;
    for (;;) {
      const lf = this.buf.indexOf(10);
      if (lf >= 0) {
        const line = decoder.decode(this.buf.subarray(0, lf)).replace(/\r$/, "");
        this.buf = this.buf.slice(lf + 1);
        return line;
      }
      if (this.buf.length > 65536) throw new SmtpError("resposta grande demais do servidor SMTP", false);
      const chunk = new Uint8Array(4096);
      const n = await this.guard(this.alive().read(chunk));
      if (n === null) {
        const hint = this.stage === "greeting" ? " — confira a porta e a segurança (SSL/STARTTLS)" : "";
        throw new SmtpError(`o servidor SMTP fechou a conexão${hint}`, true);
      }
      if (n > 0) {
        this.buf = concat(this.buf, chunk.subarray(0, n));
        idle = 0;
      } else if (++idle > 50) {
        throw new SmtpError("o servidor SMTP parou de responder", true);
      }
    }
  }

  /** Lê uma resposta completa, inclusive multilinha (250-... até 250 ...). */
  async reply(): Promise<Reply> {
    const lines: string[] = [];
    for (;;) {
      const line = await this.readLine();
      const m = /^(\d{3})(?:([ -])(.*))?$/.exec(line);
      if (!m) throw new SmtpError(`o servidor não respondeu como SMTP — confira host, porta e segurança (${short(line, 60)})`, false);
      lines.push(m[3] ?? "");
      if (m[2] !== "-") return { code: Number(m[1]), text: lines.join(" ").trim(), lines };
      if (lines.length > 500) throw new SmtpError("resposta grande demais do servidor SMTP", false);
    }
  }

  async send(line: string): Promise<Reply> {
    await this.write(line + CRLF);
    return this.reply();
  }

  async expect(stage: SmtpStage, ok: number[], line?: string): Promise<Reply> {
    this.stage = stage;
    const r = line === undefined ? await this.reply() : await this.send(line);
    if (!ok.includes(r.code)) throw replyError(r, stage);
    return r;
  }

  async ehlo(name: string): Promise<void> {
    this.stage = "ehlo";
    const r = await this.send(`EHLO ${name}`);
    if (r.code === 250) {
      this.ext = parseExtensions(r.lines);
      return;
    }
    if (r.code < 500) throw replyError(r, "ehlo");
    // Servidor antigo sem EHLO: tenta HELO (sem extensões).
    await this.expect("ehlo", [250], `HELO ${name}`);
    this.ext = new Map();
  }

  async startTls(name: string): Promise<void> {
    this.stage = "starttls";
    if (!this.ext.has("STARTTLS")) throw new SmtpError("o servidor não oferece STARTTLS nesta porta — use a porta 465 com SSL", false);
    await this.expect("starttls", [220], "STARTTLS");
    // Nada pode vir antes do TLS (proteção contra injeção de comandos).
    if (this.buf.length) throw new SmtpError("resposta inesperada do servidor no STARTTLS", false);
    const plain = this.alive();
    await this.attach(this.transport.startTls(plain, oneLine(this.cfg.host)));
    await this.ehlo(name);
  }

  async auth(user: string, pass: string): Promise<void> {
    this.stage = "auth";
    if (!this.ext.has("AUTH")) {
      throw new SmtpError(
        this.cfg.security === "none"
          ? "o servidor não aceita login sem criptografia — use SSL (465) ou STARTTLS"
          : "o servidor não oferece login (AUTH) nesta porta — confira host e porta",
        false,
      );
    }
    const mechs = (this.ext.get("AUTH") || "").toUpperCase().split(/\s+/);
    if (mechs.includes("PLAIN")) {
      let r = await this.send(`AUTH PLAIN ${b64(`\u0000${user}\u0000${pass}`)}`);
      if (r.code === 334) r = await this.send(b64(`\u0000${user}\u0000${pass}`));
      if (r.code !== 235) throw replyError(r, "auth");
      return;
    }
    if (mechs.includes("LOGIN")) {
      await this.expect("auth", [334], "AUTH LOGIN");
      await this.expect("auth", [334], b64(user));
      await this.expect("auth", [235], b64(pass));
      return;
    }
    throw new SmtpError(`o servidor só aceita login por ${short(mechs.join(", "), 60)} — não suportado (use PLAIN ou LOGIN)`, false);
  }

  /** Conecta, cumprimenta, liga o TLS e faz login. */
  async open(name: string): Promise<void> {
    const host = oneLine(this.cfg.host);
    this.stage = "connect";
    await this.attach(this.transport.connect({ hostname: host, port: Number(this.cfg.port), tls: this.cfg.security === "ssl" }));
    await this.expect("greeting", [220]);
    await this.ehlo(name);
    if (this.cfg.security === "starttls") await this.startTls(name);
    const user = oneLine(this.cfg.username);
    if (user) await this.auth(user, String(this.cfg.password ?? ""));
  }

  /** QUIT educado: espera o 221 por até 2s, mas nunca falha. */
  async quit(): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await this.write(`QUIT${CRLF}`);
      const bye = this.reply();
      bye.catch(() => undefined);
      await Promise.race([bye, new Promise((resolve) => (timer = setTimeout(resolve, 2000)))]);
    } catch {
      // o importante já foi feito
    } finally {
      clearTimeout(timer);
    }
  }

  failure(err: unknown): { error: string; transient: boolean } {
    const e = this.timedOut ? this.timeoutError() : networkError(err, this.cfg, this.stage);
    return { error: e.message, transient: e.transient };
  }

  close(): void {
    clearTimeout(this.timer);
    const sock = this.sock;
    this.sock = null;
    safeClose(sock);
  }
}

const timeoutOf = (ms: number | undefined) => (typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? Math.min(ms, MAX_TIMER) : DEFAULT_TIMEOUT);

interface DenoNet {
  connect(o: { hostname: string; port: number; transport: "tcp" }): Promise<SmtpSocket>;
  connectTls?(o: { hostname: string; port: number }): Promise<SmtpSocket>;
  startTls?(conn: SmtpSocket, o: { hostname: string }): Promise<SmtpSocket>;
}

/** Transporte padrão: Deno.connect / connectTls / startTls (só existe na Edge Function). */
export function denoTransport(): SmtpTransport {
  const deno = (): DenoNet => {
    const ns = (globalThis as unknown as { Deno?: DenoNet }).Deno;
    if (!ns || typeof ns.connect !== "function") throw new SmtpError("envio por SMTP só funciona na Edge Function (Deno)", false);
    return ns;
  };
  return {
    async connect({ hostname, port, tls }) {
      const ns = deno();
      if (!tls) return await ns.connect({ hostname, port, transport: "tcp" });
      if (typeof ns.connectTls !== "function") throw new SmtpError("SSL indisponível neste servidor", false);
      return await ns.connectTls({ hostname, port });
    },
    async startTls(sock, hostname) {
      const ns = deno();
      if (typeof ns.startTls !== "function") throw new SmtpError("STARTTLS indisponível neste servidor — use a porta 465 com SSL", false);
      return await ns.startTls(sock, { hostname });
    },
  };
}

/**
 * Envia por SMTP: EHLO, (STARTTLS), AUTH PLAIN/LOGIN, MAIL, RCPT (to + bcc), DATA, QUIT.
 * O envelope sai pela própria conta SMTP quando o usuário é um e-mail (a Hostinger exige).
 * Cópia oculta recusada pelo servidor não impede a entrega principal.
 */
export async function sendViaSmtp(
  cfg: SmtpConfig,
  msg: MailMessage,
  opts: { transport?: SmtpTransport; timeoutMs?: number; now?: Date; messageIdDomain?: string } = {},
): Promise<MailResult> {
  const problem = smtpConfigProblem(cfg);
  if (problem) return { ok: false, error: problem, transient: false };
  const fromEmail = cleanAddress(msg?.from?.email);
  if (!isAddress(fromEmail)) return { ok: false, error: "e-mail do remetente inválido", transient: false };
  const to = cleanAddress(msg.to);
  if (!isAddress(to)) return { ok: false, error: "e-mail do destinatário inválido", transient: false };

  const account = cleanAddress(cfg.username);
  const envelope = isAddress(account) ? account : fromEmail;
  const bcc = bccList(msg.bcc, to);
  const messageId = await makeMessageId(msg, to, oneLine(opts.messageIdDomain) || domainOf(fromEmail));
  const mime = buildMime({ ...msg, from: { name: msg.from.name, email: fromEmail }, to, bcc: undefined }, { messageId, date: opts.now ?? new Date() });

  const client = new SmtpClient(cfg, opts.transport ?? denoTransport(), timeoutOf(opts.timeoutMs));
  try {
    await client.open(ehloName(envelope));
    await client.expect("mail", [250], `MAIL FROM:<${envelope}>`);
    await client.expect("rcpt", [250, 251], `RCPT TO:<${to}>`);
    for (const address of bcc) {
      client.stage = "rcpt";
      await client.send(`RCPT TO:<${address}>`);
    }
    await client.expect("data", [354], "DATA");
    client.stage = "message";
    let payload = dotStuff(mime);
    if (!payload.endsWith(CRLF)) payload += CRLF;
    await client.write(`${payload}.${CRLF}`);
    await client.expect("message", [250]);
    await client.quit();
    return { ok: true, id: messageId };
  } catch (err) {
    const { error, transient } = client.failure(err);
    return { ok: false, error, transient };
  } finally {
    client.close();
  }
}

/** Testa a conta SMTP (conecta, EHLO, STARTTLS, login e QUIT) sem enviar nada. */
export async function verifySmtp(
  cfg: SmtpConfig,
  opts: { transport?: SmtpTransport; timeoutMs?: number } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = smtpConfigProblem(cfg);
  if (problem) return { ok: false, error: problem };
  const client = new SmtpClient(cfg, opts.transport ?? denoTransport(), timeoutOf(opts.timeoutMs));
  try {
    await client.open(ehloName(cleanAddress(cfg.username)));
    await client.quit();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: client.failure(err).error };
  } finally {
    client.close();
  }
}

// ── Resend ──────────────────────────────────────────────────────────

type Json = Record<string, unknown>;

/**
 * fetch + leitura do corpo com um prazo só (o Resend às vezes trava, inclusive depois dos cabeçalhos).
 * Corpo que não chega ou não é JSON vira {} — o status continua valendo.
 */
async function requestJson(fetchFn: typeof fetch, url: string, init: RequestInit, ms = DEFAULT_TIMEOUT): Promise<{ status: number; ok: boolean; body: Json }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("tempo esgotado"));
    }, ms);
  });
  expired.catch(() => undefined);
  try {
    let res: Response;
    try {
      res = await Promise.race([fetchFn(url, { ...init, signal: controller.signal }), expired]);
    } catch (err) {
      throw controller.signal.aborted ? new Error("tempo esgotado") : err;
    }
    let body: Json = {};
    try {
      const text = await Promise.race([res.text(), expired]);
      const data = text ? JSON.parse(text) : {};
      if (data && typeof data === "object") body = data as Json;
    } catch {
      // corpo ilegível ou travado
    }
    return { status: res.status, ok: res.ok, body };
  } finally {
    clearTimeout(timer);
  }
}

/** Chave do Resend: cabeçalho HTTP só aceita ASCII visível. */
const validKey = (key: string) => /^[\x21-\x7e]+$/.test(key);

/** Idempotency-Key em ASCII (o fetch recusa € e emoji) e com até 256 caracteres sem perder o fim. */
async function idempotencyHeader(key: string): Promise<string> {
  const ascii = Array.from(encoder.encode(key), (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : `%${b.toString(16).toUpperCase().padStart(2, "0")}`)).join("");
  if (ascii.length <= 256) return ascii;
  const digest = await sha256Hex(ascii);
  return digest ? `${ascii.slice(0, 191)}~${digest}` : ascii.slice(0, 256);
}

/** Traduz os erros do Resend para algo que o produtor entende. */
function resendError(status: number, body: Json): { error: string; transient: boolean } {
  const message = short(body.message, 200);
  const name = String(body.name || "");
  if (status === 429) {
    const quota = /quota/i.test(name) || /quota/i.test(message);
    return { error: quota ? "cota de envios do Resend esgotada — tente mais tarde ou aumente o plano" : "limite de envios do Resend atingido — tente mais tarde", transient: true };
  }
  if (status >= 500) return { error: `o Resend está instável agora (erro ${status}) — tente de novo`, transient: true };
  if (status === 403 && /testing emails|verify a domain|own email/i.test(message)) {
    return { error: "domínio ainda não verificado no Resend (com o remetente de teste, só o e-mail da sua conta Resend recebe)", transient: false };
  }
  if (status === 403 && /not verified/i.test(message)) return { error: "o domínio do remetente ainda não foi verificado no Resend", transient: false };
  if (name === "restricted_api_key") return { error: "essa chave do Resend não tem permissão para enviar por esse domínio", transient: false };
  if (status === 401 || name === "invalid_api_key" || name === "missing_api_key" || (status === 403 && /api key/i.test(message))) {
    return { error: "chave do Resend inválida", transient: false };
  }
  if (status === 409 && name === "concurrent_idempotent_requests") return { error: "esse e-mail já está sendo enviado — tente de novo em instantes", transient: true };
  if (status === 409) return { error: "essa chave de envio já foi usada com outro conteúdo", transient: false };
  if (status === 422) return { error: `dados recusados pelo Resend: ${message || "verifique o remetente"}`, transient: false };
  return { error: message ? `Resend: ${message}` : `erro ${status} no Resend`, transient: false };
}

/** Envia pela API do Resend (POST /emails). */
export async function sendViaResend(key: string, msg: MailMessage, opts: { fetchFn?: typeof fetch } = {}): Promise<MailResult> {
  const apiKey = oneLine(key);
  if (!apiKey) return { ok: false, error: "chave do Resend não configurada", transient: false };
  if (!validKey(apiKey)) return { ok: false, error: "chave do Resend inválida", transient: false };
  const fromEmail = cleanAddress(msg?.from?.email);
  if (!isAddress(fromEmail)) return { ok: false, error: "e-mail do remetente inválido", transient: false };
  const to = cleanAddress(msg.to);
  if (!isAddress(to)) return { ok: false, error: "e-mail do destinatário inválido", transient: false };

  const name = oneLine(msg.from.name).replace(/[<>"\\]/g, "").trim();
  // Vírgula, @, ; etc. no nome confundem o leitor de endereços: vai entre aspas.
  const display = /[,;:@()[\]]/.test(name) ? `"${name}"` : name;
  const bcc = bccList(msg.bcc, to);
  const replyTo = cleanAddress(msg.replyTo);
  const html = String(msg.html ?? "");
  const text = String(msg.text ?? "");
  const body: Json = {
    from: display ? `${display} <${fromEmail}>` : fromEmail,
    to: [to],
    subject: oneLine(msg.subject),
    ...(html ? { html } : {}),
    ...(text || !html ? { text } : {}),
    ...(bcc.length ? { bcc } : {}),
    ...(isAddress(replyTo) ? { reply_to: replyTo } : {}),
  };
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
  };
  const idem = oneLine(msg.idempotencyKey);
  if (idem) headers["Idempotency-Key"] = await idempotencyHeader(idem);

  const fetchFn = opts.fetchFn ?? fetch;
  let res: { status: number; ok: boolean; body: Json };
  try {
    res = await requestJson(fetchFn, "https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify(body) });
  } catch (err) {
    return { ok: false, error: `sem conexão com o Resend (${errText(err)})`, transient: true };
  }
  if (!res.ok) return { ok: false, ...resendError(res.status, res.body) };
  return { ok: true, id: String(res.body.id || "") };
}

/**
 * Confere a chave do Resend listando os domínios.
 * "send_only" = chave válida só de envio (não pode listar domínios).
 */
export async function checkResendKey(
  key: string,
  opts: { fetchFn?: typeof fetch } = {},
): Promise<{ check: "ok" | "send_only" | "invalid" | "unreachable"; domains: Array<{ name: string; status: string }> | null }> {
  const apiKey = oneLine(key);
  if (!apiKey || !validKey(apiKey)) return { check: "invalid", domains: null };
  const fetchFn = opts.fetchFn ?? fetch;
  try {
    const res = await requestJson(fetchFn, "https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
    });
    const body = res.body;
    if (res.ok) {
      const list = Array.isArray(body.data) ? (body.data as Json[]) : [];
      return { check: "ok", domains: list.map((d) => ({ name: String(d?.name || ""), status: String(d?.status || "") })) };
    }
    if (res.status === 401 && body.name === "restricted_api_key") return { check: "send_only", domains: null };
    // Limite ou instabilidade do Resend não dizem nada sobre a chave.
    if (res.status === 429 || res.status >= 500) return { check: "unreachable", domains: null };
    return { check: "invalid", domains: null };
  } catch {
    return { check: "unreachable", domains: null };
  }
}
