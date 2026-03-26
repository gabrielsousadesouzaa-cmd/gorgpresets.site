import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/store/cartStore";
import { useLanguage } from "@/store/languageStore";
import { useCurrency } from "@/store/currencyStore";
import { useMenu } from "@/store/MenuContext";
import { useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ShoppingBag, Search, Menu, X, Instagram, ChevronDown, ChevronRight, UserCheck, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, openCart } = useCart();
  const { settings, loading } = useSiteSettings();
  const { isMenuOpen, setIsMenuOpen, isSearchOpen, setIsSearchOpen } = useMenu();
  const [navQuery, setNavQuery] = useState("");
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const { products } = useProducts();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atalho de Teclado (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Fechar menus sincronamente ao trocar de URL (Blindagem Máxima)
  useLayoutEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname, location.search, location.key]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(navQuery.trim())}`);
      setIsSearchOpen(false);
      setNavQuery("");
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const navLinks = [
    { label: t("navHome"), href: "/" },
    { label: t("navAllPresets"), href: "/catalog" },
    { label: t("navContact"), href: "/contact" },
  ];

  return (
    <div className="flex flex-col w-full relative z-[2500]">
      {/* Red Announcement Bar */}
      <div className="w-full bg-[#d82828] text-white py-2 text-center text-[10px] md:text-sm font-semibold uppercase tracking-[0.2em]">
        {loading ? "" : (settings.promoBar[language] || t("promoBar"))}
      </div>

      <header className="bg-white/40 backdrop-blur-2xl w-full border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="container mx-auto px-4 md:px-8 py-3 md:py-4">
          <div className="grid grid-cols-3 items-center">
            
            {/* Left Column: Menu Button ONLY on Desktop */}
            <div className="flex items-center">
               <button 
                 onClick={() => setIsMenuOpen(true)}
                 className="p-1 hover:text-[#d82828] transition-colors"
                 aria-label="Menu"
               >
                 <Menu size={24} />
               </button>
            </div>

            {/* Center Column: Logo */}
            <div className="flex justify-center text-center">
              <Link to="/" onClick={handleLogoClick} className="flex-shrink-0">
                 <img src="/logo.png" alt="Gorg Presets" className="h-14 md:h-20 w-auto object-contain" />
              </Link>
            </div>

            {/* Right Column: Search & Cart */}
            <div className="flex justify-end items-center gap-4 md:gap-6">
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="p-1 hover:text-[#d82828] transition-colors" 
                  aria-label="Search"
                >
                  <Search size={22} />
                </button>
                {settings.integration.isCartEnabled && (
                  <button 
                    onClick={openCart}
                    className="relative p-1 group"
                    aria-label="Cart"
                  >
                    <ShoppingBag size={24} className="group-hover:text-[#d82828] transition-colors" />
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#d82828] text-white text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                        {items.length}
                      </span>
                    )}
                  </button>
                )}
            </div>

          </div>
        </div>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[1500] flex flex-col pt-6 md:pt-20 px-4 md:px-12 overflow-y-auto custom-scrollbar"
          >
            <div className="container mx-auto max-w-5xl w-full relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchOpen(false);
                }}
                className="absolute top-0 right-1 md:top-0 md:-right-2 p-2.5 md:p-3 bg-black/5 hover:bg-black/10 rounded-full text-black hover:text-[#d82828] hover:scale-110 active:scale-95 transition-all z-[1510] group"
                aria-label="Close Search"
              >
                <X strokeWidth={2.5} className="w-5 h-5 md:w-8 md:h-8 group-hover:rotate-90 transition-transform duration-300" />
              </button>

              <div className="pt-12 md:pt-8">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center group">
                   <Search size={28} className="absolute left-0 text-gray-300 group-focus-within:text-[#d82828] transition-colors" />
                   <input 
                     ref={searchInputRef}
                     autoFocus
                     type="text"
                     placeholder={t("searchPlaceholder")}
                     value={navQuery}
                     onChange={(e) => setNavQuery(e.target.value)}
                     className="w-full bg-transparent border-b-2 border-black/5 focus:border-[#d82828] outline-none text-xl md:text-3xl font-bold py-6 pl-12 md:pl-16 placeholder:text-gray-400 placeholder:text-lg md:placeholder:text-2xl text-black uppercase tracking-tighter transition-all"
                   />
                </form>
              </div>

              <div className="py-10 md:py-16">
                 {navQuery.trim().length > 1 ? (
                   <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-black/5 pb-4">
                         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Resultados Encontrados</p>
                         <button onClick={handleSearchSubmit} className="text-[10px] font-black uppercase tracking-widest text-[#d82828] flex items-center gap-1.5 hover:gap-3 transition-all">Ver todos <ArrowRight size={12} /></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {(products.filter(p => p.name.toLowerCase().includes(navQuery.toLowerCase()))).slice(0, 6).map((product) => (
                          <Link 
                            key={product.id}
                            to={`/product/${product.id}`}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center gap-4 group p-4 rounded-[2rem] bg-white border border-black/5 hover:border-black/10 hover:shadow-2xl hover:shadow-black/5 transition-all active:scale-[0.98]"
                          >
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 shadow-sm group-hover:scale-95 transition-transform duration-500">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[9px] font-bold text-[#d82828] uppercase tracking-[0.2em]">{product.category}</span>
                              <h4 className="text-[14px] md:text-15px font-bold text-gray-950 uppercase tracking-tight truncate group-hover:text-[#d82828] transition-colors leading-tight">{product.name}</h4>
                              <span className="text-xs font-bold text-gray-900 mt-1">
                                {formatCurrency(product.price)}
                              </span>
                            </div>
                          </Link>
                        ))}
                        
                        {products.filter(p => p.name.toLowerCase().includes(navQuery.toLowerCase())).length === 0 && (
                           <div className="col-span-full py-20 text-center space-y-4">
                              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                 <Search className="text-gray-200" size={32} />
                              </div>
                              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{t("searchEmpty")}</p>
                           </div>
                        )}
                      </div>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                            <Sparkles size={14} className="text-[#d82828]" /> Sugestões Populares
                         </p>
                         <div className="flex flex-wrap gap-2">
                            {["Lifestyle", "Creative", "Travel", "Negócios", "Essential"].map((sug) => (
                               <button 
                                 key={sug}
                                 onClick={() => setNavQuery(sug)}
                                 className="px-6 py-3 bg-gray-50 hover:bg-black hover:text-white rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border border-black/5 shadow-sm"
                               >
                                  {sug}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-6 hidden md:block">
                         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Atalho Rápido</p>
                         <div className="p-8 rounded-[2.5rem] bg-gray-50/50 border border-black/5 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500 uppercase">Pesquisa Rápida</span>
                            <div className="flex gap-1.5">
                               <kbd className="px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-bold shadow-sm">Ctrl</kbd>
                               <span className="text-gray-300 font-bold">+</span>
                               <kbd className="px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-bold shadow-sm">K</kbd>
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Side Menu Overlay - Versão Simples e Direta */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Fundo Escuro que Fecha */}
            <motion.div 
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] cursor-pointer"
            />
            
            {/* Barra Lateral Branca */}
            <motion.div 
              key="menu-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-[400px] bg-white z-[3000] shadow-2xl flex flex-col pt-0 rounded-r-[2rem] overflow-hidden"
            >
              {/* Botão X Absoluto no Topo Direito */}
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-6 right-6 p-4 bg-black/5 hover:bg-black/10 rounded-full transition-all text-black z-[3010] active:scale-95"
                aria-label="Close"
              >
                <X size={24} strokeWidth={2.5} />
              </button>

              {/* Logo no Topo */}
              <div className="p-8 border-b border-black/5">
                <Link to="/" onClick={() => setIsMenuOpen(false)}>
                  <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
                </Link>
              </div>

              {/* Links de Navegação Simples */}
              <nav className="flex flex-col p-8 gap-1 overflow-y-auto flex-grow h-full custom-scrollbar">
                {navLinks.map((link, idx) => (
                  <Link 
                    key={idx}
                    to={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center justify-between group py-5 border-b border-black/5 last:border-0 hover:pl-2 transition-all"
                  >
                    <span className="text-2xl font-black uppercase tracking-tighter group-hover:text-[#d82828] transition-colors text-black">
                      {link.label}
                    </span>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-[#d82828] transition-all" />
                  </Link>
                ))}

                {/* Área de Membros Simples */}
                <a 
                  href="https://membros.gorgpresets.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-6 p-6 bg-black text-white rounded-2xl flex items-center justify-between group active:scale-95 transition-all shadow-xl shadow-black/20"
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">{t("memberAreaDesc")}</span>
                    <span className="text-lg font-bold uppercase tracking-tight">{t("memberArea")}</span>
                  </div>
                  <UserCheck size={20} />
                </a>

                {/* Seletores de Língua e Moeda Simples */}
                <div className="mt-auto pt-8 flex flex-col gap-6">
                  {/* Selectors grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("languageLabel")}</p>
                       <select 
                         value={language}
                         onChange={(e) => setLanguage(e.target.value as any)}
                         className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-[#d82828] transition-all appearance-none cursor-pointer"
                       >
                         <option value="PT">🇧🇷 PT</option>
                         <option value="EN">🇺🇸 EN</option>
                         <option value="ES">🇪🇸 ES</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("currencyLabel")}</p>
                       <select 
                         value={currency}
                         onChange={(e) => setCurrency(e.target.value as any)}
                         className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-black transition-all appearance-none cursor-pointer"
                       >
                         <option value="BRL">{t("countryBR")}</option>
                         <option value="USD">{t("countryUS")}</option>
                         <option value="EUR">{t("countryPT")}</option>
                       </select>
                    </div>
                  </div>

                  {/* Redes Sociais no Fim */}
                  <div className="flex items-center gap-4 border-t border-black/5 pt-8 mb-4">
                    <a href="https://www.instagram.com/gorgpresets" target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-50 rounded-full hover:text-[#d82828] transition-colors shadow-sm">
                      <Instagram size={20} strokeWidth={2} />
                    </a>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">© 2026 GORG PRESETS</p>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
