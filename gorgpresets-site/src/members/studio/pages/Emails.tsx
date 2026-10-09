// E-mail de boas-vindas: conexão com o Resend, remetente, mensagem com prévia
// ao vivo (o mesmo modelo que a Edge Function envia) e envio de teste.
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Loader2, MailCheck, RotateCcw, Send, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, useCatalog, useRepo, useSettings } from "../../context/MembersContext";
import { DEFAULT_EMAIL, EMAIL_VARIABLES, renderWelcomeEmail } from "../../../../supabase/functions/members-api/email";
import { isValidEmail, sortByOrder } from "../../lib/format";
import type { EmailSettings, EmailStatus } from "../../lib/types";
import { Badge, Button, Card, Field, Input, PageHeader, Segmented, Textarea, Toggle, useConfirm } from "../ui";
import { useStudioAction, useStudioQuery } from "../hooks";
import { useQueryClient } from "@tanstack/react-query";

type TextField = "subject" | "heading" | "message" | "buttonLabel" | "signature";

export default function EmailsPage() {
  const repo = useRepo();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { catalog } = useCatalog();
  const run = useStudioAction();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const status = useStudioQuery("email-status", () => repo.getEmailStatus());

  const [draft, setDraft] = useState<EmailSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [focused, setFocused] = useState<TextField>("message");
  const [frameHeight, setFrameHeight] = useState(900);
  const fields = useRef<Partial<Record<TextField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  useEffect(() => {
    if (settings && !draft) setDraft(settings.email);
  }, [settings, draft]);
  useEffect(() => {
    if (user?.email) setTestTo((current) => current || user.email);
  }, [user?.email]);

  const dirty = !!draft && !!settings && JSON.stringify(draft) !== JSON.stringify(settings.email);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://gorgpresets.site";

  const sampleProducts = useMemo(() => {
    const titles = sortByOrder(catalog.products.filter((p) => p.published)).map((p) => p.title);
    return titles.length ? titles.slice(0, 2) : ["Coleção de exemplo"];
  }, [catalog.products]);

  const preview = useMemo(() => {
    if (!draft || !settings) return null;
    const email = isValidEmail(testTo) ? testTo : "ana@exemplo.com";
    return renderWelcomeEmail(draft, {
      brand: settings.brandName,
      name: "Ana Julia",
      email,
      products: sampleProducts,
      link: `${origin}/membros/entrar?email=${encodeURIComponent(email)}`,
      password: mode === "new" ? "Exemplo-7Kq2" : undefined,
      logoUrl: `${origin}/logo.png`,
      accent: settings.accentColor,
    });
  }, [draft, settings, testTo, user, sampleProducts, origin, mode]);

  if (!draft || !settings) return null;

  const set = (patch: Partial<EmailSettings>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async () => {
    setSaving(true);
    await run(() => repo.saveSettings({ ...settings, email: draft }), { success: "E-mail salvo", scopes: ["settings"] });
    setSaving(false);
  };

  const insertVariable = (token: string) => {
    const el = fields.current[focused];
    const value = String(draft[focused] ?? "");
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    set({ [focused]: value.slice(0, start) + token + value.slice(end) } as Partial<EmailSettings>);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const saveKey = async () => {
    setSavingKey(true);
    const result = await run(() => repo.saveEmailKey(keyInput), { success: "Resend conectado", scopes: ["studio"] });
    if (result) {
      queryClient.setQueryData(["ma", "studio", "email-status"], result);
      setKeyInput("");
    }
    setSavingKey(false);
  };

  const disconnect = async () => {
    const ok = await confirm({
      title: "Desconectar o Resend?",
      text: "As próximas compras continuam liberando o acesso, mas sem e-mail: o comprador entra pelo “Primeiro acesso”.",
      confirmLabel: "Desconectar",
      danger: true,
    });
    if (!ok) return;
    const result = await run(() => repo.saveEmailKey(""), { success: "Resend desconectado", scopes: ["studio"] });
    if (result) queryClient.setQueryData(["ma", "studio", "email-status"], result);
  };

  const sendTest = async () => {
    if (!isValidEmail(testTo)) return toast.error("Informe um e-mail válido para o teste.");
    setTesting(true);
    try {
      await repo.sendTestEmail(testTo.trim(), draft, mode === "existing");
      toast.success(`Teste enviado para ${testTo.trim()}`, { description: "Confira a caixa de entrada (e o spam)." });
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível enviar o teste.");
    } finally {
      setTesting(false);
    }
  };

  const fieldProps = (name: TextField) => ({
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      fields.current[name] = el;
    },
    value: draft[name],
    onFocus: () => setFocused(name),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set({ [name]: e.target.value } as Partial<EmailSettings>),
  });

  const fromDomain = draft.fromEmail.split("@")[1]?.toLowerCase() || "";
  const domains = status.data?.domains || null;
  const fromDomainStatus = fromDomain && domains ? domains.find((d) => d.name.toLowerCase() === fromDomain)?.status || "missing" : null;

  return (
    <div className="pb-28">
      <PageHeader
        title="E-mails"
        subtitle="A cada compra aprovada no checkout, o comprador recebe um e-mail com o acesso à área de membros — escrito por você."
        actions={<Button onClick={save} loading={saving} disabled={!dirty}>Salvar alterações</Button>}
      />

      <div className="space-y-6">
        <ConnectionCard
          status={status.data}
          loading={status.isLoading}
          error={status.error as Error | null}
          keyInput={keyInput}
          onKeyInput={setKeyInput}
          onSaveKey={saveKey}
          savingKey={savingKey}
          onDisconnect={disconnect}
          onRefresh={() => status.refetch()}
          refreshing={status.isFetching}
        />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card title="Remetente" description="Quem aparece como autor do e-mail na caixa de entrada do cliente.">
              <div className="space-y-5">
                <div className="rounded-2xl bg-[#f5f5f7] p-4">
                  <Toggle
                    checked={draft.enabled}
                    onChange={(enabled) => set({ enabled })}
                    label="Enviar automaticamente a cada compra aprovada"
                    description="Cria a conta do comprador e envia o login com uma senha provisória. Desligado, o comprador entra pelo “Primeiro acesso”."
                  />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Nome do remetente">
                    <Input value={draft.fromName} onChange={(e) => set({ fromName: e.target.value })} placeholder="Gorg Presets" />
                  </Field>
                  <Field label="E-mail do remetente" hint="Do domínio verificado no Resend.">
                    <Input type="email" value={draft.fromEmail} onChange={(e) => set({ fromEmail: e.target.value.trim() })} placeholder="acesso@gorgpresets.site" />
                  </Field>
                  <Field label="Responder para" hint="Opcional. Para onde vão as respostas do cliente." className="md:col-span-2">
                    <Input type="email" value={draft.replyTo} onChange={(e) => set({ replyTo: e.target.value.trim() })} placeholder="suporte@gorgpresets.site" />
                  </Field>
                </div>
                {!draft.fromEmail ? (
                  <Notice tone="amber">
                    Sem um remetente do seu domínio, o Resend funciona em modo de teste e só entrega para o e-mail da sua conta Resend. Verifique o domínio e preencha, por exemplo, <b>acesso@gorgpresets.site</b>.
                  </Notice>
                ) : draft.fromEmail && !isValidEmail(draft.fromEmail) ? (
                  <Notice tone="red">E-mail do remetente inválido.</Notice>
                ) : fromDomainStatus && fromDomainStatus !== "verified" ? (
                  <Notice tone="amber">
                    {fromDomainStatus === "missing"
                      ? <>O domínio <b>{fromDomain}</b> não está cadastrado no Resend. Adicione e verifique em resend.com/domains.</>
                      : <>O domínio <b>{fromDomain}</b> ainda não foi verificado no Resend (situação: {fromDomainStatus}).</>}
                  </Notice>
                ) : null}
              </div>
            </Card>

            <Card
              title="Mensagem"
              description="Clique em uma variável para inserir onde está o cursor. Os dados de acesso e as coleções compradas entram automaticamente."
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RotateCcw size={13} />}
                  onClick={() => set({ subject: DEFAULT_EMAIL.subject, heading: DEFAULT_EMAIL.heading, message: DEFAULT_EMAIL.message, buttonLabel: DEFAULT_EMAIL.buttonLabel, signature: DEFAULT_EMAIL.signature })}
                >
                  Restaurar padrão
                </Button>
              }
            >
              <div className="space-y-5">
                <div className="flex flex-wrap gap-1.5">
                  {EMAIL_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertVariable(v.key)}
                      title={v.label}
                      className="rounded-full bg-[#f5f5f7] px-3 py-1.5 font-mono text-[11.5px] font-semibold text-[#1d1d1f] ring-1 ring-inset ring-black/[0.06] transition hover:bg-[#1d1d1f] hover:text-white"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
                <Field label="Assunto">
                  <Input {...fieldProps("subject")} placeholder={DEFAULT_EMAIL.subject} />
                </Field>
                <Field label="Título">
                  <Input {...fieldProps("heading")} placeholder={DEFAULT_EMAIL.heading} />
                </Field>
                <Field label="Texto" hint="Deixe uma linha em branco para começar outro parágrafo.">
                  <Textarea {...fieldProps("message")} className="min-h-[150px]" />
                </Field>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Texto do botão">
                    <Input {...fieldProps("buttonLabel")} placeholder={DEFAULT_EMAIL.buttonLabel} />
                  </Field>
                  <Field label="Assinatura">
                    <Textarea {...fieldProps("signature")} className="min-h-[72px]" />
                  </Field>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4 xl:sticky xl:top-6">
            <Card padded={false} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                <p className="text-[15px] font-bold tracking-tight">Prévia</p>
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "new", label: "Cliente novo" },
                    { value: "existing", label: "Já tem conta" },
                  ]}
                />
              </div>
              <div className="space-y-1 border-b border-black/[0.06] bg-[#fbfbfd] px-5 py-3 text-[12.5px]">
                <p className="truncate">
                  <span className="text-[#86868b]">De: </span>
                  <span className="font-semibold">{draft.fromName || settings.brandName}</span>{" "}
                  <span className="text-[#86868b]">&lt;{draft.fromEmail || "onboarding@resend.dev"}&gt;</span>
                </p>
                <p className="truncate">
                  <span className="text-[#86868b]">Assunto: </span>
                  <span className="font-semibold">{preview?.subject}</span>
                </p>
              </div>
              {preview && (
                <iframe
                  title="Prévia do e-mail"
                  srcDoc={preview.html}
                  // Sem scripts; same-origin só para medir a altura do conteúdo.
                  sandbox="allow-same-origin"
                  onLoad={(e) => {
                    const height = e.currentTarget.contentDocument?.documentElement.scrollHeight;
                    if (height) setFrameHeight(height);
                  }}
                  style={{ height: frameHeight }}
                  className="block w-full bg-[#f5f5f7]"
                />
              )}
            </Card>

            <Card title="Enviar um teste" description="Receba o e-mail como o cliente vai receber (com dados de exemplo).">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="seu@email.com" className="flex-1" />
                <Button icon={<Send size={14} />} onClick={sendTest} loading={testing} disabled={!status.data?.configured}>
                  Enviar teste
                </Button>
              </div>
              {!status.data?.configured && <p className="mt-2 text-[12px] text-[#86868b]">Conecte o Resend acima para enviar testes.</p>}
              {dirty && <p className="mt-2 text-[12px] text-[#86868b]">O teste usa o texto atual, mesmo antes de salvar.</p>}
            </Card>
          </div>
        </div>
      </div>

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
              <button onClick={() => setDraft(settings.email)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-white/70 hover:text-white">Descartar</button>
              <Button variant="accent" onClick={save} loading={saving}>Salvar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Notice({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex gap-2.5 rounded-2xl p-4 text-[13px] leading-relaxed ring-1 ring-inset",
        tone === "amber" ? "bg-amber-50 text-amber-900 ring-amber-200/70" : "bg-red-50 text-red-800 ring-red-200/70",
      )}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const DOMAIN_STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  verified: { label: "Verificado", tone: "green" },
  pending: { label: "Aguardando DNS", tone: "amber" },
  not_started: { label: "Não verificado", tone: "amber" },
  partially_verified: { label: "Parcial", tone: "amber" },
  partially_failed: { label: "Falhou em parte", tone: "red" },
  failed: { label: "Falhou", tone: "red" },
};

function ConnectionCard({
  status,
  loading,
  error,
  keyInput,
  onKeyInput,
  onSaveKey,
  savingKey,
  onDisconnect,
  onRefresh,
  refreshing,
}: {
  status?: EmailStatus;
  loading: boolean;
  error: Error | null;
  keyInput: string;
  onKeyInput: (v: string) => void;
  onSaveKey: () => void;
  savingKey: boolean;
  onDisconnect: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const connected = !!status?.configured && status.keyCheck !== "invalid";
  return (
    <Card
      title={
        <span className="flex items-center gap-2.5">
          <MailCheck size={18} /> Provedor de e-mail · Resend
          {loading ? (
            <Loader2 size={15} className="animate-spin text-[#86868b]" />
          ) : connected ? (
            <Badge tone="green">Conectado</Badge>
          ) : status?.configured ? (
            <Badge tone="red">Chave recusada</Badge>
          ) : (
            <Badge tone="amber">Não conectado</Badge>
          )}
        </span>
      }
      description="O Resend entrega os e-mails com o seu domínio. O plano grátis cobre 3.000 e-mails por mês (100 por dia)."
      actions={
        status?.configured ? (
          <Button size="sm" variant="secondary" onClick={onRefresh} loading={refreshing}>
            Verificar de novo
          </Button>
        ) : undefined
      }
    >
      {error && <Notice tone="red">{error.message || "Não foi possível consultar o Resend."}</Notice>}

      {status?.configured && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f5f5f7] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#1d1d1f] ring-1 ring-black/[0.06]">
              <KeyRound size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[13px] font-semibold">{status.hint}</p>
              <p className="text-[12px] text-[#86868b]">
                {status.source === "env" ? "Segredo RESEND_API_KEY do Supabase (tem prioridade)." : "Chave salva com segurança — só o servidor consegue lê-la."}
                {status.keyCheck === "send_only" && " Chave só de envio: ótima para o dia a dia, mas não mostra os domínios."}
                {status.keyCheck === "unreachable" && " Não foi possível falar com o Resend agora."}
              </p>
            </div>
            {status.source === "studio" && (
              <Button size="sm" variant="ghost" icon={<Unplug size={13} />} onClick={onDisconnect}>
                Desconectar
              </Button>
            )}
          </div>
          {status.domains && (
            <div className="flex flex-wrap gap-2">
              {status.domains.length === 0 ? (
                <Notice tone="amber">Nenhum domínio cadastrado no Resend ainda. Adicione o seu em resend.com/domains.</Notice>
              ) : (
                status.domains.map((d) => {
                  const info = DOMAIN_STATUS[d.status] || { label: d.status, tone: "neutral" as const };
                  return (
                    <span key={d.name} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-black/[0.08]">
                      {d.status === "verified" ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
                      {d.name}
                      <Badge tone={info.tone}>{info.label}</Badge>
                    </span>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {status?.source !== "env" && (
        <div>
          <Field label={status?.configured ? "Trocar a chave da API" : "Chave da API do Resend"} hint="Começa com re_. Fica guardada no servidor e nunca volta para o navegador.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={keyInput}
                onChange={(e) => onKeyInput(e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 font-mono"
              />
              <Button icon={<ShieldCheck size={14} />} onClick={onSaveKey} loading={savingKey} disabled={!keyInput.trim()}>
                {status?.configured ? "Trocar chave" : "Conectar"}
              </Button>
            </div>
          </Field>
        </div>
      )}

      {!connected && (
        <ol className="mt-6 space-y-3.5">
          {[
            <>Crie uma conta grátis em <a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer" className="font-semibold underline">resend.com <ExternalLink size={11} className="inline" /></a>.</>,
            <>Em <b>Domains → Add Domain</b>, adicione <b>gorgpresets.site</b> (região <b>São Paulo</b>) e copie os registros DNS que aparecem (MX e TXT com nome <b>send</b>, e TXT <b>resend._domainkey</b>) para onde o seu domínio está registrado. Depois clique em <b>Verify</b>.</>,
            <>Em <b>API Keys → Create API Key</b>, escolha a permissão <b>Sending access</b>, copie a chave e cole aqui.</>,
            <>Preencha o <b>remetente</b> abaixo (ex: acesso@gorgpresets.site) e envie um teste.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1d1d1f] text-[11px] font-bold text-white">{i + 1}</span>
              <p className="pt-0.5 text-[13.5px] leading-relaxed text-[#424245]">{step}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
