import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, MailCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, useRepo, useSettings } from "../context/MembersContext";
import { DEFAULT_SETTINGS } from "../lib/defaults";
import { isValidEmail } from "../lib/format";
import { DEMO_ADMIN_EMAIL, DEMO_MEMBER_EMAIL } from "../lib/localRepo";
import { Btn, darkInput, SafeImg } from "../components/ui";

type View = "login" | "first" | "forgot" | "sent";

export default function Login() {
  const repo = useRepo();
  const { user, loading } = useAuth();
  const { data } = useSettings();
  const settings = data || DEFAULT_SETTINGS;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Só volta para páginas da própria área (evita redirecionar para outro site).
  const nextParam = params.get("next") || "";
  const next = nextParam.startsWith("/membros") && !nextParam.startsWith("//") ? nextParam : "/membros";

  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user) return <Navigate to={next} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) return setError("Digite um e-mail válido.");
    setBusy(true);
    try {
      if (view === "login") {
        if (!password) throw new Error("Digite sua senha.");
        await repo.signIn(email, password);
        navigate(next, { replace: true });
      } else if (view === "first") {
        if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        await repo.firstAccess(email, password, name.trim());
        toast.success("Conta criada! Bem-vindo(a) 🎉");
        navigate("/membros", { replace: true });
      } else if (view === "forgot") {
        await repo.requestPasswordReset(email);
        setView("sent");
      }
    } catch (err) {
      setError((err as Error).message || "Algo deu errado. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<View, { title: string; text: string; cta: string }> = {
    login: { title: settings.login.headline, text: settings.login.subheadline, cta: "Entrar" },
    first: { title: "Primeiro acesso", text: "Use o mesmo e-mail da sua compra e crie uma senha para entrar.", cta: "Criar minha senha" },
    forgot: { title: "Esqueceu a senha?", text: "Enviaremos um link para você criar uma nova senha.", cta: "Enviar link" },
    sent: { title: "Confira seu e-mail", text: `Se existir uma conta para ${email}, você receberá o link em instantes. Olhe também o spam.`, cta: "" },
  };
  const copy = titles[view];

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-black">
      {/* Fundo */}
      <div className="absolute inset-0">
        {settings.login.backgroundUrl ? (
          <>
            <SafeImg src={settings.login.backgroundUrl} alt="" loading="eager" className="ma-kenburns h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />
          </>
        ) : (
          <>
            <div className="absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-ma opacity-30 blur-[160px]" />
            <div className="absolute -bottom-60 -left-40 h-[520px] w-[520px] rounded-full bg-white opacity-[0.06] blur-[140px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
          </>
        )}
      </div>

      <header className="ma-gutter relative z-10 flex h-20 items-center md:h-24">
        <SafeImg src={settings.logoUrl} alt={settings.brandName} loading="eager" className="h-8 w-auto md:h-10" />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="ma-glass w-full max-w-[440px] rounded-[2rem] p-7 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10 md:p-10"
        >
          {settings.login.allowFirstAccess && (view === "login" || view === "first") && (
            <div className="mb-8 grid grid-cols-2 rounded-full bg-white/[0.06] p-1 ring-1 ring-inset ring-white/10">
              {(["login", "first"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setView(v);
                    setError("");
                  }}
                  className="relative rounded-full py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors"
                >
                  {view === v && <motion.span layoutId="ma-login-tab" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
                  <span className={cn("relative", view === v ? "text-black" : "text-white/60")}>{v === "login" ? "Entrar" : "Primeiro acesso"}</span>
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              {(view === "forgot" || view === "sent") && (
                <button type="button" onClick={() => setView("login")} className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-white/55 transition-colors hover:text-white">
                  <ArrowLeft size={15} /> Voltar
                </button>
              )}
              {view === "sent" && (
                <span className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <MailCheck />
                </span>
              )}
              <h1 className="text-[1.7rem] font-semibold uppercase leading-[1.02] tracking-[-0.03em] [text-wrap:balance] md:text-[2rem]">{copy.title}</h1>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{copy.text}</p>

              {view !== "sent" && (
                <form onSubmit={submit} className="mt-8 space-y-3">
                  {view === "first" && (
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" className={darkInput} />
                  )}
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={view === "first" ? "E-mail usado na compra" : "E-mail"}
                    className={darkInput}
                    autoFocus
                  />
                  {view !== "forgot" && (
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete={view === "first" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={view === "first" ? "Crie uma senha (mín. 6 caracteres)" : "Senha"}
                        className={cn(darkInput, "pr-12")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-white/45 transition-colors hover:text-white"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  )}

                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-xl bg-ma/15 px-4 py-3 text-[13px] text-red-200 ring-1 ring-ma/30">
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Btn type="submit" size="lg" className="mt-3 w-full" loading={busy} icon={!busy ? <ArrowRight size={16} /> : undefined}>
                    {copy.cta}
                  </Btn>
                </form>
              )}

              {view === "login" && (
                <button type="button" onClick={() => setView("forgot")} className="mt-6 block w-full text-center text-[13px] text-white/55 transition-colors hover:text-white">
                  Esqueci minha senha
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {repo.mode === "demo" && view === "login" && (
            <div className="mt-8 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.08]">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ma">
                <Sparkles size={12} /> Modo demonstração
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">Qualquer senha funciona. Escolha um perfil:</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Membro", email: DEMO_MEMBER_EMAIL },
                  { label: "Produtor", email: DEMO_ADMIN_EMAIL },
                ].map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => {
                      setEmail(p.email);
                      setPassword("demo");
                    }}
                    className="rounded-xl bg-white/[0.06] px-3 py-2.5 text-left ring-1 ring-white/10 transition-colors hover:bg-white/10"
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-white">{p.label}</span>
                    <span className="block truncate text-[11px] text-white/45">{p.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-[11px] text-white/35">{settings.footerText}</footer>
    </div>
  );
}
