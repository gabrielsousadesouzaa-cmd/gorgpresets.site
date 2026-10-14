import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, AtSign, Instagram, MessageCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useSettings } from "../context/MembersContext";
import { Eyebrow } from "../components/ui";

export default function Support() {
  const { data: settings } = useSettings();
  const { user } = useAuth();
  const support = settings?.support;
  const [open, setOpen] = useState<string | null>(null);

  const whatsappDigits = (support?.whatsapp || "").replace(/\D/g, "");
  const channels = [
    whatsappDigits && {
      icon: <MessageCircle size={22} />,
      title: "WhatsApp",
      text: "Resposta rápida em horário comercial",
      href: `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá! Preciso de ajuda com a Área de Membros. Meu e-mail: ${user?.email || ""}`)}`,
      tone: "from-emerald-500/25",
    },
    support?.email && {
      icon: <AtSign size={22} />,
      title: "E-mail",
      text: support.email,
      href: `mailto:${support.email}?subject=${encodeURIComponent("Ajuda - Área de Membros")}`,
      tone: "from-sky-500/20",
    },
    support?.instagram && {
      icon: <Instagram size={22} />,
      title: "Instagram",
      text: `@${support.instagram.replace(/^@/, "")}`,
      href: `https://instagram.com/${support.instagram.replace(/^@/, "")}`,
      tone: "from-fuchsia-500/20",
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; title: string; text: string; href: string; tone: string }>;

  return (
    <div className="ma-gutter mx-auto max-w-6xl pb-28 pt-28 md:pb-20 md:pt-36">
      <section className="relative overflow-hidden rounded-[2rem] px-6 py-12 ring-1 ring-white/[0.08] md:rounded-[3rem] md:px-14 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgb(var(--ma-accent)/0.35),transparent_55%),radial-gradient(ellipse_at_0%_100%,rgba(255,255,255,0.06),transparent_50%)]" />
        <div className="relative max-w-2xl">
          <Eyebrow>Suporte</Eyebrow>
          <h1 className="mt-5 text-4xl font-semibold uppercase leading-[0.98] tracking-[-0.035em] md:text-6xl">{support?.headline || "Estamos aqui para ajudar"}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/65 md:text-lg">{support?.text}</p>
        </div>
      </section>

      {channels.length > 0 && (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {channels.map((c, i) => (
            <motion.a
              key={c.title}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn("group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br to-transparent p-6 ring-1 ring-white/[0.08] transition duration-500 hover:-translate-y-1 hover:ring-white/20", c.tone)}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white">{c.icon}</span>
              <p className="mt-6 text-lg font-bold uppercase tracking-tight">{c.title}</p>
              <p className="mt-1 truncate text-sm text-white/55">{c.text}</p>
              <ArrowUpRight className="absolute right-6 top-6 text-white/30 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
            </motion.a>
          ))}
        </div>
      )}

      {!!support?.faq.length && (
        <section className="mt-16 md:mt-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold uppercase tracking-tighter md:text-4xl">Perguntas frequentes</h2>
            <div className="mx-auto mt-3 h-[3px] w-12 rounded-full bg-ma" />
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-3 md:grid-cols-2">
            {support.faq.map((item) => {
              const isOpen = open === item.id;
              return (
                <div key={item.id} className={cn("self-start rounded-2xl ring-1 transition-colors", isOpen ? "bg-white/[0.06] ring-white/15" : "bg-white/[0.03] ring-white/[0.07]")}>
                  <button onClick={() => setOpen(isOpen ? null : item.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                    <span className="text-[15px] font-semibold">{item.question}</span>
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 transition-transform duration-300", isOpen && "rotate-45 bg-ma")}>
                      <Plus size={16} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                        <p className="whitespace-pre-line px-5 pb-5 text-sm leading-relaxed text-white/60">{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
