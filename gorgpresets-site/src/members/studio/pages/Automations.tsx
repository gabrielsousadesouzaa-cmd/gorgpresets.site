// Automações: o checkout avisa cada venda (webhook) e a área de membros libera
// ou retira o acesso, cria a conta e envia o e-mail sozinha. Aqui o produtor
// liga a automação, define as regras e a senha, liga os produtos do checkout às
// coleções (com e-mail próprio por produto) e faz vendas de teste.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleCheck,
  CirclePause,
  Code2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FlaskConical,
  History,
  IdCard,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MailX,
  Package,
  PackagePlus,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Wand2,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, useCatalog, useRepo, useSettings } from "../../context/MembersContext";
import { generatePassword, isValidEmail, normalizeEmail, relativeDate, sortByOrder } from "../../lib/format";
import type { AutomationSettings, CheckoutItem, EmailTemplate, PasswordMode, PortalSettings, Product, WebhookLog } from "../../lib/types";
import { PASSWORD_MODES } from "../../../../supabase/functions/members-api/automation";
import { EMAIL_VARIABLES, renderEmail, templateToHtml } from "../../../../supabase/functions/members-api/email";
import { PosterArt } from "../../components/PosterArt";
import { Badge, Button, ButtonLink, Card, CopyButton, EmptyState, Field, IconButton, Input, Modal, PageHeader, Segmented, Textarea, Toggle, useConfirm } from "../ui";
import { useStudioAction, useStudioQuery } from "../hooks";
import { Tabs } from "../components/Tabs";
import { EmailPreview } from "../components/EmailPreview";
import { blankCheckoutItem, MapItemModal } from "../components/MapItemModal";

// ── Utilidades ──────────────────────────────────────────────────────
type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "dark";
type ItemState = "pending" | "linked" | "ignored";
type ItemTab = "todos" | "pendentes" | "ligados" | "ignorados";

const norm = (value: string) => String(value || "").trim().toLowerCase();
const digits = (value: string) => value.replace(/\D/g, "");
const fullDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const PLATFORMS = ["GGCheckout", "Hotmart", "Kiwify", "Cakto", "Eduzz", "Perfect Pay", "Ticto", "Yampi", "CartPanda", "Shopify", "Stripe"];
const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(PLATFORMS.map((p) => [p.toLowerCase().replace(/[\s_-]/g, ""), p]));
const platformLabel = (platform: string) => {
  const key = norm(platform).replace(/[\s_-]/g, "");
  if (!key) return "";
  return PLATFORM_LABELS[key] || platform.charAt(0).toUpperCase() + platform.slice(1);
};

/** Avisos que ainda não são uma venda (ex: PIX gerado): não vale reprocessar. */
const NOT_FINAL = /generat|pending|waiting|aguard|gerad|abandon|created/i;

const LOG_STATUS: Record<string, { label: string; tone: Tone }> = {
  granted: { label: "Acesso liberado", tone: "green" },
  revoked: { label: "Acesso retirado", tone: "red" },
  unmatched: { label: "Sem coleção ligada", tone: "amber" },
  ignored: { label: "Ignorado", tone: "neutral" },
  paused: { label: "Automação pausada", tone: "neutral" },
  error: { label: "Erro", tone: "red" },
};

function itemState(item: CheckoutItem, known: Set<string> | null): ItemState {
  if (item.ignored) return "ignored";
  const linked = known ? item.productIds.some((id) => known.has(id)) : item.productIds.length > 0;
  return linked ? "linked" : "pending";
}

const SECTION = "scroll-mt-20 lg:scroll-mt-8";

// ── Página ──────────────────────────────────────────────────────────
export default function AutomationsPage() {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const location = useLocation();
  const settingsQuery = useSettings();
  const settings = settingsQuery.data;
  const { catalog, isLoading: catalogLoading } = useCatalog();
  const products = useMemo(() => sortByOrder(catalog.products), [catalog.products]);
  const itemsQuery = useStudioQuery("checkout-items", () => repo.listCheckoutItems());
  const logsQuery = useStudioQuery("automation-logs", () => repo.listWebhookLogs({ limit: 200 }));

  const [draft, setDraft] = useState<AutomationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [itemTab, setItemTab] = useState<ItemTab>("todos");
  const [mapping, setMapping] = useState<{ item: CheckoutItem; isNew: boolean } | null>(null);

  useEffect(() => {
    if (settings && !draft) setDraft(settings.automation);
  }, [settings, draft]);

  // Link direto para uma seção (ex: /membros/studio/automacoes#produtos).
  const ready = !!draft;
  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id || !ready) return;
    const timer = setTimeout(() => scrollToId(id), 200);
    return () => clearTimeout(timer);
  }, [location.hash, ready]);

  const known = useMemo(() => (catalogLoading && !catalog.products.length ? null : new Set(catalog.products.map((p) => p.id))), [catalog.products, catalogLoading]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const pending = useMemo(() => items.filter((i) => itemState(i, known) === "pending"), [items, known]);

  const stats = useMemo(
    () => ({
      granted: logs.filter((l) => l.status === "granted").length,
      revoked: logs.filter((l) => l.status === "revoked").length,
      failedEmails: logs.filter((l) => l.emailStatus === "failed").length,
      last: logs[0]?.receivedAt || null,
    }),
    [logs],
  );

  // O interruptor geral (enabled) salva na hora; o rascunho cuida do resto.
  const dirty = useMemo(
    () => !!draft && !!settings && JSON.stringify({ ...draft, enabled: settings.automation.enabled }) !== JSON.stringify(settings.automation),
    [draft, settings],
  );

  if (!settings || !draft) {
    return (
      <div>
        <PageHeader title="Automações" subtitle="Liberação automática de acesso a cada venda do checkout." />
        {settingsQuery.error ? (
          <ErrorBox message={(settingsQuery.error as Error).message} onRetry={() => settingsQuery.refetch()} />
        ) : (
          <div className="grid min-h-[40vh] place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#86868b]" />
          </div>
        )}
      </div>
    );
  }

  const set = (patch: Partial<AutomationSettings>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const active = settings.automation.enabled;

  const save = async () => {
    setSaving(true);
    await run(() => repo.saveSettings({ ...settings, automation: { ...draft, enabled: settings.automation.enabled } }), { success: "Automação salva", scopes: ["settings"] });
    setSaving(false);
  };

  // Ligar/pausar salva na hora (é o interruptor geral), sem mexer no resto do rascunho.
  const toggleEnabled = async (enabled: boolean) => {
    if (!enabled) {
      const ok = await confirm({
        title: "Pausar a automação?",
        text: "As vendas continuam chegando e ficam no histórico, mas ninguém recebe nem perde acesso até você ligar de novo.",
        confirmLabel: "Pausar",
        danger: true,
      });
      if (!ok) return;
    }
    setSwitching(true);
    await run(() => repo.saveSettings({ ...settings, automation: { ...settings.automation, enabled } }), {
      success: enabled ? "Automação ligada" : "Automação pausada",
      scopes: ["settings"],
    });
    setSwitching(false);
  };

  const showPending = () => {
    setItemTab("pendentes");
    scrollToId("produtos");
  };

  return (
    <div className="pb-24">
      <PageHeader
        title="Automações"
        subtitle="O checkout avisa cada venda e a área de membros faz o resto: libera o acesso, cria a conta e envia o e-mail. Reembolso e chargeback retiram o acesso."
        actions={
          <>
            <ButtonLink to="/membros/studio/registros" variant="secondary" icon={<History size={15} />}>Registros</ButtonLink>
            <Button icon={<FlaskConical size={15} />} onClick={() => scrollToId("teste")}>Venda de teste</Button>
          </>
        }
      />

      <div className="space-y-6">
        <StatusHero
          active={active}
          switching={switching}
          onToggle={toggleEnabled}
          loading={logsQuery.isLoading}
          stats={stats}
          pendingCount={itemsQuery.isLoading ? null : pending.length}
          onShowPending={showPending}
          sample={logs.length}
        />

        <div id="webhook" className={SECTION}>
          <WebhookCard />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div id="regras" className={SECTION}>
            <RulesCard draft={draft} set={set} />
          </div>
          <div id="senha" className={SECTION}>
            <PasswordCard draft={draft} set={set} />
          </div>
        </div>

        <div id="produtos" className={SECTION}>
          <CheckoutItemsCard
            query={itemsQuery}
            items={items}
            known={known}
            products={products}
            logs={logs}
            tab={itemTab}
            setTab={setItemTab}
            settings={settings}
            onMap={(item, isNew = false) => setMapping({ item, isNew })}
          />
        </div>

        <div id="teste" className={SECTION}>
          <TestSaleCard items={items} known={known} products={products} paused={!active} onMap={(item) => setMapping({ item, isNew: false })} />
        </div>
      </div>

      <MapItemModal item={mapping?.item ?? null} isNew={mapping?.isNew} products={products} onClose={() => setMapping(null)} />

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-full bg-[#1d1d1f] py-2 pl-6 pr-2 text-white shadow-2xl lg:left-[264px]"
          >
            <span className="text-[13px] font-medium">Alterações não salvas</span>
            <div className="flex gap-1.5">
              <button onClick={() => setDraft(settings.automation)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-white/70 hover:text-white">Descartar</button>
              <Button variant="accent" onClick={save} loading={saving}>Salvar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 1. Estado da automação ──────────────────────────────────────────
function StatusHero({
  active,
  switching,
  onToggle,
  loading,
  stats,
  pendingCount,
  onShowPending,
  sample,
}: {
  active: boolean;
  switching: boolean;
  onToggle: (v: boolean) => void;
  loading: boolean;
  stats: { granted: number; revoked: number; failedEmails: number; last: string | null };
  pendingCount: number | null;
  onShowPending: () => void;
  sample: number;
}) {
  const tiles: Array<{ label: string; value: number | null; icon: ReactNode; tone?: "amber" | "red"; onClick?: () => void; to?: string }> = [
    { label: "Acessos liberados", value: loading ? null : stats.granted, icon: <CircleCheck size={17} className="text-emerald-600" /> },
    { label: "Reembolsos e chargebacks", value: loading ? null : stats.revoked, icon: <Undo2 size={17} /> },
    { label: "Produtos sem coleção", value: pendingCount, icon: <Package size={17} />, tone: pendingCount ? "amber" : undefined, onClick: onShowPending },
    { label: "E-mails com falha", value: loading ? null : stats.failedEmails, icon: <MailX size={17} />, tone: stats.failedEmails ? "red" : undefined, to: "/membros/studio/registros?aba=emails" },
  ];

  return (
    <section
      className={cn(
        "rounded-[1.6rem] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_30px_-12px_rgba(0,0,0,0.08)] ring-1 transition-colors md:p-7",
        active ? "bg-white ring-black/[0.05]" : "bg-amber-50/60 ring-amber-200/80",
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className={cn("relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl", active ? "bg-emerald-50 text-emerald-600" : "bg-amber-100 text-amber-700")}>
            {active ? <Zap size={22} /> : <CirclePause size={22} />}
            {active && (
              <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-[19px] font-bold tracking-tight">{active ? "Automação ativa" : "Automação pausada"}</h2>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#6e6e73]">
              {active
                ? "Cada venda aprovada libera o acesso, cria a conta e envia o e-mail sozinha. Reembolsos e chargebacks retiram o acesso, conforme as regras abaixo."
                : "As vendas continuam chegando e ficam no histórico, mas ninguém recebe nem perde acesso até você ligar de novo."}
            </p>
            <p className="mt-2 text-[12px] text-[#86868b]">
              {stats.last ? (
                <>
                  Último aviso do checkout: <span title={fullDate(stats.last)} className="font-semibold text-[#6e6e73]">{relativeDate(stats.last)}</span>
                </>
              ) : loading ? (
                "Carregando o histórico…"
              ) : (
                "Nenhum aviso do checkout recebido ainda."
              )}
            </p>
          </div>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-3 self-start rounded-full bg-black/[0.04] py-1.5 pl-4 pr-1.5">
          <span className="text-[13px] font-semibold">{switching ? "Salvando…" : active ? "Ligada" : "Pausada"}</span>
          <Toggle checked={active} onChange={onToggle} disabled={switching} />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg",
                  tile.tone === "amber" ? "bg-amber-100 text-amber-700" : tile.tone === "red" ? "bg-red-100 text-red-600" : "bg-white text-[#1d1d1f] shadow-sm",
                )}
              >
                {tile.icon}
              </span>
              <span className={cn("mt-4 block text-[1.75rem] font-bold leading-none tracking-tight tabular-nums", tile.tone === "amber" && "text-amber-800", tile.tone === "red" && "text-red-700")}>
                {tile.value ?? "—"}
              </span>
              <span className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-[#6e6e73]">
                {tile.label}
                {(tile.onClick || tile.to) && <ArrowRight size={12} className="opacity-50 transition-transform group-hover:translate-x-0.5" />}
              </span>
            </>
          );
          const cls = cn(
            "group block rounded-2xl p-4 text-left ring-1 ring-inset transition-colors",
            tile.tone === "amber" ? "bg-amber-50 ring-amber-200/70 hover:bg-amber-100/70" : tile.tone === "red" ? "bg-red-50 ring-red-200/70 hover:bg-red-100/60" : "bg-[#f5f5f7] ring-black/[0.04]",
            !tile.tone && (tile.onClick || tile.to) && "hover:bg-black/[0.06]",
          );
          if (tile.to) return <Link key={tile.label} to={tile.to} className={cls}>{body}</Link>;
          if (tile.onClick) return <button key={tile.label} type="button" onClick={tile.onClick} className={cls}>{body}</button>;
          return <div key={tile.label} className={cls}>{body}</div>;
        })}
      </div>
      <p className="mt-3 text-[11px] text-[#a1a1a6]">{sample >= 200 ? "Contagem dos últimos 200 avisos recebidos." : "Contagem de todos os avisos recebidos."} Os produtos sem coleção são os que ainda não liberam nada.</p>
    </section>
  );
}

// ── 2. Webhook do checkout ──────────────────────────────────────────
function WebhookCard() {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const webhook = useStudioQuery("webhook-url", () => repo.getWebhookUrl());
  const [rotating, setRotating] = useState(false);
  const portalUrl = `${window.location.origin}/membros`;

  const token = useMemo(() => {
    try {
      return webhook.data ? new URL(webhook.data).searchParams.get("token") || "" : "";
    } catch {
      return "";
    }
  }, [webhook.data]);

  const rotate = async () => {
    const ok = await confirm({
      title: "Gerar um novo link?",
      text: "O link atual para de funcionar na hora. Depois cole o novo link (e o novo Secret, se usar) no checkout — senão as vendas deixam de chegar.",
      confirmLabel: "Gerar novo link",
      danger: true,
    });
    if (!ok) return;
    setRotating(true);
    await run(() => repo.rotateWebhookToken(), { success: "Novo link gerado. Atualize no checkout.", scopes: ["studio"] });
    setRotating(false);
  };

  const steps: ReactNode[] = [
    <>No <b>GGCheckout</b>, abra <b>Integrações → Webhooks</b> e crie um <b>novo webhook</b>.</>,
    <>Cole o <b>link acima</b> no campo de URL.</>,
    <>
      Marque os eventos <b>PIX pago</b> e <b>Cartão pago</b> (liberam o acesso) e <b>PIX reembolsado</b>, <b>Cartão reembolsado</b> e <b>Chargeback</b> (retiram).
    </>,
    <>
      Se o checkout pedir um <b>Secret</b>, cole o código que vem depois de <code className="rounded bg-black/[0.06] px-1 font-mono text-[12px]">token=</code> (tem um botão para copiar só ele aqui em cima).
    </>,
    <>
      Salve e faça uma <button type="button" onClick={() => scrollToId("teste")} className="font-semibold underline decoration-black/25 underline-offset-2 hover:decoration-black">venda de teste</button>. Os produtos do checkout aparecem sozinhos logo abaixo, prontos para ligar às coleções.
    </>,
  ];

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Webhook size={18} /> Webhook do checkout
        </span>
      }
      description="Cole este link no seu checkout. Ele avisa cada venda, reembolso e chargeback, e a área de membros cuida do resto."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <code className="flex min-h-11 min-w-0 flex-1 items-center break-all rounded-xl bg-[#1d1d1f] px-4 py-3 font-mono text-[12px] leading-relaxed text-white">
          {webhook.isLoading ? (
            <Loader2 size={15} className="animate-spin text-white/60" />
          ) : webhook.error ? (
            <span className="text-red-300">Não foi possível carregar o link: {(webhook.error as Error).message}</span>
          ) : (
            webhook.data
          )}
        </code>
        <div className="flex shrink-0 gap-2">
          {webhook.data ? <CopyButton value={webhook.data} label="Copiar link" /> : webhook.error ? <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={() => webhook.refetch()}>Tentar de novo</Button> : null}
          <Button size="sm" variant="secondary" icon={<KeyRound size={13} />} onClick={rotate} loading={rotating}>Gerar novo</Button>
        </div>
      </div>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-[#86868b]">O link já contém uma chave secreta. Não compartilhe fora do painel do checkout.</p>
        {token && (
          <div className="flex items-center gap-2 self-start rounded-full bg-[#f5f5f7] py-1 pl-3.5 pr-1 ring-1 ring-inset ring-black/[0.05] sm:self-auto">
            <span className="text-[11px] font-semibold text-[#6e6e73]">Secret</span>
            <code className="font-mono text-[11.5px] text-[#1d1d1f]">{token.length > 10 ? `${token.slice(0, 4)}…${token.slice(-4)}` : token}</code>
            <CopyButton value={token} label="Copiar" />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#86868b]">Como ligar no GGCheckout</p>
          <ol className="mt-4 space-y-3.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1d1d1f] text-[11px] font-bold text-white">{i + 1}</span>
                <p className="pt-0.5 text-[13.5px] leading-relaxed text-[#424245]">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[12px] leading-relaxed text-[#86868b]">Em outras plataformas, use o mesmo link no webhook de <b>compra aprovada</b> (e, se houver, de reembolso e chargeback).</p>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#86868b]">Funciona com</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <Badge key={p} className={cn("px-3 py-1", p === "GGCheckout" && "bg-[#1d1d1f] text-white")}>{p}</Badge>
              ))}
              <Badge className="px-3 py-1">e outros checkouts com webhook</Badge>
            </div>
          </div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4 ring-1 ring-inset ring-black/[0.04]">
            <p className="text-[13px] font-bold">Link da área de membros</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#86868b]">Para a página de obrigado do checkout e para enviar aos clientes.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex h-10 min-w-0 flex-1 items-center truncate rounded-xl bg-white px-3.5 font-mono text-[12px] ring-1 ring-inset ring-black/[0.06]">{portalUrl}</code>
              <div className="flex gap-2">
                <CopyButton value={portalUrl} />
                <Button size="sm" variant="secondary" icon={<ExternalLink size={13} />} onClick={() => window.open(portalUrl, "_blank", "noopener")}>Abrir</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── 3. Regras ───────────────────────────────────────────────────────
const BATCH_OPTIONS = [
  { value: "0", label: "Não" },
  { value: "2", label: "2 s" },
  { value: "4", label: "4 s" },
  { value: "6", label: "6 s" },
  { value: "8", label: "8 s" },
] as const;
type BatchValue = (typeof BATCH_OPTIONS)[number]["value"];

function RulesCard({ draft, set }: { draft: AutomationSettings; set: (patch: Partial<AutomationSettings>) => void }) {
  const batch = String(Math.min(8, Math.max(0, Math.round(draft.batchSeconds / 2) * 2))) as BatchValue;
  return (
    <Card title="Regras" description="O que acontece a cada aviso do checkout.">
      <div className="divide-y divide-black/[0.06]">
        <div className="pb-5">
          <Toggle
            checked={draft.grantOnApproved}
            onChange={(grantOnApproved) => set({ grantOnApproved })}
            label="Liberar acesso na compra aprovada"
            description="Libera as coleções ligadas ao produto, cria a conta do comprador e envia o e-mail de acesso."
          />
          {!draft.grantOnApproved && <Notice tone="amber" className="mt-3">Desligado: as vendas aprovadas só ficam registradas. Ninguém recebe acesso sozinho.</Notice>}
        </div>
        <div className="py-5">
          <Toggle
            checked={draft.revokeOnRefund}
            onChange={(revokeOnRefund) => set({ revokeOnRefund })}
            label="Retirar acesso no reembolso"
            description="Remove as coleções liberadas por aquela venda e avisa o comprador. Acessos que você liberou à mão continuam."
          />
        </div>
        <div className="py-5">
          <Toggle
            checked={draft.revokeOnChargeback}
            onChange={(revokeOnChargeback) => set({ revokeOnChargeback })}
            label="Retirar acesso no chargeback"
            description="Quando o comprador contesta a compra no cartão."
          />
        </div>
        <div className="pt-5">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">Agrupar compras seguidas num só e-mail</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#86868b]">
            Quem compra pelo carrinho ou leva um order bump gera um aviso por produto. A área espera alguns segundos para mandar um único e-mail com tudo.
          </p>
          <Segmented<BatchValue> className="mt-3" value={batch} onChange={(v) => set({ batchSeconds: Number(v) })} options={BATCH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          <p className="mt-2 text-[12px] text-[#6e6e73]">
            {draft.batchSeconds === 0 ? "Sem espera: cada aviso manda o próprio e-mail na hora." : `Espera ${draft.batchSeconds} segundos antes de enviar.`} Recomendado: 4 s.
          </p>
        </div>
      </div>
    </Card>
  );
}

// ── 4. Senha dos alunos ─────────────────────────────────────────────
const MODE_ICONS: Record<PasswordMode, ReactNode> = {
  random: <Shuffle size={17} />,
  fixed: <KeyRound size={17} />,
  cpf: <IdCard size={17} />,
};

function PasswordCard({ draft, set }: { draft: AutomationSettings; set: (patch: Partial<AutomationSettings>) => void }) {
  const weak = (draft.passwordMode === "fixed" || draft.passwordMode === "cpf") && !draft.forcePasswordChange;
  return (
    <Card
      title="Senha dos alunos"
      description="Como nasce a senha de quem compra pela primeira vez. Quem já tem conta continua com a senha que usa hoje."
    >
      <div role="radiogroup" aria-label="Tipo de senha" className="grid gap-2.5">
        {PASSWORD_MODES.map((mode) => {
          const selected = draft.passwordMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set({ passwordMode: mode.id })}
              className={cn(
                "flex items-start gap-3.5 rounded-2xl p-4 text-left ring-inset transition",
                selected ? "bg-white ring-2 ring-[#1d1d1f] shadow-sm" : "bg-[#f5f5f7] ring-1 ring-black/[0.05] hover:bg-black/[0.05]",
              )}
            >
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", selected ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] shadow-sm")}>{MODE_ICONS[mode.id]}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{mode.label}</span>
                  {mode.id === "random" && <Badge tone="green">Mais segura</Badge>}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-[#86868b]">{mode.text}</span>
              </span>
              <span className={cn("mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full ring-2 ring-inset", selected ? "bg-[#1d1d1f] ring-[#1d1d1f]" : "ring-black/15")}>
                {selected && <Check size={11} strokeWidth={3.5} className="text-white" />}
              </span>
            </button>
          );
        })}
      </div>

      {draft.passwordMode === "fixed" && <FixedPasswordBox />}
      {draft.passwordMode === "cpf" && (
        <p className="mt-4 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-[12px] leading-relaxed text-[#6e6e73]">
          A senha é o CPF só com números (ex: <span className="font-mono">12345678900</span>). Se o pedido vier sem CPF, o comprador recebe uma senha aleatória.
        </p>
      )}

      <div className="mt-5 rounded-2xl bg-[#f5f5f7] p-4">
        <Toggle
          checked={draft.forcePasswordChange}
          onChange={(forcePasswordChange) => set({ forcePasswordChange })}
          label="Pedir uma senha nova no primeiro acesso"
          description={`O aluno entra com a senha recebida e cria a dele antes de ver o conteúdo.${draft.passwordMode === "random" ? "" : " Recomendado para senha padrão e CPF."}`}
        />
      </div>

      {weak && (
        <Notice tone="red" className="mt-3" action={<Button size="sm" variant="secondary" onClick={() => set({ forcePasswordChange: true })}>Ativar troca</Button>}>
          {draft.passwordMode === "fixed"
            ? "Sem a troca obrigatória, qualquer pessoa que saiba o e-mail de um aluno (e a senha padrão) consegue entrar na conta dele."
            : "Sem a troca obrigatória, qualquer pessoa que saiba o e-mail e o CPF de um aluno consegue entrar na conta dele."}
        </Notice>
      )}
    </Card>
  );
}

function FixedPasswordBox() {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const status = useStudioQuery("automation-status", () => repo.getAutomationStatus());
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = !!status.data?.hasFixedPassword;

  const save = async () => {
    if (value.length < 6) return;
    setSaving(true);
    const result = await run(() => repo.saveFixedPassword(value), { success: "Senha padrão salva", scopes: ["studio"] });
    setSaving(false);
    if (result) {
      setValue("");
      setEditing(false);
      setVisible(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Remover a senha padrão?",
      text: "Enquanto não houver outra, cada comprador novo recebe uma senha aleatória. Quem já tem conta continua igual.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (ok) await run(() => repo.saveFixedPassword(""), { success: "Senha padrão removida", scopes: ["studio"] });
  };

  if (status.isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f5f5f7] px-4 py-3.5 text-[12px] text-[#86868b]">
        <Loader2 size={14} className="animate-spin" /> Verificando a senha padrão…
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl p-4 ring-1 ring-inset ring-black/[0.08]">
      {saved && !editing ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={17} />
            </span>
            <div>
              <p className="text-[14px] font-semibold">Senha padrão salva</p>
              <p className="text-[12px] text-[#86868b]">Por segurança, ela não aparece de novo aqui.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Trocar</Button>
            <Button size="sm" variant="danger" onClick={remove}>Remover</Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label={saved ? "Nova senha padrão" : "Senha padrão"} hint="Mínimo 6 caracteres. Ela vai no e-mail de acesso de cada comprador novo.">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  type={visible ? "text" : "password"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Ex: gorg2026"
                  autoComplete="new-password"
                  className="pr-20"
                  aria-invalid={value.length > 0 && value.length < 6}
                />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2">
                  <IconButton label={visible ? "Esconder senha" : "Mostrar senha"} onClick={() => setVisible((v) => !v)}>
                    {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </IconButton>
                  <IconButton
                    label="Gerar senha"
                    onClick={() => {
                      setValue(generatePassword(10));
                      setVisible(true);
                    }}
                  >
                    <Wand2 size={15} />
                  </IconButton>
                </div>
              </div>
              <Button type="submit" loading={saving} disabled={value.length < 6}>Salvar</Button>
            </div>
          </Field>
          {value.length > 0 && value.length < 6 && <p className="mt-1.5 text-[12px] font-medium text-red-600">Faltam {6 - value.length} caracteres.</p>}
          {editing ? (
            <button type="button" onClick={() => { setEditing(false); setValue(""); }} className="mt-2 text-[12px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
              Cancelar troca
            </button>
          ) : (
            <Notice tone="amber" className="mt-3">Nenhuma senha padrão salva ainda: até salvar, cada comprador novo recebe uma senha aleatória.</Notice>
          )}
        </form>
      )}
    </div>
  );
}

// ── 5. Produtos do checkout ─────────────────────────────────────────
function CheckoutItemsCard({
  query,
  items,
  known,
  products,
  logs,
  tab,
  setTab,
  settings,
  onMap,
}: {
  query: { isLoading: boolean; error: unknown; refetch: () => unknown };
  items: CheckoutItem[];
  known: Set<string> | null;
  products: Product[];
  logs: WebhookLog[];
  tab: ItemTab;
  setTab: (t: ItemTab) => void;
  settings: PortalSettings;
  onMap: (item: CheckoutItem, isNew?: boolean) => void;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [emailItem, setEmailItem] = useState<CheckoutItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const states = useMemo(() => new Map(items.map((i) => [i.id, itemState(i, known)])), [items, known]);
  const counts = useMemo(() => {
    const c = { todos: items.length, pendentes: 0, ligados: 0, ignorados: 0 };
    states.forEach((s) => {
      if (s === "pending") c.pendentes++;
      else if (s === "linked") c.ligados++;
      else c.ignorados++;
    });
    return c;
  }, [items.length, states]);
  const soldPending = useMemo(() => items.filter((i) => states.get(i.id) === "pending" && i.salesCount > 0), [items, states]);

  // Vendas que chegaram antes do produto ser ligado (podem ser reprocessadas).
  const replayable = useMemo(() => {
    const replayed = new Set(logs.map((l) => l.replayOf).filter(Boolean) as string[]);
    const map = new Map<string, WebhookLog[]>();
    logs.forEach((log) => {
      if (log.status !== "unmatched" || replayed.has(log.id) || NOT_FINAL.test(log.event)) return;
      new Set(log.items.map((i) => norm(i.id))).forEach((key) => map.set(key, [...(map.get(key) || []), log]));
    });
    return map;
  }, [logs]);

  const list = useMemo(() => {
    const q = norm(search);
    const rank: Record<ItemState, number> = { pending: 0, linked: 1, ignored: 2 };
    const want: Record<ItemTab, ItemState | null> = { todos: null, pendentes: "pending", ligados: "linked", ignorados: "ignored" };
    return items
      .filter((i) => !want[tab] || states.get(i.id) === want[tab])
      .filter((i) => !q || [i.title, i.externalId, i.platform].some((v) => norm(v).includes(q)))
      .sort(
        (a, b) =>
          rank[states.get(a.id) || "linked"] - rank[states.get(b.id) || "linked"] ||
          (b.lastSeenAt || "").localeCompare(a.lastSeenAt || "") ||
          b.createdAt.localeCompare(a.createdAt),
      );
  }, [items, states, tab, search]);

  const toggleIgnored = async (item: CheckoutItem) => {
    if (!item.ignored && item.productIds.length) {
      const ok = await confirm({
        title: `Ignorar “${item.title || item.externalId}”?`,
        text: "Ele deixa de liberar as coleções ligadas nas próximas vendas. Quem já comprou continua com acesso.",
        confirmLabel: "Ignorar",
      });
      if (!ok) return;
    }
    setBusy(item.id);
    await run(() => repo.saveCheckoutItem({ ...item, ignored: !item.ignored }), { success: item.ignored ? "Produto reativado" : "Produto ignorado", scopes: ["studio"] });
    setBusy(null);
  };

  const remove = async (item: CheckoutItem) => {
    const ok = await confirm({
      title: `Excluir “${item.title || item.externalId}”?`,
      text: "Ele deixa de liberar acesso. Se o checkout mandar este produto de novo, ele volta para a lista como “Sem coleção”. Quem já comprou continua com acesso.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    setBusy(item.id);
    await run(() => repo.deleteCheckoutItem(item.id), { success: "Produto excluído", scopes: ["studio"] });
    setBusy(null);
  };

  const replay = async (item: CheckoutItem, events: WebhookLog[]) => {
    const n = events.length;
    const ok = await confirm({
      title: n === 1 ? "Liberar para quem já comprou?" : `Reprocessar ${n} vendas?`,
      text: "Os avisos que chegaram antes de você ligar este produto são processados de novo, na ordem em que chegaram, com as coleções de agora. Quem comprou recebe o acesso e o e-mail.",
      confirmLabel: "Reprocessar",
    });
    if (!ok) return;
    setBusy(item.id);
    await run(
      async () => {
        for (const log of [...events].reverse()) await repo.replayWebhook(log.id);
      },
      { success: n === 1 ? "Venda reprocessada" : `${n} vendas reprocessadas`, scopes: ["studio", "access"] },
    );
    setBusy(null);
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Package size={18} /> Produtos do checkout
        </span>
      }
      description="Cada produto vendido no checkout libera as coleções que você escolher. Ligue uma vez e pronto."
      actions={
        <Button size="sm" icon={<PackagePlus size={14} />} onClick={() => onMap(blankCheckoutItem(), true)}>
          <span className="hidden sm:inline">Adicionar ID manualmente</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-[#f5f5f7] to-white p-4 ring-1 ring-inset ring-black/[0.05]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1d1d1f] text-white">
          <Sparkles size={16} />
        </span>
        <p className="text-[13px] leading-relaxed text-[#424245]">
          <b className="text-[#1d1d1f]">Aprendizado automático.</b> Todo produto que chega num aviso do checkout aparece aqui sozinho, com o ID e o nome que o checkout usa. Basta ligar às coleções — e marcar como ignorado o que não libera nada (ex: o produto “carrinho”).
        </p>
      </div>

      {soldPending.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200/80 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-[13.5px] font-bold text-amber-900">
                {soldPending.length === 1 ? "1 produto já vendido não libera nenhuma coleção" : `${soldPending.length} produtos já vendidos não liberam nenhuma coleção`}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-amber-800/90">Quem comprou ainda não recebeu acesso. Ligue cada um às coleções certas e depois libere para quem já comprou.</p>
            </div>
          </div>
          {tab !== "pendentes" && (
            <Button size="sm" variant="secondary" className="shrink-0 self-start sm:self-auto" onClick={() => setTab("pendentes")}>Ver pendentes</Button>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <Tabs<ItemTab>
          value={tab}
          onChange={setTab}
          className="md:flex-1"
          tabs={[
            { value: "todos", label: "Todos", count: counts.todos },
            { value: "pendentes", label: "Sem coleção", count: counts.pendentes, tone: "amber" },
            { value: "ligados", label: "Ligados", count: counts.ligados },
            { value: "ignorados", label: "Ignorados", count: counts.ignorados },
          ]}
        />
        <div className="relative md:mb-2 md:w-64">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1a6]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou ID" className="pl-10" aria-label="Buscar produto do checkout" />
        </div>
      </div>

      <div className="mt-4">
        {query.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-[#f5f5f7]" />
            ))}
          </div>
        ) : query.error ? (
          <ErrorBox message={(query.error as Error).message} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="Nenhum produto ainda"
            text="Assim que o checkout mandar o primeiro aviso, os produtos aparecem aqui sozinhos. Você também pode cadastrar o ID à mão."
            action={<Button icon={<PackagePlus size={15} />} onClick={() => onMap(blankCheckoutItem(), true)}>Adicionar ID manualmente</Button>}
          />
        ) : list.length === 0 ? (
          <p className="rounded-2xl bg-[#f5f5f7] py-10 text-center text-[13px] text-[#86868b]">
            {search ? "Nenhum produto encontrado com essa busca." : tab === "pendentes" ? "Tudo ligado. Nenhum produto sem coleção." : "Nada por aqui."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/[0.06]">
            <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(0,1.35fr)_104px_104px] gap-4 border-b border-black/[0.05] bg-[#fbfbfd] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6] md:grid">
              <span>Produto no checkout</span>
              <span>Libera</span>
              <span>Vendas</span>
              <span className="sr-only">Ações</span>
            </div>
            <ul className="divide-y divide-black/[0.05]">
              {list.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  state={states.get(item.id) || "pending"}
                  products={products}
                  busy={busy === item.id}
                  replayable={states.get(item.id) === "linked" ? replayable.get(norm(item.externalId)) || [] : []}
                  onMap={() => onMap(item)}
                  onEmail={() => setEmailItem(item)}
                  onToggleIgnored={() => toggleIgnored(item)}
                  onDelete={() => remove(item)}
                  onReplay={(events) => replay(item, events)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      <ItemEmailModal item={emailItem} products={products} settings={settings} onClose={() => setEmailItem(null)} />
    </Card>
  );
}

function ItemRow({
  item,
  state,
  products,
  busy,
  replayable,
  onMap,
  onEmail,
  onToggleIgnored,
  onDelete,
  onReplay,
}: {
  item: CheckoutItem;
  state: ItemState;
  products: Product[];
  busy: boolean;
  replayable: WebhookLog[];
  onMap: () => void;
  onEmail: () => void;
  onToggleIgnored: () => void;
  onDelete: () => void;
  onReplay: (events: WebhookLog[]) => void;
}) {
  const linked = products.filter((p) => item.productIds.includes(p.id));
  const platform = platformLabel(item.platform);
  const statusBadge =
    state === "pending" ? <Badge tone="amber">Sem coleção</Badge> : state === "ignored" ? <Badge>Ignorado</Badge> : <Badge tone="green">Ligado</Badge>;

  return (
    <li className={cn("px-4 py-4 transition-colors md:px-5", state === "pending" && "bg-amber-50/40", busy && "opacity-60")}>
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.45fr)_minmax(0,1.35fr)_104px_104px] md:items-center md:gap-4">
        {/* Produto */}
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              state === "pending" ? "bg-amber-100 text-amber-700" : state === "ignored" ? "bg-black/[0.05] text-[#a1a1a6]" : "bg-[#1d1d1f] text-white",
            )}
          >
            <Package size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[14px] font-semibold", state === "ignored" && "text-[#86868b]")}>{item.title || "Sem nome"}</p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1">
              <code className="truncate font-mono text-[11.5px] text-[#86868b]" title={item.externalId}>{item.externalId}</code>
              <CopyIconButton value={item.externalId} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {statusBadge}
              {platform && <Badge>{platform}</Badge>}
              {item.email?.enabled && (
                <Badge tone="blue">
                  <Mail size={10} /> E-mail próprio
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Coleções */}
        {state === "pending" ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <Button size="sm" icon={<Link2 size={13} />} onClick={onMap}>Ligar coleções</Button>
            <span className="text-[12px] font-medium text-amber-800">Ainda não libera nada</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onMap}
            className="group/col flex min-w-0 items-center gap-2.5 rounded-xl text-left md:-mx-2 md:px-2 md:py-1.5 md:hover:bg-black/[0.03]"
            aria-label={`Escolher as coleções de ${item.title || item.externalId}`}
          >
            {state === "ignored" || !linked.length ? (
              <span className="text-[12.5px] text-[#86868b]">{state === "ignored" ? "Não libera nada (ignorado)" : "Nenhuma coleção"}</span>
            ) : (
              <>
                <span className="flex shrink-0 -space-x-2">
                  {linked.slice(0, 4).map((p) => (
                    <span key={p.id} className="relative block aspect-[2/3] w-7 overflow-hidden rounded-md ring-2 ring-white">
                      <PosterArt product={p} />
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold">{linked.map((p) => p.title).join(", ")}</span>
                  <span className="block text-[11px] text-[#86868b]">{plural(linked.length, "coleção", "coleções")}</span>
                </span>
              </>
            )}
            <Pencil size={13} className="shrink-0 text-[#a1a1a6] transition-colors group-hover/col:text-[#1d1d1f]" />
          </button>
        )}

        {/* Vendas + ações (uma linha só no celular) */}
        <div className="flex items-center justify-between gap-3 md:contents">
          <div className="min-w-0 text-[12px]">
            <p className="font-semibold tabular-nums text-[#1d1d1f]">{plural(item.salesCount, "venda", "vendas")}</p>
            <p className="truncate text-[#86868b]" title={item.lastSeenAt ? `Último aviso: ${fullDate(item.lastSeenAt)}` : undefined}>
              {item.lastSeenAt ? `visto ${relativeDate(item.lastSeenAt)}` : "ainda não recebido"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 md:justify-end">
            <IconButton label="E-mail próprio deste produto" onClick={onEmail} className={cn(item.email?.enabled && "bg-sky-50 text-sky-600")}>
              <Mail size={15} />
            </IconButton>
            <IconButton label={item.ignored ? "Voltar a considerar" : "Ignorar produto"} onClick={onToggleIgnored} disabled={busy}>
              {item.ignored ? <Eye size={15} /> : <EyeOff size={15} />}
            </IconButton>
            <IconButton label="Excluir produto" onClick={onDelete} disabled={busy} className="hover:text-red-600">
              <Trash2 size={15} />
            </IconButton>
          </div>
        </div>
      </div>

      {replayable.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-sky-50 px-3.5 py-2.5 ring-1 ring-inset ring-sky-200/70 sm:flex-row sm:items-center sm:justify-between md:ml-[52px]">
          <p className="text-[12px] leading-relaxed text-sky-900">
            <b>{plural(replayable.length, "venda", "vendas")}</b> deste produto {replayable.length === 1 ? "chegou" : "chegaram"} antes de ele ser ligado e {replayable.length === 1 ? "ficou" : "ficaram"} sem acesso.
          </p>
          <Button size="sm" variant="secondary" icon={<RotateCcw size={13} />} loading={busy} onClick={() => onReplay(replayable)} className="shrink-0 self-start sm:self-auto">
            Liberar agora
          </Button>
        </div>
      )}
    </li>
  );
}

function CopyIconButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      label="Copiar ID"
      className="h-6 w-6"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </IconButton>
  );
}

// ── E-mail próprio por produto ──────────────────────────────────────
type TemplateField = "subject" | "heading" | "message" | "buttonLabel" | "signature" | "html";

function ItemEmailModal({ item, products, settings, onClose }: { item: CheckoutItem | null; products: Product[]; settings: PortalSettings; onClose: () => void }) {
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [own, setOwn] = useState(false);
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [focused, setFocused] = useState<TemplateField>("message");
  const [account, setAccount] = useState<"new" | "existing">("new");
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const fields = useRef<Partial<Record<TemplateField, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const general = settings.email.welcome;

  // Reabre do zero a cada produto (o rascunho não deve ser trocado por um recarregamento das configurações).
  const itemId = item?.id;
  useEffect(() => {
    if (!item) return;
    setOwn(!!item.email?.enabled);
    setDraft(item.email ? { ...item.email } : { ...general });
    setFocused("message");
    setAccount("new");
    setTestTo((current) => current || user?.email || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const origin = window.location.origin;
  const template = useMemo<EmailTemplate>(() => (own && draft ? { ...draft, enabled: true } : general), [own, draft, general]);
  const preview = useMemo(() => {
    if (!item) return null;
    const titles = products.filter((p) => item.productIds.includes(p.id)).map((p) => p.title);
    const to = isValidEmail(testTo) ? normalizeEmail(testTo) : "ana@exemplo.com";
    const whatsapp = digits(settings.support.whatsapp || "");
    try {
      return renderEmail("welcome", template, {
        brand: settings.brandName,
        name: "Ana Julia Souza",
        email: to,
        phone: "11999998888",
        products: titles.length ? titles : [item.title || "Coleção de exemplo"],
        link: `${origin}/membros/entrar?email=${encodeURIComponent(to)}`,
        password: account === "new" ? "Exemplo-7Kq2" : undefined,
        orderId: "gg-70123",
        logoUrl: `${origin}/logo.png`,
        accent: settings.accentColor,
        supportUrl: whatsapp ? `https://wa.me/${whatsapp}` : `${origin}/membros/suporte`,
      });
    } catch (err) {
      return { subject: template.subject, html: `<p style="font-family:sans-serif;padding:24px;color:#b91c1c">Não foi possível montar a prévia: ${(err as Error).message}</p>`, text: "" };
    }
  }, [item, products, template, testTo, account, settings, origin]);

  if (!item) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;

  const nextValue: EmailTemplate | null = own && draft ? { ...draft, enabled: true } : item.email ? { ...item.email, enabled: false } : null;
  const dirty = JSON.stringify(nextValue) !== JSON.stringify(item.email);
  const set = (patch: Partial<EmailTemplate>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const htmlMode = !!draft && draft.mode === "html";
  const variables = EMAIL_VARIABLES.filter((v) => htmlMode || !v.html);

  const insert = (key: string) => {
    if (!draft) return;
    const token = key.startsWith("{") ? key : `{${key}}`;
    const target: TemplateField = htmlMode && focused !== "subject" ? "html" : focused;
    const el = fields.current[target];
    const current = String(draft[target] ?? "");
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    set({ [target]: current.slice(0, start) + token + current.slice(end) } as Partial<EmailTemplate>);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const setMode = (mode: "visual" | "html") => {
    if (!draft) return;
    if (mode === "html" && !draft.html.trim()) set({ mode, html: templateToHtml("welcome", draft) });
    else set({ mode });
    setFocused(mode === "html" ? "html" : "message");
  };

  const rebuildHtml = async () => {
    if (!draft) return;
    const ok = await confirm({ title: "Recriar o código?", text: "O HTML atual é trocado pelo modelo gerado a partir dos campos do modo visual.", confirmLabel: "Recriar" });
    if (ok) set({ html: templateToHtml("welcome", { ...draft, mode: "visual" }) });
  };

  const save = async () => {
    setSaving(true);
    const saved = await run(() => repo.saveCheckoutItem({ ...item, email: nextValue }), {
      success: own ? "E-mail próprio salvo" : "Este produto voltou a usar o e-mail geral",
      scopes: ["studio"],
    });
    setSaving(false);
    if (saved) onClose();
  };

  const removeOwn = async () => {
    const ok = await confirm({ title: "Apagar o e-mail próprio?", text: "O texto deste produto é apagado e ele volta a usar o e-mail de boas-vindas geral.", confirmLabel: "Apagar", danger: true });
    if (!ok) return;
    setSaving(true);
    const saved = await run(() => repo.saveCheckoutItem({ ...item, email: null }), { success: "E-mail próprio apagado", scopes: ["studio"] });
    setSaving(false);
    if (saved) onClose();
  };

  const sendTest = async () => {
    const to = normalizeEmail(testTo);
    if (!isValidEmail(to)) return toast.error("Informe um e-mail válido para o teste.");
    setTesting(true);
    await run(() => repo.sendTestEmail({ to, kind: "welcome", template, settings: settings.email, existingAccount: account === "existing" }), {
      success: `Teste enviado para ${to}`,
      scopes: ["studio"],
    });
    setTesting(false);
  };

  const textField = (key: Exclude<TemplateField, "html" | "message" | "signature">, label: string, placeholder?: string) => (
    <Field label={label}>
      <Input
        ref={(el) => {
          fields.current[key] = el;
        }}
        value={draft ? String(draft[key] ?? "") : ""}
        onChange={(e) => set({ [key]: e.target.value } as Partial<EmailTemplate>)}
        onFocus={() => setFocused(key)}
        placeholder={placeholder}
      />
    </Field>
  );

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      size="xl"
      title={`E-mail de “${item.title || item.externalId}”`}
      description="Quem comprar este produto recebe este e-mail de acesso no lugar do e-mail de boas-vindas geral."
      footer={
        <>
          <div className="mr-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="seu@email.com" className="h-9 bg-white sm:w-56" aria-label="E-mail para o teste" />
            <Button size="sm" variant="secondary" icon={<Send size={13} />} loading={testing} onClick={sendTest}>Enviar teste</Button>
          </div>
          {item.email && (
            <Button variant="ghost" onClick={removeOwn} disabled={saving} className="text-red-600 hover:text-red-700">Apagar</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
        </>
      }
    >
      {draft && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 space-y-5">
            <div className="rounded-2xl bg-[#f5f5f7] p-4">
              <Toggle
                checked={own}
                onChange={setOwn}
                label="Usar e-mail próprio neste produto"
                description={own ? "Este texto substitui o e-mail geral para quem comprar este produto." : "Desligado: este produto usa o e-mail de boas-vindas geral."}
              />
            </div>

            {own ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Segmented<"visual" | "html">
                    value={draft.mode === "html" ? "html" : "visual"}
                    onChange={setMode}
                    options={[
                      { value: "visual", label: <><Type size={13} /> Visual</> },
                      { value: "html", label: <><Code2 size={13} /> Código HTML</> },
                    ]}
                  />
                  {htmlMode && (
                    <button type="button" onClick={rebuildHtml} className="text-[12px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
                      Recriar a partir do visual
                    </button>
                  )}
                </div>

                {textField("subject", "Assunto")}

                {htmlMode ? (
                  <Field label="HTML do e-mail" hint="O e-mail é enviado exatamente com este código. As variáveis funcionam igual.">
                    <Textarea
                      ref={(el) => {
                        fields.current.html = el;
                      }}
                      value={draft.html}
                      onChange={(e) => set({ html: e.target.value })}
                      onFocus={() => setFocused("html")}
                      spellCheck={false}
                      className="min-h-[340px] whitespace-pre bg-[#1d1d1f] font-mono text-[12px] leading-relaxed text-white/90 focus:bg-[#1d1d1f]"
                    />
                  </Field>
                ) : (
                  <>
                    {textField("heading", "Título")}
                    <Field label="Mensagem" hint="Deixe uma linha em branco para começar outro parágrafo.">
                      <Textarea
                        ref={(el) => {
                          fields.current.message = el;
                        }}
                        value={draft.message}
                        onChange={(e) => set({ message: e.target.value })}
                        onFocus={() => setFocused("message")}
                        className="min-h-[140px]"
                      />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {textField("buttonLabel", "Texto do botão", "Acessar minha área")}
                      <Field label="Assinatura">
                        <Textarea
                          ref={(el) => {
                            fields.current.signature = el;
                          }}
                          value={draft.signature}
                          onChange={(e) => set({ signature: e.target.value })}
                          onFocus={() => setFocused("signature")}
                          className="min-h-[44px] py-2.5"
                          rows={2}
                        />
                      </Field>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-[12px] font-semibold">Variáveis</p>
                  <p className="mt-0.5 text-[11.5px] text-[#86868b]">Clique para inserir no campo selecionado. Cada uma vira o dado do comprador.</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {variables.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insert(v.key)}
                        title={v.label}
                        className="rounded-lg bg-white px-2.5 py-1 font-mono text-[11.5px] font-medium text-[#1d1d1f] shadow-sm ring-1 ring-black/[0.08] transition hover:ring-black/25"
                      >
                        {v.key.startsWith("{") ? v.key : `{${v.key}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl p-4 ring-1 ring-inset ring-black/[0.08]">
                <p className="text-[13px] leading-relaxed text-[#6e6e73]">
                  A prévia ao lado é o e-mail geral, que você edita em{" "}
                  <Link to="/membros/studio/emails" className="font-semibold text-[#1d1d1f] underline decoration-black/25 underline-offset-2">E-mails</Link>. Ligue a opção acima para escrever um texto só para este produto.
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-[#6e6e73]">Prévia {own ? "· e-mail próprio" : "· e-mail geral"}</p>
              <Segmented<"new" | "existing">
                value={account}
                onChange={setAccount}
                options={[
                  { value: "new", label: "Conta nova" },
                  { value: "existing", label: "Já tinha conta" },
                ]}
              />
            </div>
            {preview && <PreviewWithSender html={preview.html} subject={preview.subject} settings={settings} />}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Prévia com o remetente efetivo (só consulta o envio enquanto a prévia está aberta). */
function PreviewWithSender({ html, subject, settings }: { html: string; subject: string; settings: PortalSettings }) {
  const repo = useRepo();
  const status = useStudioQuery("email-status", () => repo.getEmailStatus());
  const from = status.data
    ? `${status.data.from.name} <${status.data.from.email}>`
    : settings.email.fromEmail
      ? `${settings.email.fromName} <${settings.email.fromEmail}>`
      : settings.email.fromName;
  return <EmailPreview html={html} subject={subject} from={from} />;
}

// ── 6. Venda de teste ───────────────────────────────────────────────
interface TestResult {
  log: WebhookLog | null;
  raw: unknown;
  email: string;
  event: "approved" | "refunded";
}

function TestSaleCard({ items, known, products, paused, onMap }: { items: CheckoutItem[]; known: Set<string> | null; products: Product[]; paused: boolean; onMap: (item: CheckoutItem) => void }) {
  const repo = useRepo();
  const run = useStudioAction();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ email: "", name: "", document: "", phone: "" });
  const [event, setEvent] = useState<"approved" | "refunded">("approved");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, email: f.email || user.email, name: f.name || user.name || "" }));
  }, [user]);

  const ordered = useMemo(() => {
    const rank: Record<ItemState, number> = { linked: 0, pending: 1, ignored: 2 };
    return [...items].sort((a, b) => rank[itemState(a, known)] - rank[itemState(b, known)] || (b.lastSeenAt || "").localeCompare(a.lastSeenAt || ""));
  }, [items, known]);
  const valid = selected.filter((id) => items.some((i) => i.id === id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const setField = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const simulate = async () => {
    const email = normalizeEmail(form.email);
    if (!isValidEmail(email)) return toast.error("Informe um e-mail válido.");
    if (!valid.length) return toast.error("Escolha pelo menos um produto do checkout.");
    setRunning(true);
    setResult(null);
    const response = await run(
      () =>
        repo.simulateSale({
          email,
          name: form.name.trim() || "Cliente Teste",
          phone: digits(form.phone) || undefined,
          document: digits(form.document) || undefined,
          items: valid,
          event,
        }),
      { scopes: ["studio", "access"] },
    );
    if (response) {
      const recent = await repo.listWebhookLogs({ limit: 5, search: email }).catch(() => [] as WebhookLog[]);
      const log = recent.find((l) => norm(l.email) === email && Math.abs(Date.now() - Date.parse(l.receivedAt)) < 3 * 60_000) || null;
      setResult({ log, raw: response.result, email, event });
      toast.success(event === "approved" ? "Venda de teste processada" : "Reembolso de teste processado");
    }
    setRunning(false);
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <FlaskConical size={18} /> Venda de teste
        </span>
      }
      description="Simula um aviso do GGCheckout e passa pelo mesmo caminho de uma venda real: libera o acesso, cria a conta e envia o e-mail de verdade. Não conta nas vendas do produto."
    >
      {items.length === 0 ? (
        <p className="rounded-2xl bg-[#f5f5f7] px-4 py-8 text-center text-[13px] text-[#86868b]">
          Adicione um produto do checkout primeiro (ou espere o primeiro aviso chegar) para fazer uma venda de teste.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <form
            className="min-w-0 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void simulate();
            }}
          >
            {paused && <Notice tone="amber">A automação está pausada: a venda de teste só vai ser registrada, sem liberar nada.</Notice>}

            <Field
              label={`Produtos da venda (${valid.length})`}
              aside={
                valid.length > 0 ? (
                  <button type="button" onClick={() => setSelected([])} className="text-[11px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">Limpar</button>
                ) : undefined
              }
            >
              <div className="flex max-h-[184px] flex-wrap gap-1.5 overflow-y-auto rounded-2xl bg-[#f5f5f7] p-2 ring-1 ring-inset ring-black/[0.05]">
                {ordered.map((item) => {
                  const on = valid.includes(item.id);
                  const state = itemState(item, known);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(item.id)}
                      title={item.externalId}
                      className={cn(
                        "flex max-w-full items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[12px] font-semibold transition",
                        on ? "bg-[#1d1d1f] text-white shadow-sm" : "bg-white text-[#1d1d1f] ring-1 ring-black/[0.07] hover:ring-black/20",
                        state === "ignored" && !on && "text-[#a1a1a6]",
                      )}
                    >
                      <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full", on ? "bg-white text-[#1d1d1f]" : "ring-1 ring-inset ring-black/20")}>
                        {on && <Check size={10} strokeWidth={3.5} />}
                      </span>
                      <span className="truncate">{item.title || item.externalId}</span>
                      {state === "pending" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="sem coleção" />}
                    </button>
                  );
                })}
              </div>
              {ordered.some((i) => itemState(i, known) === "pending") && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#86868b]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> sem coleção ligada (a venda não vai liberar nada)
                </p>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail do comprador" hint="Recebe o e-mail de verdade. Use o seu.">
                <Input type="email" value={form.email} onChange={(e) => setField({ email: e.target.value })} placeholder="voce@email.com" />
              </Field>
              <Field label="Nome">
                <Input value={form.name} onChange={(e) => setField({ name: e.target.value })} placeholder="Cliente Teste" />
              </Field>
              <Field label="CPF (opcional)">
                <Input value={form.document} onChange={(e) => setField({ document: e.target.value })} inputMode="numeric" placeholder="Só números" maxLength={18} />
              </Field>
              <Field label="Telefone (opcional)">
                <Input value={form.phone} onChange={(e) => setField({ phone: e.target.value })} inputMode="tel" placeholder="5511999999999" maxLength={20} />
              </Field>
            </div>

            <Field label="Evento">
              <Segmented<"approved" | "refunded">
                value={event}
                onChange={setEvent}
                options={[
                  { value: "approved", label: <><CircleCheck size={13} /> Compra aprovada</> },
                  { value: "refunded", label: <><Undo2 size={13} /> Reembolso</> },
                ]}
              />
            </Field>

            <Button type="submit" variant="accent" icon={<FlaskConical size={15} />} loading={running} disabled={!valid.length}>
              {event === "approved" ? "Simular compra" : "Simular reembolso"}
            </Button>
          </form>

          <div className="min-w-0">
            {running ? (
              <div className="grid h-full min-h-[260px] place-items-center rounded-2xl bg-[#f5f5f7]">
                <div className="text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#86868b]" />
                  <p className="mt-3 text-[13px] text-[#86868b]">Processando a venda…</p>
                </div>
              </div>
            ) : result ? (
              <TestResultPanel result={result} items={items} products={products} onMap={onMap} />
            ) : (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/[0.08] px-6 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ma/10 text-ma">
                  <FlaskConical size={20} />
                </span>
                <p className="mt-4 text-[14px] font-bold">O resultado aparece aqui</p>
                <p className="mt-1 max-w-xs text-[12.5px] text-[#86868b]">Coleções liberadas, se a conta foi criada e se o e-mail saiu — com link para ver tudo nos registros.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function TestResultPanel({ result, items, products, onMap }: { result: TestResult; items: CheckoutItem[]; products: Product[]; onMap: (item: CheckoutItem) => void }) {
  const { log } = result;
  if (!log) {
    return (
      <div className="rounded-2xl bg-[#f5f5f7] p-5">
        <Badge tone="green"><Check size={11} /> Processada</Badge>
        <p className="mt-3 text-[13px] text-[#424245]">A venda foi processada. Os detalhes completos ficam nos registros.</p>
        <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-[#1d1d1f] p-3 font-mono text-[11px] text-white/80">{JSON.stringify(result.raw, null, 2)}</pre>
        <ButtonLink to="/membros/studio/registros?aba=webhook" size="sm" variant="secondary" className="mt-4" icon={<History size={13} />}>Abrir registros</ButtonLink>
      </div>
    );
  }

  const status = LOG_STATUS[log.status] || { label: log.status, tone: "neutral" as Tone };
  const collections = products.filter((p) => log.productIds.includes(p.id));
  const email =
    log.emailStatus === "sent"
      ? { tone: "green" as Tone, label: "Enviado", text: `para ${log.email}`, icon: <Mail size={15} /> }
      : log.emailStatus === "failed"
        ? { tone: "red" as Tone, label: "Falhou", text: "veja o erro nos registros", icon: <MailX size={15} /> }
        : log.emailStatus === "skipped"
          ? { tone: "neutral" as Tone, label: "Não enviado", text: "o motivo está no resumo acima", icon: <Mail size={15} /> }
          : { tone: "neutral" as Tone, label: "Nenhum", text: "esta venda não gera e-mail", icon: <Mail size={15} /> };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl ring-1 ring-black/[0.08]">
      <div className={cn("rounded-t-2xl px-5 py-4", status.tone === "green" ? "bg-emerald-50" : status.tone === "red" ? "bg-red-50" : status.tone === "amber" ? "bg-amber-50" : "bg-[#f5f5f7]")}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="text-[11px] text-[#86868b]" title={fullDate(log.receivedAt)}>{relativeDate(log.receivedAt)}</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#1d1d1f]">{log.message || "Venda processada."}</p>
      </div>

      <dl className="divide-y divide-black/[0.05] px-5">
        <div className="py-3.5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Produtos detectados</dt>
          <dd className="mt-2 space-y-1.5">
            {log.items.length === 0 && <p className="text-[12.5px] text-[#86868b]">Nenhum produto no aviso.</p>}
            {log.items.map((i) => {
              const known = items.find((c) => norm(c.externalId) === norm(i.id));
              return (
                <div key={i.id} className="flex items-center gap-2 text-[12.5px]">
                  {i.matched ? <CircleCheck size={14} className="shrink-0 text-emerald-600" /> : i.ignored ? <EyeOff size={14} className="shrink-0 text-[#a1a1a6]" /> : <AlertTriangle size={14} className="shrink-0 text-amber-600" />}
                  <span className="min-w-0 flex-1 truncate font-semibold">{i.title || i.id}</span>
                  {!i.matched && !i.ignored && known && (
                    <button type="button" onClick={() => onMap(known)} className="shrink-0 text-[12px] font-semibold text-amber-800 underline decoration-amber-800/30 underline-offset-2 hover:decoration-amber-800">
                      Ligar coleções
                    </button>
                  )}
                  {i.ignored && <span className="shrink-0 text-[11px] text-[#a1a1a6]">ignorado</span>}
                </div>
              );
            })}
          </dd>
        </div>

        <div className="py-3.5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">{result.event === "refunded" ? "Coleções retiradas" : "Coleções liberadas"}</dt>
          <dd className="mt-2">
            {collections.length ? (
              <div className="flex flex-wrap gap-2">
                {collections.map((p) => (
                  <span key={p.id} className="flex max-w-full items-center gap-2 rounded-full bg-[#f5f5f7] py-1 pl-1 pr-3 text-[12px] font-semibold">
                    <span className="relative block aspect-[2/3] w-5 shrink-0 overflow-hidden rounded">
                      <PosterArt product={p} />
                    </span>
                    <span className="truncate">{p.title}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-[#86868b]">Nenhuma.</p>
            )}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">E-mail</dt>
            <dd className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
              <Badge tone={email.tone}>{email.label}</Badge>
              <span className="truncate text-[#6e6e73]">{email.text}</span>
            </dd>
          </div>
          {log.emailLogId && (
            <ButtonLink to={`/membros/studio/registros?aba=emails&email=${encodeURIComponent(log.emailLogId)}`} size="sm" variant="secondary" icon={email.icon} className="shrink-0">
              Ver e-mail
            </ButtonLink>
          )}
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] px-5 py-3.5">
        <p className="text-[11.5px] text-[#86868b]">Pedido {log.orderId || "—"}</p>
        <Link
          to={`/membros/studio/registros?aba=webhook&evento=${encodeURIComponent(log.id)}`}
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#1d1d1f] hover:underline"
        >
          Ver evento completo <ArrowRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}

// ── Peças pequenas ──────────────────────────────────────────────────
function Notice({ tone, children, className, action }: { tone: "amber" | "red"; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset sm:flex-row sm:items-center",
        tone === "red" ? "bg-red-50 text-red-900 ring-red-200/70" : "bg-amber-50 text-amber-900 ring-amber-200/70",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {tone === "red" ? <ShieldAlert size={16} className="mt-px shrink-0 text-red-600" /> : <AlertTriangle size={16} className="mt-px shrink-0 text-amber-600" />}
        <p className="text-[12.5px] leading-relaxed">{children}</p>
      </div>
      {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-red-50 px-6 py-10 text-center ring-1 ring-inset ring-red-200/70">
      <AlertTriangle className="h-6 w-6 text-red-500" />
      <p className="mt-3 text-[14px] font-bold text-red-900">Não foi possível carregar</p>
      <p className="mt-1 max-w-md text-[12.5px] text-red-800/80">{message || "Tente de novo em instantes."}</p>
      <Button size="sm" variant="secondary" className="mt-4" icon={<RefreshCw size={13} />} onClick={onRetry}>Tentar de novo</Button>
    </div>
  );
}
