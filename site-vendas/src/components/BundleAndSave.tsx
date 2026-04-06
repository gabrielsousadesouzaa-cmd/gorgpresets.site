import { Link } from "react-router-dom";
import { CheckCircle2, Zap } from "lucide-react";
import { useCurrency } from "@/store/currencyStore";

export function BundleAndSave() {
  const { formatCurrency } = useCurrency();

  return (
    <section className="py-16 md:py-24 bg-gray-50/50" id="bundles">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-950 uppercase tracking-tighter mb-4">
            Escolha o Seu Pacote
          </h2>
          <p className="text-sm md:text-base text-gray-500 font-medium">
            Leve a coleção completa e economize em até 60% com os nossos combos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
          
          {/* TIER 1 */}
          <div className="bg-white rounded-[2rem] p-8 border border-black/5 shadow-xl md:hover:scale-105 transition-transform flex flex-col h-full">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Opção 1</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-gray-950">{formatCurrency(49.9)}</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Escolha 2 Presets Individuais</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Instalação descompliada em 1 Clique</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium text-opacity-40"><CheckCircle2 size={18} className="text-gray-300 shrink-0" /> Acesso à futuras atualizações</li>
            </ul>
            <Link to="/catalog" className="w-full flex justify-center py-4 rounded-xl border-2 border-gray-950 text-gray-950 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 mt-auto">Explorar Prests Individuais</Link>
          </div>

          {/* TIER 2 - DESTAQUE */}
          <div className="bg-gray-950 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative md:scale-110 z-10 flex flex-col h-[105%]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#d82828] text-white text-[10px] font-black uppercase px-4 py-2 rounded-full tracking-widest whitespace-nowrap shadow-highlight">
              ⭐ MASTER VITALÍCIO ⭐
            </div>
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 mt-4">A coleção completa</h3>
            <div className="flex flex-col mb-6">
              <span className="text-gray-500 line-through text-sm font-bold">{formatCurrency(297.0)}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-white">{formatCurrency(149.0)}</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Todos os Presets da Loja Liberados</li>
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Compatibilidade Total (Mobile e Desktop)</li>
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Acesso Vitalício Garantido</li>
              <li className="flex gap-3 text-sm text-gray-200 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Todas Atualizações Futuras Inclusas Grátis</li>
            </ul>
            <Link to="/catalog" className="w-full flex items-center justify-center gap-2 py-4 md:py-5 rounded-xl bg-[#d82828] text-white font-bold uppercase tracking-widest text-[11px] hover:bg-red-700 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(216,40,40,0.4)] mt-auto">
              <Zap size={16} fill="currentColor"/> Quero a Coleção Completa
            </Link>
          </div>

          {/* TIER 3 */}
          <div className="bg-white rounded-[2rem] p-8 border border-black/5 shadow-xl md:hover:scale-105 transition-transform flex flex-col h-full">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Opção 2</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-gray-950">{formatCurrency(89.9)}</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Escolha até 5 Presets</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Instalação Rápida e Fácil</li>
              <li className="flex gap-3 text-sm text-gray-600 font-medium"><CheckCircle2 size={18} className="text-[#d82828] shrink-0" /> Acesso Vitalício aos Filtros</li>
            </ul>
            <Link to="/catalog" className="w-full flex justify-center py-4 rounded-xl border-2 border-gray-950 text-gray-950 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 mt-auto">Montar Meu Pack</Link>
          </div>

        </div>
      </div>
    </section>
  );
}
