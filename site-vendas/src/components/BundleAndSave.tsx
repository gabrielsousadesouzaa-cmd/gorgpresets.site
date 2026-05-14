import { Link } from "react-router-dom";
import { CheckCircle2, Zap } from "lucide-react";
import { useCurrency } from "@/store/currencyStore";
import { useLanguage } from "@/store/languageStore";

export function BundleAndSave() {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 bg-gray-50/50" id="bundles">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-950 uppercase tracking-tighter mb-4">
            {t("bundleTitle" as any)}
          </h2>
          <p className="text-sm md:text-base text-gray-500 font-medium">
            {t("bundleSubtitle" as any)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
          
          {/* TIER 1 */}
          <div className="bg-white rounded-[2rem] p-8 border border-black/5 shadow-xl md:hover:scale-105 transition-transform flex flex-col h-full">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2">{t("bundleOption1" as any)}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-gray-950">{formatCurrency(49.9)}</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleChoose2" as any)}</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleEasyInstall" as any)}</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium text-opacity-40"><CheckCircle2 size={18} className="text-gray-300 shrink-0" /> {t("bundleFutureUpdates" as any)}</li>
            </ul>
            <Link to="/catalog" className="w-full flex justify-center py-4 rounded-xl border-2 border-gray-950 text-gray-950 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 mt-auto">{t("bundleExploreIndiv" as any)}</Link>
          </div>

          {/* TIER 2 - DESTAQUE */}
          <div className="bg-gray-950 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative md:scale-110 z-10 flex flex-col h-[105%]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#d82828] text-white text-[10px] font-black uppercase px-4 py-2 rounded-full tracking-widest whitespace-nowrap shadow-highlight">
              ⭐ {t("bundleMaster" as any)} ⭐
            </div>
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 mt-4">{t("bundleFullColl" as any)}</h3>
            <div className="flex flex-col mb-6">
              <span className="text-gray-500 line-through text-sm font-bold">{formatCurrency(297.0)}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-white">{formatCurrency(149.0)}</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleAllUnlocked" as any)}</li>
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleTotalCompat" as any)}</li>
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleLifetimeGuar" as any)}</li>
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleFutureFree" as any)}</li>
            </ul>
            <Link to="/catalog" className="w-full flex items-center justify-center gap-2 py-4 md:py-5 rounded-xl bg-[#d82828] text-white font-bold uppercase tracking-widest text-[11px] hover:bg-red-700 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(216,40,40,0.4)] mt-auto">
              <Zap size={16} fill="currentColor"/> {t("bundleGetFull" as any)}
            </Link>
          </div>

          {/* TIER 3 */}
          <div className="bg-white rounded-[2rem] p-8 border border-black/5 shadow-xl md:hover:scale-105 transition-transform flex flex-col h-full">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2">{t("bundleOption2" as any)}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-gray-950">{formatCurrency(89.9)}</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleChoose5" as any)}</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleEasyInstall" as any)}</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> {t("bundleLifetimeGuar" as any)}</li>
            </ul>
            <Link to="/catalog" className="w-full flex justify-center py-4 rounded-xl border-2 border-gray-950 text-gray-950 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 mt-auto">{t("bundleBuildPack" as any)}</Link>
          </div>

        </div>
      </div>
    </section>
  );
}
