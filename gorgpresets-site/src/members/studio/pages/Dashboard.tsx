import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, BookOpenCheck, Check, ExternalLink, LayoutTemplate, PlayCircle, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useCatalog, useRepo, useSettings } from "../../context/MembersContext";
import { blankProduct } from "../../lib/defaults";
import { firstName, relativeDate, sortByOrder } from "../../lib/format";
import { PosterArt } from "../../components/PosterArt";
import { Avatar } from "../../components/ui";
import { Badge, Button, Card, PageHeader } from "../ui";
import { useMembersList, useStats, useStudioAction } from "../hooks";

export default function Dashboard() {
  const { user } = useAuth();
  const { catalog } = useCatalog();
  const { data: settings } = useSettings();
  const { data: stats } = useStats();
  const { data: members } = useMembersList();
  const repo = useRepo();
  const run = useStudioAction();
  const navigate = useNavigate();

  const createProduct = async () => {
    const draft = { ...blankProduct(catalog.products.length), title: "Nova coleção", slug: `nova-colecao-${Date.now().toString(36)}`, published: false };
    const saved = await run(() => repo.saveProduct(draft), { success: "Coleção criada" });
    if (saved) navigate(`/membros/studio/colecoes/${saved.id}`);
  };

  const steps = [
    { done: !!settings && (settings.logoUrl !== "/members/logo-white.png" || settings.heroSlides.length > 0), label: "Personalize marca e banner", to: "/membros/studio/aparencia" },
    { done: catalog.products.length > 0, label: "Crie sua primeira coleção", to: "/membros/studio/colecoes" },
    { done: catalog.lessons.length > 0, label: "Adicione módulos e aulas", to: "/membros/studio/colecoes" },
    { done: catalog.rows.length > 0, label: "Monte as vitrines da home", to: "/membros/studio/vitrines" },
    { done: catalog.products.some((p) => p.externalIds.length > 0), label: "Conecte o checkout (webhook)", to: "/membros/studio/integracoes" },
    { done: (members?.length || 0) > 0, label: "Libere o acesso do primeiro membro", to: "/membros/studio/membros" },
  ];
  const doneSteps = steps.filter((s) => s.done).length;

  const statCards = [
    { label: "Membros", value: stats?.members, icon: Users },
    { label: "Ativos (7 dias)", value: stats?.activeMembers7d, icon: Activity },
    { label: "Coleções", value: stats?.products, icon: LayoutTemplate },
    { label: "Aulas", value: stats?.lessons, icon: PlayCircle },
    { label: "Aulas concluídas", value: stats?.completions, icon: BookOpenCheck },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={<p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-ma">Studio do produtor</p>}
        title={`Olá, ${firstName(user?.name || "", user?.email) || "Produtor"}`}
        subtitle="Tudo o que acontece na sua área de membros, em um só lugar."
        actions={
          <>
            <Button variant="secondary" icon={<ExternalLink size={15} />} onClick={() => window.open("/membros", "_blank")}>Ver como membro</Button>
            <Button icon={<Plus size={16} />} onClick={createProduct}>Nova coleção</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[1.4rem] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_30px_-12px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.05]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5f5f7] text-[#1d1d1f]">
              <Icon size={18} />
            </span>
            <p className="mt-5 text-[2rem] font-bold leading-none tracking-tight tabular-nums">{value ?? "—"}</p>
            <p className="mt-2 text-[12px] font-medium text-[#86868b]">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card
          title="Primeiros passos"
          description={`${doneSteps} de ${steps.length} concluídos`}
          actions={
            <div className="relative h-11 w-11">
              <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(var(--ma-accent))" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(doneSteps / steps.length) * 97.4} 97.4`} />
              </svg>
            </div>
          }
        >
          <ul className="space-y-1">
            {steps.map((s) => (
              <li key={s.label}>
                <Link to={s.to} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#f5f5f7]">
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", s.done ? "bg-[#34c759] text-white" : "ring-2 ring-inset ring-black/10")}>
                    {s.done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className={cn("flex-1 text-[14px] font-medium", s.done && "text-[#86868b] line-through decoration-black/20")}>{s.label}</span>
                  <ArrowRight size={15} className="text-[#a1a1a6] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1d1d1f]" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Membros recentes"
          actions={<Link to="/membros/studio/membros" className="text-[13px] font-semibold text-ma hover:underline">Ver todos</Link>}
        >
          {members?.length ? (
            <ul className="-mx-2 space-y-0.5">
              {members.slice(0, 6).map((m) => (
                <li key={m.email} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <Avatar name={m.name} email={m.email} size={36} className="ring-black/10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{m.name || m.email.split("@")[0]}</p>
                    <p className="truncate text-[12px] text-[#86868b]">{m.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={m.hasAccount ? "green" : "amber"}>{m.grants.length} {m.grants.length === 1 ? "coleção" : "coleções"}</Badge>
                    <p className="mt-1 text-[11px] text-[#a1a1a6]">{relativeDate(m.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-[#86868b]">Nenhum membro ainda.</p>
          )}
        </Card>
      </div>

      {catalog.products.length > 0 && (
        <Card
          className="mt-6"
          title="Suas coleções"
          actions={<Link to="/membros/studio/colecoes" className="text-[13px] font-semibold text-ma hover:underline">Gerenciar</Link>}
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {sortByOrder(catalog.products).slice(0, 12).map((p) => {
              const lessons = catalog.lessons.filter((l) => l.productId === p.id).length;
              return (
                <Link key={p.id} to={`/membros/studio/colecoes/${p.id}`} className="group">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-black/10 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                    <PosterArt product={p} />
                    {!p.published && <span className="absolute left-2 top-2 rounded bg-amber-400 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">Rascunho</span>}
                  </div>
                  <p className="mt-2 truncate text-[12px] font-semibold">{p.title}</p>
                  <p className="text-[11px] text-[#86868b]">{lessons} aulas</p>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
