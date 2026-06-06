import { useState, useMemo, useEffect, useRef } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useSearchParams } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, LayoutGrid, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/store/languageStore";

const CATEGORIES = ["Todos", "Negócios", "Lifestyle", "Essential", "Travel", "Creative"];
const CATEGORY_MAP: Record<string, any> = {
  "Todos": "catAll",
  "Negócios": "cat1",
  "Lifestyle": "cat2",
  "Essential": "cat3",
  "Travel": "cat4",
  "Creative": "cat5"
};
type SortOption = "bestseller" | "price-asc" | "price-desc" | "az";
const ITEMS_PER_PAGE = 12;

export default function Catalog() {
  const { t } = useLanguage();
  const { products, loading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");

  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("bestseller");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  // Extrai todas as vibes únicas dos produtos disponíveis
  const allVibes = useMemo(() => {
    const vibes = new Set<string>();
    products.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tag => {
          if (tag.trim()) vibes.add(tag.trim());
        });
      }
    });
    return Array.from(vibes).sort();
  }, [products]);

  // Sincroniza o parâmetro da URL com o estado interno
  useEffect(() => {
    // Categoria
    if (categoryParam) {
      const found = CATEGORIES.find(c => 
        c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
        categoryParam.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );
      if (found) {
        setActiveCategory(found);
        setActiveVibe(null); // Reseta vibe ao mudar categoria pela URL
        setCurrentPage(1);
      }
    } else {
      setActiveCategory("Todos");
      setActiveVibe(null);
      setCurrentPage(1);
    }

    // Busca
    if (searchParam) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery("");
    }
    
    // Paginação via URL
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const p = parseInt(pageParam);
      if (!isNaN(p) && p > 0) setCurrentPage(p);
    }
  }, [categoryParam, searchParam]);

  const handleCategoryChange = (cat: string) => {
    // Atualização imediata do estado para performance máxima
    setActiveCategory(cat);
    setActiveVibe(null);
    setCurrentPage(1);

    // Atualização da URL para persistência
    if (cat === "Todos") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    }
    searchParams.delete("page");
    setSearchParams(searchParams);

    // Scroll suave para o início da lista no mobile
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((product) => {
      const q = searchQuery.toLowerCase().trim();
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(q) || 
        normalize(product.category).includes(q) ||
        (product.tags && product.tags.some(tag => normalize(tag).includes(q))) ||
        (q === 'novidades' && product.isNew) ||
        ((q === 'best sellers' || q === 'mais vendidos') && product.isBestseller);
      
      const matchesCategory = activeCategory === "Todos" || normalize(product.category) === normalize(activeCategory);
      const matchesVibe = !activeVibe || (product.tags && product.tags.some(tag => normalize(tag) === normalize(activeVibe!)));

      return matchesSearch && matchesCategory && matchesVibe;
    });

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "az": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "bestseller": result.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)); break;
    }
    return result;
  }, [products, activeCategory, activeVibe, sortBy, searchQuery]);

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    searchParams.set("page", String(newPage));
    setSearchParams(searchParams);
    
    // Scroll preciso para o início da lista
    if (catalogTopRef.current) {
      const offset = 100; // Compensação para o header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = catalogTopRef.current.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Reseta página ao mudar ordenação ou busca
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, searchQuery]);

  if (loading) {
     return (
        <div className="container mx-auto px-6 max-w-[1400px] pt-12 space-y-12 animate-in fade-in duration-500">
           <div className="flex flex-col lg:flex-row gap-8 items-start">
              <Skeleton className="w-full lg:w-[280px] h-[450px] rounded-[2.5rem] shrink-0" />
              <div className="flex-1 space-y-8 w-full">
                 <Skeleton className="w-full h-32 rounded-[2.5rem]" />
                 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                    {[1,2,3,4,5,6,7,8].map(i => (
                       <div key={i} className="space-y-4">
                          <Skeleton className="w-full aspect-[4/5] rounded-[2rem]" />
                          <div className="space-y-2 px-1">
                             <Skeleton className="w-full h-5 rounded-md" />
                             <Skeleton className="w-2/3 h-4 rounded-md opacity-60" />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
     );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-white pb-24">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1400px] pt-0 lg:pt-12">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start relative -mt-2 lg:mt-0">
          
          {/* Sidebar de Filtros - Versão Premium Floating Glass */}
          <aside className="w-full lg:w-[280px] shrink-0 lg:sticky lg:top-32 z-30 mb-6 lg:mb-0">
             <div className="lg:bg-white/85 lg:backdrop-blur-2xl lg:rounded-[2.8rem] lg:border lg:border-black/[0.08] lg:p-8 lg:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.12)] lg:hover:shadow-[0_45px_80px_-20px_rgba(0,0,0,0.15)] transition-all duration-700">
                <h3 className="hidden lg:block text-xl font-black text-gray-950 uppercase tracking-tighter mb-10 pl-1 border-l-4 border-[#d82828]">
                  {t("catNav")}
                </h3>
                
                <div className="hidden lg:flex lg:flex-col gap-2 space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-4 mb-4">{t("catFilter")}</p>
                   {CATEGORIES.map((cat) => (
                     <button
                       key={cat}
                       onClick={() => handleCategoryChange(cat)}
                       className={`w-full text-left text-[13px] font-bold uppercase tracking-widest py-4 px-6 rounded-2xl transition-all ${
                         activeCategory === cat 
                           ? 'bg-black text-white shadow-lg scale-[1.02]' 
                           : 'text-gray-400 hover:text-black hover:bg-gray-50'
                       }`}
                     >
                       {t(CATEGORY_MAP[cat] as any)}
                     </button>
                   ))}
                </div>
             </div>
          </aside>

          {/* Grid Principal */}
          <main className="flex-1 w-full" ref={catalogTopRef}>
            <div 
               className="rounded-[1.8rem] sm:rounded-[2.5rem] border border-black/[0.06] p-5 sm:p-10 mb-6 lg:mb-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-6 scroll-mt-32"
               style={{ background: 'radial-gradient(circle at center, #ffffff 20%, #f2f2f2 100%)' }}
            >
               <div className="px-2 relative">
                  <button 
                    onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                    className="group flex items-center gap-3 active:scale-95 transition-all text-left"
                  >
                    <h1 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter group-hover:text-[#d82828] transition-colors">
                      {activeCategory === "Todos" ? t("catAll") : t(CATEGORY_MAP[activeCategory] as any)}
                    </h1>
                    <div className="lg:hidden w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                      <ChevronDown size={14} strokeWidth={3} className={isFilterDrawerOpen ? 'rotate-180' : ''} />
                    </div>
                  </button>

                  {/* Mobile Inline Dropdown */}
                  <AnimatePresence>
                    {isFilterDrawerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="lg:hidden absolute top-full left-0 mt-4 w-64 bg-white rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] border border-black/5 p-3 z-[100] origin-top-left"
                      >
                         <div className="flex flex-col gap-1">
                            {CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => {
                                  handleCategoryChange(cat);
                                  setIsFilterDrawerOpen(false);
                                }}
                                className={`w-full text-left py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all ${
                                  activeCategory === cat ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'
                                }`}
                              >
                                {t(CATEGORY_MAP[cat] as any)}
                              </button>
                            ))}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2 ml-1">
                    {t("catShowing")} {filteredAndSortedProducts.length} {t("catItems")}
                  </p>
               </div>

               <div className="flex flex-wrap items-center gap-4 md:gap-8 px-2">
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("catSort")}</span>
                     <div className="relative group min-w-[180px]">
                       <select 
                         value={sortBy}
                         onChange={(e) => setSortBy(e.target.value as SortOption)}
                         className="w-full bg-gray-100/50 border-none rounded-2xl px-5 py-4 text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer hover:bg-gray-100 transition-all appearance-none pr-10"
                       >
                          <option value="bestseller">{t("sortBestseller")}</option>
                          <option value="price-asc">{t("sortPriceAsc")}</option>
                          <option value="price-desc">{t("sortPriceDesc")}</option>
                          <option value="az">{t("sortAz")}</option>
                       </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={16} strokeWidth={3} />
                       </div>
                     </div>
                  </div>

                  <div className="h-10 w-px bg-black/5 hidden md:block" />

                  <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden sm:inline">{t("catView")}</span>
                      <div className="p-3.5 bg-black text-white rounded-2xl shadow-lg">
                        <LayoutGrid size={20} strokeWidth={2.5} />
                      </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 min-h-[400px]">
               <AnimatePresence mode="wait">
               <motion.div 
                   key={`catalog-grid-${activeCategory}-${currentPage}-${searchQuery}`} 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.12 }}
                   className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 contents"
                 >
                   {currentItems.map((product) => (
                     <div key={product.id}>
                       <ProductCard product={product} />
                     </div>
                   ))}
                 </motion.div>
               </AnimatePresence>
            </div>

            {/* Controles de Paginação */}
            {totalPages > 1 && (
               <div className="flex items-center justify-center gap-2 mt-16">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl border border-black/5 bg-white text-gray-400 hover:text-black hover:border-black transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                     <ChevronDown className="rotate-90" size={20} />
                  </button>

                  <div className="flex items-center gap-1.5 px-4 bg-gray-50/50 rounded-[2rem] border border-black/5 py-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[40px] h-10 px-3 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all ${
                          currentPage === page 
                            ? 'bg-black text-white shadow-xl shadow-black/20' 
                            : 'text-gray-400 hover:text-black'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl border border-black/5 bg-white text-gray-400 hover:text-black hover:border-black transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                     <ChevronDown className="-rotate-90" size={20} />
                  </button>
               </div>
            )}

            {filteredAndSortedProducts.length === 0 && (
               <div className="py-32 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-black/10 mt-10">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Search size={32} className="text-gray-200" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-950 mb-2">{t("catEmpty")}</h3>
                  <button onClick={() => handleCategoryChange("Todos")} className="mt-8 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-all">{t("catEmptyBtn")}</button>
               </div>
            )}
          </main>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
