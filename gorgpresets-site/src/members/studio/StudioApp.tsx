import { lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Gauge, LayoutTemplate, Loader2, LogOut, Mail, Menu, Palette, PlugZap, Rows3, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useRepo } from "../context/MembersContext";
import { DemoBadge } from "../components/MembersHeader";
import { Avatar } from "../components/ui";
import { ConfirmProvider } from "./ui";
import Dashboard from "./pages/Dashboard";

const ProductsPage = lazy(() => import("./pages/Products"));
const ProductEditor = lazy(() => import("./pages/ProductEditor"));
const RowsPage = lazy(() => import("./pages/Rows"));
const AppearancePage = lazy(() => import("./pages/Appearance"));
const MembersPage = lazy(() => import("./pages/Members"));
const IntegrationsPage = lazy(() => import("./pages/Integrations"));
const EmailsPage = lazy(() => import("./pages/Emails"));

const NAV = [
  { to: "/membros/studio", label: "Visão geral", icon: Gauge, end: true },
  { to: "/membros/studio/colecoes", label: "Coleções e aulas", icon: LayoutTemplate, end: false },
  { to: "/membros/studio/vitrines", label: "Seções da home", icon: Rows3, end: false },
  { to: "/membros/studio/aparencia", label: "Aparência", icon: Palette, end: false },
  { to: "/membros/studio/membros", label: "Membros", icon: Users, end: false },
  { to: "/membros/studio/emails", label: "E-mails", icon: Mail, end: false },
  { to: "/membros/studio/integracoes", label: "Integrações", icon: PlugZap, end: false },
];

export default function StudioApp() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#f5f5f7";
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, []);

  return (
    <ConfirmProvider>
      <div className="min-h-[100dvh] bg-[#f5f5f7] text-[#1d1d1f] [color-scheme:light]">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-black/[0.06] bg-white/80 backdrop-blur-xl lg:block">
          <Sidebar />
        </aside>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/[0.06] bg-white/80 px-4 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5" aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <img src="/logo.png" alt="Gorg" className="h-8 w-auto" />
          <Link to="/membros" className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5" aria-label="Ver área de membros">
            <ExternalLink size={18} />
          </Link>
        </header>

        <AnimatePresence>
          {menuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl"
              >
                <button onClick={() => setMenuOpen(false)} className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-full hover:bg-black/5" aria-label="Fechar menu">
                  <X size={18} />
                </button>
                <Sidebar />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <main className="lg:pl-[264px]">
          <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 md:px-10 md:py-12">
            <Suspense
              fallback={
                <div className="grid min-h-[50vh] place-items-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#86868b]" />
                </div>
              }
            >
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="colecoes" element={<ProductsPage />} />
                <Route path="colecoes/:productId" element={<ProductEditor />} />
                <Route path="vitrines" element={<RowsPage />} />
                <Route path="aparencia" element={<AppearancePage />} />
                <Route path="membros" element={<MembersPage />} />
                <Route path="integracoes" element={<IntegrationsPage />} />
                <Route path="emails" element={<EmailsPage />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </ConfirmProvider>
  );
}

function Sidebar() {
  const { user } = useAuth();
  const repo = useRepo();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <Link to="/membros/studio" className="flex items-center gap-3">
          <img src="/logo.png" alt="Gorg Presets" className="h-9 w-auto" />
          <span className="rounded-md bg-[#1d1d1f] px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">Studio</span>
        </Link>
        {repo.mode === "demo" && (
          <div className="mt-4">
            <DemoBadge light />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                isActive ? "bg-[#1d1d1f] text-white shadow-sm" : "text-[#1d1d1f]/70 hover:bg-black/[0.04] hover:text-[#1d1d1f]",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? "text-ma" : "text-[#86868b] group-hover:text-[#1d1d1f]"} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-black/[0.06] p-3">
        <Link
          to="/membros"
          className="flex items-center justify-between rounded-xl bg-[#f5f5f7] px-3 py-3 text-[13px] font-semibold transition-colors hover:bg-black/[0.06]"
        >
          Ver área de membros
          <ExternalLink size={15} className="text-[#86868b]" />
        </Link>
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user?.name || "Produtor"} email={user?.email} size={34} className="ring-black/10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{user?.name || "Produtor"}</p>
            <p className="truncate text-[11px] text-[#86868b]">{user?.email}</p>
          </div>
          <button
            onClick={async () => {
              await repo.signOut();
              navigate("/membros/entrar", { replace: true });
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-[#86868b] transition-colors hover:bg-black/5 hover:text-ma"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
