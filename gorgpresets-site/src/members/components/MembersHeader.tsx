import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Library, LifeBuoy, LogOut, RotateCcw, Search, Settings2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, useRefreshPortal, useRepo, useSettings } from "../context/MembersContext";
import { resetDemo } from "../lib/localRepo";
import { firstName } from "../lib/format";
import { Avatar, SafeImg } from "./ui";

const NAV = [
  { to: "/membros", label: "Início", icon: Home, end: true },
  { to: "/membros/minha-colecao", label: "Minha coleção", icon: Library, end: false },
  { to: "/membros/suporte", label: "Suporte", icon: LifeBuoy, end: false },
];

export function MembersHeader({ onSearch }: { onSearch: () => void }) {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const repo = useRepo();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const signOut = async () => {
    setMenuOpen(false);
    await repo.signOut();
    navigate("/membros/entrar", { replace: true });
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled ? "ma-glass border-b border-white/[0.06]" : "border-b border-transparent bg-gradient-to-b from-black/80 via-black/30 to-transparent",
      )}
    >
      <div className="ma-gutter flex h-16 items-center gap-6 md:h-[72px] lg:gap-10">
        <Link to="/membros" className="shrink-0" aria-label="Início">
          <SafeImg src={settings?.logoUrl || "/members/logo-white.png"} alt={settings?.brandName || "Gorg"} className="h-7 w-auto md:h-8" loading="eager" />
        </Link>

        {repo.mode === "demo" && (
          <span className="-ml-2 hidden sm:block lg:-ml-4">
            <DemoBadge />
          </span>
        )}

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                  isActive ? "text-white" : "text-white/60 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={cn("transition-colors", isActive ? "text-ma" : "text-white/50 group-hover:text-white/80")} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <button
            onClick={onSearch}
            className="flex h-10 items-center gap-2 rounded-full px-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:px-3.5"
            aria-label="Buscar"
          >
            <Search size={18} />
            <span className="hidden text-[13px] lg:inline">Buscar</span>
            <kbd className="hidden rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/40 lg:inline">⌘K</kbd>
          </button>

          {user?.isAdmin && (
            <Link
              to="/membros/studio"
              className="hidden h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/20 sm:flex"
            >
              <Settings2 size={14} /> Studio
            </Link>
          )}

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-3 rounded-full p-0.5 transition-opacity hover:opacity-90" aria-label="Menu da conta">
              <span className="hidden text-right text-[13px] leading-tight text-white/70 lg:block">
                Bem-vindo(a), <span className="font-semibold text-white">{firstName(user?.name || "", user?.email)}</span>
              </span>
              <Avatar name={user?.name || ""} email={user?.email} size={36} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="ma-glass absolute right-0 top-12 w-64 origin-top-right overflow-hidden rounded-2xl p-1.5 shadow-2xl ring-1 ring-white/10"
                >
                  <div className="px-3 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user?.name || firstName("", user?.email)}</p>
                    <p className="truncate text-xs text-white/50">{user?.email}</p>
                  </div>
                  <div className="my-1 h-px bg-white/10" />
                  <MenuLink to="/membros/perfil" icon={<User size={16} />} onClick={() => setMenuOpen(false)}>Meu perfil</MenuLink>
                  <MenuLink to="/membros/minha-colecao" icon={<Library size={16} />} onClick={() => setMenuOpen(false)}>Minha coleção</MenuLink>
                  <MenuLink to="/membros/suporte" icon={<LifeBuoy size={16} />} onClick={() => setMenuOpen(false)}>Suporte</MenuLink>
                  {user?.isAdmin && (
                    <MenuLink to="/membros/studio" icon={<Settings2 size={16} />} onClick={() => setMenuOpen(false)}>Studio do produtor</MenuLink>
                  )}
                  <div className="my-1 h-px bg-white/10" />
                  <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                    <LogOut size={16} className="text-ma" /> Sair
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({ to, icon, children, onClick }: { to: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
      <span className="text-white/50">{icon}</span>
      {children}
    </Link>
  );
}

export function MobileTabBar({ onSearch }: { onSearch: () => void }) {
  const tabs = [
    { to: "/membros", label: "Início", icon: Home, end: true },
    { to: "/membros/minha-colecao", label: "Coleção", icon: Library, end: false },
    { to: "/membros/suporte", label: "Suporte", icon: LifeBuoy, end: false },
    { to: "/membros/perfil", label: "Perfil", icon: User, end: false },
  ];
  return (
    <nav className="ma-glass fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid h-16 grid-cols-5">
        {tabs.slice(0, 2).map((t) => <Tab key={t.to} {...t} />)}
        <button onClick={onSearch} className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-white/55">
          <Search size={20} />
          Buscar
        </button>
        {tabs.slice(2).map((t) => <Tab key={t.to} {...t} />)}
      </div>
    </nav>
  );
}

function Tab({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof Home; end: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors", isActive ? "text-white" : "text-white/55")}>
      {({ isActive }) => (
        <>
          <Icon size={20} className={isActive ? "text-ma" : undefined} />
          {label}
        </>
      )}
    </NavLink>
  );
}

/** Selo do modo demonstração, com atalho para restaurar os dados de exemplo. */
export function DemoBadge({ light }: { light?: boolean }) {
  const refresh = useRefreshPortal();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ring-1",
        light ? "bg-black/[0.04] text-black/60 ring-black/10" : "bg-white/[0.06] text-white/60 ring-white/10",
      )}
    >
      <Sparkles size={10} className="text-ma" /> Demo
      <button
        onClick={async () => {
          resetDemo();
          await refresh("catalog", "settings", "access", "progress", "materials", "studio", "auth");
          toast.success("Dados de demonstração restaurados");
        }}
        className={cn("grid h-6 w-6 place-items-center rounded-full transition-colors", light ? "hover:bg-black/10 hover:text-black" : "hover:bg-white/10 hover:text-white")}
        title="Restaurar dados de demonstração"
        aria-label="Restaurar dados de demonstração"
      >
        <RotateCcw size={10} />
      </button>
    </span>
  );
}
