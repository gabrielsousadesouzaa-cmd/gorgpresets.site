// Leitor universal do webhook dos checkouts — o "modo aprendizado".
//
// Arquivo sem dependências: a Edge Function usa para entender cada venda e o
// Studio pode usar para mostrar o que foi lido do payload. Não precisa de compra
// de teste: o leitor acha comprador, status, pedido, valor e produtos pela forma
// do JSON. Conhece GGCheckout, Hotmart, Kiwify, Cakto, Eduzz, Perfect Pay, Ticto,
// Yampi, CartPanda, Shopify, Stripe, Monetizze e Braip — e tenta os parecidos.

export interface SaleItem {
  id: string;
  title: string;
  /** "main", "orderbump", "upsell", "downsell" ou "" (não informado). */
  type: string;
  /** Na moeda da venda (já convertido de centavos quando for o caso). */
  price: number | null;
}

export type SaleStatus = "approved" | "refunded" | "chargeback" | "pending" | "canceled" | "unknown";

export interface ParsedSale {
  email: string;
  name: string;
  /** Só dígitos, com DDI quando o checkout manda. */
  phone: string;
  /** CPF/CNPJ só dígitos. */
  document: string;
  /** Nome cru do evento (ex: "pix.paid", "PURCHASE_APPROVED", "order_approved"). */
  event: string;
  status: SaleStatus;
  approved: boolean;
  /** Reembolso ou chargeback: o acesso deve ser removido. */
  refunded: boolean;
  chargeback: boolean;
  /** Valores crus de status/evento encontrados (para o log). */
  statusValues: string[];
  orderId: string;
  amount: number | null;
  currency: string;
  /** "pix", "cartão", "boleto", outro texto ou "". */
  paymentMethod: string;
  /** "ggcheckout", "hotmart", "kiwify"... ou "" (desconhecida). */
  platform: string;
  /** Produtos do pedido (principal, order bump, upsell), sem repetir id. */
  items: SaleItem[];
  /** Ids e títulos em minúsculas, para casar com os produtos cadastrados. */
  productRefs: string[];
}

// ── Utilidades ──────────────────────────────────────────────────────
type Obj = Record<string, unknown>;
type Prim = string | number | boolean;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isPrim = (v: unknown): v is Prim => typeof v === "string" || typeof v === "number" || typeof v === "boolean";
const deaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** "paymentMethod", "Payment-Method" e "payment_method" viram "payment_method". */
function normKey(key: string): string {
  return deaccent(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Valor para comparar: "PURCHASE_APPROVED", "pix.paid", "paymentApproved", "Pagamento Aprovado" → "purchase_approved"... */
function slug(value: unknown): string {
  return deaccent(String(value ?? ""))
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Texto útil de um valor simples. Número vira texto; vazio, "null" e booleanos não contam. */
function text(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value !== "string") return "";
  const v = value.trim();
  return /^(null|undefined|none|nil)$/i.test(v) ? "" : v;
}

const digits = (value: unknown) => text(value).replace(/\D/g, "");
// Limite de tamanho antes da regex: texto enorme travaria a checagem (tempo quadrático).
const isEmail = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
/** Caracteres invisíveis que vêm de copiar e colar (espaço de largura zero, BOM). */
const invisible = (v: string) => v.replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g, "");

/** E-mail em minúsculas; aceita "Nome <email@x.com>". "" se não for e-mail. */
function cleanEmail(value: unknown): string {
  const v = invisible(text(value)).trim().toLowerCase();
  if (v.length > 320) return "";
  const inner = v.match(/<([^<>\s]+)>/)?.[1] || v.replace(/^mailto:/, "");
  return isEmail(inner) ? inner : "";
}

function validId(value: unknown): string {
  const v = text(value);
  return v && v !== "0" && v.length <= 200 ? v : "";
}

/** Campos de um objeto com as chaves normalizadas: valores simples e filhos. */
interface Fields {
  prim: Map<string, Prim>;
  kids: Map<string, unknown>;
}

function fieldsOf(obj: Obj): Fields {
  const prim = new Map<string, Prim>();
  const kids = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    const key = normKey(k);
    if (isPrim(v)) {
      if (!prim.has(key)) prim.set(key, v);
    } else if (v !== null && v !== undefined && !kids.has(key)) kids.set(key, v);
  }
  return { prim, kids };
}

const emptyFields = (): Fields => ({ prim: new Map(), kids: new Map() });

function pick(f: Fields, keys: string[]): string {
  for (const k of keys) {
    const v = text(f.prim.get(k));
    if (v) return v;
  }
  return "";
}

function get(obj: unknown, key: string): unknown {
  if (!isObj(obj)) return undefined;
  for (const [k, v] of Object.entries(obj)) if (normKey(k) === key) return v;
  return undefined;
}

const present = (obj: unknown, key: string) => {
  const v = get(obj, key);
  return v !== undefined && v !== null && v !== "";
};

// ── Percorrer o payload ─────────────────────────────────────────────
/** Valor simples com o caminho (chaves normalizadas, sem índices de lista). */
interface Leaf {
  segs: string[];
  key: string;
  value: Prim;
  inArray: boolean;
}

interface Node {
  segs: string[];
  obj: Obj;
  inArray: boolean;
}

/** Profundidade máxima (listas dentro de listas também contam). */
const MAX_DEPTH = 32;

function walk(input: unknown, segs: string[], inArray: boolean, leaves: Leaf[], nodes: Node[], depth = 0, open = new Set<unknown>()) {
  // Limite de profundidade e proteção contra referência circular: nunca estoura a pilha.
  if (depth > MAX_DEPTH || segs.length > 24 || open.has(input)) return;
  if (Array.isArray(input)) {
    open.add(input);
    for (const v of input) {
      if (isPrim(v)) {
        if (segs.length) leaves.push({ segs: segs.slice(0, -1), key: segs[segs.length - 1], value: v, inArray: true });
      } else walk(v, segs, true, leaves, nodes, depth + 1, open);
    }
    open.delete(input);
    return;
  }
  if (!isObj(input)) return;
  open.add(input);
  nodes.push({ segs, obj: input, inArray });
  for (const [k, v] of Object.entries(input)) {
    const key = normKey(k);
    if (isPrim(v)) leaves.push({ segs, key, value: v, inArray });
    else walk(v, [...segs, key], inArray, leaves, nodes, depth + 1, open);
  }
  open.delete(input);
}

/** Embrulhos que não dizem o que o objeto é ({ data: {...} }, { object: {...} }). */
const WRAPPER = /^(data|object|node|nodes|edges|attributes|resource|payload|body|content|result|results|values|list|\d+)$/;

/** O que o objeto representa: a última chave do caminho que não é embrulho. */
function kindOf(segs: string[]): string {
  for (let i = segs.length - 1; i >= 0; i--) if (!WRAPPER.test(segs[i])) return segs[i];
  return "";
}

/** Partes do payload que nunca são o comprador nem o produto comprado (vendedor, loja, rastreio, pixels). */
const OUTSIDE =
  /^(webhooks?|hooks?|affiliates?|afiliad[oa]s?|affiliations?|producers?|produtor(es)?|co_?producers?|coprodutor(es)?|commissions?|comissao|comissoes|sellers?|vendedor(es)?|merchants?|owners?|webhook_owner|partners?|parceiros?|splits?|recipients?|utms?|tracking|tracking_parameters|query_params|url_params|marketplace|stores?|lojas?|shops?|compan(y|ies)|empresas?|business(es)?|organizations?|support|suporte|pixels?|analytics|fbq|facebook|tiktok|kwai|taboola|google_ads)$/;
const outside = (segs: string[]) => segs.some((s) => OUTSIDE.test(s));

const BUYER =
  /^(customers?|buyers?|clients?|clientes?|compradore?s?|payers?|pagador(es)?|purchasers?|customer_details|billing_details|contacts?|contatos?|leads?|alunos?|students?|subscribers?|assinantes?|members?|membros?|users?|usuarios?|consumers?|shoppers?)$/;
const PRODUCT =
  /^(products?|produtos?|items?|itens|line_items|order_items|cart_items|lines|courses?|cursos?|ebooks?|bundles?|order_bumps?|bumps?|upsells?|downsells?)$/;
const OFFER = /^(offers?|ofertas?|plans?|planos?|skus?|variants?|variantes?|prices?)$/;
/** Listas que repetem produtos sem serem a compra (entregas, reembolsos parciais...). */
const NOT_ITEMS = /^(fulfillments?|refunds?|refund_line_items|returns?|shipping_lines|tax_lines|discount_applications|discount_allocations|duties)$/;

/** Grava como propriedade própria: a chave "__proto__" vira dado comum, sem trocar o protótipo. */
function setOwn(obj: Obj, key: string, value: unknown) {
  Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
}
const hasOwn = (obj: Obj, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

/** Form-urlencoded ("venda[codigo]=1") vira objeto; texto com JSON é aberto. */
function prepare(payload: unknown): Obj {
  let p = payload;
  // Pares chave/valor na ordem em que chegaram: em form-urlencoded "itens[]=a&itens[]=b"
  // repete a chave, e as duas entradas precisam virar dois itens.
  let entries: Array<[string, unknown]> | null = null;
  if (typeof payload === "string") {
    const raw = payload.replace(/^\ufeff/, "").trim();
    try {
      p = JSON.parse(raw);
    } catch {
      entries = Array.from(new URLSearchParams(raw));
    }
  }
  if (!entries) {
    if (Array.isArray(p) && isObj(p[0])) p = p[0];
    if (!isObj(p)) return {};
    entries = Object.entries(p);
  }
  const out: Obj = {};
  let bracketed = false;
  for (const [k, v] of entries) {
    let value = v;
    if (typeof v === "string" && /^\s*[[{]/.test(v)) {
      try {
        const parsed = JSON.parse(v);
        if (parsed && typeof parsed === "object") value = parsed;
      } catch {
        // texto comum
      }
    }
    const m = k.match(/^([^[\]]+)((?:\[[^[\]]*\])+)$/);
    if (!m) {
      if (!hasOwn(out, k) || !isObj(out[k])) setOwn(out, k, value);
      continue;
    }
    const path = [m[1], ...Array.from(m[2].matchAll(/\[([^[\]]*)\]/g), (x) => x[1])];
    // Nunca escrever em __proto__/constructor (poluição de protótipo).
    if (path.some((seg) => /^(__proto__|constructor|prototype)$/.test(seg))) continue;
    let cur = out;
    path.forEach((seg, i) => {
      const key = seg === "" ? String(Object.keys(cur).length) : seg;
      if (i === path.length - 1) setOwn(cur, key, value);
      else {
        if (!hasOwn(cur, key) || !isObj(cur[key])) setOwn(cur, key, {});
        cur = cur[key] as Obj;
      }
    });
    bracketed = true;
  }
  return bracketed ? (listify(out, 0) as Obj) : out;
}

/** {"0": a, "1": b} montado por "itens[]=a&itens[]=b" (ou itens[0], itens[1]) vira lista. */
function listify(value: unknown, depth: number): unknown {
  if (!isObj(value) || depth > 12) return value;
  const keys = Object.keys(value);
  const list = keys.length > 0 && keys.every((k, i) => k === String(i));
  if (list) return keys.map((k) => listify(value[k], depth + 1));
  for (const k of keys) setOwn(value, k, listify(value[k], depth + 1));
  return value;
}

function lowerHeaders(headers?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers || {})) out[k.toLowerCase()] = String(v ?? "");
  return out;
}

// ── Plataforma ──────────────────────────────────────────────────────
const HEADER_PLATFORM: Array<[RegExp, string]> = [
  [/^x-gg-?checkout/, "ggcheckout"],
  [/^x-hotmart|^hottok$/, "hotmart"],
  [/^x-shopify/, "shopify"],
  [/^stripe-signature$/, "stripe"],
  [/^x-yampi/, "yampi"],
  [/^x-cartpanda/, "cartpanda"],
  [/^x-kiwify/, "kiwify"],
  [/^x-cakto/, "cakto"],
  [/^x-eduzz/, "eduzz"],
  [/^x-ticto/, "ticto"],
  [/^x-perfect-?pay/, "perfectpay"],
  [/^x-monetizze/, "monetizze"],
  [/^x-braip/, "braip"],
];

/** Nomes em user-agent e domínios (CartPanda antes da Shopify: usa o CDN dela). */
const PLATFORM_NAMES: Array<[RegExp, string]> = [
  [/gg-?checkout/, "ggcheckout"],
  [/hotmart/, "hotmart"],
  [/kiwify/, "kiwify"],
  [/cakto/, "cakto"],
  [/eduzz/, "eduzz"],
  [/perfect[- ]?pay/, "perfectpay"],
  [/ticto/, "ticto"],
  [/yampi/, "yampi"],
  [/cartpanda/, "cartpanda"],
  [/shopify/, "shopify"],
  [/stripe/, "stripe"],
  [/monetizze/, "monetizze"],
  [/braip/, "braip"],
];

function platformFromHeaders(h: Record<string, string>): string {
  for (const name of Object.keys(h)) for (const [re, platform] of HEADER_PLATFORM) if (re.test(name)) return platform;
  const agent = (h["user-agent"] || "").toLowerCase();
  for (const [re, platform] of PLATFORM_NAMES) if (re.test(agent)) return platform;
  return "";
}

function platformFromPayload(p: Obj, leaves: Leaf[]): string {
  const event = text(get(p, "event"));
  const data = get(p, "data");
  const payment = get(p, "payment");
  const order = get(p, "order");
  const commissions = get(p, "commissions");
  if (present(p, "hottok") || (isObj(get(data, "buyer")) && isObj(get(data, "purchase")))) return "hotmart";
  if (
    present(p, "webhook_event_type") ||
    present(commissions, "kiwify_fee") ||
    (present(p, "order_status") && isObj(get(p, "customer")) && present(get(p, "product"), "product_id"))
  ) {
    return "kiwify";
  }
  if (text(get(p, "object")) === "event" || /^evt_/.test(text(get(p, "id")))) return "stripe";
  if (
    present(get(p, "webhook"), "business_id") ||
    /^(pix|card|boleto|billet)\.[a-z_]+$/i.test(event) ||
    (present(payment, "payment_method") && present(payment, "gateway")) ||
    // Formato do MCP: "payment.paid", "payment.charged_back", "payment.canceled"... com o comprador dentro do pagamento.
    (/^payment\.[a-z_]+$/i.test(event) && isObj(get(payment, "customer"))) ||
    /^(pix|card|boleto|billet)\.[a-z_]+$/i.test(text(get(payment, "method")))
  ) {
    return "ggcheckout";
  }
  if (present(p, "sale_status_enum") || present(p, "webhook_owner") || present(p, "sale_status_detail")) return "perfectpay";
  if (present(p, "chave_unica") || isObj(get(p, "tipo_postback")) || (isObj(get(p, "venda")) && isObj(get(p, "comprador")))) return "monetizze";
  if (present(p, "trans_cod") || present(p, "cus_email") || /^myeduzz\./i.test(event)) return "eduzz";
  if (present(p, "trans_key") || present(p, "basic_authentication") || present(p, "client_documment")) return "braip";
  if ((present(p, "status_date") && isObj(get(p, "item"))) || isObj(get(p, "url_params")) || (present(order, "hash") && isObj(get(p, "item")))) {
    return "ticto";
  }
  if (isObj(get(data, "offer")) && (isObj(get(data, "product")) || isObj(get(data, "customer")))) return "cakto";
  if (isObj(get(p, "merchant")) && isObj(get(p, "resource"))) return "yampi";
  if (/^gid:\/\/shopify/.test(text(get(p, "admin_graphql_api_id"))) || (Array.isArray(get(p, "line_items")) && present(p, "financial_status"))) {
    return "shopify";
  }
  // CartPanda antes dos links: as imagens dela vêm do CDN da Shopify.
  if (/^order\./.test(event) && Array.isArray(get(order, "line_items"))) return "cartpanda";
  // Último recurso: links do próprio checkout dentro do payload.
  const hosts = leaves
    .map((l) => (typeof l.value === "string" ? l.value.match(/^https?:\/\/([^/?#\s]+)/i)?.[1]?.toLowerCase() : undefined))
    .filter((h): h is string => !!h);
  for (const [re, platform] of PLATFORM_NAMES) if (hosts.some((h) => re.test(h))) return platform;
  return "";
}

/** Descobre de qual checkout veio o webhook. "" quando não reconhece. */
export function detectPlatform(payload: unknown, headers?: Record<string, string>): string {
  try {
    const fromHeaders = platformFromHeaders(lowerHeaders(headers));
    if (fromHeaders) return fromHeaders;
    const data = prepare(payload);
    const leaves: Leaf[] = [];
    walk(data, [], false, leaves, []);
    return platformFromPayload(data, leaves);
  } catch {
    return "";
  }
}

// ── Dinheiro ────────────────────────────────────────────────────────
/** Checkouts que mandam valores inteiros em centavos. */
const CENTS_PLATFORMS = new Set(["stripe", "kiwify", "ticto", "braip"]);

/** "97,00", "1.297,00", "R$ 97" e "1,297.00" viram número; avisa se veio sem casas decimais. */
function parseAmount(raw: string): { n: number; integer: boolean } | null {
  const s = raw.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return null;
  const dot = s.lastIndexOf(".");
  const comma = s.lastIndexOf(",");
  let sep = "";
  if (dot >= 0 && comma >= 0) sep = dot > comma ? "." : ",";
  else if (comma >= 0) sep = /,\d{1,2}$/.test(s) ? "," : "";
  else if (dot >= 0) sep = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? "" : ".";
  const at = sep ? s.lastIndexOf(sep) : -1;
  const int = (at >= 0 ? s.slice(0, at) : s).replace(/[.,]/g, "");
  const frac = at >= 0 ? s.slice(at + 1) : "";
  const n = Number(`${int || "0"}.${frac || "0"}`);
  // Só "9700" puro é ambíguo (pode ser centavos). "1.297", "R$ 197" e "197,00" já vêm formatados em reais.
  return Number.isFinite(n) ? { n, integer: /^-?\d+$/.test(raw.trim()) } : null;
}

/**
 * Converte para a moeda da venda. Inteiros são centavos na Stripe, Kiwify, Ticto e
 * Braip; no GGCheckout, inteiros a partir de 100 (a doc mostra 97.00 e 9900).
 */
function toMoney(value: unknown, platform: string, key = ""): number | null {
  if (isObj(value)) {
    const f = fieldsOf(value);
    for (const k of ["value", "amount", "unit_amount", "valor", "cents", "amount_cents"]) {
      if (f.prim.has(k)) return toMoney(f.prim.get(k), platform, k);
    }
    return null;
  }
  let n: number;
  let integer: boolean;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    n = value;
    integer = Number.isInteger(value);
  } else if (typeof value === "string") {
    const parsed = parseAmount(value);
    if (!parsed) return null;
    n = parsed.n;
    integer = parsed.integer;
  } else return null;
  if (n < 0) return null;
  const cents = /cents|centavos/.test(key) || (integer && (CENTS_PLATFORMS.has(platform) || (platform === "ggcheckout" && n >= 100)));
  return Math.round((cents ? n / 100 : n) * 100) / 100;
}

const AMOUNT_KEYS = [
  "amount_total",
  "total_cents",
  "amount_cents",
  "amount_in_cents",
  "total_in_cents",
  "valor_centavos",
  "total_price",
  "current_total_price",
  "value_total",
  "total_amount",
  "charge_amount",
  "paid_amount",
  "amount_paid",
  "sale_amount",
  "transaction_amount",
  "trans_value",
  "valor_total",
  "valor_pago",
  "total",
  "amount",
  "paid",
  "price",
  "valor",
  "value",
  "full_price",
  "preco",
  "trans_total_value",
];
const MONEY_PARENT = /^(price|full_price|total|total_price|amount|paid|valor|preco|total_amount|amount_total|price_paid)$/;
const MONEY_SKIP = /(fee|taxa|discount|desconto|shipping|frete|tax|imposto|installment|parcela|refund|estorno|commission|comiss|coupon|cupom|interest|juros|split)/;
const CURRENCY_KEY = /^(currency|currency_code|currency_value|currency_id|currency_iso|moeda|trans_currency|product_base_price_currency|presentment_currency)$/;

function readAmount(leaves: Leaf[], platform: string): { amount: number | null; currency: string } {
  let best: { rank: number; amount: number; segs: string } | null = null;
  for (const l of leaves) {
    if (l.inArray) continue;
    let key = l.key;
    let segs = l.segs;
    // Hotmart/Eduzz: { price: { value: 97 } }
    if (/^(value|amount|valor|cents|amount_cents)$/.test(key) && segs.length && MONEY_PARENT.test(segs[segs.length - 1])) {
      key = segs[segs.length - 1];
      segs = segs.slice(0, -1);
    }
    const rank = AMOUNT_KEYS.indexOf(key);
    if (rank < 0 || (best && rank >= best.rank)) continue;
    // Kiwify manda o total pago dentro de "Commissions".
    const kiwifyTotal = key === "charge_amount";
    if (!kiwifyTotal && (outside(segs) || segs.some((s) => MONEY_SKIP.test(s)))) continue;
    if (segs.some((s) => PRODUCT.test(s) || OFFER.test(s) || BUYER.test(s))) continue;
    const amount = toMoney(l.value, platform, l.key);
    if (amount !== null) best = { rank, amount, segs: l.segs.join(".") };
  }
  const isCurrency = (l: Leaf) => !l.inArray && !outside(l.segs) && CURRENCY_KEY.test(l.key) && /^[a-z]{3}$/i.test(text(l.value));
  const found = (best && leaves.find((l) => isCurrency(l) && l.segs.join(".") === best?.segs)) || leaves.find(isCurrency);
  const amount = best ? best.amount : null;
  const currency = found ? text(found.value).toUpperCase() : amount !== null ? "BRL" : "";
  return { amount, currency };
}

// ── Comprador ───────────────────────────────────────────────────────
/** Chaves soltas com prefixo do comprador: cus_email (Eduzz), client_cel (Braip)... */
const BUYER_PREFIX = /^(cus|client|cliente|customer|buyer|comprador|payer|pagador|purchaser|lead|aluno|student)_(.+)$/;
/** Objetos do pedido em si (a raiz, "order", "payment"...), onde o e-mail às vezes fica solto. */
const ORDER_SEG = /^(orders?|pedidos?|sales?|vendas?|purchases?|compras?|transactions?|transacao|payments?|pagamentos?|checkouts?|charges?|invoices?|faturas?|sessions?)$/;
// "shop"/"store"/"loja" só como palavra inteira: "shopper_email" é do comprador.
// "aff_email" (Eduzz/Hotmart v1) é do afiliado; "pro_email"/"prod_email", do produtor.
const EMAIL_BAD =
  /(support|suporte|producer|produtor|affiliate|afiliado|seller|vendedor|owner|merchant|(^|_)(store|loja|shop)(_|$)|(^|_)(aff|afil|pro|prod|coprod)_|sender|remetente|from|reply|notification|admin|company|empresa|business|partner|parceiro|recipient|receiver|recebedor|collector)/;

function emailOf(f: Fields): string {
  const keys = Array.from(f.prim.keys()).sort((a, b) => Number(a !== "email") - Number(b !== "email"));
  for (const k of keys) {
    if (!/e_?mail/.test(k) || EMAIL_BAD.test(k)) continue;
    const v = cleanEmail(f.prim.get(k));
    if (v) return v;
  }
  return "";
}

function cleanName(value: unknown): string {
  const v = invisible(text(value)).replace(/\s+/g, " ").trim();
  if (!v || v.length > 120 || isEmail(v) || /^https?:/i.test(v) || !/\p{L}/u.test(v)) return "";
  // "null null", "undefined" (nome montado por sistemas que juntam campos vazios).
  if (v.split(" ").every((w) => /^(null|undefined|none|nil)$/i.test(w))) return "";
  return v;
}

/** Nome completo; sem ele, junta nome e sobrenome. "plain" aceita a chave genérica "name". */
function nameOf(f: Fields, plain: boolean): string {
  for (const k of ["full_name", "fullname", "nome_completo", "name", "nome", "display_name", "razao_social"]) {
    if (!plain && (k === "name" || k === "nome" || k === "display_name")) continue;
    const v = cleanName(f.prim.get(k));
    if (v) return v;
  }
  const first = cleanName(pick(f, ["first_name", "firstname", "primeiro_nome", "given_name"]));
  const last = cleanName(pick(f, ["last_name", "lastname", "sobrenome", "ultimo_nome", "family_name", "surname"]));
  // Alguns checkouts mandam o nome completo em first_name: "Ana Julia Pereira" + "Pereira" não repete o sobrenome.
  const lower = (s: string) => deaccent(s).toLowerCase();
  if (first && last && (lower(first) === lower(last) || lower(first).endsWith(` ${lower(last)}`))) return first;
  return [first, last].filter(Boolean).join(" ").slice(0, 120);
}

const PHONE_KEYS = [
  "full_number",
  "e164",
  "international_number",
  "phone",
  "phone_number",
  "telefone",
  "celular",
  "cellphone",
  "cell_phone",
  "mobile",
  "mobile_phone",
  "mobile_number",
  "whatsapp",
  "cel",
  "tel",
  "fone",
  "checkout_phone",
  "contact_phone",
  "formated_number",
  "formatted_number",
  "phone_checkout_number",
];
const PHONE_KID = /^(phone|phones|telefone|telefones|fone|celular|mobile|mobile_phone|cellphone|whatsapp|phone_number|contact_phone)$/;

/** Telefone só com dígitos. Junta DDI + DDD + número quando vêm separados (Ticto, Perfect Pay). */
function composePhone(f: Fields, phoneObject: boolean): string {
  const ddi = digits(pick(f, ["ddi", "country_code", "phone_country_code", "phone_ddi", "dial_code", "country_calling_code"]));
  // Hotmart v1 (form): phone_local_code + phone_number.
  const area = digits(pick(f, ["area_code", "phone_area_code", "ddd", "phone_ddd", "local_code", "phone_local_code", "phone_checkout_local_code"]));
  for (const key of phoneObject ? [...PHONE_KEYS, "number", "numero"] : PHONE_KEYS) {
    const d = digits(f.prim.get(key));
    // Mais de 15 dígitos não é telefone (E.164): provavelmente dois números juntos.
    if (d.length < 8 || d.length > 15) continue;
    if (area && d.length <= 9) return ddi + area + d;
    // Só considera que o DDI já veio no número se sobrar um número nacional completo:
    // "55988887777" é DDD 55 (RS) sem DDI, não DDI 55.
    if (ddi && (d.length === 10 || d.length === 11) && !(d.startsWith(ddi) && d.length - ddi.length >= 10)) return ddi + d;
    return d;
  }
  return "";
}

function phoneOf(f: Fields): string {
  for (const [k, v] of f.kids) {
    if (!PHONE_KID.test(k) || !isObj(v)) continue;
    const phone = composePhone(fieldsOf(v), true);
    if (phone) return phone;
  }
  return composePhone(f, false);
}

const DOC_KEYS = [
  "document",
  "documento",
  "doc",
  "doc_number",
  "document_number",
  "documment",
  "cpf",
  "cnpj",
  "cpf_cnpj",
  "cnpj_cpf",
  "taxnumber",
  "tax_number",
  "tax_id",
  "identification_number",
  "identificacao",
  "national_id",
];

/** CPF (11) ou CNPJ (14) só dígitos. Enviado como número, pode perder zeros à esquerda. */
function cleanDoc(value: unknown): string {
  let d = digits(value);
  if (typeof value === "number" && d.length >= 9 && d.length < 11) d = d.padStart(11, "0");
  else if (typeof value === "number" && (d.length === 12 || d.length === 13)) d = d.padStart(14, "0");
  // "000.000.000-00", "111.111.111-11": preenchimento de teste, não documento (e viraria senha fraca no modo CPF).
  if (/^(\d)\1+$/.test(d)) return "";
  return d.length === 11 || d.length === 14 ? d : "";
}

function docOf(f: Fields): string {
  for (const k of DOC_KEYS) {
    const d = cleanDoc(f.prim.get(k));
    if (d) return d;
  }
  // { document: { number } } ou Stripe { tax_ids: [{ type: "br_cpf", value }] }
  for (const [k, v] of f.kids) {
    if (!/^(document|documento|documents|doc|identification|tax_ids?)$/.test(k)) continue;
    for (const entry of Array.isArray(v) ? v : [v]) {
      if (!isObj(entry)) continue;
      const d = cleanDoc(pick(fieldsOf(entry), ["number", "numero", "value", "document", "id"]));
      if (d) return d;
    }
  }
  return "";
}

/** Nomes que com certeza são o comprador ("user", "member", "contact" são mais vagos). */
const BUYER_STRONG =
  /^(customers?|buyers?|clients?|clientes?|compradore?s?|payers?|pagador(es)?|purchasers?|customer_details|billing_details|alunos?|students?|subscribers?|assinantes?)$/;

function readBuyer(nodes: Node[], leaves: Leaf[]) {
  // Primeiro os objetos com e-mail; entre eles, os de nome forte de comprador.
  const objects = nodes
    .filter((n) => !outside(n.segs) && BUYER.test(kindOf(n.segs)) && !n.segs.some((s) => PRODUCT.test(s) || OFFER.test(s)))
    .map((n) => ({ f: fieldsOf(n.obj), strong: BUYER_STRONG.test(kindOf(n.segs)) }))
    .map((o) => ({ ...o, mail: !!emailOf(o.f) }))
    .sort((a, b) => Number(b.mail) - Number(a.mail) || Number(b.strong) - Number(a.strong))
    .map((o) => o.f);
  const prefixed = emptyFields();
  const loose = emptyFields();
  for (const l of leaves) {
    if (l.inArray || outside(l.segs)) continue;
    const m = l.key.match(BUYER_PREFIX);
    if (m) {
      if (!prefixed.prim.has(m[2])) prefixed.prim.set(m[2], l.value);
    } else if (l.segs.every((s) => WRAPPER.test(s) || ORDER_SEG.test(s)) && !loose.prim.has(l.key)) {
      loose.prim.set(l.key, l.value);
    }
  }
  const sources = [...objects, prefixed, loose];
  const first = (read: (f: Fields) => string) => {
    for (const f of sources) {
      const v = read(f);
      if (v) return v;
    }
    return "";
  };
  let email = first(emailOf);
  if (!email) {
    // Último recurso: qualquer e-mail que não seja de produtor, afiliado ou produto.
    const hit = leaves.find(
      (l) =>
        /e_?mail/.test(l.key) &&
        !EMAIL_BAD.test(l.key) &&
        !outside(l.segs) &&
        !l.segs.some((s) => PRODUCT.test(s) || OFFER.test(s)) &&
        !!cleanEmail(l.value),
    );
    email = hit ? cleanEmail(hit.value) : "";
  }
  // Na raiz, "name" costuma ser o pedido ("#1001") ou o produto: só aceita nome e sobrenome.
  const name = first((f) => nameOf(f, f !== loose));
  return { email, name, phone: first(phoneOf), document: first(docOf) };
}

// ── Status e evento ─────────────────────────────────────────────────
/**
 * "disputed": disputa/reclamação/mediação aberta, ainda sem resultado (não retira o acesso).
 * "partial": reembolso parcial (não retira o pedido inteiro). "lost": disputa perdida (Stripe "lost").
 */
type StatusClass = "chargeback" | "refunded" | "partial" | "disputed" | "lost" | "canceled" | "failed" | "pending" | "approved" | "unknown";

const EVENT_KEYS = [
  "event",
  "webhook_event_type",
  "event_type",
  "event_name",
  "webhook_event",
  "trigger",
  "topic",
  "evento",
  "tipo_evento",
  "notification_type",
  "type",
];
/** Status de outra coisa (entrega, assinatura, cartão, produto...) ou o status anterior não decide a venda. */
const STATUS_BAD_KEY =
  /^(fulfillment|shipping|shipment|delivery|entrega|frete|funds|subscription|assinatura|card|refund|webhook|product|produto|account|kyc|document|email|tracking|nfe|nota|commission|affiliate|recurrence|recorrencia|item|antifraud|risk|previous|prev|old|from|before|anterior|initial)_/;
const STATUS_BAD_SEG =
  /^(subscriptions?|assinaturas?|recurrences?|products?|produtos?|items?|itens|line_items|offers?|ofertas?|plans?|planos?|shipping|shipments?|fulfillments?|delivery|entrega|frete|address|endereco|billing_address|shipping_address|customers?|buyers?|clients?|clientes?|compradore?s?|cards?|cartao|refunds?|disputes?|nfe|nota_fiscal|antifraud|risk|previous_attributes|previous|anterior|old_values?|changes)$/;

function isStatusKey(key: string, segs: string[]): boolean {
  // Status como objeto: Yampi status.data.alias, { status: { name: "Refunded" } }.
  if (/^(alias|slug|name|nome|code|codigo|description|descricao|value)$/.test(key) && /^(status|situacao)$/.test(kindOf(segs))) return true;
  if (key === "descricao" && kindOf(segs) === "tipo_postback") return true; // Monetizze
  if (STATUS_BAD_KEY.test(key)) return false;
  // "statusPagamento", "payment_status", "sale_status_detail"...
  return (
    /(^|_)status($|_(detail|enum|name|alias|descricao|description|pagamento|payment|venda|sale|pedido|order|compra|purchase|transacao|transaction))/.test(key) ||
    /^situacao(_|$)/.test(key)
  );
}

// Códigos numéricos conhecidos.
const EDUZZ_STATUS: Record<string, StatusClass> = {
  "1": "pending",
  "3": "approved",
  "4": "canceled",
  // 6 = "Aguardando reembolso": o reembolso ainda não saiu; quem retira o acesso é o 7.
  "6": "pending",
  "7": "refunded",
  "9": "canceled",
  "10": "canceled",
  "11": "pending",
  "15": "pending",
};
const PERFECTPAY_STATUS: Record<string, StatusClass> = {
  "1": "pending",
  "2": "approved",
  "3": "pending",
  // 4 = in_mediation: disputa aberta, ainda sem resultado (o 9 é o chargeback).
  "4": "disputed",
  "5": "canceled",
  "6": "canceled",
  "7": "refunded",
  "8": "pending",
  "9": "chargeback",
  "10": "approved",
  "11": "canceled",
  "12": "pending",
  "13": "canceled",
  "16": "pending",
};

/** Classifica um valor de status/evento. Os negativos vêm antes: "unpaid" nunca vira "paid". */
function classify(raw: string, key: string, platform: string): StatusClass {
  const s = slug(raw);
  if (!s) return "unknown";
  if (/^\d+$/.test(s)) {
    if (platform === "eduzz" && key === "trans_status") return EDUZZ_STATUS[s] || "unknown";
    if (platform === "perfectpay" && key === "sale_status_enum") return PERFECTPAY_STATUS[s] || "unknown";
    return "unknown";
  }
  // Stripe "no_payment_required" (cupom de 100% ou teste grátis): não é recusa; o evento/status decide.
  if (s === "no_payment_required") return "unknown";
  if (/^(lost|perdid[ao]|perdeu)$/.test(s)) return "lost";
  const words = s.split("_");
  const has = (re: RegExp) => words.some((w) => re.test(w));
  // "no"/"sem" só negam no começo ("NO_FUNDS", "Sem saldo"); no meio são preposição ("Pago no PIX").
  const lacks = words[0] === "no" || words[0] === "sem";
  const chargeback = /charge_?d?_?back/.test(s);
  // Disputa/reclamação/mediação aberta: o resultado ainda não saiu (Hotmart PURCHASE_PROTEST, Ticto "claimed",
  // Perfect Pay "in_mediation", Stripe charge.dispute.created).
  const dispute = has(/^(disput|protest|contest|reclam|claim|mediat|mediac)/);
  const refund = has(/^(refund|reembols|estorn|devolv|devoluc|returned$|revers)/);
  // "refund_failed", "estorno_negado", "not_refunded", "chargeback_won": o reembolso/chargeback não aconteceu.
  if ((chargeback || dispute || refund) && (lacks || has(/^(refus|recus|reject|rejeit|denied$|deny$|negad|fail|falh|won$|ganh|venceu|vencid|not$|nao$)/))) {
    return "unknown";
  }
  const partial = has(/^(partial|parcial)/);
  if (chargeback) {
    // "chargeback_reversed"/"chargeback revertido": o produtor recuperou o valor.
    if (has(/^(revers|revert)/)) return "unknown";
    return partial ? "partial" : "chargeback";
  }
  if (dispute) return has(/^(lost$|perdid|perdeu$)/) ? "chargeback" : "disputed";
  if (refund) {
    if (partial) return "partial";
    // Pedido de reembolso ainda não feito ("Reembolso solicitado", "Estorno pendente", "waiting_refund"):
    // o checkout manda o "reembolsado" quando sair; retirar antes tiraria o acesso de quem desistiu do pedido.
    if (has(/^(request|solicit|pend|aguard|waiting$|await|processing$|processando$|progress$|andamento$|analis|analys|review$|scheduled$|agendad)/)) {
      return "pending";
    }
    return "refunded";
  }
  if (has(/^(cancel|anulad|void|abandon|desist|deleted$|excluid)/) || /out_of_shopping_cart/.test(s)) return "canceled";
  // Hotmart NO_FUNDS, "Sem saldo", "insufficient_funds".
  if (lacks || has(/^(refus|recus|reject|rejeit|reprov|denied$|declin|negad|expir|vencid|venceu|fail|falh|error$|erro$|incomplete$|block|bloque|duplic|fraud|insufficient|insuficient)/)) {
    return "failed";
  }
  // Na Ticto, "authorized" é a venda aprovada — só a palavra sozinha ("not_authorized" não).
  if (platform === "ticto" && /^(authorized|authorised|autorizad[oa])$/.test(s)) return "approved";
  if (
    has(
      /^(unpaid$|not$|nao$|waiting|aguard|await|pend|processing$|processando$|processament|process$|review$|analis|analys|creat|criad|generat|gerad|print|impress|emitid|open$|opened$|abert|delay|atras|overdue$|late$|due$|authoriz|authoris|autoriz|pre$|preorder$|precheckout$|initiat|inici|started$|requires$|partial|parcial|trial|scheduled$|draft$|hold$|recover|recuper)/,
    )
  ) {
    return "pending";
  }
  if (has(/^(approv|aprovad|paid$|pago$|paga$|complet|conclu|succe|sucesso$|confirm|finaliz|captur|settled$|liberad|accredited$|creditad|renewed$|renovad)/)) {
    return "approved";
  }
  return "unknown";
}

/**
 * Reembolso e chargeback têm prioridade; aprovado só sem nenhum sinal contrário.
 * Reembolso parcial e disputa em aberto não retiram nem liberam: ficam "pending".
 */
function decide(classes: StatusClass[]): SaleStatus {
  const any = (c: StatusClass) => classes.includes(c);
  if (any("chargeback")) return "chargeback";
  // Stripe charge.dispute.closed + status "lost".
  if (any("disputed") && any("lost")) return "chargeback";
  // "PURCHASE_REFUNDED" + "PARTIALLY_REFUNDED": só parte do pedido foi devolvida.
  if (any("partial")) return "pending";
  if (any("refunded")) return "refunded";
  if (any("canceled") || any("failed")) return "canceled";
  if (any("pending") || any("disputed")) return "pending";
  if (any("approved")) return "approved";
  return "unknown";
}

function readStatus(leaves: Leaf[], headers: Record<string, string>, platform: string) {
  const events: Array<{ value: string; key: string; rank: number }> = [];
  const statuses: Array<{ value: string; key: string }> = [];
  for (const l of leaves) {
    if (l.inArray || outside(l.segs) || l.segs.some((s) => STATUS_BAD_SEG.test(s))) continue;
    const value = text(l.value);
    if (!value || value.length > 120) continue;
    // "type" só vale na raiz (Stripe); dentro do produto é "main"/"orderbump".
    let eventRank = l.key === "type" && l.segs.length ? -1 : EVENT_KEYS.indexOf(l.key);
    if (eventRank >= 0) eventRank += l.segs.length * 100;
    // Evento como objeto: { event: { name: "order.paid" } }.
    else if (/^(event|evento)$/.test(kindOf(l.segs)) && /^(name|nome|type|tipo|code|slug|alias|action|key)$/.test(l.key)) {
      eventRank = (l.segs.length - 1) * 100 + EVENT_KEYS.length;
    }
    if (eventRank >= 0) events.push({ value, key: l.key, rank: eventRank });
    else if (isStatusKey(l.key, l.segs)) statuses.push({ value, key: l.key });
  }
  events.sort((a, b) => a.rank - b.rank);
  const header = Object.entries(headers).find(([k, v]) => /^x-[a-z0-9-]*(event|topic)(-type|-name)?$/.test(k) && text(v));
  const found = [...events, ...statuses];
  if (header) found.push({ value: text(header[1]), key: "event" });
  const seen = new Set<string>();
  const statusValues: string[] = [];
  for (const f of found) {
    const k = f.value.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      statusValues.push(f.value);
    }
  }
  const classes = found.map((f) => classify(f.value, f.key, platform));
  // Stripe manda "charge.refunded" também no reembolso parcial; aí a cobrança continua com refunded: false.
  if (platform === "stripe" && classes.includes("refunded")) {
    const charge = leaves.find((l) => l.key === "refunded" && !l.inArray && l.segs.every((s) => WRAPPER.test(s)));
    if (charge && (charge.value === false || charge.value === "false")) classes.push("partial");
  }
  const status = decide(classes);
  return { event: events[0]?.value || (header ? text(header[1]) : ""), status, statusValues };
}

// ── Pedido e pagamento ──────────────────────────────────────────────
const ORDER_KEYS = [
  "order_id",
  "order_code",
  "id_pedido",
  "pedido_id",
  "codigo_pedido",
  "transaction",
  "transaction_id",
  "transaction_code",
  "trans_cod",
  "trans_key",
  "trans_id",
  "sale_id",
  "sale_code",
  "codigo_venda",
  "venda_id",
  "purchase_id",
  "payment_intent",
  "payment_id",
  "invoice_id",
  "charge_id",
];
const ORDER_OWNERS = ["order", "pedido", "payment", "pagamento", "sale", "venda", "purchase", "compra", "transaction", "transacao", "invoice", "fatura", "charge"];

function readOrderId(leaves: Leaf[], platform: string): string {
  const usable = leaves.filter(
    (l) =>
      !l.inArray &&
      !outside(l.segs) &&
      !l.segs.some((s) => PRODUCT.test(s) || OFFER.test(s) || BUYER.test(s) || /^(subscriptions?|assinaturas?)$/.test(s)),
  );
  const first = (test: (l: Leaf) => boolean) => {
    for (const l of usable) {
      if (!test(l)) continue;
      const v = validId(l.value);
      if (v) return v;
    }
    return "";
  };
  for (const key of ORDER_KEYS) {
    const v = first((l) => l.key === key);
    if (v) return v;
  }
  // GGCheckout { payment: { id } }, Ticto { order: { id } }, Monetizze { venda: { codigo } }
  for (const owner of ORDER_OWNERS) {
    for (const key of ["id", "codigo", "code", "hash", "uuid"]) {
      const v = first((l) => l.key === key && kindOf(l.segs) === owner);
      if (v) return v;
    }
  }
  if (platform === "shopify") return first((l) => l.key === "id" && !l.segs.length);
  if (platform === "perfectpay") return first((l) => l.key === "code" && !l.segs.length);
  // Cakto/Eduzz { data: { id } }, Stripe { data: { object: { id } } }, Yampi { resource: { id } }
  return first((l) => l.key === "id" && l.segs.length > 0 && l.segs.every((s) => WRAPPER.test(s))) || first((l) => l.key === "id" && !l.segs.length);
}

const METHOD_KEYS = [
  "payment_method",
  "payment_method_name",
  "payment_method_type",
  "metodo_pagamento",
  "forma_pagamento",
  "forma_de_pagamento",
  "tipo_pagamento",
  "payment_type",
  "billing_type",
  "trans_paymentmethod",
  "payment_form",
];
const METHOD_OWNER = /^(payments?|pagamentos?|payment_methods?|payment_method_details|forma_pagamento)$/;

/** "pix", "cartão", "boleto" ou o texto original em minúsculas. */
function normalizeMethod(value: unknown): string {
  const raw = text(value);
  const s = slug(raw);
  if (!s || /^\d+$/.test(s)) return "";
  // Id da Stripe (pm_...) antes de tudo: um id aleatório pode conter "pix" ou "card".
  if (/^[a-z]{2,5}_(?=[a-z0-9]*\d)[a-z0-9]{10,}$/i.test(raw)) return "";
  if (/pix/.test(s)) return "pix";
  if (/boleto|billet|bank_?slip|ticket/.test(s)) return "boleto";
  if (/card|cartao|credit|credito|debit|debito/.test(s) || /^(visa|master|mastercard|amex|elo|hipercard|diners)$/.test(s)) return "cartão";
  return raw.toLowerCase().slice(0, 40);
}

function readMethod(leaves: Leaf[]): string {
  const usable = leaves.filter((l) => !outside(l.segs) && !l.segs.some((s) => PRODUCT.test(s) || OFFER.test(s)));
  for (const key of METHOD_KEYS) {
    for (const l of usable) {
      if (l.inArray || l.key !== key) continue;
      const m = normalizeMethod(l.value);
      if (m) return m;
    }
  }
  // Hotmart { payment: { type } }, GGCheckout { payment: { method: "pix.paid" } }, Stripe { payment_method_details: { type } }.
  // Em listas de tentativas (Yampi transactions), vale a última.
  const owned = usable.filter((l) => /^(type|alias|method|name|slug)$/.test(l.key) && METHOD_OWNER.test(kindOf(l.segs)));
  for (const l of [...owned.filter((x) => !x.inArray), ...owned.filter((x) => x.inArray).reverse()]) {
    const m = normalizeMethod(l.value);
    if (m) return m;
  }
  for (const l of usable) {
    if (l.key !== "payment_method_types") continue;
    const m = normalizeMethod(l.value);
    if (m) return m;
  }
  return "";
}

// ── Produtos ────────────────────────────────────────────────────────
interface Draft {
  id: string;
  title: string;
  type: string;
  price: number | null;
  refs: string[];
  /** Oferta/plano: só vira item se o payload não tiver produto. */
  offer: boolean;
  /** Linha do pedido identificada só pelo "id" da linha: um produto dentro dela passa a ser o item. */
  line?: boolean;
}

/** Listas de linhas do pedido, onde o "id" costuma ser da linha e não do produto. */
const LINE = /^(items?|itens|line_items|order_items|cart_items|lines)$/;
/** Listas só com os ids dos produtos: { products: ["abc", "def"] }. */
const ID_LIST = /^(products?|produtos?|product_ids|produto_ids|products_ids|produtos_ids|items?|itens)$/;

const PRODUCT_ID_KEYS = [
  "product_id",
  "produto_id",
  "id_produto",
  "product_code",
  "product_cod",
  "codigo_produto",
  "cod_produto",
  "product_key",
  "product_hash",
  "product_uuid",
];
const ID_KEYS = [
  ...PRODUCT_ID_KEYS,
  "id",
  "code",
  "codigo",
  "cod",
  "ucode",
  "uuid",
  "hash",
  "sku",
  "key",
  "chave",
  "short_id",
  "external_id",
  "external_reference",
  "slug",
  "offer_id",
  "offer_code",
  "offer_hash",
  "plan_id",
  "plan_code",
  "plan_key",
  "variant_id",
  "price_id",
];
const TITLE_KEYS = ["title", "product_title", "product_name", "produto_nome", "nome_produto", "name", "nome", "titulo", "offer_name", "plan_name"];
const TYPE_KEYS = ["type", "item_type", "offer_type", "product_type", "tipo", "kind"];
const PRICE_KEYS = ["price", "unit_price", "sale_price", "offer_price", "product_price", "item_price", "amount", "unit_amount", "value", "valor", "preco"];
// Chaves soltas (Kiwify, Eduzz, Braip, Hotmart v1, metadata da Stripe).
const LOOSE_ID = [...PRODUCT_ID_KEYS, "prod", "prod_id"];
const LOOSE_TITLE = ["product_name", "produto_nome", "nome_produto", "product_title", "prod_name", "produto_titulo"];
const LOOSE_EXTRA = ["offer_id", "offer_code", "offer_hash", "codigo_oferta", "oferta_id", "plan_id", "plan_key", "plan_code", "plano_id", "off", "offer_name", "plan_name"];
const LOOSE_PRICE = ["product_price", "produto_valor", "valor_produto", "product_value"];

/** "orderbump", "upsell", "downsell", "main" ou "" (desconhecido). */
function normalizeType(value: unknown): string {
  const s = slug(value);
  if (!s) return "";
  if (/bump/.test(s)) return "orderbump";
  if (/(^|_)up_?sells?($|_)|upsell/.test(s)) return "upsell";
  if (/(^|_)down_?sells?($|_)|downsell/.test(s)) return "downsell";
  if (/^(main|principal|primary|main_product|produto_principal)$/.test(s)) return "main";
  return "";
}

function cleanTitle(value: unknown): string {
  const v = text(value).replace(/\s+/g, " ");
  return v.length <= 200 && !/^https?:/i.test(v) ? v : "";
}

function idsOf(f: Fields): string[] {
  // Com product_id, o "id" costuma ser da linha do pedido (Shopify, Yampi).
  const hasProductId = PRODUCT_ID_KEYS.some((k) => validId(f.prim.get(k)));
  const out: string[] = [];
  for (const k of ID_KEYS) {
    if (k === "id" && hasProductId) continue;
    const v = validId(f.prim.get(k));
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function priceOf(f: Fields, keys: string[], platform: string): number | null {
  for (const k of keys) {
    const v = f.prim.has(k) ? f.prim.get(k) : f.kids.get(k);
    if (v === undefined) continue;
    const n = toMoney(v, platform, k);
    if (n !== null) return n;
  }
  return null;
}

function typeOf(f: Fields, kind: string): string {
  for (const k of TYPE_KEYS) {
    const t = normalizeType(f.prim.get(k));
    if (t) return t;
  }
  return normalizeType(kind);
}

function looseOf(f: Fields, platform: string): Draft | null {
  const id = LOOSE_ID.map((k) => validId(f.prim.get(k))).find(Boolean) || "";
  const title = cleanTitle(pick(f, LOOSE_TITLE));
  const extras = LOOSE_EXTRA.map((k) => validId(f.prim.get(k))).filter(Boolean);
  if (!id && !title) return extras.length ? { id: extras[0], title: "", type: "", price: null, refs: extras.slice(1), offer: true } : null;
  return { id, title, type: "", price: priceOf(f, LOOSE_PRICE, platform), refs: extras, offer: false };
}

function merge(owner: Draft, child: Draft) {
  // Produto dentro de uma oferta ou de uma linha do pedido: o produto passa a ser o item.
  if ((owner.offer || owner.line) && child.id && !child.offer && !child.line) {
    owner.refs.push(owner.id, owner.title);
    owner.id = child.id;
    owner.title = child.title || owner.title;
    owner.offer = false;
    owner.line = false;
  } else {
    owner.refs.push(child.id, child.title);
    if (!owner.title) owner.title = child.title;
  }
  owner.refs.push(...child.refs);
  if (owner.price === null) owner.price = child.price;
  if (!owner.type) owner.type = child.type;
}

/**
 * Acha os produtos: objetos em product/products/items/offer/plan... que tenham id.
 * Objetos de produto dentro de outro (sku, preço, oferta) completam o de fora;
 * cada elemento de lista é um item próprio.
 */
function collectItems(
  input: unknown,
  segs: string[],
  listItem: boolean,
  owner: Draft | null,
  platform: string,
  out: Draft[],
  orphans: string[],
  depth = 0,
  open = new Set<unknown>(),
) {
  if (depth > MAX_DEPTH || segs.length > 24 || open.has(input)) return;
  if (Array.isArray(input)) {
    open.add(input);
    const ids = ID_LIST.test(kindOf(segs)) && !outside(segs) && !segs.some((s) => NOT_ITEMS.test(s));
    for (const v of input) {
      if (isPrim(v)) {
        if (!ids) continue;
        // Texto com espaço é nome, não id. Dentro de um produto (pacote), os ids só completam as referências.
        const id = validId(v);
        if (id && !/\s/.test(id)) {
          if (owner) owner.refs.push(id);
          else out.push({ id, title: "", type: "", price: null, refs: [], offer: false });
        } else if (cleanTitle(v)) orphans.push(cleanTitle(v));
      } else collectItems(v, segs, true, owner, platform, out, orphans, depth + 1, open);
    }
    open.delete(input);
    return;
  }
  if (!isObj(input) || outside(segs) || segs.some((s) => NOT_ITEMS.test(s))) return;
  open.add(input);
  const f = fieldsOf(input);
  const kind = kindOf(segs);
  let next = owner;
  if (PRODUCT.test(kind) || OFFER.test(kind)) {
    let ids = idsOf(f);
    const title = cleanTitle(pick(f, TITLE_KEYS));
    // Preço/plano que aponta o produto pelo id (Stripe price.product = "prod_..."): o produto é o item.
    const productRef = OFFER.test(kind) ? [f.prim.get("product"), f.prim.get("produto")].map(validId).find((v) => v && !/\s/.test(v)) || "" : "";
    if (productRef) ids = [productRef, ...ids.filter((x) => x !== productRef)];
    if (ids.length) {
      const draft: Draft = {
        id: ids[0],
        title,
        type: typeOf(f, kind),
        price: priceOf(f, PRICE_KEYS, platform),
        refs: ids.slice(1),
        offer: !PRODUCT.test(kind) && !productRef,
        line: LINE.test(kind) && !PRODUCT_ID_KEYS.some((k) => validId(f.prim.get(k))),
      };
      if (owner && !listItem) merge(owner, draft);
      else {
        out.push(draft);
        next = draft;
      }
    } else if (title) orphans.push(title);
  } else if (!BUYER.test(kind)) {
    const loose = looseOf(f, platform);
    if (loose && owner) merge(owner, loose);
    else if (loose) out.push(loose);
  }
  for (const [k, v] of Object.entries(input)) {
    if (v !== null && typeof v === "object") collectItems(v, [...segs, normKey(k)], false, next, platform, out, orphans, depth + 1, open);
  }
  open.delete(input);
}

/** Dica de tipo para venda de um produto só: Hotmart is_order_bump, Cakto offer_type. */
function saleTypeHint(leaves: Leaf[]): string {
  for (const l of leaves) {
    if (l.inArray || outside(l.segs)) continue;
    if (l.key === "is_order_bump" && (l.value === true || l.value === "true" || l.value === 1 || l.value === "1")) return "orderbump";
    if (/^(offer_type|item_type|sale_kind|purchase_type|tipo_oferta)$/.test(l.key)) {
      const t = normalizeType(l.value);
      if (t) return t;
    }
  }
  return "";
}

function readItems(data: Obj, leaves: Leaf[], platform: string): { items: SaleItem[]; productRefs: string[] } {
  const drafts: Draft[] = [];
  const orphans: string[] = [];
  collectItems(data, [], false, null, platform, drafts, orphans);
  const products = drafts.filter((d) => !d.offer);
  const refs: string[] = [];
  const items: SaleItem[] = [];
  const byKey = new Map<string, SaleItem>();
  for (const d of products.length ? products : drafts) {
    refs.push(d.id, d.title, ...d.refs);
    const key = d.id || `#${d.title.toLowerCase()}`;
    const prev = byKey.get(key);
    if (prev) {
      if (!prev.title) prev.title = d.title;
      if (!prev.type) prev.type = d.type;
      if (prev.price === null) prev.price = d.price;
      continue;
    }
    const item: SaleItem = { id: d.id, title: d.title, type: d.type, price: d.price };
    byKey.set(key, item);
    items.push(item);
  }
  // Oferta/plano ao lado do produto (Cakto, Perfect Pay, Hotmart) só entra nas referências.
  if (products.length) for (const d of drafts) if (d.offer) refs.push(d.id, d.title, ...d.refs);
  refs.push(...orphans);
  // Produto sem id (só nome): melhor mostrar o nome do que nada.
  if (!items.length) {
    for (const title of orphans) {
      if (byKey.has(`#${title.toLowerCase()}`)) continue;
      const item: SaleItem = { id: "", title, type: "", price: null };
      byKey.set(`#${title.toLowerCase()}`, item);
      items.push(item);
    }
  }
  if (items.length === 1 && !items[0].type) items[0].type = saleTypeHint(leaves) || "main";
  // Principal sem tipo ao lado de order bumps/upsells (Ticto item + order_bumps): é o principal.
  const untyped = items.filter((i) => !i.type);
  if (items.length > 1 && untyped.length === 1 && items.some((i) => i.type && i.type !== "main")) untyped[0].type = "main";
  const productRefs = Array.from(new Set(refs.map((r) => String(r || "").trim().toLowerCase()).filter((r) => r && r !== "0")));
  return { items, productRefs };
}

// ── Leitura completa ────────────────────────────────────────────────
/** Lê o webhook de qualquer checkout. Nunca lança erro: o que não achar fica vazio. */
export function parseSale(payload: unknown, headers?: Record<string, string>): ParsedSale {
  try {
    return readSale(payload, headers);
  } catch {
    // Rede de segurança: payload inesperado nunca derruba o webhook.
    return readSale({}, {});
  }
}

function readSale(payload: unknown, headers?: Record<string, string>): ParsedSale {
  const data = prepare(payload);
  const h = lowerHeaders(headers);
  const leaves: Leaf[] = [];
  const nodes: Node[] = [];
  walk(data, [], false, leaves, nodes);
  const platform = platformFromHeaders(h) || platformFromPayload(data, leaves);
  const buyer = readBuyer(nodes, leaves);
  const { event, status, statusValues } = readStatus(leaves, h, platform);
  const { amount, currency } = readAmount(leaves, platform);
  const { items, productRefs } = readItems(data, leaves, platform);
  return {
    email: buyer.email,
    name: buyer.name,
    phone: buyer.phone,
    document: buyer.document,
    event,
    status,
    approved: status === "approved",
    refunded: status === "refunded" || status === "chargeback",
    chargeback: status === "chargeback",
    statusValues,
    orderId: readOrderId(leaves, platform),
    amount,
    currency,
    paymentMethod: readMethod(leaves),
    platform,
    items,
    productRefs,
  };
}
