// Membros: lista com filtros, seleção e ações em massa, e o painel completo de
// cada membro (dados, coleções, senha, bloqueio e histórico de vendas e e-mails).
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type Ref } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CircleCheck,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  History,
  KeyRound,
  Library,
  Lock,
  LockOpen,
  Mail,
  MailCheck,
  MailX,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  Undo2,
  Upload,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo, useSettings } from "../../context/MembersContext";
import { firstName, generatePassword, isValidEmail, normalizeEmail, relativeDate, sortByOrder } from "../../lib/format";
import type { EmailLog, MemberSummary, Product, WebhookLog } from "../../lib/types";
import { PosterArt } from "../../components/PosterArt";
import { Avatar } from "../../components/ui";
import { Badge, Button, Card, CopyButton, Drawer, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, Textarea, Toggle, useConfirm } from "../ui";
import { useMembersList, useStudioAction, useStudioQuery } from "../hooks";
import { CollectionPicker } from "../components/CollectionPicker";
import { Tabs } from "../components/Tabs";

// ── Tipos e utilidades ──────────────────────────────────────────────
type Situation = "ativo" | "sem-conta" | "senha" | "bloqueado";
type StatusFilter = "todos" | Situation;
type SortKey = "recentes" | "acesso" | "nome";
type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "dark";
type Ask = ReturnType<typeof useConfirm>;
type Focus = "colecoes" | "senha" | null;
type RowAction = "open" | "colecoes" | "resend" | "senha" | "reset" | "message" | "block" | "unblock" | "delete";

const SITUATIONS: Record<Situation, { label: string; short: string; tone: Tone; hint: string }> = {
  ativo: { label: "Ativo", short: "Ativo", tone: "green", hint: "Conta criada e com acesso ao conteúdo." },
  "sem-conta": { label: "Sem conta ainda", short: "Sem conta ainda", tone: "amber", hint: "Tem coleções liberadas, mas ainda não criou a conta." },
  senha: { label: "Troca de senha pendente", short: "Senha pendente", tone: "blue", hint: "Precisa criar uma senha nova no próximo acesso." },
  bloqueado: { label: "Bloqueado", short: "Bloqueado", tone: "red", hint: "Não consegue entrar e o conteúdo fica escondido." },
};

function situationOf(m: MemberSummary): Situation {
  if (m.blocked) return "bloqueado";
  if (!m.hasAccount) return "sem-conta";
  if (m.mustChangePassword) return "senha";
  return "ativo";
}

const STUDIO = "/membros/studio";
const NO_COLLECTION = "__sem-colecao__";
const PAGE_SIZE = 60;

const digits = (value: string) => (value || "").replace(/\D/g, "");
const fold = (value: string) => (value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fullDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : undefined);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const displayName = (m: { name: string; email: string }) => m.name || m.email.split("@")[0];
const portalUrl = () => `${window.location.origin}/membros`;
const money = (value: number | null) => (typeof value === "number" ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "");

function formatPhone(raw: string): string {
  let d = digits(raw);
  if (!d) return raw || "";
  let prefix = "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    prefix = "+55 ";
    d = d.slice(2);
  }
  if (d.length === 11) return `${prefix}(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${prefix}(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function formatDocument(raw: string): string {
  const d = digits(raw);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return raw || "";
}

/** Link do WhatsApp; sem telefone, abre para escolher o contato. */
function whatsappLink(phone: string, text: string): string {
  let d = digits(phone).replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return `https://wa.me/${d.length >= 10 ? d : ""}?text=${encodeURIComponent(text)}`;
}

const PAYMENT_LABELS: Array<[RegExp, string]> = [
  [/pix/i, "PIX"],
  [/credit|card|cartao|cartão/i, "Cartão"],
  [/boleto|billet|bank_slip/i, "Boleto"],
];
const paymentLabel = (value: string) => PAYMENT_LABELS.find(([re]) => re.test(value))?.[1] || value;

const SALE_STATUS: Record<string, { label: string; tone: Tone }> = {
  granted: { label: "Acesso liberado", tone: "green" },
  revoked: { label: "Acesso retirado", tone: "red" },
  unmatched: { label: "Sem coleção ligada", tone: "amber" },
  ignored: { label: "Ignorado", tone: "neutral" },
  paused: { label: "Automação pausada", tone: "neutral" },
  error: { label: "Erro", tone: "red" },
};

const EMAIL_KINDS: Record<string, string> = {
  welcome: "Boas-vindas",
  refund: "Reembolso",
  access: "Acesso reenviado",
  reset: "Redefinição de senha",
  test: "Teste",
};

const providerLabel = (value: string) => (value === "smtp" ? "SMTP" : value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

/** Executa `worker` em paralelo, no máximo `size` por vez. */
async function inPool<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

// ── Mensagem de acesso ──────────────────────────────────────────────
interface AccessInfo {
  email: string;
  name: string;
  phone?: string;
  password?: string;
  /** undefined = nenhum e-mail foi tentado. */
  emailed?: boolean;
  emailError?: string;
  warning?: string;
  mustChange?: boolean;
  hasAccount?: boolean;
}

function accessMessage(info: AccessInfo, brand: string, allowFirstAccess: boolean): string {
  const lines = [`Olá${info.name ? `, ${firstName(info.name)}` : ""}! 💫`, `Seu acesso à Área de Membros ${brand} está liberado.`, "", `🔗 ${portalUrl()}`, `📧 E-mail: ${info.email}`];
  if (info.password) {
    lines.push(`🔑 Senha: ${info.password}`);
    if (info.mustChange) lines.push("", "No primeiro login você cria uma senha só sua.");
  } else if (!info.hasAccount && allowFirstAccess) {
    lines.push("🔑 Toque em “Primeiro acesso” e crie sua senha com este e-mail.");
  } else {
    lines.push("🔑 Entre com sua senha. Se não lembrar, toque em “Esqueci minha senha”.");
  }
  return lines.join("\n");
}

// ── Exportação ──────────────────────────────────────────────────────
function exportCsv(list: MemberSummary[], productMap: Map<string, Product>) {
  // Evita que planilhas executem fórmulas vindas de nomes do checkout.
  const cell = (value: string) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = ["Nome", "E-mail", "Telefone", "CPF", "Situação", "Coleções", "Membro desde", "Último acesso"];
  const rows = list.map((m) => [
    m.name,
    m.email,
    digits(m.phone),
    digits(m.document),
    SITUATIONS[situationOf(m)].label,
    m.grants.map((g) => productMap.get(g.productId)?.title).filter(Boolean).join(" | "),
    fullDate(m.createdAt) || "",
    fullDate(m.lastSeenAt) || "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => cell(String(v ?? ""))).join(";")).join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `membros-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Ações de um membro (usadas na lista e no painel) ────────────────
function useMemberActions(ask: Ask, mustChange: boolean) {
  const repo = useRepo();
  const run = useStudioAction();
  return useMemo(
    () => ({
      async resend(m: MemberSummary): Promise<AccessInfo | undefined> {
        if (!m.grants.length) {
          toast.error("Libere ao menos uma coleção antes de enviar o acesso.");
          return undefined;
        }
        const ok = await ask(
          m.hasAccount
            ? { title: `Reenviar o acesso de ${displayName(m)}?`, text: "Uma senha nova é gerada e enviada por e-mail com todas as coleções. A senha atual deixa de funcionar.", confirmLabel: "Reenviar acesso" }
            : { title: `Criar a conta de ${displayName(m)}?`, text: "A conta é criada com uma senha nova e o e-mail de acesso é enviado com todas as coleções liberadas.", confirmLabel: "Criar e enviar" },
        );
        if (!ok) return undefined;
        const result = await run(() => repo.resendAccess(m.email), { scopes: ["studio"] });
        if (!result) return undefined;
        if (result.emailed) toast.success(`Acesso enviado para ${m.email}`);
        else toast.warning("Senha nova gerada, mas o e-mail não foi enviado");
        return { email: m.email, name: m.name, phone: m.phone, password: result.password, emailed: result.emailed, emailError: result.emailError, mustChange, hasAccount: true };
      },
      async sendReset(m: MemberSummary): Promise<boolean> {
        const ok = await run(() => repo.sendPasswordReset(m.email).then(() => true), { success: `Link de redefinição enviado para ${m.email}`, scopes: ["studio"] });
        return !!ok;
      },
      async setBlocked(m: MemberSummary, blocked: boolean): Promise<boolean> {
        if (
          blocked &&
          !(await ask({
            title: `Bloquear ${displayName(m)}?`,
            text: "O membro não consegue mais entrar e o conteúdo fica escondido. As coleções ficam guardadas e voltam quando você desbloquear.",
            confirmLabel: "Bloquear",
            danger: true,
          }))
        )
          return false;
        const ok = await run(() => repo.setMemberBlocked(m.email, blocked).then(() => true), { success: blocked ? "Membro bloqueado" : "Membro desbloqueado", scopes: ["studio"] });
        return !!ok;
      },
      async remove(m: MemberSummary): Promise<boolean> {
        const n = m.grants.length;
        const ok = await ask({
          title: `Excluir ${displayName(m)}?`,
          text: `${n ? `A conta e ${plural(n, "coleção liberada", "coleções liberadas")} são removidas` : "A conta é removida"} e o acesso termina na hora. Não dá para desfazer.`,
          confirmLabel: "Excluir membro",
          danger: true,
        });
        if (!ok) return false;
        const done = await run(() => repo.removeMember(m.email).then(() => true), { success: "Membro excluído", scopes: ["studio", "access"] });
        return !!done;
      },
    }),
    [ask, mustChange, repo, run],
  );
}

// ── Ações em massa ──────────────────────────────────────────────────
interface BulkTarget {
  email: string;
  name: string;
  phone: string;
}
interface BulkOutcome extends BulkTarget {
  ok: boolean;
  error?: string;
  access?: { password: string; emailed: boolean; emailError: string };
}
interface BulkJob {
  title: string;
  total: number;
  done: number;
  running: boolean;
  /** O modal só aparece se a tarefa demora ou se há algo para mostrar no fim. */
  showing: boolean;
  outcomes: BulkOutcome[];
  skipped: Array<{ email: string; reason: string }>;
  mustChange: boolean;
}
type BulkWorker = (target: BulkTarget) => Promise<BulkOutcome["access"] | void>;

// ── Página ──────────────────────────────────────────────────────────
export default function MembersPage() {
  const { data: members, isLoading, isError, error, refetch } = useMembersList();
  const { catalog } = useCatalog();
  const { data: settings } = useSettings();
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();

  const products = useMemo(() => sortByOrder(catalog.products), [catalog.products]);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const brand = settings?.brandName || "Gorg Presets";
  const allowFirstAccess = settings?.login?.allowFirstAccess ?? true;
  const mustChangeDefault = !!settings?.automation?.forcePasswordChange;

  // Diálogos de confirmação: enquanto um está aberto, o Esc não fecha o painel.
  const dialogOpen = useRef(false);
  const ask = useCallback<Ask>(
    async (options) => {
      dialogOpen.current = true;
      try {
        return await confirm(options);
      } finally {
        window.setTimeout(() => {
          dialogOpen.current = false;
        }, 0);
      }
    },
    [confirm],
  );
  const actions = useMemberActions(ask, mustChangeDefault);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [collection, setCollection] = useState("");
  const [sort, setSort] = useState<SortKey>("recentes");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const anchor = useRef<number | null>(null);

  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [credentials, setCredentials] = useState<AccessInfo | null>(null);
  const [bulkPick, setBulkPick] = useState<"grant" | "revoke" | null>(null);
  const [job, setJob] = useState<BulkJob | null>(null);

  // ── Filtros ──
  const ownedOf = useCallback((m: MemberSummary) => m.grants.map((g) => productMap.get(g.productId)).filter((p): p is Product => !!p), [productMap]);

  const byOther = useMemo(() => {
    const q = fold(query.trim());
    const qDigits = digits(query);
    return (members || []).filter((m) => {
      if (collection === NO_COLLECTION) {
        if (m.grants.some((g) => productMap.has(g.productId))) return false;
      } else if (collection && !m.grants.some((g) => g.productId === collection)) return false;
      if (!q) return true;
      return fold(m.name).includes(q) || m.email.includes(q) || (qDigits.length >= 3 && (digits(m.phone).includes(qDigits) || digits(m.document).includes(qDigits)));
    });
  }, [members, query, collection, productMap]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { todos: byOther.length, ativo: 0, "sem-conta": 0, senha: 0, bloqueado: 0 };
    byOther.forEach((m) => c[situationOf(m)]++);
    return c;
  }, [byOther]);

  const list = useMemo(() => {
    const filtered = status === "todos" ? [...byOther] : byOther.filter((m) => situationOf(m) === status);
    if (sort === "nome") filtered.sort((a, b) => displayName(a).localeCompare(displayName(b), "pt-BR", { sensitivity: "base" }));
    else if (sort === "acesso") filtered.sort((a, b) => (b.lastSeenAt || "").localeCompare(a.lastSeenAt || ""));
    else filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered;
  }, [byOther, status, sort]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
    anchor.current = null;
  }, [query, status, collection, sort]);

  const visible = list.slice(0, limit);
  const filtersActive = !!query.trim() || !!collection || status !== "todos";
  const clearFilters = () => {
    setQuery("");
    setCollection("");
    setStatus("todos");
  };

  // ── Seleção ──
  useEffect(() => {
    if (!members) return;
    setSelected((prev) => {
      const valid = new Set(members.map((m) => m.email));
      const next = new Set([...prev].filter((e) => valid.has(e)));
      return next.size === prev.size ? prev : next;
    });
  }, [members]);

  const selectedMembers = useMemo(() => (members || []).filter((m) => selected.has(m.email)), [members, selected]);
  const allChecked = list.length > 0 && list.every((m) => selected.has(m.email));
  const someChecked = !allChecked && list.some((m) => selected.has(m.email));
  const hiddenSelected = selectedMembers.filter((m) => !list.includes(m)).length;

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      list.forEach((m) => (allChecked ? next.delete(m.email) : next.add(m.email)));
      return next;
    });

  const toggleOne = (index: number, shift: boolean) => {
    const member = visible[index];
    if (!member) return;
    const on = !selected.has(member.email);
    setSelected((prev) => {
      const next = new Set(prev);
      const range = shift && anchor.current !== null ? visible.slice(Math.min(anchor.current, index), Math.max(anchor.current, index) + 1) : [member];
      range.forEach((m) => (on ? next.add(m.email) : next.delete(m.email)));
      return next;
    });
    anchor.current = index;
  };

  const clearSelection = () => {
    setSelected(new Set());
    anchor.current = null;
  };

  // ── Painel do membro (?membro=e-mail) ──
  const [params, setParams] = useSearchParams();
  const openEmail = params.get("membro");
  const [focus, setFocus] = useState<Focus>(null);
  const [session, setSession] = useState(0);
  const panelDirty = useRef(false);
  const lastShown = useRef<MemberSummary | null>(null);
  const renamedTo = useRef<string | null>(null);

  const found = openEmail ? members?.find((m) => m.email === openEmail) || null : null;
  if (found) {
    lastShown.current = found;
    if (renamedTo.current === found.email) renamedTo.current = null;
  }
  // Ao trocar o e-mail, mantém o painel aberto até a lista chegar com o e-mail novo.
  const shown = found || (openEmail && renamedTo.current === openEmail ? lastShown.current : null);

  const setMemberParam = (email: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (email) next.set("membro", email);
        else next.delete("membro");
        return next;
      },
      { replace: true },
    );

  const openMember = (email: string, f: Focus = null) => {
    setFocus(f);
    setSession((s) => s + 1);
    panelDirty.current = false;
    setMemberParam(email);
  };

  const closePanel = async () => {
    if (dialogOpen.current) return;
    if (panelDirty.current && !(await ask({ title: "Descartar alterações?", text: "Há mudanças neste membro que ainda não foram salvas.", confirmLabel: "Descartar", danger: true }))) return;
    panelDirty.current = false;
    setMemberParam(null);
  };

  // ── Ações por linha ──
  const onRowAction = async (m: MemberSummary, action: RowAction) => {
    switch (action) {
      case "open":
        return openMember(m.email);
      case "colecoes":
        return openMember(m.email, "colecoes");
      case "senha":
        return openMember(m.email, "senha");
      case "resend": {
        const info = await actions.resend(m);
        if (info) setCredentials(info);
        return;
      }
      case "reset":
        await actions.sendReset(m);
        return;
      case "message":
        return setCredentials({ email: m.email, name: m.name, phone: m.phone, hasAccount: m.hasAccount });
      case "block":
      case "unblock":
        await actions.setBlocked(m, action === "block");
        return;
      case "delete":
        await actions.remove(m);
        return;
    }
  };

  // ── Execução em massa com progresso e resumo ──
  const startJob = async (
    title: string,
    targets: BulkTarget[],
    worker: BulkWorker,
    successText: (n: number) => string,
    options: { skipped?: BulkJob["skipped"]; mustChange?: boolean } = {},
  ) => {
    const skipped = options.skipped || [];
    setJob({ title, total: targets.length, done: 0, running: true, showing: false, outcomes: [], skipped, mustChange: !!options.mustChange });
    const timer = window.setTimeout(() => setJob((j) => (j && j.running ? { ...j, showing: true } : j)), 350);
    const outcomes: BulkOutcome[] = [];
    await run(
      () =>
        inPool(targets, 3, async (t) => {
          const outcome: BulkOutcome = { email: t.email, name: t.name, phone: t.phone, ok: true };
          try {
            const access = await worker(t);
            if (access) outcome.access = access;
          } catch (err) {
            outcome.ok = false;
            outcome.error = (err as Error).message || "Algo deu errado";
          }
          outcomes.push(outcome);
          setJob((j) => (j ? { ...j, done: outcomes.length, outcomes: [...outcomes] } : j));
        }),
      { scopes: ["studio", "access"] },
    );
    window.clearTimeout(timer);
    const failed = outcomes.filter((o) => !o.ok).length;
    const okCount = outcomes.length - failed;
    const needsSummary = failed > 0 || skipped.length > 0 || outcomes.some((o) => o.access);
    setJob((j) => (j ? (needsSummary ? { ...j, running: false, showing: true, outcomes: [...outcomes] } : null) : j));
    if (!failed) toast.success(successText(okCount));
    else if (okCount) toast.warning(`${plural(okCount, "deu certo", "deram certo")}, ${plural(failed, "com erro", "com erro")}`);
    else toast.error(`Nenhum deu certo (${plural(failed, "erro", "erros")})`);
  };

  const asTarget = (m: MemberSummary): BulkTarget => ({ email: m.email, name: m.name, phone: m.phone });

  const bulkGrant = (ids: string[]) => {
    setBulkPick(null);
    const targets = selectedMembers.map(asTarget);
    void startJob("Liberando coleções", targets, (t) => repo.grantAccess(t.email, ids), (n) => `Coleções liberadas para ${plural(n, "membro", "membros")}`);
  };

  const bulkRevoke = async (ids: string[]) => {
    setBulkPick(null);
    const affected = selectedMembers.filter((m) => m.grants.some((g) => ids.includes(g.productId)));
    if (!affected.length) return void toast.info("Nenhum dos selecionados tem essas coleções.");
    const ok = await ask({
      title: `Remover ${plural(ids.length, "coleção", "coleções")} de ${plural(affected.length, "membro", "membros")}?`,
      text: "O acesso a essas coleções termina na hora. As outras coleções de cada membro continuam liberadas.",
      confirmLabel: "Remover coleções",
      danger: true,
    });
    if (!ok) return;
    const keep = new Map(affected.map((m) => [m.email, m.grants.map((g) => g.productId).filter((id) => !ids.includes(id))]));
    void startJob("Removendo coleções", affected.map(asTarget), (t) => repo.setMemberAccess(t.email, keep.get(t.email) || []), (n) => `Coleções removidas de ${plural(n, "membro", "membros")}`);
  };

  const bulkResend = async () => {
    const targets = selectedMembers.filter((m) => m.grants.length > 0);
    const skipped = selectedMembers.filter((m) => !m.grants.length).map((m) => ({ email: m.email, reason: "Sem coleção liberada" }));
    if (!targets.length) return void toast.error("Nenhum dos selecionados tem coleção liberada.");
    const ok = await ask({
      title: `Reenviar o acesso para ${plural(targets.length, "membro", "membros")}?`,
      text: `Cada um recebe uma senha nova por e-mail com todas as suas coleções, e a senha atual deixa de funcionar. Quem ainda não tem conta ganha uma agora.${skipped.length ? ` ${plural(skipped.length, "membro sem coleção fica", "membros sem coleção ficam")} de fora.` : ""}`,
      confirmLabel: "Reenviar acesso",
    });
    if (!ok) return;
    void startJob(
      "Reenviando acesso",
      targets.map(asTarget),
      async (t) => {
        const r = await repo.resendAccess(t.email);
        return { password: r.password, emailed: r.emailed, emailError: r.emailError };
      },
      (n) => `Acesso reenviado para ${plural(n, "membro", "membros")}`,
      { skipped, mustChange: mustChangeDefault },
    );
  };

  const bulkBlock = async (blocked: boolean) => {
    const targets = selectedMembers.filter((m) => m.hasAccount && m.blocked !== blocked);
    if (!targets.length) return void toast.info(blocked ? "Nenhum dos selecionados pode ser bloqueado." : "Nenhum dos selecionados está bloqueado.");
    const skipped = blocked ? selectedMembers.filter((m) => !m.hasAccount).map((m) => ({ email: m.email, reason: "Ainda não criou a conta" })) : [];
    if (blocked) {
      const ok = await ask({
        title: `Bloquear ${plural(targets.length, "membro", "membros")}?`,
        text: `Eles não conseguem mais entrar e o conteúdo fica escondido. As coleções ficam guardadas e voltam quando você desbloquear.${skipped.length ? ` ${plural(skipped.length, "membro sem conta fica", "membros sem conta ficam")} de fora.` : ""}`,
        confirmLabel: "Bloquear",
        danger: true,
      });
      if (!ok) return;
    }
    void startJob(
      blocked ? "Bloqueando" : "Desbloqueando",
      targets.map(asTarget),
      (t) => repo.setMemberBlocked(t.email, blocked),
      (n) => `${plural(n, "membro", "membros")} ${blocked ? (n === 1 ? "bloqueado" : "bloqueados") : n === 1 ? "desbloqueado" : "desbloqueados"}`,
      { skipped },
    );
  };

  const bulkDelete = async () => {
    const n = selectedMembers.length;
    const ok = await ask({
      title: `Excluir ${plural(n, "membro", "membros")}?`,
      text: "As contas e todas as coleções liberadas são removidas e o acesso termina na hora. Não dá para desfazer.",
      confirmLabel: `Excluir ${n}`,
      danger: true,
    });
    if (!ok) return;
    await startJob("Excluindo membros", selectedMembers.map(asTarget), (t) => repo.removeMember(t.email), (count) => `${plural(count, "membro excluído", "membros excluídos")}`);
    clearSelection();
  };

  const runImport = (emails: string[], productIds: string[], sendAccess: boolean) => {
    setImporting(false);
    const known = new Map((members || []).map((m) => [m.email, m]));
    const targets = emails.map((email) => ({ email, name: known.get(email)?.name || "", phone: known.get(email)?.phone || "" }));
    void startJob(
      "Importando membros",
      targets,
      async (t) => {
        await repo.grantAccess(t.email, productIds);
        // Só quem ainda não tem conta recebe senha nova: quem já tem continua com a dele.
        if (sendAccess && !known.get(t.email)?.hasAccount) {
          const r = await repo.resendAccess(t.email);
          return { password: r.password, emailed: r.emailed, emailError: r.emailError };
        }
      },
      (n) => `${plural(n, "membro importado", "membros importados")}`,
      { mustChange: mustChangeDefault },
    );
  };

  const exportList = () => {
    if (!list.length) return;
    exportCsv(list, productMap);
    toast.success(`${plural(list.length, "membro exportado", "membros exportados")}`);
  };

  const canBlock = selectedMembers.some((m) => m.hasAccount && !m.blocked);
  const canUnblock = selectedMembers.some((m) => m.blocked);
  const anyGrants = selectedMembers.some((m) => m.grants.length > 0);
  const loadingList = isLoading && !members;

  return (
    <div className={cn(selected.size > 0 && "pb-32 sm:pb-24")}>
      <PageHeader
        title="Membros"
        subtitle="Quem tem acesso à sua área. Compras aprovadas no checkout entram aqui sozinhas; reembolsos e chargebacks retiram o acesso."
        actions={
          <>
            <Button variant="secondary" icon={<Download size={15} />} onClick={exportList} disabled={!list.length} title="Baixa a lista filtrada em CSV">
              Exportar
            </Button>
            <Button variant="secondary" icon={<FileUp size={15} />} onClick={() => setImporting(true)}>
              Importar lista
            </Button>
            <Button icon={<UserPlus size={16} />} onClick={() => setAdding(true)}>
              Adicionar membro
            </Button>
          </>
        }
      />

      {isError && !members ? (
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle size={22} />
            </span>
            <p className="mt-4 text-[15px] font-bold">Não foi possível carregar os membros</p>
            <p className="mt-1 max-w-sm text-[13px] text-[#86868b]">{(error as Error)?.message || "Verifique a conexão e tente de novo."}</p>
            <Button variant="secondary" className="mt-5" icon={<RefreshCw size={14} />} onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </div>
        </Card>
      ) : !loadingList && !members?.length ? (
        <EmptyState
          icon={<Users />}
          title="Nenhum membro ainda"
          text="Adicione manualmente, importe a lista da plataforma antiga ou conecte o checkout para liberar o acesso a cada venda."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" icon={<FileUp size={15} />} onClick={() => setImporting(true)}>
                Importar lista
              </Button>
              <Button icon={<UserPlus size={16} />} onClick={() => setAdding(true)}>
                Adicionar membro
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <Tabs
            value={status}
            onChange={setStatus}
            className="mb-4"
            tabs={[
              { value: "todos", label: "Todos", count: counts.todos },
              { value: "ativo", label: "Ativos", count: counts.ativo },
              { value: "sem-conta", label: "Sem conta ainda", count: counts["sem-conta"] },
              { value: "senha", label: "Troca de senha pendente", count: counts.senha },
              { value: "bloqueado", label: "Bloqueados", count: counts.bloqueado, tone: "red" },
            ]}
          />

          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-[minmax(0,1fr)_210px_180px]">
            <div className="relative col-span-2 sm:col-span-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1a6]" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail, telefone ou CPF" aria-label="Buscar membros" className="bg-white pl-10 pr-10" />
              {query && (
                <IconButton label="Limpar busca" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <X size={15} />
                </IconButton>
              )}
            </div>
            <Select value={collection} onChange={(e) => setCollection(e.target.value)} aria-label="Filtrar por coleção" className="bg-white">
              <option value="">Todas as coleções</option>
              <option value={NO_COLLECTION}>Sem nenhuma coleção</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar" className="bg-white">
              <option value="recentes">Mais recentes</option>
              <option value="acesso">Último acesso</option>
              <option value="nome">Nome (A–Z)</option>
            </Select>
          </div>

          {filtersActive && !loadingList && (
            <div className="mb-3 flex items-center justify-between gap-3 px-1 text-[12.5px] text-[#6e6e73]">
              <span>
                {plural(list.length, "membro encontrado", "membros encontrados")} de {members?.length || 0}
              </span>
              <button type="button" onClick={clearFilters} className="font-semibold text-[#1d1d1f] hover:underline">
                Limpar filtros
              </button>
            </div>
          )}

          <Card padded={false} className="overflow-visible">
            {/* Cabeçalho: colunas no computador, "selecionar todos" no celular. */}
            <div className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-2.5 lg:grid lg:grid-cols-[24px_minmax(0,1.4fr)_minmax(0,1.2fr)_136px_100px_36px] lg:gap-4 lg:px-5">
              <Checkbox checked={allChecked} mixed={someChecked} onToggle={toggleAll} label={allChecked ? "Desmarcar todos" : `Selecionar todos os ${list.length} membros filtrados`} disabled={!list.length} />
              <span className="text-[12px] font-semibold text-[#6e6e73] lg:hidden">{selected.size ? `${selected.size} de ${list.length} selecionados` : `Selecionar todos (${list.length})`}</span>
              {["Membro", "Coleções", "Situação", "Último acesso"].map((h) => (
                <span key={h} className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6] lg:block">
                  {h}
                </span>
              ))}
              <span className="hidden lg:block" />
            </div>

            <ul className="divide-y divide-black/[0.05]">
              {loadingList &&
                Array.from({ length: 6 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-4 lg:px-5">
                    <Bone className="h-5 w-5 rounded-md" />
                    <Bone className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Bone className="h-3.5 w-40" />
                      <Bone className="h-3 w-56 max-w-full" />
                    </div>
                  </li>
                ))}
              {visible.map((m, index) => (
                <MemberRow
                  key={m.email}
                  member={m}
                  owned={ownedOf(m)}
                  checked={selected.has(m.email)}
                  onCheck={(shift) => toggleOne(index, shift)}
                  onOpen={(f) => openMember(m.email, f)}
                  onAction={(a) => void onRowAction(m, a)}
                />
              ))}
              {!loadingList && list.length === 0 && (
                <li className="px-5 py-14 text-center">
                  <p className="text-[14px] font-semibold">Nenhum membro encontrado</p>
                  <p className="mt-1 text-[13px] text-[#86868b]">Tente outro termo ou mude os filtros.</p>
                  {filtersActive && (
                    <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </li>
              )}
            </ul>

            {list.length > limit && (
              <div className="flex flex-col items-center gap-2 border-t border-black/[0.05] px-5 py-4">
                <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Mostrar mais {Math.min(PAGE_SIZE, list.length - limit)}
                </Button>
                <p className="text-[11.5px] text-[#86868b]">
                  Mostrando {limit} de {list.length}
                </p>
              </div>
            )}
          </Card>
          <p className="mt-3 hidden px-1 text-[11.5px] text-[#a1a1a6] lg:block">Dica: segure Shift ao marcar para selecionar vários de uma vez.</p>
        </>
      )}

      <AddMemberModal
        open={adding}
        products={products}
        members={members || []}
        onClose={() => setAdding(false)}
        onDone={(info) => {
          setAdding(false);
          setCredentials(info);
        }}
      />
      <ImportModal open={importing} products={products} members={members || []} onClose={() => setImporting(false)} onSubmit={runImport} />
      <CredentialsModal info={credentials} brand={brand} allowFirstAccess={allowFirstAccess} onClose={() => setCredentials(null)} />
      <BulkCollectionsModal mode={bulkPick} members={selectedMembers} products={products} onClose={() => setBulkPick(null)} onConfirm={(ids) => (bulkPick === "revoke" ? void bulkRevoke(ids) : bulkGrant(ids))} />
      <BulkJobModal job={job} brand={brand} allowFirstAccess={allowFirstAccess} onClose={() => setJob(null)} />

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            role="region"
            aria-label="Ações em massa"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-[1.4rem] bg-[#1d1d1f] p-1.5 text-white shadow-2xl sm:inset-x-4 sm:bottom-5 lg:left-[264px]"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <div className="flex items-center justify-between gap-2 px-3 pt-1 sm:pt-0">
                <span className="text-[13px] font-medium">
                  <b className="tabular-nums">{selected.size}</b> {selected.size === 1 ? "selecionado" : "selecionados"}
                  {hiddenSelected > 0 && <span className="text-white/50"> · {hiddenSelected} fora do filtro</span>}
                </span>
                <button type="button" onClick={clearSelection} className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-white/60 hover:bg-white/10 hover:text-white">
                  Limpar
                </button>
              </div>
              <div className="flex flex-1 items-stretch sm:justify-end">
                <BarButton icon={<Plus size={17} />} label="Liberar" title="Liberar coleções" onClick={() => setBulkPick("grant")} />
                <BarButton icon={<Minus size={17} />} label="Remover" title="Remover coleções" onClick={() => setBulkPick("revoke")} disabled={!anyGrants} />
                <BarButton icon={<Send size={16} />} label="Reenviar" title="Reenviar acesso por e-mail" onClick={() => void bulkResend()} disabled={!anyGrants} />
                <BarButton icon={<Lock size={16} />} label="Bloquear" title="Bloquear" onClick={() => void bulkBlock(true)} disabled={!canBlock} />
                <BarButton icon={<LockOpen size={16} />} label="Desbloquear" title="Desbloquear" onClick={() => void bulkBlock(false)} disabled={!canUnblock} />
                <BarButton icon={<Trash2 size={16} />} label="Excluir" title="Excluir membros" onClick={() => void bulkDelete()} danger />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer open={!!shown} onClose={() => void closePanel()} title={shown ? displayName(shown) : ""} description={shown?.email}>
        {shown && (
          <MemberPanel
            key={session}
            member={shown}
            products={products}
            productMap={productMap}
            brand={brand}
            allowFirstAccess={allowFirstAccess}
            mustChangeDefault={mustChangeDefault}
            focus={focus}
            ask={ask}
            actions={actions}
            dirtyRef={panelDirty}
            onRenamed={(email) => {
              renamedTo.current = email;
              setSelected((prev) => {
                if (!prev.has(shown.email)) return prev;
                const next = new Set(prev);
                next.delete(shown.email);
                next.add(email);
                return next;
              });
              setMemberParam(email);
            }}
            onDeleted={() => {
              panelDirty.current = false;
              setMemberParam(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

// ── Linha da lista ──────────────────────────────────────────────────
function MemberRow({
  member: m,
  owned,
  checked,
  onCheck,
  onOpen,
  onAction,
}: {
  member: MemberSummary;
  owned: Product[];
  checked: boolean;
  onCheck: (shift: boolean) => void;
  onOpen: (focus?: Focus) => void;
  onAction: (action: RowAction) => void;
}) {
  const situation = SITUATIONS[situationOf(m)];
  const last = m.lastSeenAt ? relativeDate(m.lastSeenAt) : m.hasAccount ? "Ainda não entrou" : "Nunca";
  return (
    <li
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 transition-colors lg:grid lg:grid-cols-[24px_minmax(0,1.4fr)_minmax(0,1.2fr)_136px_100px_36px] lg:items-center lg:gap-4 lg:px-5",
        checked ? "bg-ma/[0.04]" : "hover:bg-black/[0.015]",
      )}
    >
      <div className="pt-2.5 lg:pt-0">
        <Checkbox checked={checked} onToggle={onCheck} label={`Selecionar ${displayName(m)}`} />
      </div>

      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => onOpen()} className="flex w-full min-w-0 items-center gap-3 rounded-xl text-left" aria-label={`Abrir ${displayName(m)}`}>
          <span className="relative shrink-0">
            <Avatar name={m.name} email={m.email} size={40} className="ring-black/10" />
            {m.blocked && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-red-600 text-white ring-2 ring-white">
                <Lock size={9} strokeWidth={3} />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className={cn("block truncate text-[14px] font-semibold", m.blocked && "text-[#86868b]")}>{displayName(m)}</span>
            <span className="block truncate text-[12px] text-[#86868b]">{m.email}</span>
          </span>
        </button>
        {/* Celular e tablet: situação, acesso e coleções embaixo do nome. */}
        <div className="mt-2.5 space-y-2 pl-[52px] lg:hidden">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={situation.tone}>{situation.label}</Badge>
            <span className="text-[11.5px] text-[#86868b]" title={fullDate(m.lastSeenAt)}>
              {m.lastSeenAt ? `Acesso ${last}` : last}
            </span>
          </div>
          <CollectionChips owned={owned} onClick={() => onOpen("colecoes")} />
        </div>
      </div>

      <div className="hidden min-w-0 lg:block">
        <CollectionChips owned={owned} onClick={() => onOpen("colecoes")} />
      </div>
      <div className="hidden lg:block" title={situation.hint}>
        <Badge tone={situation.tone}>{situation.short}</Badge>
      </div>
      <p className="hidden truncate text-[12px] text-[#86868b] lg:block" title={fullDate(m.lastSeenAt)}>
        {last}
      </p>
      <RowMenu member={m} onAction={onAction} />
    </li>
  );
}

function CollectionChips({ owned, onClick, max = 2 }: { owned: Product[]; onClick: () => void; max?: number }) {
  if (!owned.length) {
    return (
      <button type="button" onClick={onClick} className="text-[12px] text-[#a1a1a6] transition-colors hover:text-[#1d1d1f]">
        Sem coleções · <span className="font-semibold underline decoration-black/20 underline-offset-2">liberar</span>
      </button>
    );
  }
  const rest = owned.length - max;
  const names = owned.map((p) => p.title).join(", ");
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-left" title={names} aria-label={`Coleções: ${names}. Gerenciar coleções`}>
      {owned.slice(0, max).map((p) => (
        <span key={p.id} className="flex min-w-0 max-w-[140px] items-center gap-1.5 rounded-full bg-[#f5f5f7] py-0.5 pl-0.5 pr-2.5 text-[11.5px] font-semibold ring-1 ring-inset ring-black/[0.05]">
          <span className="relative block aspect-[2/3] w-[18px] shrink-0 overflow-hidden rounded-[4px]">
            <PosterArt product={p} />
          </span>
          <span className="truncate">{p.title}</span>
        </span>
      ))}
      {rest > 0 && <span className="rounded-full bg-[#1d1d1f] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">+{rest}</span>}
    </button>
  );
}

function RowMenu({ member: m, onAction }: { member: MemberSummary; onAction: (action: RowAction) => void }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (action: RowAction) => {
    setOpen(false);
    onAction(action);
  };

  return (
    <div ref={ref} className="relative shrink-0 justify-self-end">
      <button
        type="button"
        onClick={() => {
          if (!open && ref.current) setUp(window.innerHeight - ref.current.getBoundingClientRect().bottom < 400);
          setOpen((v) => !v);
        }}
        className={cn("grid h-9 w-9 place-items-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/5 hover:text-[#1d1d1f]", open && "bg-black/5 text-[#1d1d1f]")}
        aria-label={`Ações de ${displayName(m)}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: up ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: up ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            className={cn("absolute right-0 z-30 w-64 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/10", up ? "bottom-11 origin-bottom-right" : "top-11 origin-top-right")}
          >
            <MenuItem icon={<UserRound size={15} />} onClick={() => pick("open")}>Abrir painel do membro</MenuItem>
            <MenuItem icon={<Library size={15} />} onClick={() => pick("colecoes")}>Gerenciar coleções</MenuItem>
            <MenuDivider />
            <MenuItem icon={<Send size={15} />} onClick={() => pick("resend")} disabled={!m.grants.length} hint={!m.grants.length ? "Sem coleção liberada" : undefined}>
              {m.hasAccount ? "Reenviar acesso por e-mail" : "Criar conta e enviar acesso"}
            </MenuItem>
            {m.hasAccount && (
              <>
                <MenuItem icon={<KeyRound size={15} />} onClick={() => pick("senha")}>Definir nova senha</MenuItem>
                <MenuItem icon={<Mail size={15} />} onClick={() => pick("reset")}>Enviar link de redefinição</MenuItem>
              </>
            )}
            <MenuItem icon={<MessageCircle size={15} />} onClick={() => pick("message")}>Mensagem para WhatsApp</MenuItem>
            <MenuDivider />
            {m.hasAccount &&
              (m.blocked ? (
                <MenuItem icon={<LockOpen size={15} />} onClick={() => pick("unblock")}>Desbloquear</MenuItem>
              ) : (
                <MenuItem icon={<Lock size={15} />} onClick={() => pick("block")}>Bloquear</MenuItem>
              ))}
            <MenuItem icon={<Trash2 size={15} />} danger onClick={() => pick("delete")}>Excluir membro</MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger, disabled, hint }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        danger ? "text-red-600 hover:bg-red-50" : "text-[#1d1d1f] hover:bg-black/[0.04]",
      )}
    >
      <span className={danger ? "" : "text-[#86868b]"}>{icon}</span>
      {children}
    </button>
  );
}

const MenuDivider = () => <div className="my-1 h-px bg-black/[0.06]" role="separator" />;

function Checkbox({ checked, mixed, onToggle, label, disabled }: { checked: boolean; mixed?: boolean; onToggle: (shift: boolean) => void; label: string; disabled?: boolean }) {
  const on = checked || mixed;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => onToggle(e.shiftKey)}
      className="group -m-2 grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-40"
    >
      <span className={cn("grid h-5 w-5 place-items-center rounded-[6px] ring-1 ring-inset transition", on ? "bg-[#1d1d1f] text-white ring-[#1d1d1f]" : "bg-white ring-black/20 group-hover:ring-black/40")}>
        {mixed ? <Minus size={12} strokeWidth={3.5} /> : checked ? <Check size={12} strokeWidth={3.5} /> : null}
      </span>
    </button>
  );
}

function BarButton({ icon, label, title, onClick, disabled, danger }: { icon: ReactNode; label: string; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1.5 text-[10.5px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-35 sm:flex-none sm:px-3",
        danger ? "text-red-300 hover:bg-red-500/15 hover:text-red-200" : "text-white/85 hover:bg-white/10 hover:text-white",
      )}
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

const Bone = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-lg bg-black/[0.06]", className)} />;

function Notice({ tone, icon, children }: { tone: "amber" | "red" | "blue" | "green"; icon: ReactNode; children: ReactNode }) {
  const tones = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200/70",
    red: "bg-red-50 text-red-900 ring-red-200/70",
    blue: "bg-sky-50 text-sky-900 ring-sky-200/70",
    green: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
  };
  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[12.5px] leading-relaxed ring-1 ring-inset", tones[tone])}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function CopyIcon({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
    >
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
    </IconButton>
  );
}

const waButton =
  "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#25d366] px-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.97]";

// ── Resultado de acesso (senha nova, mensagem e WhatsApp) ───────────
function AccessResult({ info, brand, allowFirstAccess, compact }: { info: AccessInfo; brand: string; allowFirstAccess: boolean; compact?: boolean }) {
  const message = accessMessage(info, brand, allowFirstAccess);
  return (
    <div className="space-y-3">
      {info.emailed === true && (
        <Notice tone="green" icon={<MailCheck size={15} className="text-emerald-600" />}>
          E-mail de acesso enviado para <b>{info.email}</b>.
        </Notice>
      )}
      {info.emailed === false && (
        <Notice tone="amber" icon={<MailX size={15} className="text-amber-600" />}>
          O e-mail não foi enviado{info.emailError ? ` (${info.emailError})` : ""}. Mande os dados pelo WhatsApp ou copie a mensagem.
        </Notice>
      )}
      {info.warning && (
        <Notice tone="amber" icon={<AlertTriangle size={15} className="text-amber-600" />}>
          {info.warning}
        </Notice>
      )}
      {info.password && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3 ring-1 ring-inset ring-black/[0.04]">
          <KeyRound size={17} className="shrink-0 text-[#86868b]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#a1a1a6]">{info.emailed === undefined ? "Senha definida" : "Senha nova"}</p>
            <p className="select-all break-all font-mono text-[16px] font-semibold tracking-wide">{info.password}</p>
          </div>
          <CopyButton value={info.password} label="Copiar" />
        </div>
      )}
      {!compact && <Textarea readOnly value={message} aria-label="Mensagem de acesso" className="min-h-[170px] font-mono text-[12.5px]" />}
      <div className="flex flex-wrap gap-2">
        <CopyButton value={message} label="Copiar mensagem" />
        <a href={whatsappLink(info.phone || "", message)} target="_blank" rel="noopener noreferrer" className={waButton}>
          <MessageCircle size={13} />
          Enviar pelo WhatsApp
        </a>
      </div>
      {!info.phone && <p className="text-[11.5px] text-[#86868b]">Sem telefone no cadastro: o WhatsApp abre para você escolher o contato.</p>}
    </div>
  );
}

// ── Painel do membro ────────────────────────────────────────────────
function MemberPanel({
  member,
  products,
  productMap,
  brand,
  allowFirstAccess,
  mustChangeDefault,
  focus,
  ask,
  actions,
  dirtyRef,
  onRenamed,
  onDeleted,
}: {
  member: MemberSummary;
  products: Product[];
  productMap: Map<string, Product>;
  brand: string;
  allowFirstAccess: boolean;
  mustChangeDefault: boolean;
  focus: Focus;
  ask: Ask;
  actions: ReturnType<typeof useMemberActions>;
  dirtyRef: MutableRefObject<boolean>;
  onRenamed: (email: string) => void;
  onDeleted: () => void;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const situation = SITUATIONS[situationOf(member)];
  const owned = member.grants.map((g) => productMap.get(g.productId)).filter((p): p is Product => !!p);

  const collectionsRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<AccessInfo | null>(null);

  // Dados
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  useEffect(() => {
    setName(member.name);
    setEmail(member.email);
  }, [member.name, member.email]);
  const nextEmail = normalizeEmail(email);
  const nameDirty = member.hasAccount && name.trim() !== member.name;
  const emailDirty = nextEmail !== member.email;
  const dataDirty = nameDirty || emailDirty;

  // Coleções
  const grantIds = member.grants.map((g) => g.productId);
  const grantKey = [...grantIds].sort().join("|");
  const [coll, setColl] = useState<string[]>(grantIds);
  useEffect(() => setColl(grantKey ? grantKey.split("|") : []), [grantKey]);
  const collDirty = [...coll].sort().join("|") !== grantKey;
  const added = coll.filter((id) => !grantIds.includes(id) && productMap.has(id)).length;
  const removed = grantIds.filter((id) => !coll.includes(id) && productMap.has(id)).length;

  // Senha
  const [pwOpen, setPwOpen] = useState(focus === "senha" && member.hasAccount);
  const [pw, setPw] = useState(() => generatePassword());
  const [showPw, setShowPw] = useState(true);
  const [force, setForce] = useState(mustChangeDefault);

  useEffect(() => {
    dirtyRef.current = dataDirty || collDirty;
  });
  useEffect(
    () => () => {
      dirtyRef.current = false;
    },
    [dirtyRef],
  );

  useEffect(() => {
    const target = focus === "colecoes" ? collectionsRef.current : focus === "senha" ? accountRef.current : null;
    if (!target) return;
    const t = window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 380);
    return () => window.clearTimeout(t);
  }, [focus]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const saveData = async () => {
    if (!isValidEmail(nextEmail)) return void toast.error("Digite um e-mail válido.");
    if (
      emailDirty &&
      !(await ask({
        title: "Trocar o e-mail do membro?",
        text: `O login passa de ${member.email} para ${nextEmail}${member.grants.length ? ` e ${plural(member.grants.length, "coleção vai", "coleções vão")} junto` : ""}. Avise o membro sobre o novo e-mail de acesso.`,
        confirmLabel: "Trocar e-mail",
      }))
    )
      return;
    await act("data", () =>
      run(
        async () => {
          const final = await repo.updateMember(member.email, { name: member.hasAccount ? name.trim() : undefined, newEmail: emailDirty ? nextEmail : undefined });
          if (final && final !== member.email) onRenamed(final);
          return final;
        },
        { success: emailDirty ? "E-mail atualizado" : "Dados salvos", scopes: ["studio", "access"] },
      ),
    );
  };

  const saveCollections = () =>
    act("coll", () => run(() => repo.setMemberAccess(member.email, coll), { success: "Coleções atualizadas", scopes: ["studio", "access"] }));

  const savePassword = async () => {
    if (pw.length < 6) return void toast.error("A senha precisa ter pelo menos 6 caracteres.");
    await act("pw", async () => {
      const ok = await run(() => repo.setMemberPassword(member.email, pw, force).then(() => true), { success: "Senha atualizada", scopes: ["studio"] });
      if (ok) {
        setResult({ email: member.email, name: member.name, phone: member.phone, password: pw, mustChange: force, hasAccount: true });
        setPwOpen(false);
        setPw(generatePassword());
      }
    });
  };

  const needsAccount = "Disponível depois que o membro criar a conta.";

  return (
    <div className="space-y-8">
      {/* Resumo */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="relative shrink-0">
            <Avatar name={member.name} email={member.email} size={56} className="ring-black/10" />
            {member.blocked && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white ring-2 ring-white">
                <Lock size={11} strokeWidth={3} />
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={situation.tone}>{situation.label}</Badge>
              <Badge>{plural(owned.length, "coleção", "coleções")}</Badge>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <CopyButton value={member.email} label="Copiar e-mail" />
              {member.phone && (
                <a href={whatsappLink(member.phone, `Olá${member.name ? `, ${firstName(member.name)}` : ""}!`)} target="_blank" rel="noopener noreferrer" className={waButton}>
                  <MessageCircle size={13} />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-black/[0.06] ring-1 ring-black/[0.06]">
          <Fact label="Membro desde" value={new Date(member.createdAt).toLocaleDateString("pt-BR")} title={fullDate(member.createdAt)} />
          <Fact label="Último acesso" value={member.lastSeenAt ? relativeDate(member.lastSeenAt) : member.hasAccount ? "Ainda não entrou" : "Nunca"} title={fullDate(member.lastSeenAt)} />
        </dl>

        {member.blocked && (
          <Notice tone="red" icon={<Lock size={15} className="text-red-600" />}>
            <b>Bloqueado.</b> Não consegue entrar e o conteúdo fica escondido. As coleções continuam guardadas para quando você desbloquear.
          </Notice>
        )}
        {!member.hasAccount && (
          <Notice tone="amber" icon={<UserRound size={15} className="text-amber-600" />}>
            <b>Ainda não criou a conta.</b> {allowFirstAccess ? "Pode entrar por “Primeiro acesso” com este e-mail, ou" : "Você pode"} criar a conta agora em “Criar conta e enviar acesso”.
          </Notice>
        )}
        {member.hasAccount && !member.blocked && member.mustChangePassword && (
          <Notice tone="blue" icon={<KeyRound size={15} className="text-sky-600" />}>
            <b>Troca de senha pendente.</b> No próximo acesso, o membro cria uma senha só dele antes de ver o conteúdo.
          </Notice>
        )}
      </div>

      {/* Dados */}
      <PanelSection title="Dados" description="Nome e e-mail de login. Telefone e CPF vêm do checkout.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" hint={member.hasAccount ? undefined : "Salvo quando o membro criar a conta."}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do membro" disabled={!member.hasAccount} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" autoComplete="off" />
          </Field>
          <ReadOnlyField label="Telefone" value={member.phone ? formatPhone(member.phone) : ""} copy={member.phone ? digits(member.phone) : ""} />
          <ReadOnlyField label={digits(member.document).length === 14 ? "CNPJ" : "CPF"} value={formatDocument(member.document)} copy={digits(member.document)} />
        </div>
        <AnimatePresence initial={false}>
          {dataDirty && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-4">
                {emailDirty && isValidEmail(nextEmail) && (
                  <Notice tone="amber" icon={<Mail size={15} className="text-amber-600" />}>
                    O login passa a ser <b>{nextEmail}</b>
                    {member.grants.length ? ` e ${plural(member.grants.length, "coleção vai", "coleções vão")} junto` : ""}.
                  </Notice>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setName(member.name); setEmail(member.email); }}>
                    Desfazer
                  </Button>
                  <Button size="sm" onClick={() => void saveData()} loading={busy === "data"} disabled={!isValidEmail(nextEmail)}>
                    Salvar dados
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PanelSection>

      {/* Coleções */}
      <PanelSection
        innerRef={collectionsRef}
        title="Coleções"
        description="Marque o que este membro pode assistir."
        aside={<span className="text-[12px] font-semibold tabular-nums text-[#86868b]">{coll.filter((id) => productMap.has(id)).length} de {products.length}</span>}
      >
        {products.length ? (
          <CollectionPicker products={products} value={coll} onChange={setColl} columns="grid-cols-3 sm:grid-cols-4" />
        ) : (
          <p className="rounded-2xl bg-[#f5f5f7] py-6 text-center text-[13px] text-[#86868b]">Nenhuma coleção criada ainda.</p>
        )}
        <AnimatePresence initial={false}>
          {collDirty && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1d1d1f] py-2 pl-4 pr-2 text-white">
                <span className="text-[12.5px] font-medium">
                  {[added && `${added} para liberar`, removed && `${removed} para remover`].filter(Boolean).join(" · ") || "Alterações não salvas"}
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setColl(grantKey ? grantKey.split("|") : [])} className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white/70 hover:text-white">
                    Desfazer
                  </button>
                  <Button size="sm" variant="accent" loading={busy === "coll"} onClick={() => void saveCollections()}>
                    Salvar coleções
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PanelSection>

      {/* Conta */}
      <PanelSection innerRef={accountRef} title="Gerenciamento de conta" description="Senha, envio do acesso e bloqueio.">
        <div className="space-y-2.5">
          {result && (
            <div className="relative rounded-2xl p-4 ring-1 ring-black/[0.08]">
              <IconButton label="Fechar" className="absolute right-2 top-2" onClick={() => setResult(null)}>
                <X size={15} />
              </IconButton>
              <p className="mb-3 pr-8 text-[13px] font-bold">{result.emailed === undefined ? "Senha alterada" : "Acesso reenviado"}</p>
              <AccessResult info={result} brand={brand} allowFirstAccess={allowFirstAccess} compact />
            </div>
          )}

          <ActionRow
            icon={<Send size={16} />}
            title={member.hasAccount ? "Reenviar acesso por e-mail" : "Criar conta e enviar acesso"}
            text={member.grants.length ? "Gera uma senha nova e envia o e-mail de acesso com todas as coleções. A senha atual deixa de funcionar." : "Libere ao menos uma coleção para enviar o acesso."}
            action={
              <Button
                size="sm"
                variant="secondary"
                disabled={!member.grants.length}
                loading={busy === "resend"}
                onClick={() =>
                  void act("resend", async () => {
                    const info = await actions.resend(member);
                    if (info) setResult(info);
                  })
                }
              >
                {member.hasAccount ? "Reenviar" : "Criar e enviar"}
              </Button>
            }
          />

          <div className="rounded-2xl bg-[#f5f5f7]">
            <ActionRow
              plain
              icon={<KeyRound size={16} />}
              title="Definir nova senha"
              text={member.hasAccount ? "Você escolhe a senha e envia para o membro." : needsAccount}
              action={
                <Button size="sm" variant="secondary" disabled={!member.hasAccount} onClick={() => setPwOpen((v) => !v)} aria-expanded={pwOpen}>
                  {pwOpen ? "Cancelar" : "Definir senha"}
                </Button>
              }
            />
            <AnimatePresence initial={false}>
              {pwOpen && member.hasAccount && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-4 border-t border-black/[0.06] p-4">
                    <Field
                      label="Nova senha"
                      hint="Mínimo de 6 caracteres."
                      aside={
                        <button type="button" onClick={() => setPw(generatePassword())} className="flex items-center gap-1 text-[11px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
                          <RefreshCw size={11} /> Gerar outra
                        </button>
                      }
                    >
                      <div className="relative">
                        <Input value={pw} onChange={(e) => setPw(e.target.value)} type={showPw ? "text" : "password"} autoComplete="new-password" className="bg-white pr-11 font-mono" aria-label="Nova senha" />
                        <IconButton label={showPw ? "Esconder senha" : "Mostrar senha"} className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setShowPw((v) => !v)}>
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </IconButton>
                      </div>
                    </Field>
                    <Toggle checked={force} onChange={setForce} label="Pedir para trocar no próximo acesso" description="Ao entrar com esta senha, o membro cria uma senha só dele antes de ver o conteúdo." />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => void savePassword()} loading={busy === "pw"} disabled={pw.length < 6}>
                        Salvar senha
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ActionRow
            icon={<Mail size={16} />}
            title="Enviar link de redefinição"
            text={member.hasAccount ? "O membro recebe um e-mail com um link para criar uma senha nova." : needsAccount}
            action={
              <Button size="sm" variant="secondary" disabled={!member.hasAccount} loading={busy === "reset"} onClick={() => void act("reset", () => actions.sendReset(member))}>
                Enviar link
              </Button>
            }
          />

          <ActionRow
            icon={member.blocked ? <LockOpen size={16} /> : <Lock size={16} />}
            title={member.blocked ? "Desbloquear acesso" : "Bloquear acesso"}
            text={
              !member.hasAccount
                ? needsAccount
                : member.blocked
                  ? "O membro volta a entrar e vê de novo todas as coleções."
                  : "Impede o login e esconde o conteúdo. As coleções ficam guardadas e voltam ao desbloquear."
            }
            action={
              <Button
                size="sm"
                variant={member.blocked ? "secondary" : "danger"}
                disabled={!member.hasAccount}
                loading={busy === "block"}
                onClick={() => void act("block", () => actions.setBlocked(member, !member.blocked))}
              >
                {member.blocked ? "Desbloquear" : "Bloquear"}
              </Button>
            }
          />
        </div>
      </PanelSection>

      {/* Histórico */}
      <PanelSection title="Histórico" description="Últimas vendas e e-mails deste membro.">
        <MemberHistory email={member.email} productMap={productMap} />
      </PanelSection>

      {/* Excluir */}
      <div className="flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-inset ring-red-200/80 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-red-700">Excluir membro</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#86868b]">Remove a conta e todas as coleções. O acesso termina na hora e não dá para desfazer.</p>
        </div>
        <Button
          size="sm"
          variant="danger"
          icon={<Trash2 size={13} />}
          loading={busy === "delete"}
          onClick={() =>
            void act("delete", async () => {
              if (await actions.remove(member)) onDeleted();
            })
          }
        >
          Excluir
        </Button>
      </div>
    </div>
  );
}

function PanelSection({ title, description, aside, children, innerRef }: { title: string; description?: string; aside?: ReactNode; children: ReactNode; innerRef?: Ref<HTMLElement> }) {
  return (
    <section ref={innerRef} className="scroll-mt-2 border-t border-black/[0.06] pt-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-[12.5px] text-[#86868b]">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">{label}</dt>
      <dd className="mt-0.5 truncate text-[13.5px] font-semibold" title={title}>
        {value}
      </dd>
    </div>
  );
}

function ReadOnlyField({ label, value, copy }: { label: string; value: string; copy: string }) {
  return (
    <Field label={label}>
      <div className="flex h-11 items-center justify-between gap-2 rounded-xl bg-[#f5f5f7]/60 pl-3.5 pr-1.5 text-[14px] ring-1 ring-inset ring-black/[0.04]" aria-readonly="true">
        <span className={cn("truncate tabular-nums", !value && "text-[#a1a1a6]")}>{value || "Não informado"}</span>
        {copy && <CopyIcon value={copy} label={`Copiar ${label.toLowerCase()}`} />}
      </div>
    </Field>
  );
}

function ActionRow({ icon, title, text, action, plain }: { icon: ReactNode; title: string; text: string; action: ReactNode; plain?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", !plain && "rounded-2xl bg-[#f5f5f7]")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#1d1d1f] shadow-sm ring-1 ring-black/[0.05]">{icon}</span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#86868b]">{text}</p>
        </div>
      </div>
      <div className="shrink-0 pl-12 sm:pl-0">{action}</div>
    </div>
  );
}

// ── Histórico do membro ─────────────────────────────────────────────
function MemberHistory({ email, productMap }: { email: string; productMap: Map<string, Product> }) {
  const repo = useRepo();
  // A busca do servidor é parcial ("ana@" acha "joana@"): filtra pelo e-mail exato.
  const sales = useStudioQuery(`member-sales:${email}`, async () => (await repo.listWebhookLogs({ search: email, limit: 20 })).filter((l) => l.email.toLowerCase() === email).slice(0, 10));
  const mails = useStudioQuery(`member-emails:${email}`, async () => (await repo.listEmailLogs({ search: email, limit: 20 })).filter((l) => l.to.toLowerCase() === email).slice(0, 10));

  return (
    <div className="space-y-6">
      <HistoryBlock
        title="Vendas e reembolsos"
        icon={<ShoppingBag size={14} />}
        allHref={`${STUDIO}/registros?aba=webhook`}
        loading={sales.isLoading}
        error={sales.isError}
        onRetry={() => void sales.refetch()}
        empty="Nenhum aviso do checkout para este e-mail."
        count={sales.data?.length || 0}
      >
        {sales.data?.map((log) => <SaleItem key={log.id} log={log} productMap={productMap} />)}
      </HistoryBlock>
      <HistoryBlock
        title="E-mails"
        icon={<Mail size={14} />}
        allHref={`${STUDIO}/registros?aba=emails`}
        loading={mails.isLoading}
        error={mails.isError}
        onRetry={() => void mails.refetch()}
        empty="Nenhum e-mail enviado para este endereço."
        count={mails.data?.length || 0}
      >
        {mails.data?.map((log) => <EmailItem key={log.id} log={log} />)}
      </HistoryBlock>
    </div>
  );
}

function HistoryBlock({
  title,
  icon,
  allHref,
  loading,
  error,
  onRetry,
  empty,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  allHref: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  empty: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
          {icon}
          {title}
        </p>
        <Link to={allHref} className="flex items-center gap-1 text-[12px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
          Ver todos <ArrowUpRight size={13} />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Bone className="h-14 w-full rounded-xl" />
          <Bone className="h-14 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-[12.5px] text-red-800 ring-1 ring-inset ring-red-200/70">
          Não foi possível carregar.
          <Button size="sm" variant="secondary" onClick={onRetry} icon={<RefreshCw size={12} />}>
            Tentar de novo
          </Button>
        </div>
      ) : count === 0 ? (
        <p className="rounded-xl bg-[#f5f5f7] px-4 py-4 text-center text-[12.5px] text-[#86868b]">{empty}</p>
      ) : (
        <div className="-mx-2 divide-y divide-black/[0.05]">{children}</div>
      )}
    </div>
  );
}

const TONE_BG: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-sky-50 text-sky-600",
  neutral: "bg-black/[0.05] text-[#6e6e73]",
  dark: "bg-[#1d1d1f] text-white",
};

function SaleItem({ log, productMap }: { log: WebhookLog; productMap: Map<string, Product> }) {
  const status = SALE_STATUS[log.status] || { label: log.status || "Aviso", tone: "neutral" as Tone };
  const icon = log.status === "granted" ? <ShoppingBag size={14} /> : log.status === "revoked" ? <Undo2 size={14} /> : status.tone === "amber" || status.tone === "red" ? <AlertTriangle size={14} /> : <History size={14} />;
  const titles = log.items.length
    ? log.items.map((i) => i.title || i.id).join(", ")
    : log.productIds.map((id) => productMap.get(id)?.title).filter(Boolean).join(", ");
  const meta = [
    log.orderId && `Pedido ${log.orderId}`,
    log.paymentMethod && paymentLabel(log.paymentMethod),
    log.emailStatus === "sent" ? "E-mail enviado" : log.emailStatus === "failed" ? "E-mail falhou" : "",
    log.replayOf && "Reprocessado",
  ].filter(Boolean);
  return (
    <Link to={`${STUDIO}/registros?evento=${encodeURIComponent(log.id)}`} className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-black/[0.03]">
      <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", TONE_BG[status.tone])}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={status.tone}>{status.label}</Badge>
          {log.amount !== null && <span className="text-[12.5px] font-semibold tabular-nums">{money(log.amount)}</span>}
        </div>
        <p className="mt-1 truncate text-[13px] font-medium">{titles || log.message || "Sem produtos no aviso"}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-[#86868b]">
          <span title={fullDate(log.receivedAt)}>{relativeDate(log.receivedAt)}</span>
          {meta.length > 0 && ` · ${meta.join(" · ")}`}
        </p>
      </div>
      <ArrowUpRight size={15} className="mt-1 shrink-0 text-[#c7c7cc] transition-colors group-hover:text-[#1d1d1f]" aria-hidden />
    </Link>
  );
}

function EmailItem({ log }: { log: EmailLog }) {
  const sent = log.status === "sent";
  return (
    <Link to={`${STUDIO}/registros?aba=emails&email=${encodeURIComponent(log.id)}`} className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-black/[0.03]">
      <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", sent ? TONE_BG.green : TONE_BG.red)}>{sent ? <MailCheck size={14} /> : <MailX size={14} />}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[12px] font-semibold">{EMAIL_KINDS[log.kind] || log.kind}</span>
          <Badge tone={sent ? "green" : "red"}>{sent ? "Enviado" : "Falhou"}</Badge>
        </div>
        <p className="mt-1 truncate text-[13px] font-medium">{log.subject || "(sem assunto)"}</p>
        {!sent && log.error && (
          <p className="mt-0.5 truncate text-[11.5px] text-red-600" title={log.error}>
            {log.error}
          </p>
        )}
        <p className="mt-0.5 truncate text-[11.5px] text-[#86868b]">
          <span title={fullDate(log.createdAt)}>{relativeDate(log.createdAt)}</span>
          {log.provider && ` · ${providerLabel(log.provider)}`}
        </p>
      </div>
      <ArrowUpRight size={15} className="mt-1 shrink-0 text-[#c7c7cc] transition-colors group-hover:text-[#1d1d1f]" aria-hidden />
    </Link>
  );
}

// ── Modais ──────────────────────────────────────────────────────────
function AddMemberModal({
  open,
  products,
  members,
  onClose,
  onDone,
}: {
  open: boolean;
  products: Product[];
  members: MemberSummary[];
  onClose: () => void;
  onDone: (info: AccessInfo) => void;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setPassword("");
      setSelected([]);
    }
  }, [open]);

  const existing = members.find((m) => m.email === normalizeEmail(email));

  const submit = async () => {
    if (!isValidEmail(email)) return void toast.error("Digite um e-mail válido.");
    if (password && password.length < 6) return void toast.error("A senha precisa ter pelo menos 6 caracteres.");
    setBusy(true);
    const result = await run(() => repo.addMember({ email, name: name.trim(), password: password || undefined, productIds: selected }), { success: existing ? "Coleções somadas ao membro" : "Membro adicionado", scopes: ["studio", "access"] });
    setBusy(false);
    if (result)
      onDone({
        email: normalizeEmail(email),
        name: name.trim() || existing?.name || "",
        phone: existing?.phone,
        password: result.password,
        warning: result.warning,
        hasAccount: result.createdAccount || !!existing?.hasAccount,
      });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Adicionar membro"
      description="Crie o acesso manualmente — útil para vendas fora do checkout, parcerias e cortesias."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} loading={busy} icon={<UserPlus size={15} />}>
            {existing ? "Somar coleções" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="E-mail" hint={existing ? "Já é membro: as coleções escolhidas são somadas às que ele tem." : undefined}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" autoFocus />
          </Field>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" />
          </Field>
          <Field
            label="Senha"
            hint="Deixe em branco para gerar uma senha automática."
            className="md:col-span-2"
            aside={
              <button type="button" onClick={() => setPassword(generatePassword())} className="text-[11px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
                Gerar
              </button>
            }
          >
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Automática" autoComplete="new-password" />
          </Field>
        </div>
        <Field label={`Liberar coleções (${selected.length})`}>
          <CollectionPicker products={products} value={selected} onChange={setSelected} />
        </Field>
      </div>
    </Modal>
  );
}

const EMAIL_IN_TEXT = /[^\s@,;<>"'()[\]]+@[^\s@,;<>"'()[\]]+\.[^\s@,;<>"'()[\]]+/g;

function ImportModal({
  open,
  products,
  members,
  onClose,
  onSubmit,
}: {
  open: boolean;
  products: Product[];
  members: MemberSummary[];
  onClose: () => void;
  onSubmit: (emails: string[], productIds: string[], sendAccess: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sendAccess, setSendAccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setSelected([]);
      setSendAccess(false);
    }
  }, [open]);

  const parsed = useMemo(() => {
    const found = new Set<string>();
    let skipped = 0;
    text.split(/\r?\n/).forEach((line) => {
      if (!line.trim()) return;
      const matches = line.match(EMAIL_IN_TEXT)?.map(normalizeEmail).filter(isValidEmail) || [];
      if (!matches.length) skipped++;
      matches.forEach((e) => found.add(e));
    });
    return { emails: Array.from(found), skipped };
  }, [text]);

  const known = useMemo(() => new Map(members.map((m) => [m.email, m])), [members]);
  const existing = parsed.emails.filter((e) => known.has(e)).length;
  const withAccount = parsed.emails.filter((e) => known.get(e)?.hasAccount).length;

  const submit = () => {
    if (!parsed.emails.length) return void toast.error("Nenhum e-mail válido encontrado.");
    if (!selected.length) return void toast.error("Selecione ao menos uma coleção.");
    onSubmit(parsed.emails, selected, sendAccess);
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      setText(await file.text());
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Importar lista de membros"
      description="Migrando de outra plataforma? Cole a lista (ou envie o CSV) e libere o acesso de todos de uma vez."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} icon={<FileUp size={15} />} disabled={!parsed.emails.length || !selected.length}>
            Importar {parsed.emails.length || ""}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field
          label="E-mails (um por linha, pode colar direto de uma planilha)"
          aside={
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-[11px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">
              <Upload size={12} /> Enviar CSV
            </button>
          }
          hint={
            text.trim() ? (
              <>
                <b className="text-[#1d1d1f]">{plural(parsed.emails.length, "e-mail válido", "e-mails válidos")}</b>
                {existing > 0 && ` · ${existing} já ${existing === 1 ? "é membro e mantém" : "são membros e mantêm"} o que tem`}
                {parsed.skipped > 0 && ` · ${plural(parsed.skipped, "linha sem e-mail ignorada", "linhas sem e-mail ignoradas")}`}
              </>
            ) : (
              "O e-mail pode estar em qualquer coluna; o resto da linha é ignorado."
            )
          }
        >
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[160px] font-mono text-[13px]" placeholder={"ana@email.com\nlucas@email.com"} />
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void readFile(e.target.files?.[0] || undefined)} />
        </Field>
        <div className="rounded-2xl bg-[#f5f5f7] p-4">
          <Toggle
            checked={sendAccess}
            onChange={setSendAccess}
            label="Enviar o e-mail de acesso agora"
            description={`Cria a conta com uma senha nova e envia o e-mail para cada pessoa.${withAccount ? ` Quem já tem conta (${withAccount}) só ganha as coleções, sem trocar a senha.` : ""} Desligado, cada um cria a senha em “Primeiro acesso”.`}
          />
        </div>
        <Field label={`Coleções liberadas para todos (${selected.length})`}>
          <CollectionPicker products={products} value={selected} onChange={setSelected} />
        </Field>
      </div>
    </Modal>
  );
}

function CredentialsModal({ info, brand, allowFirstAccess, onClose }: { info: AccessInfo | null; brand: string; allowFirstAccess: boolean; onClose: () => void }) {
  return (
    <Modal
      open={!!info}
      onClose={onClose}
      size="sm"
      title={info?.password ? "Acesso pronto" : "Mensagem de acesso"}
      description={info ? `Dados de acesso de ${info.email}` : undefined}
      footer={<Button onClick={onClose}>Concluir</Button>}
    >
      {info && <AccessResult info={info} brand={brand} allowFirstAccess={allowFirstAccess} />}
    </Modal>
  );
}

function BulkCollectionsModal({
  mode,
  members,
  products,
  onClose,
  onConfirm,
}: {
  mode: "grant" | "revoke" | null;
  members: MemberSummary[];
  products: Product[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (mode) setIds([]);
  }, [mode]);
  const revoke = mode === "revoke";
  // Para remover, só aparecem as coleções que algum selecionado tem.
  const options = revoke ? products.filter((p) => members.some((m) => m.grants.some((g) => g.productId === p.id))) : products;
  const affected = revoke ? members.filter((m) => m.grants.some((g) => ids.includes(g.productId))).length : members.length;
  return (
    <Modal
      open={!!mode}
      onClose={onClose}
      size="lg"
      title={revoke ? "Remover coleções" : "Liberar coleções"}
      description={
        revoke
          ? `Só as coleções marcadas saem; o resto continua liberado. ${plural(members.length, "membro selecionado", "membros selecionados")}.`
          : `As coleções marcadas são somadas às que cada um já tem. ${plural(members.length, "membro selecionado", "membros selecionados")}.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={revoke ? "accent" : "primary"} disabled={!ids.length || !affected} onClick={() => onConfirm(ids)}>
            {revoke ? `Remover de ${plural(affected, "membro", "membros")}` : `Liberar para ${plural(affected, "membro", "membros")}`}
          </Button>
        </>
      }
    >
      {options.length ? (
        <CollectionPicker products={options} value={ids} onChange={setIds} />
      ) : (
        <p className="py-8 text-center text-[13px] text-[#86868b]">{revoke ? "Nenhum dos selecionados tem coleções liberadas." : "Nenhuma coleção criada ainda."}</p>
      )}
    </Modal>
  );
}

function BulkJobModal({ job, brand, allowFirstAccess, onClose }: { job: BulkJob | null; brand: string; allowFirstAccess: boolean; onClose: () => void }) {
  const outcomes = job?.outcomes || [];
  const failed = outcomes.filter((o) => !o.ok);
  const okCount = outcomes.length - failed.length;
  const access = outcomes.filter((o) => o.ok && o.access).sort((a, b) => Number(a.access?.emailed) - Number(b.access?.emailed));
  const notEmailed = access.filter((o) => !o.access?.emailed).length;
  const pct = job?.total ? Math.round((job.done / job.total) * 100) : 100;
  const passwordsCsv = access.map((o) => `${o.email};${o.access?.password}`).join("\n");

  return (
    <Modal
      open={!!job?.showing}
      onClose={() => {
        if (!job?.running) onClose();
      }}
      size={access.length ? "lg" : "md"}
      title={job?.running ? job.title : "Pronto"}
      description={job?.running ? `${job.done} de ${job.total}. Não feche esta página.` : job ? `${job.title}: ${plural(okCount, "deu certo", "deram certo")}${failed.length ? `, ${plural(failed.length, "com erro", "com erro")}` : ""}.` : undefined}
      footer={
        job?.running ? (
          <Button loading disabled>
            Processando
          </Button>
        ) : (
          <>
            {access.length > 0 && <CopyButton value={passwordsCsv} label="Copiar e-mails e senhas" />}
            <Button onClick={onClose}>Concluir</Button>
          </>
        )
      }
    >
      {job && (
        <div className="space-y-5">
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.07]">
              <motion.div className={cn("h-full rounded-full", failed.length ? "bg-amber-500" : "bg-[#1d1d1f]")} animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="green">
                <CircleCheck size={11} /> {plural(okCount, "deu certo", "deram certo")}
              </Badge>
              {failed.length > 0 && (
                <Badge tone="red">
                  <AlertTriangle size={11} /> {plural(failed.length, "erro", "erros")}
                </Badge>
              )}
              {job.skipped.length > 0 && <Badge>{plural(job.skipped.length, "ficou de fora", "ficaram de fora")}</Badge>}
              {notEmailed > 0 && !job.running && <Badge tone="amber">{plural(notEmailed, "e-mail não enviado", "e-mails não enviados")}</Badge>}
            </div>
          </div>

          {failed.length > 0 && (
            <ResultList title="Com erro">
              {failed.map((o) => (
                <li key={o.email} className="py-2.5">
                  <p className="truncate text-[13px] font-semibold">{o.email}</p>
                  <p className="text-[12px] text-red-600">{o.error}</p>
                </li>
              ))}
            </ResultList>
          )}

          {job.skipped.length > 0 && (
            <ResultList title="Ficaram de fora">
              {job.skipped.map((s) => (
                <li key={s.email} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="min-w-0 truncate text-[13px] font-semibold">{s.email}</p>
                  <span className="shrink-0 text-[12px] text-[#86868b]">{s.reason}</span>
                </li>
              ))}
            </ResultList>
          )}

          {access.length > 0 && (
            <ResultList title="Senhas novas" hint={notEmailed ? "Envie pelo WhatsApp para quem não recebeu o e-mail." : undefined}>
              {access.map((o) => {
                const message = accessMessage({ email: o.email, name: o.name, password: o.access?.password, mustChange: job.mustChange, hasAccount: true }, brand, allowFirstAccess);
                return (
                  <li key={o.email} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{o.name || o.email}</p>
                      {o.name && <p className="truncate text-[12px] text-[#86868b]">{o.email}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={o.access?.emailed ? "green" : "amber"}>{o.access?.emailed ? "E-mail enviado" : "Não enviado"}</Badge>
                      <code className="rounded-lg bg-[#f5f5f7] px-2 py-1 font-mono text-[12.5px] font-semibold">{o.access?.password}</code>
                      <CopyIcon value={o.access?.password || ""} label={`Copiar senha de ${o.email}`} />
                      <a
                        href={whatsappLink(o.phone, message)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Enviar acesso de ${o.email} pelo WhatsApp`}
                        title="Enviar pelo WhatsApp"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#25d366] text-white transition hover:brightness-105"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ResultList>
          )}
        </div>
      )}
    </Modal>
  );
}

function ResultList({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">{title}</p>
      {hint && <p className="mt-1 text-[12px] text-[#86868b]">{hint}</p>}
      <ul className="mt-1 max-h-72 divide-y divide-black/[0.05] overflow-y-auto">{children}</ul>
    </div>
  );
}
