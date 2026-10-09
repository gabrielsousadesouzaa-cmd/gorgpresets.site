import { useEffect, useMemo, useState } from "react";
import { Check, FileUp, KeyRound, MessageCircle, MoreHorizontal, Search, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { generatePassword, isValidEmail, normalizeEmail, relativeDate, sortByOrder } from "../../lib/format";
import type { MemberSummary, Product } from "../../lib/types";
import { PosterArt } from "../../components/PosterArt";
import { Avatar } from "../../components/ui";
import { Badge, Button, Card, CopyButton, EmptyState, Field, Input, Modal, PageHeader, Textarea, useConfirm } from "../ui";
import { useMembersList, useStudioAction } from "../hooks";

type Filter = "todos" | "ativos" | "pendentes";

export default function MembersPage() {
  const { data: members, isLoading } = useMembersList();
  const { catalog } = useCatalog();
  const repo = useRepo();
  const run = useStudioAction();
  const confirm = useConfirm();
  const products = sortByOrder(catalog.products);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [access, setAccess] = useState<MemberSummary | null>(null);
  const [password, setPassword] = useState<MemberSummary | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password?: string; name: string; warning?: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members || []).filter((m) => {
      if (filter === "ativos" && !m.hasAccount) return false;
      if (filter === "pendentes" && m.hasAccount) return false;
      return !q || m.email.includes(q) || m.name.toLowerCase().includes(q);
    });
  }, [members, query, filter]);

  const remove = async (m: MemberSummary) => {
    const ok = await confirm({
      title: `Remover ${m.name || m.email}?`,
      text: "Todos os acessos serão revogados e a conta será excluída. O membro perde acesso imediatamente.",
      confirmLabel: "Remover membro",
      danger: true,
    });
    if (ok) await run(() => repo.removeMember(m.email), { success: "Membro removido", scopes: ["studio"] });
  };

  const counts = {
    todos: members?.length || 0,
    ativos: members?.filter((m) => m.hasAccount).length || 0,
    pendentes: members?.filter((m) => !m.hasAccount).length || 0,
  };

  return (
    <div>
      <PageHeader
        title="Membros"
        subtitle="Quem tem acesso à sua área. Compras aprovadas pelo webhook aparecem aqui automaticamente."
        actions={
          <>
            <Button variant="secondary" icon={<FileUp size={15} />} onClick={() => setImporting(true)}>Importar lista</Button>
            <Button icon={<UserPlus size={16} />} onClick={() => setAdding(true)}>Adicionar membro</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex rounded-full bg-black/[0.05] p-1">
          {(["todos", "ativos", "pendentes"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-4 py-1.5 text-[12px] font-semibold transition", filter === f ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]")}>
              {{ todos: "Todos", ativos: "Conta ativa", pendentes: "Aguardando 1º acesso" }[f]} <span className="ml-1 text-[#a1a1a6]">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1a6]" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail" className="bg-white pl-10" />
        </div>
      </div>

      {!isLoading && !members?.length ? (
        <EmptyState
          icon={<Users />}
          title="Nenhum membro ainda"
          text="Adicione manualmente, importe uma lista ou conecte o checkout para liberar o acesso a cada venda."
          action={<Button icon={<UserPlus size={16} />} onClick={() => setAdding(true)}>Adicionar membro</Button>}
        />
      ) : (
        <Card padded={false} className="overflow-visible">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_140px_120px_44px] gap-4 border-b border-black/[0.05] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a6] md:grid">
            <span>Membro</span>
            <span>Coleções</span>
            <span>Status</span>
            <span>Último acesso</span>
            <span />
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {list.map((m) => {
              const owned = m.grants.map((g) => products.find((p) => p.id === g.productId)).filter(Boolean) as Product[];
              return (
                <li key={m.email} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_140px_120px_44px] md:gap-4 md:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} email={m.email} size={38} className="ring-black/10" />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{m.name || m.email.split("@")[0]}</p>
                      <p className="truncate text-[12px] text-[#86868b]">{m.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setAccess(m)} className="hidden min-w-0 items-center gap-2 text-left md:flex" title="Gerenciar acessos">
                    <div className="flex -space-x-2">
                      {owned.slice(0, 4).map((p) => (
                        <span key={p.id} className="relative block aspect-[2/3] w-7 overflow-hidden rounded-md ring-2 ring-white">
                          <PosterArt product={p} />
                        </span>
                      ))}
                    </div>
                    <span className="truncate text-[12px] text-[#6e6e73]">{owned.length ? `${owned.length} ${owned.length === 1 ? "coleção" : "coleções"}` : "Sem acesso"}</span>
                  </button>
                  <div className="hidden md:block">{m.hasAccount ? <Badge tone="green">Conta ativa</Badge> : <Badge tone="amber">1º acesso pendente</Badge>}</div>
                  <p className="hidden text-[12px] text-[#86868b] md:block">{relativeDate(m.lastSeenAt)}</p>
                  <div className="relative justify-self-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenu(menu === m.email ? null : m.email);
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full text-[#6e6e73] hover:bg-black/5 hover:text-[#1d1d1f]"
                      aria-label="Ações"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    <AnimatePresence>
                      {menu === m.email && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-10 z-30 w-56 origin-top-right rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MenuItem icon={<ShieldCheck size={15} />} onClick={() => { setMenu(null); setAccess(m); }}>Gerenciar acessos</MenuItem>
                          {m.hasAccount && <MenuItem icon={<KeyRound size={15} />} onClick={() => { setMenu(null); setPassword(m); }}>Definir nova senha</MenuItem>}
                          <MenuItem icon={<MessageCircle size={15} />} onClick={() => { setMenu(null); setCredentials({ email: m.email, name: m.name }); }}>Mensagem de acesso</MenuItem>
                          <div className="my-1 h-px bg-black/[0.06]" />
                          <MenuItem icon={<Trash2 size={15} />} danger onClick={() => { setMenu(null); void remove(m); }}>Remover membro</MenuItem>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </li>
              );
            })}
            {list.length === 0 && <li className="px-5 py-12 text-center text-sm text-[#86868b]">Nenhum membro encontrado.</li>}
          </ul>
        </Card>
      )}

      <AddMemberModal
        open={adding}
        products={products}
        onClose={() => setAdding(false)}
        onDone={(result) => {
          setAdding(false);
          setCredentials(result);
        }}
      />
      <ImportModal open={importing} products={products} onClose={() => setImporting(false)} />
      <AccessModal member={access} products={products} onClose={() => setAccess(null)} />
      <PasswordModal member={password} onClose={() => setPassword(null)} onDone={(pw) => password && setCredentials({ email: password.email, name: password.name, password: pw })} />
      <CredentialsModal data={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors", danger ? "text-red-600 hover:bg-red-50" : "text-[#1d1d1f] hover:bg-black/[0.04]")}>
      <span className={danger ? "" : "text-[#86868b]"}>{icon}</span>
      {children}
    </button>
  );
}

function ProductPicker({ products, selected, onChange }: { products: Product[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div>
      <div className="mb-2 flex justify-end gap-3 text-[12px] font-semibold">
        <button type="button" onClick={() => onChange(products.map((p) => p.id))} className="text-[#6e6e73] hover:text-[#1d1d1f]">Selecionar todas</button>
        <button type="button" onClick={() => onChange([])} className="text-[#6e6e73] hover:text-[#1d1d1f]">Limpar</button>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {products.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button key={p.id} type="button" onClick={() => toggle(p.id)} className="text-left">
              <span className={cn("relative block aspect-[2/3] overflow-hidden rounded-xl ring-2 transition", on ? "ring-ma" : "ring-transparent opacity-60 hover:opacity-100")}>
                <PosterArt product={p} />
                {on && (
                  <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ma text-white shadow">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="mt-1.5 block truncate text-[11px] font-semibold">{p.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddMemberModal({ open, products, onClose, onDone }: { open: boolean; products: Product[]; onClose: () => void; onDone: (r: { email: string; name: string; password?: string; warning?: string }) => void }) {
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

  const submit = async () => {
    if (!isValidEmail(email)) return toast.error("Digite um e-mail válido.");
    if (password && password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    setBusy(true);
    const result = await run(() => repo.addMember({ email, name: name.trim(), password: password || undefined, productIds: selected }), { success: "Membro adicionado", scopes: ["studio"] });
    setBusy(false);
    if (result) onDone({ email: normalizeEmail(email), name: name.trim(), password: result.password, warning: result.warning });
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
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={busy} icon={<UserPlus size={15} />}>Adicionar</Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" autoFocus />
          </Field>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" />
          </Field>
          <Field
            label="Senha"
            hint="Deixe em branco para gerar uma senha automática."
            className="md:col-span-2"
            aside={<button type="button" onClick={() => setPassword(generatePassword())} className="text-[11px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f]">Gerar</button>}
          >
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Automática" />
          </Field>
        </div>
        <Field label={`Liberar coleções (${selected.length})`}>
          <ProductPicker products={products} selected={selected} onChange={setSelected} />
        </Field>
      </div>
    </Modal>
  );
}

function AccessModal({ member, products, onClose }: { member: MemberSummary | null; products: Product[]; onClose: () => void }) {
  const repo = useRepo();
  const run = useStudioAction();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (member) setSelected(member.grants.map((g) => g.productId));
  }, [member]);
  return (
    <Modal
      open={!!member}
      onClose={onClose}
      size="lg"
      title="Gerenciar acessos"
      description={member?.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={busy}
            onClick={async () => {
              if (!member) return;
              setBusy(true);
              await run(() => repo.setMemberAccess(member.email, selected), { success: "Acessos atualizados", scopes: ["studio", "access"] });
              setBusy(false);
              onClose();
            }}
          >
            Salvar acessos
          </Button>
        </>
      }
    >
      <ProductPicker products={products} selected={selected} onChange={setSelected} />
    </Modal>
  );
}

function PasswordModal({ member, onClose, onDone }: { member: MemberSummary | null; onClose: () => void; onDone: (password: string) => void }) {
  const repo = useRepo();
  const run = useStudioAction();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (member) setValue(generatePassword());
  }, [member]);
  return (
    <Modal
      open={!!member}
      onClose={onClose}
      size="sm"
      title="Definir nova senha"
      description={member?.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={busy}
            disabled={value.length < 6}
            onClick={async () => {
              if (!member) return;
              setBusy(true);
              const ok = await run(() => repo.setMemberPassword(member.email, value).then(() => true), { success: "Senha atualizada", scopes: ["studio"] });
              setBusy(false);
              if (ok) {
                onClose();
                onDone(value);
              }
            }}
          >
            Salvar senha
          </Button>
        </>
      }
    >
      <Field label="Nova senha" hint="Mínimo de 6 caracteres. Depois envie para o membro.">
        <Input value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
    </Modal>
  );
}

function CredentialsModal({ data, onClose }: { data: { email: string; name: string; password?: string; warning?: string } | null; onClose: () => void }) {
  const portal = `${window.location.origin}/membros`;
  const message = data
    ? [
        `Olá${data.name ? `, ${data.name.split(" ")[0]}` : ""}! 💫`,
        "Seu acesso à Área de Membros Gorg está liberado.",
        "",
        `🔗 ${portal}`,
        `📧 E-mail: ${data.email}`,
        data.password ? `🔑 Senha: ${data.password}` : "🔑 No primeiro acesso, clique em “Primeiro acesso” e crie sua senha.",
      ].join("\n")
    : "";
  return (
    <Modal open={!!data} onClose={onClose} size="sm" title="Acesso pronto ✨" description="Envie estes dados para o membro." footer={<Button onClick={onClose}>Concluir</Button>}>
      {data && (
        <div className="space-y-4">
          {data.warning && <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800 ring-1 ring-amber-200">{data.warning}</p>}
          <Textarea readOnly value={message} className="min-h-[170px] font-mono text-[12.5px]" />
          <div className="flex flex-wrap gap-2">
            <CopyButton value={message} label="Copiar mensagem" />
            <Button size="sm" variant="secondary" icon={<MessageCircle size={13} />} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")}>
              Enviar no WhatsApp
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ImportModal({ open, products, onClose }: { open: boolean; products: Product[]; onClose: () => void }) {
  const repo = useRepo();
  const run = useStudioAction();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (open) {
      setText("");
      setSelected([]);
      setDone(0);
    }
  }, [open]);

  const rows = text
    .split(/\n/)
    .map((line) => line.split(/[;,\t]/).map((s) => s.trim()))
    .filter(([email]) => email && isValidEmail(email));

  const submit = async () => {
    if (!rows.length) return toast.error("Nenhum e-mail válido encontrado.");
    if (!selected.length) return toast.error("Selecione ao menos uma coleção.");
    setBusy(true);
    let count = 0;
    await run(async () => {
      for (const [email] of rows) {
        await repo.grantAccess(email, selected);
        count++;
        setDone(count);
      }
    }, { success: `${rows.length} membros importados`, scopes: ["studio"] });
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Importar lista de membros"
      description="Migrando de outra plataforma? Cole a lista e libere o acesso de todos de uma vez. Cada pessoa cria a senha em “Primeiro acesso”."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={busy} icon={<FileUp size={15} />}>{busy ? `${done}/${rows.length}` : `Importar ${rows.length || ""}`}</Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="Um e-mail por linha (pode colar direto de uma planilha)" hint={`${rows.length} e-mails válidos encontrados. Quem já é membro mantém as coleções que tem.`}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[160px] font-mono text-[13px]" placeholder={"ana@email.com\nlucas@email.com"} />
        </Field>
        <Field label={`Coleções liberadas para todos (${selected.length})`}>
          <ProductPicker products={products} selected={selected} onChange={setSelected} />
        </Field>
      </div>
    </Modal>
  );
}
