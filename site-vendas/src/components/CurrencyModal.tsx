import { useCurrency } from "@/store/currencyStore";
import { useLanguage } from "@/store/languageStore";
import { Globe, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "./ui/button";

export function CurrencyModal() {
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.includes('/admin')) return;

    // Verifica se já viu o modal nesta sessão (aba do navegador)
    const hasSeenModal = sessionStorage.getItem("hasSeenCurrencyModal");
    
    // Se ele nunca viu, programa pra aparecer em 6 segundos
    if (!hasSeenModal) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeModal = () => {
    setShow(false);
    sessionStorage.setItem("hasSeenCurrencyModal", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/50 backdrop-blur-md transition-all duration-700 animate-in fade-in">
      <div className="bg-card w-full max-w-[350px] rounded-[2rem] p-6 shadow-2xl border border-border/60 relative animate-in slide-in-from-bottom-20 zoom-in-95 duration-500">
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={closeModal} 
          className="absolute top-4 right-4 hover:bg-secondary rounded-full w-8 h-8 flex items-center justify-center z-10"
        >
          <X size={18} />
        </Button>

        <div className="flex items-center gap-3 mb-4 text-[#d82828] pr-8">
          <Globe size={28} className="shrink-0" />
          <h3 className="font-bold text-xl text-gray-950 leading-tight tracking-tight">{t("welcome")}</h3>
        </div>
        
        <p className="text-sm text-foreground mb-6 font-normal leading-relaxed">
          {t("modalDesc")}
        </p>
        
        <div className="flex flex-col gap-4 mb-6">
          {/* Seletor de Idioma */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-black ml-1">
              {t("languageLabel")}
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full bg-secondary text-foreground rounded-2xl px-5 py-4 font-semibold text-lg border-2 border-transparent outline-none ring-0 focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="PT">🇧🇷 Português</option>
              <option value="EN">🇺🇸 English</option>
              <option value="ES">🇪🇸 Español</option>
            </select>
          </div>

          {/* Seletor de Moeda */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-black ml-1">
              {t("currencyLabel")}
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="w-full bg-secondary text-foreground rounded-2xl px-5 py-4 font-semibold text-lg border-2 border-transparent outline-none ring-0 focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="BRL">{t("countryBR")}</option>
              <option value="USD">{t("countryUS")}</option>
              <option value="EUR">{t("countryPT")}</option>
            </select>
          </div>
        </div>

        <Button 
          onClick={closeModal}
          className="w-full py-6 rounded-2xl text-base font-semibold uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform"
        >
          {t("confirmBtn")}
        </Button>
      </div>
    </div>
  );
}
