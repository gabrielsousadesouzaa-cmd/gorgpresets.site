import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/store/cartStore";
import { useLanguage } from "@/store/languageStore";
import { useCurrency } from "@/store/currencyStore";
import { useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ShoppingBag, Search, Menu, X, Instagram, ChevronDown, UserCheck, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const navigate = useNavigate();
  const { items, openCart } = useCart();
  const { settings } = useSiteSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
    <div className="flex flex-col w-full relative z-50">
      {/* Red Announcement Bar */}
      <div className="w-full bg-[#d82828] text-white py-2 text-center text-[10px] md:text-sm font-semibold uppercase tracking-[0.2em]">
        {settings.promoBar[language] || t("promoBar")}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[100] flex flex-col pt-6 md:pt-20 px-4 md:px-12 overflow-y-auto custom-scrollbar"
          >
            <div className="container mx-auto max-w-5xl w-full relative">
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="absolute -top-4 md:top-0 -right-2 p-3 text-black hover:text-[#d82828] hover:scale-110 active:scale-95 transition-all z-[110]"
                aria-label="Close Search"
              >
                <X size={32} strokeWidth={2.5} />
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


      {/* Side Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 h-[100dvh] min-h-screen w-[85%] max-w-[400px] bg-white/40 backdrop-blur-2xl z-50 shadow-[0_0_100px_rgba(0,0,0,0.15)] border-r border-white/20 flex flex-col pt-0 overflow-hidden rounded-r-[2.5rem]"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-7 border-b border-white/10">
                <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-black"
                >
                  <X size={20} />
                </button>
              </div>
              {/* Navigation Links */}
              <nav className="flex flex-col p-8 gap-5 overflow-y-auto flex-grow">
                {navLinks.map((link, idx) => (
                  <Link 
                    key={idx}
                    to={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block"
                  >
                    <motion.span 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + (idx * 0.05), duration: 0.4, ease: "easeOut" }}
                      className="text-3xl font-bold uppercase tracking-tighter hover:text-[#d82828] transition-colors text-black"
                    >
                      {link.label}
                    </motion.span>
                  </Link>
                ))}

                {/* Área de Membros Especial Link */}
                <motion.a
                  href="https://membros.gorgpresets.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="mt-4 p-6 bg-black text-white rounded-[2rem] flex items-center justify-between group overflow-hidden relative shadow-2xl shadow-black/40 active:scale-95 transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                   <div className="absolute top-0 right-0 w-24 h-24 bg-[#d82828]/20 blur-2xl rounded-full translate-x-5 -translate-y-5" />
                   <div className="relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">{t("memberAreaDesc")}</p>
                      <h4 className="text-xl font-bold uppercase tracking-tighter">{t("memberArea")}</h4>
                   </div>
                   <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#d82828] transition-all relative z-10">
                      <UserCheck size={18} />
                   </div>
                </motion.a>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="mt-8 pt-8 border-t border-white/10 flex gap-4"
                >
                  {/* Language Selector */}
                  <div className="flex-1 space-y-3">
                    <p className="text-[11px] font-semibold text-black uppercase tracking-[0.2em] ml-1">{t("languageLabel")}</p>
                    <div className="relative group">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="w-full bg-white/20 border-2 border-white/10 text-black/80 rounded-[1.4rem] px-5 py-4 font-semibold text-sm outline-none ring-0 focus:border-[#d82828] transition-all cursor-pointer appearance-none shadow-sm backdrop-blur-md"
                      >
                        <option value="PT">🇧🇷 PT</option>
                        <option value="EN">🇺🇸 EN</option>
                        <option value="ES">🇪🇸 ES</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/40 group-hover:text-black/60 transition-colors">
                        <ChevronDown size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>

                  {/* Currency Selector */}
                  <div className="flex-1 space-y-3">
                    <p className="text-[11px] font-semibold text-black uppercase tracking-[0.2em] ml-1">{t("currencyLabel")}</p>
                    <div className="relative group">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="w-full bg-white/20 border-2 border-white/10 text-black/80 rounded-[1.4rem] px-5 py-4 font-semibold text-sm outline-none ring-0 focus:border-black transition-all cursor-pointer appearance-none shadow-sm backdrop-blur-md"
                      >
                        <option value="BRL">{t("countryBR")}</option>
                        <option value="USD">{t("countryUS")}</option>
                        <option value="EUR">{t("countryPT")}</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/40 group-hover:text-black/60 transition-colors">
                        <ChevronDown size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </nav>

              {/* Social Footer */}
              <div className="p-7 border-t border-white/10 bg-white/10 mt-auto">
                 <div className="flex items-center gap-4">
                    <a 
                      href="https://www.instagram.com/gorgpresets" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white/30 rounded-full shadow-sm hover:text-[#d82828] transition-colors border border-white/20"
                    >
                       <Instagram size={17} strokeWidth={2.5} />
                    </a>
                 </div>
                 <p className="mt-4 text-[9px] font-bold text-black uppercase tracking-[0.2em] px-0.5">
                    © 2026 GORG PRESETS
                 </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>

  );
}
