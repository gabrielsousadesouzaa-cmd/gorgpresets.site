// Registros: cada aviso do checkout (webhook) e cada e-mail que saiu, com os
// dados recebidos, o que foi feito e o e-mail exatamente como foi enviado.
// Daqui o produtor reprocessa vendas, liga produtos pendentes às coleções e
// reenvia e-mails sem sair da tela.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleCheck,
  CirclePause,
  CircleX,
  Copy,
  CornerDownRight,
  EyeOff,
  Info,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MailCheck,
  MailX,
  MessageCircle,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  Send,
  Trash2,
  Undo2,
  Webhook,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { isValidEmail, normalizeEmail, relativeDate, sortByOrder } from "../../lib/format";
import type { CheckoutItem, EmailLog, Product, WebhookLog, WebhookLogItem } from "../../lib/types";
import { PosterArt } from "../../components/PosterArt";
import { Avatar } from "../../components/ui";
import { Badge, Button, ButtonLink, Card, CopyButton, Drawer, EmptyState, Field, IconButton, Input, Modal, PageHeader, Segmented, Select, useConfirm } from "../ui";
import { useStudioAction, useStudioQuery } from "../hooks";
import { Tabs } from "../components/Tabs";
import { EmailPreview } from "../components/EmailPreview";
import { blankCheckoutItem, MapItemModal } from "../components/MapItemModal";

// ── Constantes e utilidades ─────────────────────────────────────────
type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "dark";
type TabId = "webhook" | "emails";
type Period = "24h" | "7d";
type SummaryKey = "granted" | "pending" | "sent" | "failed";
type ItemNow = "linked" | "ignored" | "pending" | "unknown";
type FilterOption = { value: string; label: string; dot?: string };

const PAGE = 50;
const RECENT = 200;
const AUTOMATIONS_URL = "/membros/studio/automacoes";
const EMAILS_URL = "/membros/studio/emails";
const MEMBERS_URL = "/membros/studio/membros";
const ITEMS_KEY = ["ma", "studio", "checkout-items"];
/** Avisos que ainda não são uma venda (ex: PIX gerado): reprocessar não libera nada. */
const NOT_FINAL = /generat|pending|waiting|aguard|gerad|abandon|created/i;

const norm = (value: string) => String(value || "").trim().toLowerCase();
const digits = (value: string) => String(value || "").replace(/\D/g, "");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fullDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" }) : "");
const longDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "medium" }) : "");

const WEBHOOK_STATUS: Record<string, { label: string; title: string; tone: Tone; icon: LucideIcon; dot: string }> = {
  granted: { label: "Liberado", title: "Acesso liberado", tone: "green", icon: CircleCheck, dot: "bg-emerald-500" },
  revoked: { label: "Retirado", title: "Acesso retirado", tone: "red", icon: Undo2, dot: "bg-red-500" },
  unmatched: { label: "Sem coleção", title: "Produto sem coleção ligada", tone: "amber", icon: AlertTriangle, dot: "bg-amber-500" },
  ignored: { label: "Ignorado", title: "Ignorado", tone: "neutral", icon: EyeOff, dot: "bg-[#a1a1a6]" },
  paused: { label: "Pausado", title: "Automação pausada", tone: "neutral", icon: CirclePause, dot: "bg-[#6e6e73]" },
  error: { label: "Erro", title: "Erro no processamento", tone: "red", icon: CircleX, dot: "bg-red-700" },
};
const statusInfo = (status: string) => WEBHOOK_STATUS[status] || { label: status || "—", title: status || "Evento", tone: "neutral" as Tone, icon: Webhook, dot: "bg-[#a1a1a6]" };
const WEBHOOK_FILTERS: FilterOption[] = [{ value: "", label: "Todos" }, ...Object.entries(WEBHOOK_STATUS).map(([value, s]) => ({ value, label: s.label, dot: s.dot }))];

const EMAIL_KINDS: Record<string, string> = { welcome: "Boas-vindas", refund: "Reembolso", access: "Acesso manual", reset: "Senha", test: "Teste" };
const kindLabel = (kind: string) => EMAIL_KINDS[kind] || kind || "—";
const EMAIL_FILTERS: FilterOption[] = [
  { value: "", label: "Todos" },
  { value: "sent", label: "Enviado", dot: "bg-emerald-500" },
  { value: "failed", label: "Falhou", dot: "bg-red-500" },
];
const PROVIDERS: Record<string, string> = { smtp: "SMTP", resend: "Resend" };
const providerLabel = (provider: string) => PROVIDERS[norm(provider)] || provider || "—";

const PLATFORMS = ["GGCheckout", "Hotmart", "Kiwify", "Cakto", "Eduzz", "Perfect Pay", "Ticto", "Yampi", "CartPanda", "Shopify", "Stripe", "Monetizze", "Braip"];
const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(PLATFORMS.map((p) => [p.toLowerCase().replace(/[\s_-]/g, ""), p]));
function platformLabel(platform: string) {
  const key = norm(platform).replace(/[\s_-]/g, "");
  if (!key) return "";
  return PLATFORM_LABELS[key] || platform.charAt(0).toUpperCase() + platform.slice(1);
}

const ITEM_TYPES: Record<string, string> = { main: "Principal", orderbump: "Order bump", upsell: "Upsell", downsell: "Downsell" };
const itemTypeLabel = (type: string) => ITEM_TYPES[norm(type).replace(/[\s_-]/g, "")] || type;

const TONE_SOFT: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-950 ring-emerald-200/70",
  red: "bg-red-50 text-red-950 ring-red-200/70",
  amber: "bg-amber-50 text-amber-950 ring-amber-200/70",
  blue: "bg-sky-50 text-sky-950 ring-sky-200/70",
  neutral: "bg-[#f5f5f7] text-[#1d1d1f] ring-black/[0.05]",
  dark: "bg-[#1d1d1f] text-white ring-black",
};
const TONE_ICON: Record<Tone, string> = {
  green: "text-emerald-600",
  red: "text-red-600",
  amber: "text-amber-600",
  blue: "text-sky-600",
  neutral: "text-[#6e6e73]",
  dark: "text-white",
};

function money(amount: number | null | undefined) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "";
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paymentLabel(raw: string) {
  const value = norm(raw).normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!value) return "";
  if (value.includes("pix")) return "PIX";
  if (/cartao|card|credit|credito|debit/.test(value)) return "Cartão";
  if (/boleto|billet|bank_slip/.test(value)) return "Boleto";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatPhone(raw: string) {
  const d = digits(raw);
  if (!d) return "";
  const local = (x: string) =>
    x.length === 11 ? `(${x.slice(0, 2)}) ${x.slice(2, 7)}-${x.slice(7)}` : x.length === 10 ? `(${x.slice(0, 2)}) ${x.slice(2, 6)}-${x.slice(6)}` : x;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `+55 ${local(d.slice(2))}`;
  if (d.length === 10 || d.length === 11) return local(d);
  return d.length > 11 ? `+${d}` : d;
}

function whatsappUrl(raw: string) {
  const d = digits(raw);
  if (d.length < 10) return "";
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

function formatDocument(raw: string) {
  const d = digits(raw);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return raw;
}

function displayName(log: WebhookLog) {
  return log.buyerName || log.email || "Comprador sem nome";
}

function collectionTitle(id: string, products: Product[]) {
  if (!products.length) return "Coleção";
  return products.find((p) => p.id === id)?.title || "Coleção removida";
}

function uniqueById<T extends { id: string }>(list: T[]) {
  const seen = new Set<string>();
  return list.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

/** Produto que, quando a venda chegou, não liberava nada (nem estava ignorado). */
const wasPending = (item: WebhookLogItem) => !item.matched && !item.ignored;

/** Como o produto está ligado agora (pode ter mudado depois da venda). */
function nowState(item: WebhookLogItem, index: Map<string, CheckoutItem>): ItemNow {
  const current = index.get(norm(item.id));
  if (!current) return "unknown";
  if (current.ignored) return "ignored";
  return current.productIds.length ? "linked" : "pending";
}

function pendingOf(log: WebhookLog, index: Map<string, CheckoutItem>) {
  const pending: WebhookLogItem[] = [];
  const linkedSince: WebhookLogItem[] = [];
  for (const item of log.items) {
    if (!wasPending(item)) continue;
    const state = nowState(item, index);
    if (state === "linked") linkedSince.push(item);
    else if (state !== "ignored") pending.push(item);
  }
  return { pending, linkedSince };
}

function payloadText(payload: unknown) {
  if (payload === null || payload === undefined) return "";
  if (typeof payload === "string") {
    try {
      return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      return payload;
    }
  }
  try {
    return JSON.stringify(payload, null, 2) ?? "";
  } catch {
    return String(payload);
  }
}

/** Destaca chaves, textos, números e booleanos do JSON (sem HTML cru). */
function highlightJson(text: string): ReactNode {
  if (text.length > 80_000) return text;
  const token = /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1]) {
      out.push(<span key={key++} className={match[2] ? "text-sky-300" : "text-emerald-300"}>{match[1]}</span>);
      if (match[2]) out.push(match[2]);
    } else if (match[3]) {
      out.push(<span key={key++} className="text-fuchsia-300">{match[3]}</span>);
    } else {
      out.push(<span key={key++} className="text-amber-300">{match[4]}</span>);
    }
    last = token.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Traduz a resposta do servidor ao reprocessar em uma frase curta. */
function describeReplay(response: { ok: boolean; result: unknown }): { tone: "success" | "info" | "warning" | "error"; text: string } {
  const r = (response.result && typeof response.result === "object" ? response.result : {}) as Record<string, unknown>;
  if (typeof r.error === "string") {
    if (r.error === "email-temporary") return { tone: "warning", text: "Acesso liberado, mas o e-mail não saiu. Veja o erro nos registros de e-mail." };
    if (r.error === "account") return { tone: "error", text: "O acesso foi liberado, mas a conta não foi criada. Veja os detalhes do evento." };
    return { tone: "error", text: `O reprocessamento falhou: ${r.error}.` };
  }
  if (typeof r.granted === "number") {
    if (r.granted === 0) return { tone: "info", text: "O comprador já tinha esse acesso: nada mudou." };
    const what = `Acesso liberado: ${plural(r.granted, "coleção", "coleções")}`;
    return r.email === "failed" ? { tone: "warning", text: `${what}, mas o e-mail falhou.` } : { tone: "success", text: `${what}.` };
  }
  if (typeof r.revoked === "number") {
    return r.revoked > 0
      ? { tone: "success", text: `Acesso retirado: ${plural(r.revoked, "coleção", "coleções")}.` }
      : { tone: "info", text: "Não havia acesso liberado por venda para retirar." };
  }
  switch (r.ignored) {
    case "paused":
      return { tone: "warning", text: "A automação está pausada: nada foi alterado." };
    case "no-email":
      return { tone: "warning", text: "O aviso não tem o e-mail do comprador." };
    case "no-product":
      return { tone: "warning", text: "Os produtos desta venda ainda não estão ligados a coleções." };
    case "status":
      return { tone: "info", text: "O pagamento desta venda não está aprovado: nada foi liberado." };
    case "grant-disabled":
      return { tone: "warning", text: "A liberação automática está desligada nas Automações." };
    case "revoke-disabled":
      return { tone: "warning", text: "A retirada automática está desligada nas Automações." };
  }
  return response.ok ? { tone: "success", text: "Evento reprocessado." } : { tone: "error", text: "O reprocessamento falhou." };
}

function useDebounced<T>(value: T, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Acha um registro pelo id (link direto ?evento= / ?email=): primeiro no que
 * já está carregado; se não estiver, procura nas páginas mais antigas.
 */
function useLogLookup<T extends { id: string }>(
  scope: string,
  id: string | null,
  loaded: T[],
  ready: boolean,
  fetchPage: (before?: string) => Promise<T[]>,
  dateOf: (item: T) => string,
) {
  const inList = id ? loaded.find((l) => l.id === id) : undefined;
  const query = useQuery({
    queryKey: ["ma", "studio", "registro", scope, id],
    enabled: !!id && !inList && ready,
    staleTime: 15_000,
    retry: 1,
    queryFn: async (): Promise<T | null> => {
      let before: string | undefined;
      for (let i = 0; i < 5; i++) {
        const page = await fetchPage(before);
        const hit = page.find((l) => l.id === id);
        if (hit) return hit;
        if (page.length < RECENT) return null;
        before = dateOf(page[page.length - 1]);
      }
      return null;
    },
  });
  if (!id) return { log: null, loading: false, missing: false, error: null as Error | null, retry: query.refetch };
  if (inList) return { log: inList, loading: false, missing: false, error: null as Error | null, retry: query.refetch };
  return {
    log: query.data ?? null,
    loading: !ready || query.isPending,
    missing: query.isSuccess && !query.data,
    error: query.isError ? (query.error as Error) : null,
    retry: query.refetch,
  };
}

// ── Página ──────────────────────────────────────────────────────────
export default function LogsPage() {
  const repo = useRepo();
  const { catalog } = useCatalog();
  const products = useMemo(() => sortByOrder(catalog.products), [catalog.products]);
  const [params, setParams] = useSearchParams();
  const eventId = params.get("evento");
  const emailId = params.get("email");
  const aba = params.get("aba");
  const tab: TabId = aba === "emails" || (aba !== "webhook" && !!emailId && !eventId) ? "emails" : "webhook";

  const patch = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const changeTab = useCallback((value: TabId) => patch({ aba: value, evento: null, email: null }), [patch]);
  const openEvent = useCallback((id: string | null) => patch({ aba: "webhook", evento: id, email: null }), [patch]);
  const openEmail = useCallback((id: string | null) => patch({ aba: "emails", email: id, evento: null }), [patch]);

  // Últimos registros sem filtro: alimentam o resumo e os links diretos.
  const recentWebhook = useStudioQuery("automation-logs", () => repo.listWebhookLogs({ limit: RECENT }));
  const recentEmails = useStudioQuery("email-logs-recent", () => repo.listEmailLogs({ limit: RECENT }));

  const [period, setPeriod] = useState<Period>("24h");
  const summary = useMemo(() => summarize(recentWebhook.data, recentEmails.data, period), [recentWebhook.data, recentEmails.data, period]);

  const [webhookFilter, setWebhookFilter] = useState("");
  const [webhookSearch, setWebhookSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [emailKind, setEmailKind] = useState("");
  const [emailSearch, setEmailSearch] = useState("");

  const pick = (key: SummaryKey) => {
    if (key === "granted" || key === "pending") {
      setWebhookFilter(key === "granted" ? "granted" : "unmatched");
      setWebhookSearch("");
      changeTab("webhook");
    } else {
      setEmailFilter(key);
      setEmailKind("");
      setEmailSearch("");
      changeTab("emails");
    }
    window.requestAnimationFrame(() => document.getElementById("registros-lista")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="pb-16">
      <PageHeader
        title="Registros"
        subtitle="Tudo o que o checkout avisou e cada e-mail que saiu, com os dados recebidos e o resultado. Reprocesse vendas e reenvie e-mails por aqui."
        actions={
          <>
            <ButtonLink to={AUTOMATIONS_URL} variant="secondary" icon={<Workflow size={15} />}>Automações</ButtonLink>
            <ButtonLink to={EMAILS_URL} variant="secondary" icon={<Mail size={15} />}>E-mails</ButtonLink>
          </>
        }
      />

      <SummaryPanel
        period={period}
        setPeriod={setPeriod}
        summary={summary}
        loadingWebhook={recentWebhook.isLoading}
        loadingEmails={recentEmails.isLoading}
        onPick={pick}
      />

      <div id="registros-lista" className="scroll-mt-20 lg:scroll-mt-8">
        <Tabs<TabId>
          value={tab}
          onChange={changeTab}
          className="mb-6"
          tabs={[
            {
              value: "webhook",
              label: (
                <span className="flex items-center gap-2">
                  <Webhook size={15} /> Vendas (webhook)
                </span>
              ),
              count: summary.pending || undefined,
              tone: "amber",
            },
            {
              value: "emails",
              label: (
                <span className="flex items-center gap-2">
                  <Mail size={15} /> E-mails
                </span>
              ),
              count: summary.failed || undefined,
              tone: "red",
            },
          ]}
        />

        {tab === "webhook" ? (
          <WebhookTab
            status={webhookFilter}
            setStatus={setWebhookFilter}
            search={webhookSearch}
            setSearch={setWebhookSearch}
            eventId={eventId}
            openEvent={openEvent}
            products={products}
            recent={recentWebhook.data}
            recentSettled={!recentWebhook.isPending}
          />
        ) : (
          <EmailTab
            status={emailFilter}
            setStatus={setEmailFilter}
            kind={emailKind}
            setKind={setEmailKind}
            search={emailSearch}
            setSearch={setEmailSearch}
            emailId={emailId}
            openEmail={openEmail}
            recent={recentEmails.data}
            recentSettled={!recentEmails.isPending}
          />
        )}
      </div>
    </div>
  );
}

// ── Resumo ──────────────────────────────────────────────────────────
interface Summary {
  granted: number | null;
  pending: number | null;
  sent: number | null;
  failed: number | null;
  webhookFull: boolean;
  emailFull: boolean;
}

function summarize(webhook: WebhookLog[] | undefined, emails: EmailLog[] | undefined, period: Period): Summary {
  const since = Date.now() - (period === "24h" ? 1 : 7) * 86_400_000;
  const inWindow = (iso: string) => new Date(iso).getTime() >= since;
  const w = (webhook ?? []).filter((l) => inWindow(l.receivedAt));
  const e = (emails ?? []).filter((l) => inWindow(l.createdAt));
  // Uma venda reprocessada continua sendo uma venda só.
  const sales = new Set(w.filter((l) => l.status === "granted").map((l) => `${l.email}|${l.orderId || l.replayOf || l.id}`));
  const replayed = new Set((webhook ?? []).map((l) => l.replayOf).filter(Boolean));
  return {
    granted: webhook ? sales.size : null,
    pending: webhook ? w.filter((l) => l.status === "unmatched" && !replayed.has(l.id) && !NOT_FINAL.test(l.event)).length : null,
    sent: emails ? e.filter((l) => l.status === "sent").length : null,
    failed: emails ? e.filter((l) => l.status === "failed").length : null,
    webhookFull: !!webhook && webhook.length >= RECENT && inWindow(webhook[webhook.length - 1].receivedAt),
    emailFull: !!emails && emails.length >= RECENT && inWindow(emails[emails.length - 1].createdAt),
  };
}

function SummaryPanel({
  period,
  setPeriod,
  summary,
  loadingWebhook,
  loadingEmails,
  onPick,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  summary: Summary;
  loadingWebhook: boolean;
  loadingEmails: boolean;
  onPick: (key: SummaryKey) => void;
}) {
  const fmt = (value: number | null, full: boolean) => (value === null ? "—" : full ? `${value}+` : String(value));
  const tiles: Array<{ key: SummaryKey; label: string; value: string; loading: boolean; icon: ReactNode; tone?: "amber" | "red" }> = [
    { key: "granted", label: "Vendas liberadas", value: fmt(summary.granted, summary.webhookFull), loading: loadingWebhook, icon: <CircleCheck size={17} className="text-emerald-600" /> },
    {
      key: "pending",
      label: "Vendas sem coleção",
      value: fmt(summary.pending, summary.webhookFull),
      loading: loadingWebhook,
      icon: <Package size={17} />,
      tone: summary.pending ? "amber" : undefined,
    },
    { key: "sent", label: "E-mails enviados", value: fmt(summary.sent, summary.emailFull), loading: loadingEmails, icon: <MailCheck size={17} className="text-emerald-600" /> },
    {
      key: "failed",
      label: "E-mails com falha",
      value: fmt(summary.failed, summary.emailFull),
      loading: loadingEmails,
      icon: <MailX size={17} />,
      tone: summary.failed ? "red" : undefined,
    },
  ];

  return (
    <section className="mb-8 rounded-[1.6rem] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_30px_-12px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.05] md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight">Resumo</h2>
          <p className="text-[12px] text-[#86868b]">{period === "24h" ? "Últimas 24 horas" : "Últimos 7 dias"}</p>
        </div>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "24h", label: "24 horas" },
            { value: "7d", label: "7 dias" },
          ]}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => onPick(tile.key)}
            className={cn(
              "group rounded-2xl p-4 text-left ring-1 ring-inset transition-colors",
              tile.tone === "amber"
                ? "bg-amber-50 ring-amber-200/70 hover:bg-amber-100/70"
                : tile.tone === "red"
                  ? "bg-red-50 ring-red-200/70 hover:bg-red-100/60"
                  : "bg-[#f5f5f7] ring-black/[0.04] hover:bg-black/[0.06]",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg",
                tile.tone === "amber" ? "bg-amber-100 text-amber-700" : tile.tone === "red" ? "bg-red-100 text-red-600" : "bg-white text-[#1d1d1f] shadow-sm",
              )}
            >
              {tile.icon}
            </span>
            <span
              className={cn(
                "mt-4 block text-[1.75rem] font-bold leading-none tracking-tight tabular-nums",
                tile.loading && "animate-pulse text-[#c7c7cc]",
                tile.tone === "amber" && "text-amber-800",
                tile.tone === "red" && "text-red-700",
              )}
            >
              {tile.loading ? "—" : tile.value}
            </span>
            <span className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-[#6e6e73]">
              {tile.label}
              <ArrowRight size={12} className="opacity-50 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#a1a1a6]">
        {summary.webhookFull || summary.emailFull
          ? `Mais de ${RECENT} registros no período: os números contam os ${RECENT} mais recentes de cada tipo.`
          : "Clique em um número para ver os registros."}
      </p>
    </section>
  );
}

// ── Aba: vendas (webhook) ───────────────────────────────────────────
function WebhookTab({
  status,
  setStatus,
  search,
  setSearch,
  eventId,
  openEvent,
  products,
  recent,
  recentSettled,
}: {
  status: string;
  setStatus: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  eventId: string | null;
  openEvent: (id: string | null) => void;
  products: Product[];
  recent: WebhookLog[] | undefined;
  recentSettled: boolean;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const term = useDebounced(search.trim(), 350);
  const filtered = !!status || !!term;

  const query = useInfiniteQuery({
    queryKey: ["ma", "studio", "registros", "webhook", status, term],
    queryFn: ({ pageParam }) => repo.listWebhookLogs({ status: status || undefined, search: term || undefined, limit: PAGE, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: WebhookLog[]) => (last.length < PAGE ? undefined : last[last.length - 1].receivedAt),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const logs = useMemo(() => uniqueById(query.data?.pages.flat() ?? []), [query.data]);

  const itemsQuery = useStudioQuery("checkout-items", () => repo.listCheckoutItems());
  const index = useMemo(() => new Map((itemsQuery.data ?? []).map((i) => [norm(i.externalId), i] as const)), [itemsQuery.data]);

  const known = useMemo(() => [...logs, ...(recent ?? [])], [logs, recent]);
  const selected = useLogLookup("webhook", eventId, known, !query.isPending && recentSettled, (before) => repo.listWebhookLogs({ limit: RECENT, before }), (l) => l.receivedAt);
  const selectedLog = selected.log;
  const replayChild = useMemo(() => (selectedLog ? known.find((l) => l.replayOf === selectedLog.id) ?? null : null), [known, selectedLog]);

  const [mapping, setMapping] = useState<{ item: CheckoutItem; isNew: boolean; log: WebhookLog } | null>(null);
  const [replaying, setReplaying] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const startMapping = async (log: WebhookLog, item: WebhookLogItem, list?: CheckoutItem[]) => {
    const items = list ?? itemsQuery.data ?? (await itemsQuery.refetch()).data ?? [];
    const found = items.find((c) => norm(c.externalId) === norm(item.id));
    setMapping({ log, item: found ?? blankCheckoutItem(item.id, item.title, log.platform), isNew: !found });
  };

  const replay = async (log: WebhookLog, ask = true) => {
    if (ask) {
      const ok = await confirm({
        title: "Reprocessar esta venda?",
        text: NOT_FINAL.test(log.event)
          ? `Este aviso (${log.event}) ainda não é de um pagamento aprovado, então reprocessar não deve liberar nada. Quer tentar mesmo assim?`
          : "O evento é processado de novo com as ligações e as regras de agora. Se liberar um acesso novo, o comprador recebe o e-mail. O resultado aparece como um novo registro.",
        confirmLabel: "Reprocessar",
      });
      if (!ok) return;
    }
    setReplaying(log.id);
    const response = await run(() => repo.replayWebhook(log.id), { scopes: ["studio"] });
    if (response) {
      const outcome = describeReplay(response);
      toast[outcome.tone](outcome.text);
      try {
        const latest = await repo.listWebhookLogs({ limit: 20 });
        const child = latest.find((l) => l.replayOf === log.id);
        if (child) openEvent(child.id);
      } catch {
        // A lista já foi recarregada; o novo registro aparece nela.
      }
    }
    setReplaying(null);
  };

  /** Depois de ligar um produto: liga o próximo pendente ou oferece reprocessar. */
  const afterMapped = (log: WebhookLog, saved: CheckoutItem) => {
    // Espera o modal fechar antes de abrir o próximo passo.
    window.setTimeout(async () => {
      const fresh = queryClient.getQueryData<CheckoutItem[]>(ITEMS_KEY) ?? [];
      const freshIndex = new Map(fresh.map((i) => [norm(i.externalId), i] as const));
      const next = pendingOf(log, freshIndex).pending.find((i) => norm(i.id) !== norm(saved.externalId));
      if (next) {
        toast.info(`Agora ligue “${next.title || next.id}”, o outro produto desta venda.`);
        void startMapping(log, next, fresh);
        return;
      }
      if (saved.ignored || !saved.productIds.length || NOT_FINAL.test(log.event)) return;
      const ok = await confirm({
        title: "Reprocessar este evento?",
        text: `“${saved.title || saved.externalId}” agora libera ${plural(saved.productIds.length, "coleção", "coleções")}. Reprocesse a venda de ${displayName(log)} para aplicar a ligação.`,
        confirmLabel: "Reprocessar agora",
      });
      if (ok) void replay(log, false);
    }, 0);
  };

  const clear = async () => {
    const ok = await confirm({
      title: "Limpar o histórico de vendas?",
      text: "Todos os avisos recebidos do checkout serão apagados desta lista. Acessos, membros e produtos do checkout não mudam. Não dá para desfazer.",
      confirmLabel: "Limpar histórico",
      danger: true,
    });
    if (!ok) return;
    setClearing(true);
    await run(() => repo.clearWebhookLogs(), { success: "Histórico de vendas apagado", scopes: ["studio"] });
    setClearing(false);
    openEvent(null);
  };

  const resetFilters = () => {
    setStatus("");
    setSearch("");
  };

  const drawerState = selectedLog ? pendingOf(selectedLog, index) : { pending: [], linkedSince: [] };
  const closeDrawer = useCallback(() => openEvent(null), [openEvent]);

  let content: ReactNode;
  if (query.isPending) content = <ListSkeleton />;
  else if (query.isError && !query.data) content = <ErrorBox message={(query.error as Error)?.message} onRetry={() => void query.refetch()} />;
  else if (!logs.length && !filtered)
    content = (
      <EmptyState
        icon={<Webhook />}
        title="Nenhuma venda recebida ainda"
        text="Quando o checkout avisar uma venda, ela aparece aqui com tudo o que chegou: comprador, produtos, valor e o que foi liberado."
        action={<ButtonLink to={AUTOMATIONS_URL} icon={<Workflow size={15} />}>Conectar o checkout</ButtonLink>}
      />
    );
  else if (!logs.length) content = <NoResults text="Nenhuma venda com esses filtros." onClear={resetFilters} />;
  else
    content = (
      <Card padded={false} className={cn("overflow-hidden transition-opacity", query.isPlaceholderData && "opacity-60")}>
        <div className="hidden grid-cols-[150px_minmax(0,1fr)_minmax(0,1.25fr)_132px] gap-5 border-b border-black/[0.05] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6] xl:grid">
          <span>Situação</span>
          <span>Comprador</span>
          <span>Produtos e coleções</span>
          <span className="text-right">Valor e e-mail</span>
        </div>
        <ul className="divide-y divide-black/[0.05]" aria-label="Vendas recebidas">
          {logs.map((log) => (
            <WebhookRow
              key={log.id}
              log={log}
              products={products}
              index={index}
              active={log.id === eventId}
              onOpen={() => openEvent(log.id)}
              onMap={(item) => void startMapping(log, item)}
            />
          ))}
        </ul>
        <ListFooter
          count={logs.length}
          noun={["evento", "eventos"]}
          filtered={filtered}
          hasMore={!!query.hasNextPage}
          loading={query.isFetchingNextPage}
          onMore={() => void query.fetchNextPage()}
        />
      </Card>
    );

  return (
    <>
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por e-mail, nome ou pedido"
        refreshing={query.isFetching && !query.isFetchingNextPage && !query.isPending}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["ma", "studio"] })}
        clearLabel="Limpar histórico"
        onClear={clear}
        clearing={clearing}
        canClear={filtered || logs.length > 0}
      >
        <FilterChips label="Filtrar por situação" value={status} onChange={setStatus} options={WEBHOOK_FILTERS} />
      </Toolbar>

      {content}

      <Drawer
        open={!!eventId}
        onClose={closeDrawer}
        title={selectedLog ? displayName(selectedLog) : "Venda"}
        description={selectedLog ? `${statusInfo(selectedLog.status).title} · ${relativeDate(selectedLog.receivedAt)}` : undefined}
        footer={
          selectedLog ? (
            <>
              <Button
                variant={drawerState.linkedSince.length && !replayChild ? "accent" : "primary"}
                icon={<RotateCcw size={15} />}
                loading={replaying === selectedLog.id}
                onClick={() => void replay(selectedLog)}
              >
                Reprocessar
              </Button>
              {drawerState.pending.length > 0 && (
                <Button variant="secondary" icon={<Link2 size={15} />} onClick={() => void startMapping(selectedLog, drawerState.pending[0])}>
                  Ligar produtos ({drawerState.pending.length})
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {selectedLog ? (
          <WebhookDetails
            log={selectedLog}
            products={products}
            index={index}
            replayChild={replayChild}
            linkedSince={drawerState.linkedSince.length}
            onOpenEvent={openEvent}
            onMap={(item) => void startMapping(selectedLog, item)}
          />
        ) : selected.error ? (
          <ErrorBox message={selected.error.message} onRetry={() => void selected.retry()} />
        ) : selected.missing ? (
          <NotFound title="Evento não encontrado" text="Ele não está mais no histórico (pode ter sido apagado)." />
        ) : (
          <DrawerLoading />
        )}
      </Drawer>

      <MapItemModal
        item={mapping?.item ?? null}
        isNew={mapping?.isNew}
        products={products}
        onClose={() => setMapping(null)}
        onSaved={(saved) => {
          if (mapping) afterMapped(mapping.log, saved);
        }}
      />
    </>
  );
}

function WebhookRow({
  log,
  products,
  index,
  active,
  onOpen,
  onMap,
}: {
  log: WebhookLog;
  products: Product[];
  index: Map<string, CheckoutItem>;
  active: boolean;
  onOpen: () => void;
  onMap: (item: WebhookLogItem) => void;
}) {
  const st = statusInfo(log.status);
  const name = log.buyerName || (log.email ? log.email.split("@")[0] : "Sem comprador");
  const payment = paymentLabel(log.paymentMethod);
  return (
    <li onClick={onOpen} className={cn("cursor-pointer px-4 py-4 transition-colors hover:bg-black/[0.02] md:px-5", active && "bg-black/[0.03]")}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-8 xl:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.25fr)_132px] xl:gap-5">
        {/* Situação e data */}
        <div className="flex items-center justify-between gap-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-start xl:justify-start xl:gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={st.tone}>
              <st.icon size={11} /> {st.label}
            </Badge>
            {log.replayOf && (
              <Badge tone="blue">
                <RotateCcw size={10} /> Reprocessado
              </Badge>
            )}
          </div>
          <time dateTime={log.receivedAt} title={fullDate(log.receivedAt)} className="shrink-0 text-[12px] text-[#86868b]">
            {relativeDate(log.receivedAt)}
          </time>
        </div>

        {/* Comprador e evento */}
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={log.buyerName} email={log.email} size={34} className="mt-0.5 ring-black/10" />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              aria-label={`Ver detalhes da venda de ${name}`}
              className="block max-w-full truncate rounded text-left text-[14px] font-semibold text-[#1d1d1f] outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f]"
            >
              {name}
            </button>
            <p className="truncate text-[12.5px] text-[#6e6e73]">{log.email || "Sem e-mail no aviso"}</p>
            <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[#86868b]">
              <code className="max-w-full truncate rounded-md bg-black/[0.05] px-1.5 py-px font-mono text-[11px] text-[#424245]">{log.event || "sem evento"}</code>
              {log.platform && <span>{platformLabel(log.platform)}</span>}
              {log.orderId && <span className="max-w-full truncate">#{log.orderId}</span>}
            </p>
          </div>
        </div>

        {/* Produtos e coleções */}
        <div className="min-w-0">
          <ItemChips log={log} index={index} onMap={onMap} />
          <CollectionsLine ids={log.productIds} products={products} status={log.status} />
        </div>

        {/* Valor e e-mail */}
        <div className="flex items-center justify-between gap-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end xl:justify-start xl:gap-2 xl:text-right">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tabular-nums">{money(log.amount) || "—"}</p>
            {payment && <p className="text-[11.5px] text-[#86868b]">{payment}</p>}
          </div>
          <EmailPill log={log} />
        </div>
      </div>
    </li>
  );
}

function ItemChips({ log, index, onMap, max = 3 }: { log: WebhookLog; index: Map<string, CheckoutItem>; onMap: (item: WebhookLogItem) => void; max?: number }) {
  if (!log.items.length) return <p className="text-[12px] text-[#a1a1a6]">Nenhum produto no aviso</p>;
  const shown = log.items.slice(0, max);
  const rest = log.items.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <ItemChip key={item.id} item={item} now={nowState(item, index)} onMap={() => onMap(item)} />
      ))}
      {rest > 0 && <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold text-[#6e6e73]">+{rest}</span>}
    </div>
  );
}

function ItemChip({ item, now, onMap }: { item: WebhookLogItem; now: ItemNow; onMap: () => void }) {
  const label = item.title || item.id;
  const base = "inline-flex max-w-[220px] items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset";
  if (item.matched) {
    return (
      <span title={`Ligado a coleção · ID ${item.id}`} className={cn(base, "bg-emerald-50 text-emerald-800 ring-emerald-200/70")}>
        <Check size={11} className="shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }
  if (item.ignored) {
    return (
      <span title={`Ignorado · ID ${item.id}`} className={cn(base, "bg-black/[0.04] text-[#86868b] ring-black/[0.06]")}>
        <EyeOff size={11} className="shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }
  const fixed = now === "linked";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onMap();
      }}
      aria-label={fixed ? `${label}: já ligado depois desta venda. Ver ligação` : `Ligar ${label} a coleções`}
      title={fixed ? "Ligado a coleções depois desta venda: reprocesse para liberar." : "Sem coleção ligada. Clique para ligar."}
      className={cn(base, "bg-amber-50 text-amber-800 ring-amber-300/70 transition hover:bg-amber-100")}
    >
      {fixed ? <Check size={11} className="shrink-0" /> : <AlertTriangle size={11} className="shrink-0" />}
      <span className="truncate">{label}</span>
      {!fixed && <Link2 size={11} className="shrink-0 opacity-60" />}
    </button>
  );
}

function CollectionsLine({ ids, products, status }: { ids: string[]; products: Product[]; status: string }) {
  if (!ids.length) return null;
  const titles = ids.map((id) => collectionTitle(id, products)).join(", ");
  const verb = status === "revoked" ? "Retirado" : status === "granted" ? "Liberado" : "Coleções";
  return (
    <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] text-[#6e6e73]" title={titles}>
      <CornerDownRight size={12} className="shrink-0 text-[#a1a1a6]" />
      <span className="truncate">
        <span className="font-semibold text-[#1d1d1f]">{verb}:</span> {titles}
      </span>
    </p>
  );
}

function EmailPill({ log }: { log: WebhookLog }) {
  const status = log.emailStatus;
  const base = "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset";
  if (status === "sent" || status === "failed") {
    const sent = status === "sent";
    const body = (
      <>
        {sent ? <MailCheck size={12} /> : <MailX size={12} />}
        {sent ? "Enviado" : "Falhou"}
        {log.emailLogId && <ArrowUpRight size={11} className="opacity-60" />}
      </>
    );
    const tone = sent ? "bg-emerald-50 text-emerald-800 ring-emerald-200/70" : "bg-red-50 text-red-700 ring-red-200/70";
    if (!log.emailLogId) return <span className={cn(base, tone)}>{body}</span>;
    return (
      <Link
        to={`?aba=emails&email=${encodeURIComponent(log.emailLogId)}`}
        onClick={(e) => e.stopPropagation()}
        title="Ver o e-mail"
        aria-label={sent ? "E-mail enviado: ver o e-mail" : "E-mail falhou: ver o erro"}
        className={cn(base, tone, "transition", sent ? "hover:bg-emerald-100" : "hover:bg-red-100")}
      >
        {body}
      </Link>
    );
  }
  if (status === "skipped") {
    return (
      <span title={log.message} className={cn(base, "bg-black/[0.04] text-[#6e6e73] ring-black/[0.06]")}>
        <Mail size={12} /> Não enviado
      </span>
    );
  }
  return <span className="text-[11.5px] text-[#a1a1a6]">Sem e-mail</span>;
}

function WebhookDetails({
  log,
  products,
  index,
  replayChild,
  linkedSince,
  onOpenEvent,
  onMap,
}: {
  log: WebhookLog;
  products: Product[];
  index: Map<string, CheckoutItem>;
  replayChild: WebhookLog | null;
  linkedSince: number;
  onOpenEvent: (id: string) => void;
  onMap: (item: WebhookLogItem) => void;
}) {
  const st = statusInfo(log.status);
  const [expanded, setExpanded] = useState(false);
  const json = useMemo(() => payloadText(log.payload), [log.payload]);
  const highlighted = useMemo(() => highlightJson(json), [json]);
  const phone = formatPhone(log.buyerPhone);
  const whatsapp = whatsappUrl(log.buyerPhone);
  const documentDigits = digits(log.buyerDocument);
  const collectionsTitle = log.status === "revoked" ? "Coleções retiradas" : log.status === "granted" ? "Coleções liberadas" : "Coleções da venda";

  return (
    <div className="space-y-7">
      <div className="space-y-2.5">
        <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-4 ring-1 ring-inset", TONE_SOFT[st.tone])}>
          <st.icon size={18} className={cn("mt-0.5 shrink-0", TONE_ICON[st.tone])} />
          <div className="min-w-0">
            <p className="text-[14px] font-bold">{st.title}</p>
            <p className="mt-1 break-words text-[13px] leading-relaxed opacity-90">{log.message || "O servidor não deixou mensagem."}</p>
          </div>
        </div>
        {replayChild ? (
          <Notice tone="blue" icon={<RotateCcw size={15} />}>
            Este evento já foi reprocessado ({relativeDate(replayChild.receivedAt)}): {statusInfo(replayChild.status).title.toLowerCase()}.{" "}
            <button type="button" onClick={() => onOpenEvent(replayChild.id)} className="font-semibold underline underline-offset-2">
              Ver o resultado
            </button>
          </Notice>
        ) : linkedSince > 0 ? (
          <Notice tone="blue" icon={<Info size={15} />}>
            {linkedSince === 1 ? "Um produto desta venda foi ligado" : `${linkedSince} produtos desta venda foram ligados`} depois que ela chegou. Reprocesse para aplicar.
          </Notice>
        ) : null}
        {NOT_FINAL.test(log.event) && (
          <Notice tone="neutral" icon={<Info size={15} />}>
            Aviso de pagamento ainda não aprovado (ex: PIX gerado). Só os avisos de pagamento aprovado liberam acesso.
          </Notice>
        )}
      </div>

      <Section title="Dados recebidos">
        <dl className="grid grid-cols-2 gap-2">
          <DataCell label="Nome" value={log.buyerName} />
          <DataCell label="Pedido" value={log.orderId} copy={log.orderId} mono />
          <DataCell label="E-mail" value={log.email} copy={log.email} wide />
          <DataCell
            label="Telefone"
            copy={digits(log.buyerPhone)}
            value={
              phone &&
              (whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline" title="Abrir no WhatsApp">
                  {phone}
                  <MessageCircle size={12} className="shrink-0 text-emerald-600" />
                </a>
              ) : (
                phone
              ))
            }
          />
          <DataCell label={documentDigits.length === 14 ? "CNPJ" : "CPF"} value={formatDocument(log.buyerDocument)} copy={documentDigits} />
          <DataCell label="Valor" value={money(log.amount)} />
          <DataCell label="Pagamento" value={paymentLabel(log.paymentMethod)} />
          <DataCell label="Evento" value={log.event} mono />
          <DataCell label="Plataforma" value={platformLabel(log.platform)} />
          <DataCell label="Recebido em" value={longDate(log.receivedAt)} wide />
          {log.replayOf && (
            <DataCell
              label="Reprocessamento de"
              wide
              value={
                <button type="button" onClick={() => onOpenEvent(log.replayOf!)} className="inline-flex items-center gap-1 hover:underline">
                  Ver o evento original <ArrowRight size={13} />
                </button>
              }
            />
          )}
        </dl>
      </Section>

      <Section title={`Produtos detectados (${log.items.length})`}>
        {log.items.length === 0 ? (
          <p className="rounded-2xl bg-[#f5f5f7] px-4 py-5 text-center text-[13px] text-[#86868b]">Nenhum produto foi encontrado no aviso.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-2xl ring-1 ring-inset ring-black/[0.06]">
            {log.items.map((item) => (
              <ProductRow key={item.id} item={item} current={index.get(norm(item.id))} now={nowState(item, index)} products={products} onMap={() => onMap(item)} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={collectionsTitle}>
        <CollectionChips ids={log.productIds} products={products} empty="Nenhuma coleção foi afetada." />
      </Section>

      <Section title="E-mail ao comprador">
        <LinkedEmail log={log} />
      </Section>

      <Section
        title="Payload recebido"
        action={
          json ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Recolher" : "Expandir"}
              </Button>
              <CopyButton value={json} label="Copiar JSON" />
            </div>
          ) : undefined
        }
      >
        {json ? (
          <pre
            className={cn(
              "overflow-auto whitespace-pre rounded-2xl bg-[#1d1d1f] p-4 font-mono text-[11.5px] leading-relaxed text-white/85 [scrollbar-width:thin]",
              expanded ? "max-h-[70vh]" : "max-h-72",
            )}
          >
            {highlighted}
          </pre>
        ) : (
          <p className="rounded-2xl bg-[#f5f5f7] px-4 py-5 text-center text-[13px] text-[#86868b]">O payload deste evento não foi guardado.</p>
        )}
      </Section>
    </div>
  );
}

function ProductRow({ item, current, now, products, onMap }: { item: WebhookLogItem; current: CheckoutItem | undefined; now: ItemNow; products: Product[]; onMap: () => void }) {
  const type = itemTypeLabel(item.type);
  const pending = wasPending(item);
  const badge = item.matched
    ? { tone: "green" as Tone, label: "Ligado" }
    : item.ignored
      ? { tone: "neutral" as Tone, label: "Ignorado" }
      : now === "linked"
        ? { tone: "blue" as Tone, label: "Ligado depois" }
        : now === "ignored"
          ? { tone: "neutral" as Tone, label: "Ignorado depois" }
          : { tone: "amber" as Tone, label: "Sem coleção" };
  const collections = item.matched ? item.collections : pending && now === "linked" ? current?.productIds ?? [] : [];
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-[13.5px] font-semibold">{item.title || "Sem nome"}</span>
            {type && <span className="rounded-md bg-black/[0.05] px-1.5 py-px text-[10.5px] font-semibold text-[#6e6e73]">{type}</span>}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11.5px] text-[#86868b]">
            <span className="shrink-0">ID</span>
            <code className="min-w-0 truncate font-mono text-[#424245]">{item.id}</code>
            <InlineCopy value={item.id} label="Copiar ID do produto" />
          </p>
        </div>
        <Badge tone={badge.tone} className="shrink-0">
          {badge.label}
        </Badge>
      </div>
      {collections.length > 0 ? (
        <p className="mt-2 flex min-w-0 items-start gap-1.5 text-[12px] text-[#6e6e73]">
          <CornerDownRight size={12} className="mt-0.5 shrink-0 text-[#a1a1a6]" />
          <span className="min-w-0 break-words">{collections.map((id) => collectionTitle(id, products)).join(", ")}</span>
        </p>
      ) : null}
      {pending && now !== "ignored" && (
        <Button size="sm" variant={now === "linked" ? "ghost" : "secondary"} className="mt-2.5" icon={<Link2 size={13} />} onClick={onMap}>
          {now === "linked" ? "Ver ligação" : "Ligar a coleções"}
        </Button>
      )}
    </li>
  );
}

function CollectionChips({ ids, products, empty }: { ids: string[]; products: Product[]; empty: string }) {
  if (!ids.length) return <p className="rounded-2xl bg-[#f5f5f7] px-4 py-4 text-[13px] text-[#86868b]">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const product = products.find((p) => p.id === id);
        return (
          <span key={id} className="flex max-w-full items-center gap-2 rounded-full bg-[#f5f5f7] py-1 pl-1 pr-3 text-[12px] font-semibold ring-1 ring-inset ring-black/[0.04]">
            {product ? (
              <span className="relative block aspect-[2/3] w-5 shrink-0 overflow-hidden rounded">
                <PosterArt product={product} />
              </span>
            ) : (
              <Package size={14} className="ml-1.5 shrink-0 text-[#a1a1a6]" />
            )}
            <span className="truncate">{product?.title ?? collectionTitle(id, products)}</span>
          </span>
        );
      })}
    </div>
  );
}

function LinkedEmail({ log }: { log: WebhookLog }) {
  const status = log.emailStatus;
  const info =
    status === "sent"
      ? { tone: "green" as Tone, icon: <MailCheck size={16} />, title: "Enviado", text: `Para ${log.email}.` }
      : status === "failed"
        ? { tone: "red" as Tone, icon: <MailX size={16} />, title: "Falhou", text: "O envio deu erro. Abra o e-mail para ver o motivo e reenviar." }
        : status === "skipped"
          ? { tone: "neutral" as Tone, icon: <Mail size={16} />, title: "Não enviado", text: "O motivo está na mensagem do servidor, no topo." }
          : { tone: "neutral" as Tone, icon: <Mail size={16} />, title: "Nenhum e-mail", text: "Este evento não gerou e-mail." };
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl px-4 py-3.5 ring-1 ring-inset sm:flex-row sm:items-center", TONE_SOFT[info.tone])}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", TONE_ICON[info.tone])}>{info.icon}</span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold">{info.title}</p>
          <p className="break-words text-[12.5px] opacity-80">{info.text}</p>
        </div>
      </div>
      {log.emailLogId && (
        <ButtonLink to={`?aba=emails&email=${encodeURIComponent(log.emailLogId)}`} size="sm" variant="secondary" icon={<Mail size={13} />} className="shrink-0 self-start sm:self-auto">
          Ver e-mail
        </ButtonLink>
      )}
    </div>
  );
}

// ── Aba: e-mails ────────────────────────────────────────────────────
function EmailTab({
  status,
  setStatus,
  kind,
  setKind,
  search,
  setSearch,
  emailId,
  openEmail,
  recent,
  recentSettled,
}: {
  status: string;
  setStatus: (v: string) => void;
  kind: string;
  setKind: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  emailId: string | null;
  openEmail: (id: string | null) => void;
  recent: EmailLog[] | undefined;
  recentSettled: boolean;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const term = useDebounced(search.trim(), 350);
  const filtered = !!status || !!kind || !!term;

  const query = useInfiniteQuery({
    queryKey: ["ma", "studio", "registros", "emails", status, kind, term],
    queryFn: ({ pageParam }) =>
      repo.listEmailLogs({ status: status || undefined, kind: kind || undefined, search: term || undefined, limit: PAGE, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: EmailLog[]) => (last.length < PAGE ? undefined : last[last.length - 1].createdAt),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const logs = useMemo(() => uniqueById(query.data?.pages.flat() ?? []), [query.data]);
  const known = useMemo(() => [...logs, ...(recent ?? [])], [logs, recent]);
  const selected = useLogLookup("email", emailId, known, !query.isPending && recentSettled, (before) => repo.listEmailLogs({ limit: RECENT, before }), (l) => l.createdAt);
  const [clearing, setClearing] = useState(false);

  const clear = async () => {
    const ok = await confirm({
      title: "Limpar o registro de e-mails?",
      text: "Todos os registros de envio serão apagados, junto com a cópia de cada e-mail. Nada é reenviado nem desfeito. Não dá para desfazer.",
      confirmLabel: "Limpar registro",
      danger: true,
    });
    if (!ok) return;
    setClearing(true);
    await run(() => repo.clearEmailLogs(), { success: "Registro de e-mails apagado", scopes: ["studio"] });
    setClearing(false);
    openEmail(null);
  };

  const resetFilters = () => {
    setStatus("");
    setKind("");
    setSearch("");
  };
  const closeModal = useCallback(() => openEmail(null), [openEmail]);

  let content: ReactNode;
  if (query.isPending) content = <ListSkeleton />;
  else if (query.isError && !query.data) content = <ErrorBox message={(query.error as Error)?.message} onRetry={() => void query.refetch()} />;
  else if (!logs.length && !filtered)
    content = (
      <EmptyState
        icon={<Mail />}
        title="Nenhum e-mail enviado ainda"
        text="Cada e-mail de acesso, reembolso, senha ou teste aparece aqui, com o conteúdo exato e se saiu ou falhou."
        action={<ButtonLink to={EMAILS_URL} icon={<Send size={15} />}>Configurar o envio</ButtonLink>}
      />
    );
  else if (!logs.length) content = <NoResults text="Nenhum e-mail com esses filtros." onClear={resetFilters} />;
  else
    content = (
      <Card padded={false} className={cn("overflow-hidden transition-opacity", query.isPlaceholderData && "opacity-60")}>
        <div className="hidden grid-cols-[112px_minmax(0,1fr)_minmax(0,1.3fr)_128px_112px] gap-5 border-b border-black/[0.05] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6] xl:grid">
          <span>Data</span>
          <span>Destinatário</span>
          <span>Assunto</span>
          <span>Tipo</span>
          <span className="text-right">Status</span>
        </div>
        <ul className="divide-y divide-black/[0.05]" aria-label="E-mails enviados">
          {logs.map((log) => (
            <EmailRow key={log.id} log={log} active={log.id === emailId} onOpen={() => openEmail(log.id)} />
          ))}
        </ul>
        <ListFooter
          count={logs.length}
          noun={["e-mail", "e-mails"]}
          filtered={filtered}
          hasMore={!!query.hasNextPage}
          loading={query.isFetchingNextPage}
          onMore={() => void query.fetchNextPage()}
        />
      </Card>
    );

  return (
    <>
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por destinatário ou assunto"
        refreshing={query.isFetching && !query.isFetchingNextPage && !query.isPending}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["ma", "studio"] })}
        clearLabel="Limpar registro"
        onClear={clear}
        clearing={clearing}
        canClear={filtered || logs.length > 0}
        extra={
          <div className="md:w-48">
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filtrar por tipo" className="bg-white">
              <option value="">Todos os tipos</option>
              {Object.entries(EMAIL_KINDS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        <FilterChips label="Filtrar por status" value={status} onChange={setStatus} options={EMAIL_FILTERS} />
      </Toolbar>

      {content}

      <EmailDetailModal
        open={!!emailId}
        onClose={closeModal}
        log={selected.log}
        loading={selected.loading}
        missing={selected.missing}
        error={selected.error}
        onRetry={() => void selected.retry()}
      />
    </>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  return status === "sent" ? (
    <Badge tone="green">
      <Check size={11} strokeWidth={3} /> Enviado
    </Badge>
  ) : (
    <Badge tone="red">
      <X size={11} strokeWidth={3} /> Falhou
    </Badge>
  );
}

function EmailRow({ log, active, onOpen }: { log: EmailLog; active: boolean; onOpen: () => void }) {
  const subject = log.subject || "(sem assunto)";
  const openLabel = `Ver o e-mail para ${log.to}`;
  const buttonClass = "block max-w-full truncate rounded text-left font-semibold text-[#1d1d1f] outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f]";
  return (
    <li onClick={onOpen} className={cn("cursor-pointer px-4 py-3.5 transition-colors hover:bg-black/[0.02] md:px-5", active && "bg-black/[0.03]")}>
      {/* Celular e tablet */}
      <div className="xl:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <EmailStatusBadge status={log.status} />
            <Badge>{kindLabel(log.kind)}</Badge>
          </div>
          <time dateTime={log.createdAt} title={fullDate(log.createdAt)} className="shrink-0 text-[12px] text-[#86868b]">
            {relativeDate(log.createdAt)}
          </time>
        </div>
        <button type="button" aria-label={openLabel} className={cn(buttonClass, "mt-2 text-[14px]")}>
          {log.to}
        </button>
        <p className="truncate text-[12.5px] text-[#6e6e73]">{subject}</p>
        <p className="mt-1 text-[11.5px] text-[#86868b]">via {providerLabel(log.provider)}</p>
      </div>

      {/* Computador */}
      <div className="hidden grid-cols-[112px_minmax(0,1fr)_minmax(0,1.3fr)_128px_112px] items-center gap-5 xl:grid">
        <time dateTime={log.createdAt} title={fullDate(log.createdAt)} className="text-[12.5px] text-[#6e6e73]">
          {relativeDate(log.createdAt)}
        </time>
        <button type="button" aria-label={openLabel} className={cn(buttonClass, "text-[13.5px]")}>
          {log.to}
        </button>
        <p className="truncate text-[13px] text-[#424245]" title={subject}>
          {subject}
        </p>
        <div className="min-w-0">
          <Badge>{kindLabel(log.kind)}</Badge>
          <p className="mt-1 text-[11px] text-[#86868b]">{providerLabel(log.provider)}</p>
        </div>
        <div className="justify-self-end">
          <EmailStatusBadge status={log.status} />
        </div>
      </div>

      {log.status !== "sent" && (
        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] text-red-700" title={log.error || undefined}>
          <CircleX size={13} className="shrink-0" />
          <span className="truncate">{log.error || "Falhou sem mensagem do provedor."}</span>
        </p>
      )}
    </li>
  );
}

function EmailDetailModal({
  open,
  onClose,
  log,
  loading,
  missing,
  error,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  log: EmailLog | null;
  loading: boolean;
  missing: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const logId = log?.id;
  const html = useQuery({
    queryKey: ["ma", "studio", "email-html", logId],
    queryFn: () => repo.getEmailHtml(logId!),
    enabled: !!logId,
    staleTime: Infinity,
  });
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const originalTo = log?.to ?? "";
  useEffect(() => {
    setTo(originalTo);
  }, [logId, originalTo]);

  const resend = async () => {
    if (!log) return;
    const target = normalizeEmail(to);
    if (!isValidEmail(target)) {
      toast.error("Digite um e-mail válido.");
      return;
    }
    setBusy(true);
    await run(() => repo.resendEmail(log.id, target === normalizeEmail(log.to) ? undefined : target), { success: `E-mail reenviado para ${target}`, scopes: ["studio"] });
    setBusy(false);
  };

  const meta = log?.meta ?? {};
  const demo = meta.demo === true;
  const metaProducts = Array.isArray(meta.products) ? meta.products.map(String).filter(Boolean) : [];
  const resendOf = typeof meta.resendOf === "string" ? meta.resendOf : "";
  const testOf = typeof meta.template === "string" ? kindLabel(meta.template) : "";
  const sent = log?.status === "sent";
  const otherAddress = !!log && isValidEmail(to) && normalizeEmail(to) !== normalizeEmail(log.to);
  const carriesAccess = !!log && (log.kind === "welcome" || log.kind === "access");

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={log ? log.subject || "(sem assunto)" : "E-mail"}
      description={log ? `${kindLabel(log.kind)} · para ${log.to} · ${relativeDate(log.createdAt)}` : undefined}
      footer={
        <>
          {log?.webhookLogId && (
            <ButtonLink to={`?aba=webhook&evento=${encodeURIComponent(log.webhookLogId)}`} variant="secondary" icon={<Webhook size={15} />}>
              Ver venda
            </ButtonLink>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </>
      }
    >
      {log ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="order-2 min-w-0 lg:order-1">
            {html.isPending ? (
              <div className="grid h-[480px] place-items-center rounded-2xl bg-[#f5f5f7]">
                <Loader2 className="h-6 w-6 animate-spin text-[#86868b]" />
              </div>
            ) : html.isError ? (
              <ErrorBox message={(html.error as Error)?.message} onRetry={() => void html.refetch()} />
            ) : html.data ? (
              <EmailPreview html={html.data} subject={log.subject} />
            ) : (
              <div className="flex flex-col items-center rounded-2xl bg-[#f5f5f7] px-6 py-16 text-center">
                <Mail className="h-6 w-6 text-[#a1a1a6]" />
                <p className="mt-3 text-[14px] font-bold">Sem cópia do conteúdo</p>
                <p className="mt-1 max-w-xs text-[12.5px] text-[#86868b]">A cópia deste e-mail não foi guardada.</p>
              </div>
            )}
          </div>

          <aside className="order-1 space-y-3 lg:order-2">
            <div className={cn("rounded-2xl px-4 py-3.5 ring-1 ring-inset", TONE_SOFT[sent ? "green" : "red"])}>
              <p className="flex items-center gap-2 text-[14px] font-bold">
                {sent ? <CircleCheck size={16} className={TONE_ICON.green} /> : <CircleX size={16} className={TONE_ICON.red} />}
                {sent ? "Enviado" : "Falhou"}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed opacity-90">
                {sent
                  ? `Aceito pelo ${providerLabel(log.provider)}. Se não chegou, peça para olhar o spam e a aba Promoções.`
                  : log.error || "O provedor não informou o motivo."}
              </p>
            </div>
            {demo && (
              <Notice tone="amber" icon={<FlaskIcon />}>
                Modo demonstração: nada foi enviado de verdade.
              </Notice>
            )}

            <dl className="divide-y divide-black/[0.05] rounded-2xl ring-1 ring-inset ring-black/[0.06]">
              <DetailRow label="Para" value={log.to} copy={log.to} />
              <DetailRow label="Assunto" value={log.subject} />
              <DetailRow label="Tipo" value={testOf ? `${kindLabel(log.kind)} · modelo ${testOf}` : meta.manual === true ? `${kindLabel(log.kind)} · pela tela de Membros` : kindLabel(log.kind)} />
              <DetailRow label={sent ? "Enviado em" : "Tentativa em"} value={longDate(log.createdAt)} />
              <DetailRow label="Provedor" value={providerLabel(log.provider)} />
              <DetailRow label="ID da mensagem" value={log.messageId} copy={log.messageId} mono />
              {metaProducts.length > 0 && <DetailRow label="Coleções" value={metaProducts.join(", ")} />}
              {meta.accountCreated === true && <DetailRow label="Conta" value="Criada nesta venda" />}
              {resendOf && (
                <DetailRow
                  label="Reenvio de"
                  value={
                    <Link to={`?aba=emails&email=${encodeURIComponent(resendOf)}`} className="inline-flex items-center gap-1 hover:underline">
                      Ver o e-mail original <ArrowRight size={13} />
                    </Link>
                  }
                />
              )}
            </dl>

            {log.kind === "reset" ? (
              <div className="rounded-2xl bg-[#f5f5f7] p-4">
                <p className="flex items-center gap-2 text-[13.5px] font-bold">
                  <KeyRound size={15} className="text-[#6e6e73]" /> Link de senha
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#6e6e73]">Links de senha não são reenviados. Envie um link novo pela tela de Membros.</p>
                <ButtonLink to={MEMBERS_URL} size="sm" variant="secondary" className="mt-3">
                  Abrir Membros
                </ButtonLink>
              </div>
            ) : (
              <form
                className="rounded-2xl bg-[#f5f5f7] p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void resend();
                }}
              >
                <p className="text-[13.5px] font-bold">Reenviar</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#86868b]">Envia de novo o mesmo conteúdo. Pode trocar o destinatário.</p>
                <Field label="Para" className="mt-3">
                  <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="cliente@email.com" className="bg-white" autoComplete="off" />
                </Field>
                {otherAddress && carriesAccess && (
                  <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-amber-800">
                    <AlertTriangle size={13} className="mt-px shrink-0" />O e-mail vai igual, com os dados de acesso de {log.to}.
                  </p>
                )}
                <Button type="submit" className="mt-3 w-full" icon={<Send size={14} />} loading={busy} disabled={!isValidEmail(to)}>
                  {otherAddress ? "Reenviar para este e-mail" : "Reenviar e-mail"}
                </Button>
              </form>
            )}
          </aside>
        </div>
      ) : error ? (
        <ErrorBox message={error.message} onRetry={onRetry} />
      ) : missing ? (
        <NotFound title="E-mail não encontrado" text="Ele não está mais no registro (pode ter sido apagado)." />
      ) : loading ? (
        <DrawerLoading />
      ) : null}
    </Modal>
  );
}

// ── Peças compartilhadas ────────────────────────────────────────────
function Toolbar({
  search,
  onSearch,
  placeholder,
  extra,
  children,
  refreshing,
  onRefresh,
  clearLabel,
  onClear,
  clearing,
  canClear,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  extra?: ReactNode;
  children?: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  clearLabel: string;
  onClear: () => void;
  clearing: boolean;
  canClear: boolean;
}) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-72 lg:w-80">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1a6]" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder} enterKeyHint="search" className="bg-white pl-10 pr-10" />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#86868b] hover:bg-black/5 hover:text-[#1d1d1f]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {extra}
        <div className="flex gap-2 md:ml-auto">
          <Button variant="secondary" icon={<RefreshCw size={14} className={cn(refreshing && "animate-spin")} />} onClick={onRefresh} className="flex-1 md:flex-none">
            Atualizar
          </Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={onClear} loading={clearing} disabled={!canClear} className="flex-1 md:flex-none">
            {clearLabel}
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function FilterChips({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: FilterOption[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value || "todos"}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition",
              on ? "bg-[#1d1d1f] text-white shadow-sm" : "bg-white text-[#424245] ring-1 ring-inset ring-black/[0.08] hover:bg-[#fafafa] hover:ring-black/15",
            )}
          >
            {option.dot && <span className={cn("h-1.5 w-1.5 rounded-full", option.dot)} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ListFooter({ count, noun, filtered, hasMore, loading, onMore }: { count: number; noun: [string, string]; filtered: boolean; hasMore: boolean; loading: boolean; onMore: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 border-t border-black/[0.05] px-5 py-4 sm:flex-row sm:justify-between">
      <p className="text-[12px] text-[#86868b]">
        {hasMore ? `Mostrando os ${count} mais recentes` : filtered ? `${plural(count, noun[0], noun[1])} ${count === 1 ? "encontrado" : "encontrados"}` : `${plural(count, noun[0], noun[1])} · fim do histórico`}
      </p>
      {hasMore && (
        <Button size="sm" variant="secondary" loading={loading} onClick={onMore} icon={<ChevronDown size={14} />}>
          Carregar mais
        </Button>
      )}
    </div>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card padded={false}>
      <ul className="divide-y divide-black/[0.05]" aria-busy="true" aria-label="Carregando">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-4">
            <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
            <div className="flex-1 space-y-2">
              <span className="block h-3 w-1/3 animate-pulse rounded-full bg-black/[0.07]" />
              <span className="block h-3 w-1/2 animate-pulse rounded-full bg-black/[0.05]" />
            </div>
            <span className="hidden h-6 w-20 animate-pulse rounded-full bg-black/[0.05] sm:block" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NoResults({ text, onClear }: { text: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[1.6rem] bg-white px-6 py-14 text-center ring-1 ring-black/[0.05]">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5f5f7] text-[#86868b]">
        <SearchX size={20} />
      </span>
      <p className="mt-4 text-[15px] font-bold">Nada encontrado</p>
      <p className="mt-1 max-w-sm text-[13px] text-[#86868b]">{text}</p>
      <Button size="sm" variant="secondary" className="mt-5" onClick={onClear}>
        Limpar filtros
      </Button>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-red-50 px-6 py-10 text-center ring-1 ring-inset ring-red-200/70">
      <AlertTriangle className="h-6 w-6 text-red-500" />
      <p className="mt-3 text-[14px] font-bold text-red-900">Não foi possível carregar</p>
      <p className="mt-1 max-w-md text-[12.5px] text-red-800/80">{message || "Tente de novo em instantes."}</p>
      <Button size="sm" variant="secondary" className="mt-4" icon={<RefreshCw size={13} />} onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

function NotFound({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5f5f7] text-[#86868b]">
        <SearchX size={20} />
      </span>
      <p className="mt-4 text-[15px] font-bold">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-[#86868b]">{text}</p>
    </div>
  );
}

function DrawerLoading() {
  return (
    <div className="grid min-h-[40vh] place-items-center" aria-busy="true">
      <Loader2 className="h-6 w-6 animate-spin text-[#86868b]" />
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Notice({ tone, icon, children }: { tone: Tone; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[12.5px] leading-relaxed ring-1 ring-inset", TONE_SOFT[tone])}>
      <span className={cn("mt-px shrink-0", TONE_ICON[tone])}>{icon}</span>
      <p className="min-w-0">{children}</p>
    </div>
  );
}

function FlaskIcon() {
  return <Info size={15} />;
}

function isEmpty(value: ReactNode) {
  return value === null || value === undefined || value === false || value === "";
}

function DataCell({ label, value, copy, wide, mono }: { label: string; value: ReactNode; copy?: string; wide?: boolean; mono?: boolean }) {
  const empty = isEmpty(value);
  return (
    <div className={cn("min-w-0 rounded-xl bg-[#f5f5f7] px-3.5 py-3", wide && "col-span-2")}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-1 text-[13px] font-semibold text-[#1d1d1f]">
        <span className={cn("min-w-0 break-words [overflow-wrap:anywhere]", mono && !empty && "font-mono text-[12px]")}>
          {empty ? <span className="font-normal text-[#a1a1a6]">Não informado</span> : value}
        </span>
        {copy && !empty && <InlineCopy value={copy} label={`Copiar ${label.toLowerCase()}`} />}
      </dd>
    </div>
  );
}

function DetailRow({ label, value, copy, mono }: { label: string; value: ReactNode; copy?: string; mono?: boolean }) {
  const empty = isEmpty(value);
  return (
    <div className="px-4 py-2.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] text-[#1d1d1f]">
        <span className={cn("min-w-0 break-words [overflow-wrap:anywhere]", mono && !empty && "font-mono text-[12px]")}>{empty ? <span className="text-[#a1a1a6]">—</span> : value}</span>
        {copy && !empty && <InlineCopy value={copy} label={`Copiar ${label.toLowerCase()}`} />}
      </dd>
    </div>
  );
}

function InlineCopy({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <IconButton
      label={done ? "Copiado" : label}
      className="h-6 w-6"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
    >
      {done ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </IconButton>
  );
}
