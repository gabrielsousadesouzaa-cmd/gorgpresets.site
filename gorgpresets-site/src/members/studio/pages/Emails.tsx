// E-mails: como os e-mails saem (o seu próprio e-mail por SMTP ou o Resend),
// quem aparece como remetente e os modelos de boas-vindas e de acesso
// retirado — no modo visual ou em código HTML —, com prévia ao vivo (o mesmo
// modelo que a Edge Function envia) e envio de teste.
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  Info,
  KeyRound,
  Loader2,
  Lock,
  MailX,
  PlugZap,
  RotateCcw,
  Send,
  Server,
  ShieldCheck,
  Trash2,
  Unplug,
  Wand2,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useCatalog, useRepo, useSettings } from "../../context/MembersContext";
import { DEFAULT_EMAIL, EMAIL_VARIABLES, mergeEmailSettings, renderEmail, templateToHtml } from "../../../../supabase/functions/members-api/email";
import { mergeAutomation } from "../../../../supabase/functions/members-api/automation";
import { formatBytes, isValidEmail, normalizeEmail, sortByOrder } from "../../lib/format";
import type { EmailProviderStatus, EmailSettings, EmailTemplate, PortalSettings, SmtpInput, SmtpSecurity, TemplateKind } from "../../lib/types";
import { Badge, Button, ButtonLink, Card, CopyButton, EmptyState, Field, IconButton, Input, PageHeader, Segmented, TagInput, Textarea, Toggle, useConfirm } from "../ui";
import { useStudioAction, useStudioQuery } from "../hooks";
import { Tabs } from "../components/Tabs";
import { EmailPreview } from "../components/EmailPreview";

// ── Constantes ──────────────────────────────────────────────────────
type TabId = "envio" | "boas-vindas" | "acesso-retirado";
type Provider = EmailSettings["provider"];
type Editable = HTMLInputElement | HTMLTextAreaElement;
type TextKey = "subject" | "heading" | "message" | "buttonLabel" | "signature";
type FieldKey = TextKey | "html";
type RenderContext = Parameters<typeof renderEmail>[2];
type Tone = "amber" | "red" | "green" | "blue" | "neutral";

const STATUS_KEY = ["ma", "studio", "email-status"];
const LOGS_URL = "/membros/studio/registros?aba=emails";
const AUTOMATIONS_URL = "/membros/studio/automacoes";
const BLOCKED_PORTS = [25, 587];
const MAX_BCC = 5;

function parseTab(value: string | null): TabId {
  if (value === "boas-vindas" || value === "welcome") return "boas-vindas";
  if (value === "acesso-retirado" || value === "refund" || value === "reembolso") return "acesso-retirado";
  return "envio";
}

const KIND_INFO: Record<TemplateKind, { title: string; toggle: string; auto: string }> = {
  welcome: {
    title: "Boas-vindas",
    toggle: "Sai a cada compra aprovada, com o login e as coleções liberadas. Desligado, o comprador entra pelo “Primeiro acesso”.",
    auto: "As coleções compradas e os dados de acesso (e-mail e senha provisória) entram sozinhos abaixo do texto. O botão leva para a área de membros.",
  },
  refund: {
    title: "Acesso retirado",
    toggle: "Sai quando o acesso é retirado por reembolso ou chargeback, avisando o cliente sobre as coleções que saíram da conta.",
    auto: "A lista de coleções retiradas (com o nº do pedido) entra sozinha abaixo do texto. O botão leva para o seu suporte.",
  },
};

const TEXT_LABELS: Record<FieldKey, string> = {
  subject: "Assunto",
  heading: "Título",
  message: "Texto",
  buttonLabel: "Texto do botão",
  signature: "Assinatura",
  html: "Código HTML",
};

const SECURITY_LABEL: Record<SmtpSecurity, string> = { ssl: "SSL", starttls: "STARTTLS", none: "sem criptografia" };
const SECURITY_OPTIONS: Array<{ value: SmtpSecurity; label: string }> = [
  { value: "ssl", label: "SSL" },
  { value: "starttls", label: "STARTTLS" },
  { value: "none", label: "Nenhuma" },
];
const SECURITY_HINT: Record<SmtpSecurity, string> = {
  ssl: "Conexão protegida desde o início — o padrão da porta 465.",
  starttls: "Conecta e depois ativa a proteção. Use a porta 2525, se o seu provedor oferecer.",
  none: "Sem proteção: a senha trafega aberta. Evite.",
};

const SMTP_PRESETS = {
  hostinger: { label: "Hostinger", host: "smtp.hostinger.com", port: 465, security: "ssl" },
  gmail: { label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, security: "ssl" },
  zoho: { label: "Zoho", host: "smtp.zoho.com", port: 465, security: "ssl" },
} satisfies Record<string, { label: string; host: string; port: number; security: SmtpSecurity }>;
type PresetId = keyof typeof SMTP_PRESETS;

const DOMAIN_STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  verified: { label: "Verificado", tone: "green" },
  pending: { label: "Aguardando DNS", tone: "amber" },
  not_started: { label: "Não verificado", tone: "amber" },
  partially_verified: { label: "Parcial", tone: "amber" },
  partially_failed: { label: "Falhou em parte", tone: "red" },
  failed: { label: "Falhou", tone: "red" },
};

// ── Utilidades ──────────────────────────────────────────────────────
const splitEmails = (value: string) => String(value || "").split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
const sameEmail = (a: string, b: string) => normalizeEmail(a) === normalizeEmail(b);
const origin = () => (typeof window !== "undefined" ? window.location.origin : "https://gorgpresets.site");

/** Insere texto no cursor mantendo o “desfazer” (Ctrl+Z) do navegador. */
function insertAtCursor(el: Editable, text: string, fallback: (value: string, caret: number) => void) {
  el.focus();
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  let inserted = false;
  try {
    inserted = document.execCommand("insertText", false, text);
  } catch {
    inserted = false;
  }
  if (!inserted) fallback(el.value.slice(0, start) + text + el.value.slice(end), start + text.length);
}

function safeRender(kind: TemplateKind, template: EmailTemplate, ctx: RenderContext) {
  try {
    return renderEmail(kind, template, ctx);
  } catch (err) {
    const message = String((err as Error)?.message || "erro desconhecido").replace(/[<>&]/g, "");
    return {
      subject: template.subject,
      html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;padding:32px;color:#b91c1c;font-size:14px">Não foi possível montar a prévia: ${message}</div>`,
      text: "",
    };
  }
}

interface CheckItem {
  ok: boolean;
  label: string;
  /** O que falta, para o aviso do topo. */
  todo?: string;
  /** Aviso que não impede o envio. */
  warn?: boolean;
}

interface Readiness {
  ready: boolean;
  via: string;
  items: CheckItem[];
}

/** Mesmas regras do servidor (mailerReady), aplicadas ao rascunho. */
function computeReadiness(draft: EmailSettings, status: EmailProviderStatus): Readiness {
  if (draft.provider === "smtp") {
    const s = status.smtp;
    const server = s.configured && !!s.host && !!s.username;
    const mismatch = server && isValidEmail(draft.fromEmail) && isValidEmail(s.username) && !sameEmail(draft.fromEmail, s.username);
    const items: CheckItem[] = [
      { ok: server, label: server ? `Servidor ${s.host}:${s.port}` : "Servidor e usuário do SMTP", todo: "os dados do SMTP" },
      { ok: s.hasPassword, label: s.hasPassword ? "Senha salva com segurança" : "Senha do e-mail", todo: "a senha do e-mail" },
    ];
    if (mismatch) items.push({ ok: false, warn: true, label: "Remetente diferente do usuário do SMTP" });
    return { ready: server && s.hasPassword, via: server ? `Pelo SMTP · ${s.host}:${s.port} (${SECURITY_LABEL[s.security]})` : "Pelo seu e-mail (SMTP)", items };
  }
  const r = status.resend;
  const key = r.configured && r.keyCheck !== "invalid";
  const from = isValidEmail(draft.fromEmail);
  return {
    ready: key && from,
    via: r.configured ? `Pelo Resend · chave ${r.hint || ""}` : "Pelo Resend (API)",
    items: [
      { ok: key, label: r.keyCheck === "invalid" ? "Chave do Resend recusada" : r.configured ? "Chave da API conectada" : "Chave da API do Resend", todo: "uma chave válida do Resend" },
      { ok: from, label: from ? `Remetente ${normalizeEmail(draft.fromEmail)}` : "E-mail do remetente do seu domínio", todo: "o e-mail do remetente" },
    ],
  };
}

/** Remetente que o servidor usaria com o rascunho (mesma ordem do senderAddress). */
function computeSender(draft: EmailSettings, status: EmailProviderStatus | undefined, brand: string) {
  const name = draft.fromName.trim() || brand || "Gorg Presets";
  if (isValidEmail(draft.fromEmail)) return { name, email: normalizeEmail(draft.fromEmail) };
  if (draft.provider === "smtp") {
    const user = status?.smtp.configured ? status.smtp.username : "";
    return { name, email: isValidEmail(user) ? normalizeEmail(user) : "" };
  }
  return { name, email: status?.from.email || "" };
}

// ── Página ──────────────────────────────────────────────────────────
export default function EmailsPage() {
  const repo = useRepo();
  const { user } = useAuth();
  const settingsQuery = useSettings();
  const settings = settingsQuery.data;
  const { catalog } = useCatalog();
  const run = useStudioAction();
  const queryClient = useQueryClient();
  const statusQuery = useStudioQuery("email-status", () => repo.getEmailStatus());
  const status = statusQuery.data;
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get("aba"));

  const saved = useMemo(() => (settings ? mergeEmailSettings(settings.email) : null), [settings]);
  const [draft, setDraft] = useState<EmailSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (saved && !draft) setDraft(saved);
  }, [saved, draft]);
  useEffect(() => {
    if (user?.email) setTestTo((current) => current || user.email);
  }, [user?.email]);

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const sampleProducts = useMemo(() => {
    const titles = sortByOrder(catalog.products.filter((p) => p.published)).map((p) => p.title);
    return titles.length ? titles.slice(0, 2) : ["Coleção de exemplo"];
  }, [catalog.products]);

  const setTab = (next: TabId) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("aba", next);
        return p;
      },
      { replace: true },
    );

  const set = (patch: Partial<EmailSettings>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setTemplate = (kind: TemplateKind, patch: Partial<EmailTemplate>) => setDraft((d) => (d ? { ...d, [kind]: { ...d[kind], ...patch } } : d));

  const save = async () => {
    if (!draft || !settings || saving) return;
    if (draft.fromEmail && !isValidEmail(draft.fromEmail)) {
      setTab("envio");
      toast.error("O e-mail do remetente está inválido.");
      return;
    }
    if (draft.replyTo && !isValidEmail(draft.replyTo)) {
      setTab("envio");
      toast.error("O e-mail de “Responder para” está inválido.");
      return;
    }
    setSaving(true);
    const ok = await run(() => repo.saveSettings({ ...settings, email: draft }).then(() => true), { success: "E-mails salvos", scopes: ["settings"] });
    setSaving(false);
    if (ok) void statusQuery.refetch();
  };

  /** Depois de salvar um provedor: atualiza a situação e, se nada estava saindo, já passa a usá-lo. */
  const onProviderSaved = async (next: EmailProviderStatus, provider: Provider) => {
    const wasReady = status?.ready ?? false;
    queryClient.setQueryData(STATUS_KEY, next);
    const configured = provider === "smtp" ? next.smtp.configured : next.resend.configured;
    if (!settings || !saved || !configured || wasReady || saved.provider === provider) return;
    const smtpUser = normalizeEmail(next.smtp.username || "");
    const fromEmail = saved.fromEmail || (provider === "smtp" && isValidEmail(smtpUser) ? smtpUser : "");
    const ok = await run(() => repo.saveSettings({ ...settings, email: { ...saved, provider, fromEmail } }).then(() => true), { scopes: ["settings"] });
    if (!ok) return;
    setDraft((d) => (d ? { ...d, provider, fromEmail: d.fromEmail || fromEmail } : d));
    void statusQuery.refetch();
    toast.success(provider === "smtp" ? "Os e-mails agora saem pelo seu SMTP" : "Os e-mails agora saem pelo Resend");
  };

  // Ctrl/⌘ + S salva; sair da página com alterações pede confirmação.
  const saveRef = useRef(save);
  saveRef.current = save;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && dirtyRef.current) {
        e.preventDefault();
        void saveRef.current();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  if (settingsQuery.isError) {
    return (
      <div>
        <PageHeader title="E-mails" />
        <EmptyState
          icon={<MailX />}
          title="Não foi possível carregar"
          text={(settingsQuery.error as Error)?.message || "Confira a sua conexão e tente de novo."}
          action={<Button onClick={() => settingsQuery.refetch()} loading={settingsQuery.isFetching}>Tentar de novo</Button>}
        />
      </div>
    );
  }

  if (!draft || !settings || !saved) {
    return (
      <div className="grid min-h-[50vh] place-items-center" aria-busy="true">
        <Loader2 className="h-7 w-7 animate-spin text-[#86868b]" aria-label="Carregando" />
      </div>
    );
  }

  const computed = status ? computeReadiness(draft, status) : null;
  const unchanged = draft.provider === saved.provider && draft.fromEmail === saved.fromEmail && draft.fromName === saved.fromName;
  const ready = !!computed && computed.ready && (unchanged ? !!status?.ready : true);
  const sender = unchanged && status?.ready ? status.from : computeSender(draft, status, settings.brandName);
  const autoOn = draft.welcome.enabled || draft.refund.enabled;
  const showWarning = !!status && autoOn && !ready;
  const providerName = draft.provider === "smtp" ? "seu e-mail (SMTP)" : "Resend";

  return (
    <div className="pb-28">
      <PageHeader
        title="E-mails"
        subtitle="Como os e-mails saem, quem aparece como remetente e o que o cliente recebe na compra e quando o acesso é retirado."
        actions={
          <>
            <ButtonLink to={LOGS_URL} variant="secondary" icon={<History size={15} />}>
              Registro de envios
            </ButtonLink>
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Salvar alterações
            </Button>
          </>
        }
      />

      {showWarning && (
        <Notice
          tone="amber"
          className="mb-6"
          action={
            tab !== "envio" ? (
              <Button size="sm" variant="secondary" onClick={() => setTab("envio")}>
                Configurar envio
              </Button>
            ) : undefined
          }
        >
          <b>Os e-mails automáticos estão ligados, mas o envio ainda não está pronto.</b> As compras continuam liberando o acesso, só que o cliente não recebe o e-mail.
          {computed && computed.items.some((i) => !i.ok && !i.warn) && (
            <> Falta: {computed.items.filter((i) => !i.ok && !i.warn).map((i) => i.todo || i.label).join(" e ")}.</>
          )}
        </Notice>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-8"
        tabs={[
          { value: "envio", label: <TabLabel text="Envio" dot={status ? (ready ? "green" : "amber") : undefined} /> },
          { value: "boas-vindas", label: <TabLabel text="Boas-vindas" off={!draft.welcome.enabled} /> },
          { value: "acesso-retirado", label: <TabLabel text="Acesso retirado" off={!draft.refund.enabled} /> },
        ]}
      />

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        {tab === "envio" ? (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 xl:sticky xl:top-6 xl:order-2">
              <StatusCard
                loading={statusQuery.isLoading}
                error={statusQuery.error as Error | null}
                onRetry={() => statusQuery.refetch()}
                retrying={statusQuery.isFetching}
                ready={ready}
                readiness={computed}
                sender={sender}
                pendingProvider={draft.provider !== saved.provider ? providerName : null}
                welcomeOn={draft.welcome.enabled}
                refundOn={draft.refund.enabled}
                onTab={setTab}
              />
            </div>

            <div className="min-w-0 space-y-6 xl:order-1">
              <section aria-labelledby="provider-title">
                <h2 id="provider-title" className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-[#86868b]">
                  Como os e-mails saem
                </h2>
                <ProviderPicker value={draft.provider} savedValue={saved.provider} status={status} onChange={(provider) => set({ provider })} />
              </section>

              {draft.provider === "smtp" ? (
                <SmtpCard
                  status={status}
                  loading={statusQuery.isLoading}
                  active={saved.provider === "smtp"}
                  draft={draft}
                  setDraft={set}
                  supportEmail={settings.support.email}
                  onSaved={(next) => onProviderSaved(next, "smtp")}
                />
              ) : (
                <ResendCard
                  status={status}
                  loading={statusQuery.isLoading}
                  error={statusQuery.error as Error | null}
                  active={saved.provider === "resend"}
                  onSaved={(next) => onProviderSaved(next, "resend")}
                  onRefresh={() => statusQuery.refetch()}
                  refreshing={statusQuery.isFetching}
                />
              )}

              <SenderCard draft={draft} set={set} status={status} settings={settings} />

              <TestCard
                kind="welcome"
                template={draft.welcome}
                emailSettings={draft}
                existingAccount={false}
                to={testTo}
                onTo={setTestTo}
                ready={ready}
                title="Enviar um e-mail de teste"
                description="Manda o e-mail de boas-vindas (com dados de exemplo) para conferir se chega certinho."
              />
            </div>
          </div>
        ) : (
          (() => {
            const kind: TemplateKind = tab === "boas-vindas" ? "welcome" : "refund";
            return (
              <TemplateTab
                key={kind}
                kind={kind}
                template={draft[kind]}
                onChange={(patch) => setTemplate(kind, patch)}
                emailSettings={draft}
                settings={settings}
                sampleProducts={sampleProducts}
                sender={sender}
                ready={ready}
                onConfigure={() => setTab("envio")}
                testTo={testTo}
                onTestTo={setTestTo}
              />
            );
          })()
        )}
      </motion.div>

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
              <button type="button" onClick={() => setDraft(saved)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-white/70 hover:text-white">
                Descartar
              </button>
              <Button variant="accent" onClick={save} loading={saving}>
                Salvar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Peças gerais ────────────────────────────────────────────────────
function TabLabel({ text, dot, off }: { text: string; dot?: "green" | "amber"; off?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {text}
      {dot && (
        <>
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot === "green" ? "bg-emerald-500" : "bg-amber-500")} />
          <span className="sr-only">{dot === "green" ? "(pronto)" : "(falta configurar)"}</span>
        </>
      )}
      {off && <span className="rounded-full bg-black/[0.05] px-1.5 py-px text-[10px] font-semibold text-[#86868b]">Desligado</span>}
    </span>
  );
}

function Notice({ tone = "amber", children, action, className }: { tone?: Tone; children: ReactNode; action?: ReactNode; className?: string }) {
  const styles: Record<Tone, string> = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200/70",
    red: "bg-red-50 text-red-800 ring-red-200/70",
    green: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
    blue: "bg-sky-50 text-sky-900 ring-sky-200/70",
    neutral: "bg-[#f5f5f7] text-[#424245] ring-black/[0.04]",
  };
  const Icon = tone === "green" ? CheckCircle2 : tone === "red" ? XCircle : tone === "amber" ? AlertTriangle : Info;
  return (
    <div role={tone === "red" ? "alert" : undefined} className={cn("flex flex-col gap-3 rounded-2xl p-4 text-[13px] leading-relaxed ring-1 ring-inset sm:flex-row sm:items-center", styles[tone], className)}>
      <div className="flex min-w-0 flex-1 gap-2.5">
        <Icon size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0 break-words">{children}</div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2 pl-[26px] sm:pl-0">{action}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#a1a1a6]">{children}</p>;
}

// ── Situação do envio ───────────────────────────────────────────────
function StatusCard({
  loading,
  error,
  onRetry,
  retrying,
  ready,
  readiness,
  sender,
  pendingProvider,
  welcomeOn,
  refundOn,
  onTab,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  retrying: boolean;
  ready: boolean;
  readiness: Readiness | null;
  sender: { name: string; email: string };
  pendingProvider: string | null;
  welcomeOn: boolean;
  refundOn: boolean;
  onTab: (tab: TabId) => void;
}) {
  const known = !!readiness;
  return (
    <Card padded={false} className="overflow-hidden">
      <div aria-live="polite" className={cn("flex items-center gap-4 px-6 py-5", !known ? "bg-[#fbfbfd]" : ready ? "bg-emerald-50/80" : "bg-amber-50/80")}>
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm",
            !known ? "bg-black/[0.08] text-[#86868b]" : ready ? "bg-emerald-500" : "bg-amber-400",
          )}
        >
          {!known ? <Loader2 size={20} className={cn(loading && "animate-spin")} /> : ready ? <CheckCircle2 size={22} /> : <AlertTriangle size={20} />}
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-bold tracking-tight">{!known ? (loading ? "Verificando o envio…" : "Situação indisponível") : ready ? "Pronto para enviar ✓" : "Falta configurar"}</p>
          {readiness && <p className="mt-0.5 truncate text-[12.5px] text-[#6e6e73]" title={readiness.via}>{readiness.via}</p>}
        </div>
      </div>

      <div className="space-y-5 p-6">
        {error && (
          <Notice
            tone="red"
            action={
              <Button size="sm" variant="secondary" onClick={onRetry} loading={retrying}>
                Tentar de novo
              </Button>
            }
          >
            {error.message || "Não foi possível consultar a situação do envio."}
          </Notice>
        )}
        {pendingProvider && (
          <Notice tone="blue">
            Você escolheu o <b>{pendingProvider}</b>. Salve as alterações para começar a enviar por ele.
          </Notice>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <div className="min-w-0">
            <SectionLabel>Sai como</SectionLabel>
            <p className="truncate text-[14px] font-semibold">{sender.name}</p>
            <p className="break-all text-[12.5px] text-[#6e6e73]">{sender.email || "Ainda sem e-mail — configure abaixo"}</p>
          </div>

          {readiness && (
            <div className="min-w-0">
              <SectionLabel>Checklist</SectionLabel>
              <ul className="space-y-2">
                {readiness.items.map((item) => (
                  <li key={item.label} className="flex items-start gap-2 text-[13px]">
                    {item.ok ? (
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Ok" />
                    ) : item.warn ? (
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" aria-label="Atenção" />
                    ) : (
                      <CircleDashed size={15} className="mt-0.5 shrink-0 text-[#a1a1a6]" aria-label="Pendente" />
                    )}
                    <span className={cn("min-w-0 break-words", item.ok ? "text-[#1d1d1f]" : item.warn ? "text-amber-800" : "text-[#6e6e73]")}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-black/[0.06] pt-4">
          <SectionLabel>E-mails automáticos</SectionLabel>
          <div className="-mx-2 space-y-0.5">
            {(
              [
                { tab: "boas-vindas", label: "Boas-vindas", on: welcomeOn },
                { tab: "acesso-retirado", label: "Acesso retirado", on: refundOn },
              ] as const
            ).map((row) => (
              <button
                key={row.tab}
                type="button"
                onClick={() => onTab(row.tab)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-[13px] font-medium transition-colors hover:bg-black/[0.04]"
              >
                {row.label}
                <span className="flex items-center gap-1.5">
                  <Badge tone={row.on ? "green" : "neutral"}>{row.on ? "Ligado" : "Desligado"}</Badge>
                  <ArrowRight size={13} className="text-[#a1a1a6]" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <Link to={LOGS_URL} className="flex items-center justify-between rounded-xl bg-[#f5f5f7] px-3.5 py-3 text-[13px] font-semibold transition-colors hover:bg-black/[0.06]">
          <span className="flex items-center gap-2">
            <History size={15} className="text-[#86868b]" /> Ver se cada e-mail foi enviado
          </span>
          <ArrowRight size={14} className="text-[#86868b]" />
        </Link>
      </div>
    </Card>
  );
}

// ── Escolha do provedor ─────────────────────────────────────────────
function ProviderPicker({ value, savedValue, status, onChange }: { value: Provider; savedValue: Provider; status?: EmailProviderStatus; onChange: (p: Provider) => void }) {
  const options: Array<{ id: Provider; title: string; text: string; icon: ReactNode; badge?: string; configured: boolean; detail: string }> = [
    {
      id: "smtp",
      title: "Seu e-mail (SMTP)",
      badge: "Recomendado",
      icon: <Server size={18} />,
      text: "Envia pela sua própria caixa de e-mail, como um e-mail normal. Funciona com Hostinger, Gmail/Google Workspace, Zoho e outros que aceitam a porta 465.",
      configured: !!status?.smtp.configured,
      detail: status?.smtp.configured ? status.smtp.username : "Não configurado",
    },
    {
      id: "resend",
      title: "Resend (API)",
      icon: <Zap size={18} />,
      text: "Serviço de envio com o seu domínio verificado. Grátis até 3.000 e-mails por mês.",
      configured: !!status?.resend.configured,
      detail: status?.resend.configured ? `Chave ${status.resend.hint || "salva"}` : "Não configurado",
    },
  ];
  return (
    <div role="radiogroup" aria-label="Como os e-mails saem" className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={cn(
              "group relative flex min-w-0 flex-col rounded-[1.4rem] bg-white p-5 text-left transition-all duration-200",
              selected
                ? "shadow-[0_10px_30px_-14px_rgba(0,0,0,0.25)] ring-2 ring-[#1d1d1f]"
                : "shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.07] hover:ring-black/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={cn("grid h-10 w-10 place-items-center rounded-xl transition-colors", selected ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]")}>{o.icon}</span>
              <span className={cn("grid h-5 w-5 place-items-center rounded-full ring-2 transition", selected ? "bg-[#1d1d1f] ring-[#1d1d1f]" : "ring-black/15")}>
                {selected && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[15px] font-bold tracking-tight">
              {o.title}
              {o.badge && <Badge tone="dark">{o.badge}</Badge>}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6e6e73]">{o.text}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/[0.05] pt-3">
              {o.configured ? <Badge tone="green">Configurado</Badge> : <Badge>Não configurado</Badge>}
              {savedValue === o.id && <Badge tone="blue">Em uso</Badge>}
              {o.configured && <span className="min-w-0 truncate text-[12px] text-[#86868b]">{o.detail}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── SMTP ────────────────────────────────────────────────────────────
interface SmtpForm {
  host: string;
  port: string;
  security: SmtpSecurity;
  username: string;
  password: string;
}

const smtpFormFrom = (s?: EmailProviderStatus["smtp"]): SmtpForm =>
  s?.configured
    ? { host: s.host, port: String(s.port), security: s.security, username: s.username, password: "" }
    : { host: "", port: "465", security: "ssl", username: "", password: "" };

type Result = { ok: boolean; message: string; canSkip?: boolean } | null;

function SmtpCard({
  status,
  loading,
  active,
  draft,
  setDraft,
  supportEmail,
  onSaved,
}: {
  status?: EmailProviderStatus;
  loading: boolean;
  active: boolean;
  draft: EmailSettings;
  setDraft: (patch: Partial<EmailSettings>) => void;
  supportEmail: string;
  onSaved: (next: EmailProviderStatus) => void | Promise<void>;
}) {
  const repo = useRepo();
  const confirm = useConfirm();
  const smtp = status?.smtp;
  const [form, setForm] = useState<SmtpForm>(() => smtpFormFrom(smtp));
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"save" | "skip" | "test" | "remove" | null>(null);
  const [result, setResult] = useState<Result>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Enquanto o produtor não mexe, o formulário mostra o que está salvo.
  useEffect(() => {
    if (!touched) setForm(smtpFormFrom(smtp));
  }, [smtp, touched]);

  const configured = !!smtp?.configured;
  const port = Number(form.port);
  const portBlocked = BLOCKED_PORTS.includes(port);
  const mismatch = isValidEmail(draft.fromEmail) && isValidEmail(form.username) && !sameEmail(draft.fromEmail, form.username);
  const isGmail = /(^|\.)(gmail|googlemail)\.com$/i.test(form.host.trim());

  const update = (patch: Partial<SmtpForm>) => {
    setTouched(true);
    setResult(null);
    setForm((f) => ({ ...f, ...patch }));
  };

  const setUsername = (value: string) => {
    const username = value.trim();
    // O remetente acompanha o usuário enquanto estiver vazio ou igual a ele.
    if (!draft.fromEmail || sameEmail(draft.fromEmail, form.username)) setDraft({ fromEmail: username });
    update({ username });
  };

  const setSecurity = (security: SmtpSecurity) => {
    const patch: Partial<SmtpForm> = { security };
    if (security === "ssl" && ["", "25", "587", "2525"].includes(form.port)) patch.port = "465";
    if (security === "starttls" && ["", "465"].includes(form.port)) patch.port = "2525";
    update(patch);
  };

  const applyPreset = (id: PresetId) => {
    const preset = SMTP_PRESETS[id];
    const username = [draft.fromEmail, form.username, supportEmail].map((s) => String(s || "").trim()).find(isValidEmail) || form.username;
    if (!draft.fromEmail && isValidEmail(username)) setDraft({ fromEmail: username });
    update({ host: preset.host, port: String(preset.port), security: preset.security, username });
    toast.success(`Dados ${id === "hostinger" ? "da Hostinger" : `do ${preset.label}`} preenchidos`, {
      description: username ? "Agora digite a senha do e-mail e salve." : "Agora preencha o usuário e a senha do e-mail.",
    });
    requestAnimationFrame(() => (username ? passwordRef : usernameRef).current?.focus());
  };

  const validate = (): string | null => {
    if (!form.host.trim()) return "Informe o servidor SMTP (ex: smtp.hostinger.com).";
    if (!Number.isInteger(port) || port < 1 || port > 65535) return "Informe uma porta válida (ex: 465).";
    if (portBlocked) return `A porta ${port} é bloqueada no servidor. Use a 465 com SSL.`;
    if (!form.username.trim()) return "Informe o usuário (normalmente o próprio e-mail).";
    if (!form.password && !smtp?.hasPassword) return "Informe a senha do e-mail.";
    return null;
  };

  const save = async (skipVerify: boolean) => {
    const problem = validate();
    if (problem) {
      setResult({ ok: false, message: problem });
      return;
    }
    setBusy(skipVerify ? "skip" : "save");
    setResult(null);
    const input: SmtpInput = { host: form.host.trim(), port, security: form.security, username: form.username.trim(), ...(form.password ? { password: form.password } : {}) };
    try {
      const next = await repo.saveEmailProvider({ smtp: input, skipVerify });
      setTouched(false);
      setShowPassword(false);
      setResult({
        ok: true,
        message: skipVerify ? "Dados salvos sem testar. Envie um e-mail de teste para conferir." : `Conectado a ${input.host}:${input.port} e autenticado. Dados salvos.`,
      });
      toast.success(skipVerify ? "SMTP salvo" : "SMTP conectado");
      await onSaved(next);
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message || "Não foi possível conectar ao servidor.", canSkip: !skipVerify });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setResult(null);
    try {
      const r = await repo.testEmailConnection();
      setResult({ ok: r.ok, message: r.message });
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message || "Não foi possível testar a conexão." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Remover o SMTP?",
      text: active
        ? "Servidor, usuário e senha serão apagados. Os e-mails automáticos param de sair até você configurar o envio de novo — as compras continuam liberando o acesso."
        : "Servidor, usuário e senha salvos serão apagados.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    setBusy("remove");
    try {
      const next = await repo.saveEmailProvider({ smtp: null });
      setTouched(false);
      setResult(null);
      toast.success("SMTP removido");
      await onSaved(next);
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível remover.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2.5">
          <Server size={18} /> Seu e-mail (SMTP)
          {loading ? <Loader2 size={15} className="animate-spin text-[#86868b]" /> : configured ? <Badge tone="green">Conectado</Badge> : <Badge tone="amber">Não configurado</Badge>}
        </span>
      }
      description="Os dados da caixa de e-mail que vai enviar. A senha fica guardada no servidor e nunca volta para o navegador."
    >
      <form
        className="space-y-5"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
      >
        <div className="flex flex-col gap-3 rounded-2xl bg-[#f5f5f7] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold">E-mail da Hostinger?</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6e6e73]">Preenche smtp.hostinger.com, porta 465 e SSL com o seu e-mail. Depois é só digitar a senha.</p>
          </div>
          <Button size="sm" icon={<Wand2 size={13} />} onClick={() => applyPreset("hostinger")} className="self-start sm:self-auto">
            Usar Hostinger
          </Button>
        </div>
        <p className="-mt-1 text-[12px] text-[#86868b]">
          Outros:{" "}
          {(["gmail", "zoho"] as const).map((id, i) => (
            <Fragment key={id}>
              {i > 0 && " · "}
              <button type="button" onClick={() => applyPreset(id)} className="font-semibold text-[#1d1d1f] underline-offset-2 hover:underline">
                {SMTP_PRESETS[id].label}
              </button>
            </Fragment>
          ))}
        </p>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field label="Servidor SMTP">
            <Input
              value={form.host}
              onChange={(e) => update({ host: e.target.value })}
              placeholder="smtp.hostinger.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Servidor SMTP"
            />
          </Field>
          <Field label="Porta">
            <Input
              inputMode="numeric"
              value={form.port}
              onChange={(e) => update({ port: e.target.value.replace(/\D/g, "").slice(0, 5) })}
              placeholder="465"
              aria-label="Porta"
              aria-invalid={portBlocked}
              className={cn(portBlocked && "ring-2 ring-red-300")}
            />
          </Field>
        </div>

        <Field label="Criptografia" hint={SECURITY_HINT[form.security]}>
          <Segmented value={form.security} onChange={setSecurity} options={SECURITY_OPTIONS} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Usuário" hint="Normalmente o próprio e-mail completo.">
            <Input
              ref={usernameRef}
              type="email"
              value={form.username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="suporte@seudominio.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Usuário do SMTP"
            />
          </Field>
          <Field
            label="Senha"
            hint={smtp?.hasPassword ? "Deixe vazio para manter a senha salva." : isGmail ? "No Gmail, use uma senha de app (não a senha normal da conta)." : "A senha da caixa de e-mail."}
            aside={
              smtp?.hasPassword ? (
                <Badge tone="green">
                  <Lock size={10} /> Senha salva
                </Badge>
              ) : undefined
            }
          >
            <div className="relative">
              <Input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                name="smtp-password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
                placeholder={smtp?.hasPassword ? "•••••••• (senha salva)" : "Senha do e-mail"}
                autoComplete="new-password"
                spellCheck={false}
                aria-label="Senha do SMTP"
                className="pr-11"
              />
              <IconButton label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((v) => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </IconButton>
            </div>
          </Field>
        </div>

        {portBlocked ? (
          <Notice tone="red">
            A porta {port} é bloqueada no servidor e não funciona. Use a <b>465 com SSL</b>.
          </Notice>
        ) : (
          <Notice tone="neutral">
            Use a porta <b>465 com SSL</b>. As portas 25 e 587 são bloqueadas no servidor de envio.
          </Notice>
        )}

        {mismatch && (
          <Notice
            tone="amber"
            action={
              <Button size="sm" variant="secondary" onClick={() => setDraft({ fromEmail: form.username.trim() })}>
                Usar como remetente
              </Button>
            }
          >
            O remetente (<b>{draft.fromEmail}</b>) é diferente do usuário (<b>{form.username}</b>). A Hostinger e a maioria dos provedores só enviam com o mesmo e-mail da conta — o envio pode ser recusado.
          </Notice>
        )}

        <div aria-live="polite">
          {result && (
            <Notice
              tone={result.ok ? "green" : "red"}
              action={
                !result.ok && result.canSkip ? (
                  <Button size="sm" variant="secondary" loading={busy === "skip"} disabled={!!busy && busy !== "skip"} onClick={() => save(true)}>
                    Salvar mesmo assim
                  </Button>
                ) : undefined
              }
            >
              {result.message}
              {!result.ok && result.canSkip && <span className="mt-1 block text-[12px] opacity-80">Confira servidor, porta, usuário e senha. Se tiver certeza dos dados, salve sem testar.</span>}
            </Notice>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-5">
          <Button type="submit" icon={<PlugZap size={14} />} loading={busy === "save"} disabled={!!busy && busy !== "save"}>
            Salvar e testar conexão
          </Button>
          {configured && (
            <Button variant="secondary" icon={<ShieldCheck size={14} />} loading={busy === "test"} disabled={(!!busy && busy !== "test") || !active} onClick={test} title={active ? undefined : "Salve a escolha do SMTP para testar"}>
              Testar conexão
            </Button>
          )}
          {configured && (
            <Button variant="ghost" icon={<Trash2 size={14} />} loading={busy === "remove"} disabled={!!busy && busy !== "remove"} onClick={remove} className="hover:text-red-600 sm:ml-auto">
              Remover
            </Button>
          )}
        </div>
        {touched && configured && <p className="-mt-2 text-[12px] text-[#86868b]">Você mudou os dados do SMTP: clique em “Salvar e testar conexão” para aplicar.</p>}
        {configured && !active && !touched && <p className="-mt-2 text-[12px] text-[#86868b]">O SMTP está salvo, mas o envio ainda usa o Resend. Salve as alterações para passar a usar o SMTP.</p>}
      </form>
    </Card>
  );
}

// ── Resend ──────────────────────────────────────────────────────────
function ResendCard({
  status,
  loading,
  error,
  active,
  onSaved,
  onRefresh,
  refreshing,
}: {
  status?: EmailProviderStatus;
  loading: boolean;
  error: Error | null;
  active: boolean;
  onSaved: (next: EmailProviderStatus) => void | Promise<void>;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const repo = useRepo();
  const confirm = useConfirm();
  const r = status?.resend;
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [result, setResult] = useState<Result>(null);
  const connected = !!r?.configured && r.keyCheck !== "invalid";

  const saveKey = async () => {
    const value = key.trim();
    if (!/^re_[A-Za-z0-9_-]{8,}$/.test(value)) {
      setResult({ ok: false, message: "Essa não parece uma chave do Resend. Ela começa com “re_”." });
      return;
    }
    setBusy("save");
    setResult(null);
    try {
      const next = await repo.saveEmailProvider({ resendKey: value });
      setKey("");
      toast.success(r?.configured ? "Chave trocada" : "Resend conectado");
      await onSaved(next);
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message || "Não foi possível salvar a chave." });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    const ok = await confirm({
      title: "Desconectar o Resend?",
      text: active ? "Os e-mails automáticos param de sair até você configurar o envio de novo. As compras continuam liberando o acesso." : "A chave salva será apagada.",
      confirmLabel: "Desconectar",
      danger: true,
    });
    if (!ok) return;
    setBusy("remove");
    try {
      const next = await repo.saveEmailProvider({ resendKey: null });
      setResult(null);
      toast.success("Resend desconectado");
      await onSaved(next);
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível desconectar.");
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setResult(null);
    try {
      const res = await repo.testEmailConnection();
      setResult({ ok: res.ok, message: res.message });
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message || "Não foi possível testar a conexão." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2.5">
          <Zap size={18} /> Resend
          {loading ? (
            <Loader2 size={15} className="animate-spin text-[#86868b]" />
          ) : connected ? (
            <Badge tone="green">Conectado</Badge>
          ) : r?.configured ? (
            <Badge tone="red">Chave recusada</Badge>
          ) : (
            <Badge tone="amber">Não conectado</Badge>
          )}
        </span>
      }
      description="Entrega os e-mails com o seu domínio verificado. O plano grátis cobre 3.000 e-mails por mês (100 por dia)."
    >
      <div className="space-y-5">
        {error && <Notice tone="red">{error.message || "Não foi possível consultar o Resend."}</Notice>}

        {r?.configured && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f5f5f7] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#1d1d1f] ring-1 ring-black/[0.06]">
                <KeyRound size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[13px] font-semibold">{r.hint}</p>
                <p className="text-[12px] leading-relaxed text-[#86868b]">
                  {r.source === "env" ? "Segredo RESEND_API_KEY do Supabase (tem prioridade)." : "Chave salva com segurança — só o servidor consegue lê-la."}
                  {r.keyCheck === "send_only" && " Chave só de envio: ótima para o dia a dia, mas não mostra os domínios."}
                  {r.keyCheck === "unreachable" && " Não foi possível falar com o Resend agora."}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="ghost" onClick={onRefresh} loading={refreshing}>
                  Verificar de novo
                </Button>
                {r.source === "studio" && (
                  <Button size="sm" variant="ghost" icon={<Unplug size={13} />} onClick={disconnect} loading={busy === "remove"} className="hover:text-red-600">
                    Desconectar
                  </Button>
                )}
              </div>
            </div>
            {r.domains &&
              (r.domains.length === 0 ? (
                <Notice tone="amber">Nenhum domínio cadastrado no Resend ainda. Adicione o seu em resend.com/domains.</Notice>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {r.domains.map((d) => {
                    const info = DOMAIN_STATUS[d.status] || { label: d.status, tone: "neutral" as const };
                    return (
                      <span key={d.name} className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-black/[0.08]">
                        {d.status === "verified" ? <CheckCircle2 size={14} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={14} className="shrink-0 text-amber-600" />}
                        <span className="truncate">{d.name}</span>
                        <Badge tone={info.tone}>{info.label}</Badge>
                      </span>
                    );
                  })}
                </div>
              ))}
          </div>
        )}

        {r?.source !== "env" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveKey();
            }}
          >
            <Field label={r?.configured ? "Trocar a chave da API" : "Chave da API do Resend"} hint="Começa com re_. Fica guardada no servidor e nunca volta para o navegador.">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  name="resend-key"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setResult(null);
                  }}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="font-mono sm:flex-1"
                  aria-label="Chave da API do Resend"
                />
                <Button type="submit" icon={<ShieldCheck size={14} />} loading={busy === "save"} disabled={!key.trim() || (!!busy && busy !== "save")}>
                  {r?.configured ? "Trocar chave" : "Conectar"}
                </Button>
              </div>
            </Field>
          </form>
        )}

        <div aria-live="polite">{result && <Notice tone={result.ok ? "green" : "red"}>{result.message}</Notice>}</div>

        {r?.configured && (
          <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-5">
            <Button variant="secondary" icon={<ShieldCheck size={14} />} loading={busy === "test"} disabled={(!!busy && busy !== "test") || !active} onClick={test}>
              Testar conexão
            </Button>
            {!active && <p className="text-[12px] text-[#86868b]">O envio ainda usa o SMTP. Salve as alterações para passar a usar o Resend.</p>}
          </div>
        )}

        {!connected && (
          <ol className="space-y-3.5 border-t border-black/[0.06] pt-5">
            {[
              <>
                Crie uma conta grátis em{" "}
                <a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                  resend.com <ExternalLink size={11} className="inline" />
                </a>
                .
              </>,
              <>
                Em <b>Domains → Add Domain</b>, adicione o domínio do seu e-mail (ex: <b>gorgpresets.com</b>, região <b>São Paulo</b>) e copie os registros DNS que aparecem para onde o domínio está registrado. Depois clique em <b>Verify</b>.
              </>,
              <>
                Em <b>API Keys → Create API Key</b>, escolha <b>Sending access</b>, copie a chave e cole acima.
              </>,
              <>
                Preencha o <b>remetente</b> abaixo com um e-mail do domínio verificado e envie um teste.
              </>,
            ].map((step, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1d1d1f] text-[11px] font-bold text-white">{i + 1}</span>
                <p className="min-w-0 pt-0.5 text-[13.5px] leading-relaxed text-[#424245]">{step}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}

// ── Remetente ───────────────────────────────────────────────────────
function SenderCard({ draft, set, status, settings }: { draft: EmailSettings; set: (patch: Partial<EmailSettings>) => void; status?: EmailProviderStatus; settings: PortalSettings }) {
  const isSmtp = draft.provider === "smtp";
  const smtpUser = status?.smtp.configured ? status.smtp.username : "";
  const fromInvalid = !!draft.fromEmail && !isValidEmail(draft.fromEmail);
  const replyInvalid = !!draft.replyTo && !isValidEmail(draft.replyTo);
  const mismatch = isSmtp && !fromInvalid && !!draft.fromEmail && isValidEmail(smtpUser) && !sameEmail(draft.fromEmail, smtpUser);
  const bcc = splitEmails(draft.bcc);

  const fromDomain = draft.fromEmail.split("@")[1]?.toLowerCase() || "";
  const domains = status?.resend.domains || null;
  const domainStatus = !isSmtp && fromDomain && domains ? domains.find((d) => d.name.toLowerCase() === fromDomain)?.status || "missing" : null;

  const setBcc = (list: string[]) => {
    const clean = Array.from(new Set(list.map(normalizeEmail).filter(Boolean)));
    const invalid = clean.filter((e) => !isValidEmail(e));
    if (invalid.length) toast.error(`E-mail inválido: ${invalid.join(", ")}`);
    const valid = clean.filter(isValidEmail);
    if (valid.length > MAX_BCC) toast.error(`Até ${MAX_BCC} e-mails em cópia oculta.`);
    set({ bcc: valid.slice(0, MAX_BCC).join(", ") });
  };

  return (
    <Card title="Remetente" description="Como o e-mail aparece na caixa de entrada do cliente e para onde vão as respostas.">
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nome do remetente" hint="O nome que o cliente vê na caixa de entrada.">
            <Input value={draft.fromName} onChange={(e) => set({ fromName: e.target.value })} placeholder={settings.brandName || "Gorg Presets"} aria-label="Nome do remetente" />
          </Field>
          <Field
            label="E-mail do remetente"
            hint={isSmtp ? (smtpUser ? "Use o mesmo e-mail do usuário do SMTP. Vazio, usa o usuário." : "Use o mesmo e-mail da caixa que envia.") : "Um e-mail do domínio verificado no Resend."}
            aside={
              isSmtp && isValidEmail(smtpUser) && !sameEmail(draft.fromEmail, smtpUser) ? (
                <button type="button" onClick={() => set({ fromEmail: smtpUser })} className="truncate text-[11px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
                  Usar o do SMTP
                </button>
              ) : undefined
            }
          >
            <Input
              type="email"
              value={draft.fromEmail}
              onChange={(e) => set({ fromEmail: e.target.value.trim() })}
              placeholder={isSmtp ? smtpUser || "suporte@seudominio.com" : "acesso@seudominio.com"}
              aria-label="E-mail do remetente"
              aria-invalid={fromInvalid}
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
          <Field label="Responder para" hint="Opcional. Para onde vão as respostas do cliente (ex: o seu suporte).">
            <Input
              type="email"
              value={draft.replyTo}
              onChange={(e) => set({ replyTo: e.target.value.trim() })}
              placeholder={settings.support.email || "suporte@seudominio.com"}
              aria-label="Responder para"
              aria-invalid={replyInvalid}
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
          <Field label={`Cópia oculta (BCC)${bcc.length ? ` · ${bcc.length}/${MAX_BCC}` : ""}`} hint="Recebe uma cópia escondida de cada e-mail enviado. O cliente não vê. Separe por vírgula ou Enter.">
            <TagInput value={bcc} onChange={setBcc} placeholder="voce@seudominio.com" />
          </Field>
        </div>

        {fromInvalid && <Notice tone="red">O e-mail do remetente está inválido.</Notice>}
        {replyInvalid && <Notice tone="red">O e-mail de “Responder para” está inválido.</Notice>}
        {mismatch && (
          <Notice
            tone="amber"
            action={
              <Button size="sm" variant="secondary" onClick={() => set({ fromEmail: smtpUser })}>
                Usar {smtpUser}
              </Button>
            }
          >
            O remetente é diferente do usuário do SMTP (<b>{smtpUser}</b>). A Hostinger exige que seja a mesma conta — senão o e-mail pode ser recusado ou cair no spam.
          </Notice>
        )}
        {!isSmtp && !draft.fromEmail && (
          <Notice tone="amber">
            O Resend precisa de um remetente do seu domínio verificado (ex: <b>acesso@gorgpresets.com</b>). Sem ele, nada é enviado.
          </Notice>
        )}
        {!isSmtp && !fromInvalid && domainStatus && domainStatus !== "verified" && (
          <Notice tone="amber">
            {domainStatus === "missing" ? (
              <>
                O domínio <b>{fromDomain}</b> não está cadastrado no Resend. Adicione e verifique em resend.com/domains.
              </>
            ) : (
              <>
                O domínio <b>{fromDomain}</b> ainda não foi verificado no Resend ({DOMAIN_STATUS[domainStatus]?.label.toLowerCase() || domainStatus}).
              </>
            )}
          </Notice>
        )}
      </div>
    </Card>
  );
}

// ── Envio de teste ──────────────────────────────────────────────────
function TestCard({
  kind,
  template,
  emailSettings,
  existingAccount,
  to,
  onTo,
  ready,
  onConfigure,
  title = "Enviar um teste",
  description = "Receba o e-mail como o cliente vai receber, com dados de exemplo.",
}: {
  kind: TemplateKind;
  template: EmailTemplate;
  emailSettings: EmailSettings;
  existingAccount: boolean;
  to: string;
  onTo: (v: string) => void;
  ready: boolean;
  onConfigure?: () => void;
  title?: string;
  description?: string;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<{ ok: boolean; to: string } | null>(null);

  const send = async () => {
    if (!isValidEmail(to)) {
      toast.error("Informe um e-mail válido para o teste.");
      return;
    }
    const target = normalizeEmail(to);
    setSending(true);
    setOutcome(null);
    const ok = await run(() => repo.sendTestEmail({ to: target, kind, template, settings: emailSettings, existingAccount }).then(() => true), {
      success: `Teste enviado para ${target}`,
      scopes: ["studio"],
    });
    setSending(false);
    setOutcome({ ok: !!ok, to: target });
  };

  return (
    <Card title={title} description={description}>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          type="email"
          value={to}
          onChange={(e) => {
            onTo(e.target.value);
            setOutcome(null);
          }}
          placeholder="seu@email.com"
          className="sm:flex-1"
          aria-label="E-mail que recebe o teste"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Button type="submit" icon={<Send size={14} />} loading={sending} disabled={!ready}>
          Enviar teste
        </Button>
      </form>
      <div aria-live="polite" className="mt-3">
        {!ready ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#86868b]">
            Configure o envio para mandar testes.
            {onConfigure && (
              <button type="button" onClick={onConfigure} className="font-semibold text-[#1d1d1f] underline-offset-2 hover:underline">
                Configurar envio
              </button>
            )}
          </p>
        ) : outcome?.ok ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-900 ring-1 ring-inset ring-emerald-200/70">
            <CheckCircle2 size={14} className="shrink-0" />
            <span className="min-w-0 break-all">Enviado para {outcome.to}. Confira a caixa de entrada (e o spam).</span>
            <Link to={LOGS_URL} className="font-semibold underline-offset-2 hover:underline">
              Ver no registro →
            </Link>
          </p>
        ) : outcome ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-red-700">
            Não foi enviado. O motivo também fica no registro.
            <Link to={LOGS_URL} className="font-semibold underline-offset-2 hover:underline">
              Ver no registro →
            </Link>
          </p>
        ) : (
          <p className="text-[12px] text-[#86868b]">Usa o que está na tela, mesmo antes de salvar.</p>
        )}
      </div>
    </Card>
  );
}

// ── Modelos (boas-vindas e acesso retirado) ─────────────────────────
function TemplateTab({
  kind,
  template,
  onChange,
  emailSettings,
  settings,
  sampleProducts,
  sender,
  ready,
  onConfigure,
  testTo,
  onTestTo,
}: {
  kind: TemplateKind;
  template: EmailTemplate;
  onChange: (patch: Partial<EmailTemplate>) => void;
  emailSettings: EmailSettings;
  settings: PortalSettings;
  sampleProducts: string[];
  sender: { name: string; email: string };
  ready: boolean;
  onConfigure: () => void;
  testTo: string;
  onTestTo: (v: string) => void;
}) {
  const confirm = useConfirm();
  const info = KIND_INFO[kind];
  const automation = useMemo(() => mergeAutomation(settings.automation), [settings.automation]);
  const isHtml = template.mode === "html";
  const html = template.html || "";
  const [audience, setAudience] = useState<"new" | "existing">("new");
  const [focused, setFocused] = useState<FieldKey>(isHtml ? "html" : "message");
  const refs = useRef<Partial<Record<FieldKey, Editable | null>>>({});

  // Prévia ao vivo com dados de exemplo (o mesmo modelo que o servidor envia).
  const previewTemplate = useDeferredValue(template);
  const ctx = useMemo<RenderContext>(() => {
    const base = origin();
    const email = isValidEmail(testTo) ? normalizeEmail(testTo) : "ana@exemplo.com";
    const whatsapp = String(settings.support.whatsapp || "").replace(/\D/g, "");
    return {
      brand: settings.brandName,
      name: "Ana Julia",
      email,
      phone: "5511999999999",
      orderId: "TESTE-123",
      products: sampleProducts,
      link: `${base}/membros/entrar?email=${encodeURIComponent(email)}`,
      password: kind === "welcome" && audience === "new" ? "Exemplo-7Kq2" : undefined,
      logoUrl: `${base}/logo.png`,
      accent: settings.accentColor,
      supportUrl: whatsapp ? `https://wa.me/${whatsapp}` : `${base}/membros/suporte`,
    };
  }, [testTo, settings.support.whatsapp, settings.brandName, settings.accentColor, sampleProducts, kind, audience]);
  const preview = useMemo(() => safeRender(kind, previewTemplate, ctx), [kind, previewTemplate, ctx]);

  const visualVariables = useMemo(() => EMAIL_VARIABLES.filter((v) => !v.html), []);

  const insert = (token: string, block: boolean) => {
    const target: FieldKey = isHtml ? (block || focused !== "subject" ? "html" : "subject") : focused === "html" ? "message" : focused;
    const el = refs.current[target];
    if (!el) {
      onChange({ [target]: String(template[target] ?? "") + token } as Partial<EmailTemplate>);
      return;
    }
    insertAtCursor(el, token, (value, caret) => {
      onChange({ [target]: value } as Partial<EmailTemplate>);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    });
  };

  const switchMode = (mode: EmailTemplate["mode"]) => {
    if (mode === template.mode) return;
    if (mode === "html" && !html.trim()) onChange({ mode, html: templateToHtml(kind, template) });
    else onChange({ mode });
    setFocused(mode === "html" ? "html" : "message");
  };

  const generate = async () => {
    const generated = templateToHtml(kind, template);
    if (html.trim() && html !== generated) {
      const ok = await confirm({
        title: "Substituir o código atual?",
        text: "O HTML do editor será trocado por um novo, gerado a partir dos textos do modo visual. Se mudar de ideia, descarte as alterações antes de salvar.",
        confirmLabel: "Substituir",
      });
      if (!ok) return;
    }
    onChange({ html: generated });
    toast.success("Código gerado a partir do visual");
  };

  const restore = async () => {
    const ok = await confirm({
      title: "Restaurar o modelo padrão?",
      text: `Assunto, textos e código HTML do e-mail de ${info.title.toLowerCase()} voltam ao padrão. Se mudar de ideia, descarte as alterações antes de salvar.`,
      confirmLabel: "Restaurar",
    });
    if (!ok) return;
    const defaults = DEFAULT_EMAIL[kind];
    onChange({ ...defaults, enabled: template.enabled });
    setFocused(defaults.mode === "html" ? "html" : "message");
  };

  const bind = (name: TextKey) => ({
    ref: (el: Editable | null) => {
      refs.current[name] = el;
    },
    value: String(template[name] ?? ""),
    onFocus: () => setFocused(name),
    onChange: (e: ChangeEvent<Editable>) => onChange({ [name]: e.target.value } as Partial<EmailTemplate>),
    "aria-label": TEXT_LABELS[name],
  });

  const defaults = DEFAULT_EMAIL[kind];
  const automationNotice =
    kind === "welcome"
      ? !automation.enabled
        ? "O webhook está pausado em Automações: as compras ficam só no histórico e nenhum e-mail sai."
        : !automation.grantOnApproved
          ? "A liberação na compra aprovada está desligada em Automações: este e-mail só sai quando ela estiver ligada."
          : null
      : !automation.enabled
        ? "O webhook está pausado em Automações: nenhum acesso é retirado e nenhum e-mail sai."
        : !automation.revokeOnRefund && !automation.revokeOnChargeback
          ? "A retirada de acesso no reembolso e no chargeback está desligada em Automações: este e-mail não vai sair."
          : !automation.revokeOnRefund
            ? "Hoje o acesso só é retirado no chargeback (o reembolso está desligado em Automações)."
            : !automation.revokeOnChargeback
              ? "Hoje o acesso só é retirado no reembolso (o chargeback está desligado em Automações)."
              : null;

  return (
    // Celular: editor, prévia e teste, nessa ordem. Computador: editor e teste à
    // esquerda, prévia fixa à direita (com rolagem própria).
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] xl:grid-rows-[auto_1fr]">
      <div className="min-w-0 space-y-6 xl:col-start-1 xl:row-start-1">
        <Card>
          <div className="space-y-4">
            <Toggle checked={template.enabled} onChange={(enabled) => onChange({ enabled })} label="Enviar este e-mail" description={info.toggle} />
            {automationNotice && (
              <Notice
                tone="amber"
                action={
                  <ButtonLink to={AUTOMATIONS_URL} size="sm" variant="secondary">
                    Abrir Automações
                  </ButtonLink>
                }
              >
                {automationNotice}
              </Notice>
            )}
            {kind === "welcome" && (
              <p className="text-[12px] leading-relaxed text-[#86868b]">
                Produtos do checkout com e-mail próprio (em{" "}
                <Link to={AUTOMATIONS_URL} className="font-semibold text-[#1d1d1f] underline-offset-2 hover:underline">
                  Automações
                </Link>
                ) usam o modelo deles no lugar deste.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="Mensagem"
          description={isHtml ? "Você controla todo o HTML. As variáveis são trocadas pelos dados de cada cliente." : "Escreva o texto; o visual do e-mail (logo, cores e botão) é aplicado sozinho."}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                value={template.mode}
                onChange={switchMode}
                options={[
                  { value: "visual", label: <><Eye size={13} /> Visual</> },
                  { value: "html", label: <><Code2 size={13} /> Código HTML</> },
                ]}
              />
              <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={restore}>
                Restaurar padrão
              </Button>
            </div>

            {isHtml ? (
              <>
                <Field label="Assunto">
                  <Input {...bind("subject")} placeholder={defaults.subject} />
                </Field>
                <VariableChips
                  variables={EMAIL_VARIABLES}
                  onInsert={insert}
                  label="Variáveis"
                  hint="Clique para inserir no cursor. Os blocos (em vermelho) entram prontos, com o visual padrão."
                />
                <HtmlEditor
                  kind={kind}
                  value={html}
                  onChange={(value) => onChange({ html: value })}
                  onFocus={() => setFocused("html")}
                  textareaRef={(el) => {
                    refs.current.html = el;
                  }}
                  onGenerate={generate}
                />
              </>
            ) : (
              <>
                <VariableChips variables={visualVariables} onInsert={insert} label="Variáveis" hint="Clique para inserir onde está o cursor." />
                <Field label="Assunto">
                  <Input {...bind("subject")} placeholder={defaults.subject} />
                </Field>
                <Field label="Título">
                  <Input {...bind("heading")} placeholder={defaults.heading} />
                </Field>
                <Field label="Texto" hint="Deixe uma linha em branco para começar outro parágrafo.">
                  <Textarea {...bind("message")} className="min-h-[170px]" placeholder={defaults.message} />
                </Field>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Texto do botão">
                    <Input {...bind("buttonLabel")} placeholder={defaults.buttonLabel} />
                  </Field>
                  <Field label="Assinatura">
                    <Textarea {...bind("signature")} className="min-h-[72px]" placeholder={defaults.signature} />
                  </Field>
                </div>
                <p className="flex gap-2 rounded-2xl bg-[#f5f5f7] p-3.5 text-[12.5px] leading-relaxed text-[#6e6e73]">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  {info.auto}
                </p>
              </>
            )}
          </div>
        </Card>
      </div>

      <section
        aria-label="Prévia do e-mail"
        className="min-w-0 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:-mx-2 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:px-2 xl:pb-2 [scrollbar-width:thin]"
      >
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight">Prévia ao vivo</p>
            <p className="text-[12px] text-[#86868b]">Com dados de exemplo — é o que o cliente recebe.</p>
          </div>
          {kind === "welcome" && (
            <Segmented
              value={audience}
              onChange={setAudience}
              options={[
                { value: "new", label: "Cliente novo" },
                { value: "existing", label: "Já tem conta" },
              ]}
            />
          )}
        </div>
        <EmailPreview
          html={preview.html}
          subject={preview.subject}
          from={sender.email ? `${sender.name} <${sender.email}>` : sender.name}
          className="shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_30px_-12px_rgba(0,0,0,0.08)]"
        />
        {!template.enabled && <p className="mt-2 text-[12px] text-[#86868b]">Este e-mail está desligado: nada é enviado até você ligar.</p>}
      </section>

      <div className="min-w-0 xl:col-start-1 xl:row-start-2">
        <TestCard
          kind={kind}
          template={template}
          emailSettings={emailSettings}
          existingAccount={kind === "welcome" && audience === "existing"}
          to={testTo}
          onTo={onTestTo}
          ready={ready}
          onConfigure={onConfigure}
          description={kind === "welcome" ? `Receba como ${audience === "new" ? "um cliente novo (com senha provisória)" : "quem já tem conta"}, com dados de exemplo.` : undefined}
        />
      </div>
    </div>
  );
}

function VariableChips({ variables, onInsert, label, hint }: { variables: typeof EMAIL_VARIABLES; onInsert: (key: string, block: boolean) => void; label: string; hint?: string }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[12px] font-semibold text-[#1d1d1f]">{label}</span>
        {hint && <span className="text-[11.5px] text-[#86868b]">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v.key}
            type="button"
            // Mantém o foco (e o cursor) no campo que está sendo editado.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(v.key, !!v.html)}
            title={`${v.label}${v.html ? " (bloco pronto)" : ""} — clique para inserir`}
            aria-label={`Inserir ${v.label} (${v.key})`}
            className={cn(
              "rounded-full px-3 py-1.5 font-mono text-[11.5px] font-semibold ring-1 ring-inset transition",
              v.html ? "bg-ma/[0.06] text-ma ring-ma/25 hover:bg-ma hover:text-white" : "bg-[#f5f5f7] text-[#1d1d1f] ring-black/[0.06] hover:bg-[#1d1d1f] hover:text-white",
            )}
          >
            {v.key}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Editor de código ────────────────────────────────────────────────
const textEncoder = new TextEncoder();

function HtmlEditor({
  kind,
  value,
  onChange,
  onFocus,
  textareaRef,
  onGenerate,
}: {
  kind: TemplateKind;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  textareaRef: (el: HTMLTextAreaElement | null) => void;
  onGenerate: () => void;
}) {
  const gutter = useRef<HTMLPreElement>(null);
  const local = useRef<HTMLTextAreaElement | null>(null);
  // Depois de Esc, o próximo Tab sai do editor (em vez de inserir espaços).
  const escaped = useRef(false);

  const lines = useMemo(() => value.split("\n").length, [value]);
  const numbers = useMemo(() => Array.from({ length: lines }, (_, i) => i + 1).join("\n"), [lines]);
  const bytes = useMemo(() => textEncoder.encode(value).length, [value]);

  const warnings = useMemo(() => {
    const list: string[] = [];
    const code = value.trim();
    if (!code) return ["O código está vazio: use “Gerar a partir do visual” para começar."];
    const keys = new Set(EMAIL_VARIABLES.map((v) => v.key));
    if (kind === "welcome") {
      const linkKeys = ["{link}", "{botao}"].filter((k) => keys.has(k));
      if (linkKeys.length && !linkKeys.some((k) => code.includes(k))) list.push(`Sem ${linkKeys.join(" ou ")}, o cliente fica sem o link da área de membros.`);
      const accessKeys = ["{bloco_acesso}", "{senha}"].filter((k) => keys.has(k));
      if (accessKeys.length && !accessKeys.some((k) => code.includes(k))) list.push(`Sem ${accessKeys.join(" ou ")}, o cliente novo não recebe a senha provisória.`);
    }
    if (/<script[\s>]/i.test(code)) list.push("Scripts não funcionam em e-mails e são removidos pelos provedores.");
    if (bytes > 100_000) list.push("O código passa de 100 KB: o Gmail corta e-mails grandes e esconde o final da mensagem.");
    return list;
  }, [value, kind, bytes]);

  const replaceSelection = (el: HTMLTextAreaElement, text: string, selectStart?: number, selectEnd?: number) => {
    insertAtCursor(el, text, (next) => onChange(next));
    if (selectStart !== undefined && selectEnd !== undefined) requestAnimationFrame(() => el.setSelectionRange(selectStart, selectEnd));
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (e.key !== "Tab") {
      escaped.current = false;
      return;
    }
    if (escaped.current || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value: text } = el;
    const multiline = text.slice(start, end).includes("\n");
    if (!multiline && !e.shiftKey) {
      replaceSelection(el, "  ");
      return;
    }
    // Indenta (ou recua, com Shift) todas as linhas selecionadas.
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const block = text.slice(lineStart, end);
    const changed = e.shiftKey ? block.replace(/^ {1,2}/gm, "") : block.replace(/^/gm, "  ");
    if (changed === block) return;
    el.setSelectionRange(lineStart, end);
    replaceSelection(el, changed, lineStart, lineStart + changed.length);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#1d1d1f]">Código HTML</span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<Wand2 size={13} />} onClick={onGenerate}>
            Gerar a partir do visual
          </Button>
          <CopyButton value={value} label="Copiar" />
        </div>
      </div>
      <div className="flex overflow-hidden rounded-2xl bg-[#1d1d1f] ring-1 ring-black/10 transition focus-within:ring-2 focus-within:ring-ma/60">
        {/* Números das linhas: posição absoluta para não esticar o editor; rola junto com o texto. */}
        <div aria-hidden className="relative shrink-0 select-none border-r border-white/[0.07] font-mono text-[11px]" style={{ width: `calc(${String(lines).length}ch + 24px)` }}>
          <pre ref={gutter} className="absolute inset-0 m-0 overflow-hidden py-4 pr-2.5 text-right font-mono text-[11px] leading-5 text-white/25">
            {numbers}
            {"\n\n\n"}
          </pre>
        </div>
        <textarea
          ref={(el) => {
            local.current = el;
            textareaRef(el);
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={() => {
            escaped.current = false;
          }}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
          }}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          aria-label="Código HTML do e-mail"
          aria-describedby="html-editor-help"
          placeholder="<!doctype html>…"
          className="block h-[540px] min-h-[320px] w-full min-w-0 flex-1 resize-y bg-transparent py-4 pl-3 pr-4 font-mono text-[12.5px] leading-5 text-[#f5f5f7] caret-white outline-none [tab-size:2] placeholder:text-white/25 selection:bg-white/20"
        />
      </div>
      <div id="html-editor-help" className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px] text-[#86868b]">
        <span className="tabular-nums">
          {lines.toLocaleString("pt-BR")} {lines === 1 ? "linha" : "linhas"} · {value.length.toLocaleString("pt-BR")} caracteres · {formatBytes(bytes) || "0 B"}
        </span>
        <span>Tab insere espaços · Esc e depois Tab sai do editor</span>
      </div>
      {warnings.length > 0 && (
        <div className="mt-3 space-y-2">
          {warnings.map((w) => (
            <Notice key={w} tone="amber">
              {w}
            </Notice>
          ))}
        </div>
      )}
    </div>
  );
}
