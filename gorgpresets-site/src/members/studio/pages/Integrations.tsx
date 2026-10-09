import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronDown, ExternalLink, KeyRound, Loader2, Mail, PlugZap, RefreshCw, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { relativeDate, sortByOrder } from "../../lib/format";
import { Badge, Button, Card, CopyButton, PageHeader, useConfirm } from "../ui";
import { useStudioAction, useStudioQuery, useWebhookLogs } from "../hooks";

const PLATFORMS = ["GGCheckout", "Kiwify", "Hotmart", "Cakto", "Perfect Pay", "Eduzz", "Ticto", "Yampi", "Stripe"];

const STATUS: Record<string, { label: string; tone: "green" | "red" | "amber" | "neutral" }> = {
  granted: { label: "Liberado", tone: "green" },
  revoked: { label: "Revogado", tone: "red" },
  unmatched: { label: "Sem produto", tone: "amber" },
  ignored: { label: "Ignorado", tone: "neutral" },
};

export default function IntegrationsPage() {
  const repo = useRepo();
  const { catalog } = useCatalog();
  const logs = useWebhookLogs();
  const webhook = useStudioQuery("webhook-url", () => repo.getWebhookUrl());
  const run = useStudioAction();
  const confirm = useConfirm();

  const rotate = async () => {
    const ok = await confirm({
      title: "Gerar um novo link?",
      text: "O link atual para de funcionar na hora. Depois atualize o webhook no seu checkout com o novo link.",
      confirmLabel: "Gerar novo link",
      danger: true,
    });
    if (ok) await run(() => repo.rotateWebhookToken(), { success: "Novo link gerado", scopes: ["studio"] });
  };
  const [open, setOpen] = useState<string | null>(null);
  const portalUrl = `${window.location.origin}/membros`;
  const products = sortByOrder(catalog.products);
  const unmapped = products.filter((p) => !p.externalIds.length && !p.isFree);

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações" subtitle="Conecte seu checkout para liberar o acesso automaticamente a cada venda aprovada — e retirar em caso de reembolso." />

      <Card title="Link da área de membros" description="Envie este link para seus clientes ou coloque na página de obrigado do checkout.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex h-11 flex-1 items-center truncate rounded-xl bg-[#f5f5f7] px-4 text-[13px] ring-1 ring-inset ring-black/[0.06]">{portalUrl}</code>
          <div className="flex gap-2">
            <CopyButton value={portalUrl} />
            <Button size="sm" variant="secondary" icon={<ExternalLink size={13} />} onClick={() => window.open(portalUrl, "_blank")}>Abrir</Button>
          </div>
        </div>
      </Card>

      <Card title={<span className="flex items-center gap-2"><Webhook size={18} /> Webhook de vendas</span>} description="Funciona com qualquer checkout que envie um webhook com o e-mail do comprador e o produto.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex min-h-11 flex-1 items-center break-all rounded-xl bg-[#1d1d1f] px-4 py-3 text-[12.5px] text-white">
            {webhook.isLoading ? <Loader2 size={15} className="animate-spin text-white/60" /> : webhook.data || (webhook.error as Error | null)?.message}
          </code>
          <div className="flex gap-2">
            {webhook.data && <CopyButton value={webhook.data} label="Copiar link" />}
            <Button size="sm" variant="secondary" icon={<KeyRound size={13} />} onClick={rotate}>Gerar novo</Button>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-[#86868b]">O link já contém uma chave secreta. Não compartilhe fora do painel do checkout.</p>

        <ol className="mt-6 space-y-4">
          {[
            <>No painel do checkout, cadastre o link acima como webhook para <b>compra aprovada</b> (e também <b>reembolso/chargeback</b>, para retirar o acesso).</>,
            <>Em cada coleção, abra <b>Acesso e venda</b> e informe o ID (ou nome) do produto/oferta como ele aparece no checkout.</>,
            <>Faça uma compra de teste: ela aparece em <b>Últimos eventos</b> logo abaixo.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1d1d1f] text-[12px] font-bold text-white">{i + 1}</span>
              <p className="pt-1 text-[14px] leading-relaxed text-[#424245]">{step}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <Badge key={p} className="px-3 py-1">{p}</Badge>
          ))}
        </div>

        {unmapped.length > 0 && (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200/70">
            <p className="flex items-center gap-2 text-[13px] font-bold text-amber-900"><AlertCircle size={15} /> {unmapped.length} {unmapped.length === 1 ? "coleção sem ID" : "coleções sem ID"} do checkout</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unmapped.map((p) => (
                <Link key={p.id} to={`/membros/studio/colecoes/${p.id}`} className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title={<span className="flex items-center gap-2"><Mail size={18} /> E-mails automáticos (opcional)</span>} description="Com o Resend configurado, cada comprador novo recebe o login e a senha por e-mail, e o “Esqueci minha senha” passa a usar o seu remetente.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["RESEND_API_KEY", "Chave da API do resend.com"],
            ["MEMBERS_EMAIL_FROM", "Ex: Gorg Presets <acesso@gorgpresets.site>"],
            ["MEMBERS_PORTAL_URL", portalUrl],
          ].map(([key, text]) => (
            <div key={key} className="rounded-2xl bg-[#f5f5f7] p-4">
              <code className="text-[12px] font-bold">{key}</code>
              <p className="mt-1 break-all text-[12px] text-[#86868b]">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-[#86868b]">Sem e-mail configurado, o comprador entra pelo botão “Primeiro acesso” e cria a própria senha com o e-mail da compra.</p>
      </Card>

      <Card
        title="Últimos eventos"
        description="Cada notificação recebida do checkout."
        actions={<Button size="sm" variant="secondary" icon={<RefreshCw size={13} className={cn(logs.isFetching && "animate-spin")} />} onClick={() => logs.refetch()}>Atualizar</Button>}
      >
        {logs.data?.length ? (
          <ul className="-mx-2 divide-y divide-black/[0.05]">
            {logs.data.map((log) => {
              const status = STATUS[log.status] || { label: log.status, tone: "neutral" as const };
              const expanded = open === log.id;
              return (
                <li key={log.id}>
                  <button onClick={() => setOpen(expanded ? null : log.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-[#f5f5f7]">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{log.email || "—"}</span>
                      <span className="block truncate text-[12px] text-[#86868b]">{log.message}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[#a1a1a6]">{relativeDate(log.receivedAt)}</span>
                    <ChevronDown size={15} className={cn("shrink-0 text-[#a1a1a6] transition-transform", expanded && "rotate-180")} />
                  </button>
                  {expanded && (
                    <pre className="mx-2 mb-3 max-h-72 overflow-auto rounded-xl bg-[#1d1d1f] p-4 text-[11.5px] leading-relaxed text-white/85">{JSON.stringify(log.payload, null, 2)}</pre>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <PlugZap className="h-8 w-8 text-[#c7c7cc]" />
            <p className="mt-3 text-sm text-[#86868b]">Nenhum evento recebido ainda.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
