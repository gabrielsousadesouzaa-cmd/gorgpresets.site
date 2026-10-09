import { lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Database, LogOut, PlayCircle, ShieldCheck } from "lucide-react";
import "./members.css";
import { enableDemoMode, MembersProvider, useAuth, useCatalog, useRepo, useSettings } from "./context/MembersContext";
import { SetupRequiredError } from "./lib/repo";
import { BRAND_RED } from "./lib/defaults";
import { hexToRgbTriplet } from "./lib/format";
import { MembersHeader, MobileTabBar } from "./components/MembersHeader";
import { SearchOverlay } from "./components/SearchOverlay";
import { Btn, darkInput, FullScreenLoader, SafeImg } from "./components/ui";
import Login from "./pages/Login";
import Home from "./pages/Home";

const ProductPage = lazy(() => import("./pages/Product"));
const LessonPage = lazy(() => import("./pages/Lesson"));
const Library = lazy(() => import("./pages/Library"));
const Support = lazy(() => import("./pages/Support"));
const Profile = lazy(() => import("./pages/Profile"));
const StudioApp = lazy(() => import("./studio/StudioApp"));

export default function MembersApp() {
  return (
    <MembersProvider>
      <Themed>
        <Routes>
          <Route path="entrar" element={<Login />} />
          <Route element={<RequireMember />}>
            <Route
              path="studio/*"
              element={
                <RequireProducer>
                  <Suspense fallback={<FullScreenLoader />}>
                    <StudioApp />
                  </Suspense>
                </RequireProducer>
              }
            />
            <Route element={<MemberShell />}>
              <Route index element={<Home />} />
              <Route path="minha-colecao" element={<Library />} />
              <Route path="colecao/:slug" element={<ProductPage />} />
              <Route path="colecao/:slug/aula/:lessonId" element={<LessonPage />} />
              <Route path="suporte" element={<Support />} />
              <Route path="perfil" element={<Profile />} />
              <Route path="*" element={<Navigate to="/membros" replace />} />
            </Route>
          </Route>
        </Routes>
      </Themed>
    </MembersProvider>
  );
}

/** Aplica a cor de destaque escolhida no Studio e o fundo preto da área. */
function Themed({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings();
  useEffect(() => {
    const previous = { bg: document.body.style.backgroundColor, title: document.title };
    document.body.style.backgroundColor = "#000";
    const meta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = meta?.getAttribute("content");
    meta?.setAttribute("content", "#000000");
    return () => {
      document.body.style.backgroundColor = previous.bg;
      document.title = previous.title;
      if (previousTheme) meta?.setAttribute("content", previousTheme);
    };
  }, []);
  useEffect(() => {
    document.title = `Área de Membros | ${settings?.brandName || "Gorg Presets"}`;
  }, [settings?.brandName]);

  const accent = hexToRgbTriplet(settings?.accentColor || BRAND_RED);
  // Também no <html>, para modais e menus renderizados fora deste wrapper (portais).
  useEffect(() => {
    document.documentElement.style.setProperty("--ma-accent", accent);
    return () => {
      document.documentElement.style.removeProperty("--ma-accent");
    };
  }, [accent]);

  const style = { "--ma-accent": accent } as CSSProperties;
  return (
    <div className="ma-root" style={style}>
      {children}
    </div>
  );
}

function RequireMember() {
  const { user, needsMfa, loading, error } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (error instanceof SetupRequiredError) return <SetupRequired />;
  if (!user) return <Navigate to={`/membros/entrar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (needsMfa) return <MfaScreen />;
  return <Outlet />;
}

function RequireProducer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user?.isAdmin) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
        <ShieldCheck className="h-12 w-12 text-ma" />
        <h1 className="text-2xl font-bold uppercase tracking-tighter">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-white/55">O Studio é exclusivo do produtor. Entre com a conta de administrador para editar a área de membros.</p>
        <a href="/membros" className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 hover:text-white">Voltar para a área de membros</a>
      </div>
    );
  }
  return <>{children}</>;
}

function MemberShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { error } = useCatalog();
  const location = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setSearchOpen(false), [location.pathname]);

  if (error instanceof SetupRequiredError) return <SetupRequired />;

  return (
    <>
      <MembersHeader onSearch={() => setSearchOpen(true)} />
      <main>
        <Suspense fallback={<div className="min-h-[100dvh]" />}>
          <Outlet />
        </Suspense>
      </main>
      <MembersFooter />
      <MobileTabBar onSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MembersFooter() {
  const { data: settings } = useSettings();
  return (
    <footer className="ma-gutter hidden border-t border-white/[0.06] py-10 md:block">
      <div className="flex items-center justify-between gap-6 text-xs text-white/35">
        <SafeImg src="/members/mark-white.png" alt="" className="h-7 w-auto opacity-60" />
        <p>{settings?.footerText}</p>
        <a href="/" className="font-semibold uppercase tracking-[0.18em] transition-colors hover:text-white">Ir para a loja</a>
      </div>
    </footer>
  );
}

function MfaScreen() {
  const repo = useRepo();
  const { refresh } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await repo.verifyMfa(code);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <form onSubmit={submit} className="ma-glass w-full max-w-sm rounded-[2rem] p-8 text-center ring-1 ring-white/10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ma/15 text-ma">
          <ShieldCheck />
        </span>
        <h1 className="mt-6 text-2xl font-bold uppercase tracking-tighter">Verificação em 2 etapas</h1>
        <p className="mt-2 text-sm text-white/55">Digite o código de 6 dígitos do seu app autenticador.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          className={`${darkInput} mt-6 text-center text-2xl font-bold tracking-[0.5em]`}
        />
        {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
        <Btn type="submit" size="lg" className="mt-5 w-full" loading={busy} disabled={code.length !== 6}>
          Verificar
        </Btn>
        <button type="button" onClick={() => repo.signOut()} className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white">
          <LogOut size={14} /> Sair
        </button>
      </form>
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-xl rounded-[2rem] bg-white/[0.03] p-8 ring-1 ring-white/10 md:p-12">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ma/15 text-ma">
          <Database />
        </span>
        <h1 className="mt-6 text-3xl font-bold uppercase tracking-tighter">Quase pronto</h1>
        <p className="mt-3 leading-relaxed text-white/60">
          A Área de Membros já está no site, mas as tabelas ainda não foram criadas neste Supabase. Rode as migrações de
          <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-[12px]">supabase/migrations</code>
          e publique a função <code className="rounded bg-white/10 px-1.5 py-0.5 text-[12px]">members-api</code>.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Btn onClick={enableDemoMode} icon={<PlayCircle size={16} />}>Ver demonstração</Btn>
          <Btn variant="glass" onClick={() => window.location.reload()}>Tentar de novo</Btn>
        </div>
      </div>
    </div>
  );
}
