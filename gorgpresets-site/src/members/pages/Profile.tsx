import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, useRepo, useRefreshPortal } from "../context/MembersContext";
import { Avatar, Btn, DarkField, darkInput } from "../components/ui";

export default function Profile() {
  const { user } = useAuth();
  const repo = useRepo();
  const refresh = useRefreshPortal();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const recovering = params.has("nova-senha");
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState<"name" | "password" | null>(null);

  useEffect(() => setName(user?.name || ""), [user?.name]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving("name");
    try {
      await repo.updateName(name.trim());
      await refresh("auth");
      toast.success("Nome atualizado");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    setSaving("password");
    try {
      await repo.updatePassword(password);
      setPassword("");
      setConfirm("");
      toast.success("Senha alterada com sucesso");
      if (recovering) navigate("/membros", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="ma-gutter mx-auto max-w-3xl pb-28 pt-28 md:pb-20 md:pt-36">
      <div className="flex items-center gap-5">
        <Avatar name={user?.name || ""} email={user?.email} size={76} />
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold uppercase tracking-tighter md:text-4xl">{user?.name || "Meu perfil"}</h1>
          <p className="mt-1 truncate text-white/50">{user?.email}</p>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <form onSubmit={saveName} className="rounded-[1.75rem] bg-white/[0.03] p-6 ring-1 ring-white/[0.07] md:p-8">
          <h2 className="text-lg font-bold tracking-tight">Dados pessoais</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <DarkField label="Nome">
              <input value={name} onChange={(e) => setName(e.target.value)} className={darkInput} placeholder="Como quer ser chamado(a)?" />
            </DarkField>
            <DarkField label="E-mail" hint="É o e-mail usado na compra.">
              <input value={user?.email || ""} disabled className={cn(darkInput, "opacity-60")} />
            </DarkField>
          </div>
          <Btn type="submit" className="mt-6" loading={saving === "name"} icon={<Save size={15} />}>Salvar</Btn>
        </form>

        <form
          onSubmit={savePassword}
          className={cn("rounded-[1.75rem] bg-white/[0.03] p-6 ring-1 md:p-8", recovering ? "ring-ma/60" : "ring-white/[0.07]")}
        >
          <h2 className="text-lg font-bold tracking-tight">{recovering ? "Crie sua nova senha" : "Alterar senha"}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <DarkField label="Nova senha">
              <input type="password" autoComplete="new-password" autoFocus={recovering} value={password} onChange={(e) => setPassword(e.target.value)} className={darkInput} placeholder="Mínimo 6 caracteres" />
            </DarkField>
            <DarkField label="Confirmar senha">
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={darkInput} />
            </DarkField>
          </div>
          <Btn type="submit" className="mt-6" variant={recovering ? "accent" : "white"} loading={saving === "password"} icon={<KeyRound size={15} />}>
            Atualizar senha
          </Btn>
        </form>

        <button
          onClick={async () => {
            await repo.signOut();
            navigate("/membros/entrar", { replace: true });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-[1.75rem] py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 ring-1 ring-white/[0.07] transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <LogOut size={15} className="text-ma" /> Sair da conta
        </button>
      </div>
    </div>
  );
}
