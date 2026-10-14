import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Abas sublinhadas no estilo Apple (com contador opcional). */
export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: Array<{ value: T; label: ReactNode; count?: number; tone?: "amber" | "red" }>; className?: string }) {
  return (
    <div role="tablist" className={cn("-mx-1 flex gap-1 overflow-x-auto border-b border-black/[0.08] px-1 [scrollbar-width:none]", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn("relative flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-[13.5px] font-semibold transition-colors", active ? "text-[#1d1d1f]" : "text-[#86868b] hover:text-[#1d1d1f]")}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10.5px] font-bold",
                  tab.tone === "amber" && tab.count > 0 ? "bg-amber-100 text-amber-800" : tab.tone === "red" && tab.count > 0 ? "bg-red-100 text-red-700" : "bg-black/[0.06] text-[#6e6e73]",
                )}
              >
                {tab.count}
              </span>
            )}
            {active && <motion.span layoutId={`tabs-${tabs.map((t) => t.value).join("")}`} className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[#1d1d1f]" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
          </button>
        );
      })}
    </div>
  );
}
