import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/store/languageStore";
import { useCurrency } from "@/store/currencyStore";
import { Plus, Minus, ChevronDown } from "lucide-react";

export function Footer() {
  const { t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer className="bg-[#f4f4f4] text-[#333333] pt-0 pb-16 md:pt-4 md:pb-16">
      
      {/* Mobile Logo */}
      <div className="md:hidden flex justify-center mb-1">
        <Link to="/" onClick={handleLogoClick} className="block hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Gorg Presets" className="h-[5.5rem] w-auto object-contain" />
        </Link>
      </div>

      <div className="container mx-auto px-6 md:px-10 lg:px-16 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] md:gap-8 border-t border-black/10 md:border-transparent">
        
        {/* Coluna 1 */}
        <div className="flex flex-col md:gap-5 border-b border-black/10 md:border-transparent">
           {/* Desktop Logo */}
           <Link to="/" onClick={handleLogoClick} className="hidden md:block w-fit mb-2 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Gorg Presets" className="h-[4.5rem] w-auto object-contain" />
           </Link>
          <button 
            onClick={() => toggleSection('about')}
            className="flex items-center justify-between w-full py-5 md:py-0 md:cursor-default group"
          >
            <h4 className="text-[13px] font-semibold uppercase tracking-widest text-[#111] md:text-black/80 md:mt-4 transition-colors group-hover:text-primary">
              {t("footerAboutKey")}
            </h4>
            <div className="md:hidden text-black transition-transform duration-500 ease-in-out">
              <div className={`transform transition-transform duration-500 ease-in-out ${openSection === 'about' ? 'rotate-180' : 'rotate-0'}`}>
                 {openSection === 'about' ? <Minus size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
              </div>
            </div>
          </button>
          <div 
            className={`grid transition-all duration-500 ease-in-out md:block ${openSection === 'about' ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0 md:opacity-100 md:pb-0'}`}
          >
            <div className="overflow-hidden">
              <p className="text-[15px] md:text-sm font-normal text-[#444] md:text-black/70 leading-relaxed max-w-sm">
                {t("footerAboutPara")}
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 2 */}
        <div className="flex flex-col md:gap-4 pt-0 md:pt-1 border-b border-black/10 md:border-transparent">
          <button 
            onClick={() => toggleSection('info')}
            className="flex items-center justify-between w-full py-5 md:py-0 md:cursor-default group"
          >
            <h4 className="text-[13px] font-semibold uppercase tracking-widest text-[#111] md:text-black/80 md:mb-2 transition-colors group-hover:text-primary">
              {t("footerInfoKey")}
            </h4>
            <div className="md:hidden text-black transition-transform duration-500 ease-in-out">
              <div className={`transform transition-transform duration-500 ease-in-out ${openSection === 'info' ? 'rotate-180' : 'rotate-0'}`}>
                {openSection === 'info' ? <Minus size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
              </div>
            </div>
          </button>
          <div 
            className={`grid transition-all duration-500 ease-in-out md:block ${openSection === 'info' ? 'grid-rows-[1fr] opacity-100 pb-6 pt-1 md:pt-0' : 'grid-rows-[0fr] opacity-0 md:opacity-100 md:pb-0 md:pt-0'}`}
          >
            <div className="overflow-hidden flex flex-col gap-3.5 md:gap-4">
              <Link to="/faq" className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70 hover:text-black transition-colors">{t("footerFaq")}</Link>
              <Link to="/contact" className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70 hover:text-black transition-colors">{t("footerContact")}</Link>
              <Link to="/terms" className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70 hover:text-black transition-colors">{t("footerTerms")}</Link>
              <Link to="/shipping" className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70 hover:text-black transition-colors">{t("footerShipping")}</Link>
              <Link to="/refund" className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70 hover:text-black transition-colors">{t("footerRefund")}</Link>
              <Link to="/privacy" className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70 hover:text-black transition-colors">{t("footerPrivacy")}</Link>
            </div>
          </div>
        </div>

        {/* Coluna 3 */}
        <div className="flex flex-col md:gap-4 pt-0 md:pt-1 border-b border-black/10 md:border-transparent">
          <button 
            onClick={() => toggleSection('support')}
            className="flex items-center justify-between w-full py-5 md:py-0 md:cursor-default group"
          >
            <h4 className="text-[13px] font-semibold uppercase tracking-widest text-[#111] md:text-black/80 md:mb-2 transition-colors group-hover:text-primary">
              {t("footerSupportKey")}
            </h4>
            <div className="md:hidden text-black transition-transform duration-500 ease-in-out">
              <div className={`transform transition-transform duration-500 ease-in-out ${openSection === 'support' ? 'rotate-180' : 'rotate-0'}`}>
                {openSection === 'support' ? <Minus size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
              </div>
            </div>
          </button>
          <div 
            className={`grid transition-all duration-500 ease-in-out md:block ${openSection === 'support' ? 'grid-rows-[1fr] opacity-100 pb-6 pt-1 md:pt-0' : 'grid-rows-[0fr] opacity-0 md:opacity-100 md:pb-0 md:pt-0'}`}
          >
            <div className="overflow-hidden flex flex-col gap-3.5 md:gap-4">
              <p className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70">
                <strong className="text-black font-semibold">{t("supportWhatsApp")}</strong> <span className="text-[#d82828]">+351 930 941 144</span>
              </p>
              <p className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70">
                <strong className="text-black font-semibold">{t("supportEmail")}</strong> suporte@gorgpresets.com
              </p>
              <p className="text-[15px] md:text-[13px] font-normal text-[#444] md:text-black/70 md:pt-2">
                <strong className="text-black font-semibold">{t("supportDays")}</strong> {t("supportHours")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Box Inferior */}
      <div className="container mx-auto px-6 md:px-10 lg:px-16 mt-8 md:mt-20 flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
        
        {/* Dropdown de Moeda */}
        <div className="w-full md:w-auto relative group">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
            className="w-full md:w-auto bg-transparent text-[#333] border border-black/30 font-normal text-[13px] py-1.5 pl-4 pr-10 rounded-full outline-none cursor-pointer hover:border-black/60 transition-colors appearance-none"
          >
            <option value="BRL">{t("countryBR")}</option>
            <option value="USD">{t("countryUS")}</option>
            <option value="EUR">{t("countryPT")}</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black/60 group-hover:text-black/80 transition-colors">
            <ChevronDown size={14} strokeWidth={2.5} />
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div className="flex flex-col items-center md:items-start gap-2 w-full md:w-auto">
           <span className="text-xs font-normal text-[#333]">
             {t("footerWeAccept")}
           </span>
           <div className="flex flex-wrap justify-center items-center gap-1.5 md:gap-2">
              
              {/* Mastercard */}
              <div className="px-2 min-w-10 h-7 border border-black/10 rounded-md bg-white shadow-md flex items-center justify-center">
                <svg width="22" height="14" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="7.5" cy="8" r="7.5" fill="#EB001B"/>
                  <circle cx="16.5" cy="8" r="7.5" fill="#F79E1B"/>
                  <path d="M12 14.5A7.46 7.46 0 0 0 15 8a7.46 7.46 0 0 0-3-6.5A7.46 7.46 0 0 0 9 8a7.46 7.46 0 0 0 3 6.5Z" fill="#FF5F00"/>
                </svg>
              </div>

              {/* Elo */}
              <div className="px-2 min-w-10 h-7 border border-black/10 rounded-md bg-white shadow-md flex items-center justify-center">
                <img src="/elo-black.png" alt="Elo" className="h-[12px] w-auto object-contain" />
              </div>

              {/* Hipercard */}
              <div className="px-1.5 min-w-12 h-7 border border-black/10 rounded-md bg-white shadow-md flex items-center justify-center">
                <div className="bg-[#B71C1C] px-1 py-[1.5px] rounded-[2px] w-full flex justify-center">
                  <strong className="text-white text-[8.5px] italic font-sans font-semibold leading-none pt-[1px]">Hipercard</strong>
                </div>
              </div>

              {/* VISA */}
              <div className="px-2 min-w-11 h-7 border border-black/10 rounded-md bg-white shadow-md flex items-center justify-center">
                <span className="text-[#1434CB] text-[15px] italic font-black font-sans tracking-tighter leading-none mt-0.5">VISA</span>
              </div>

              {/* AMEX REMOVIDO */}

              {/* PIX */}
              <div className="px-2 min-w-10 h-7 border border-black/10 rounded-md bg-white shadow-md flex items-center justify-center">
                <img src="/pix.png" alt="Pix" className="h-[14px] w-auto object-contain" />
              </div>
              
           </div>
        </div>
      </div>
    </footer>
  );
}
