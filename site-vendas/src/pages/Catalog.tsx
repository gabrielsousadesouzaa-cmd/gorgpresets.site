import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { Search, LayoutGrid, ChevronDown } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<SortOption>("bestseller");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  // Sincroniza o parâmetro da URL com o estado interno
  useEffect(() => {
    // Categoria
    if (categoryParam) {
      const found = CATEGORIES.find(c => 
        c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
        categoryParam.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );
      if (found) {
        if (activeCategory !== found) {
          setActiveCategory(found);
          setCurrentPage(1);
        }
      }
    } else {
      if (activeCategory !== "Todos") {
        setActiveCategory("Todos");
        setCurrentPage(1);
      }
    }

    // Busca
    if (searchParam) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery("");
    }
    
    // Paginação via URL (opcional mas bom para o bug de recarregar)
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const p = parseInt(pageParam);
      if (!isNaN(p) && p > 0) setCurrentPage(p);
    }
  }, [categoryParam, searchParam]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1); // Reseta página ao mudar categoria
    if (cat === "Todos") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    }
    setSearchParams(searchParams);
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((product) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(q) || 
        product.category.toLowerCase().includes(q) ||
        (q === 'novidades' && product.isNew) ||
        ((q === 'best sellers' || q === 'mais vendidos') && product.isBestseller);
      
      const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "az": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "bestseller": result.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)); break;
    }
    return result;
  }, [products, activeCategory, sortBy, searchQuery]);

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
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
           <div className="w-12 h-12 border-4 border-[#d82828] border-t-transparent rounded-full animate-spin" />
           <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Buscando presets exclusivos...</p>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="container mx-auto px-6 max-w-[1400px] pt-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">
          
          {/* Sidebar de Filtros */}
          <aside className="w-full lg:w-[280px] shrink-0 lg:sticky lg:top-32 z-30 mb-2 lg:mb-0">
             <div className="lg:bg-white lg:rounded-[2.5rem] lg:border lg:border-black/5 lg:p-8 lg:shadow-2xl lg:shadow-black/10">
                <h3 className="hidden lg:block text-xl font-bold text-gray-950 uppercase tracking-tighter mb-8">{t("catNav")}</h3>
                
                {/* Título Mobile Discreto */}
                <p className="block lg:hidden text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 ml-1">{t("catFilter")}</p>

                <div className="flex overflow-x-auto lg:flex-col gap-2 lg:space-y-2 pb-4 lg:pb-0 scrollbar-hide -mx-6 px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                   <p className="hidden lg:block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-4 mb-4">{t("catFilter")}</p>
                   {CATEGORIES.map((cat) => (
                     <button
                       key={cat}
                       onClick={() => handleCategoryChange(cat)}
                       className={`shrink-0 lg:w-full text-center lg:text-left text-[11px] lg:text-[13px] font-bold uppercase tracking-widest py-3 px-5 lg:py-4 lg:px-6 rounded-full lg:rounded-2xl transition-all ${
                         activeCategory === cat 
                           ? 'bg-black text-white shadow-lg lg:scale-[1.02]' 
                           : 'bg-gray-100 lg:bg-transparent text-gray-400 hover:text-black hover:bg-gray-200 lg:hover:bg-gray-50 border border-black/5 lg:border-transparent'
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
            <div className="bg-white rounded-[2.5rem] border border-black/5 p-6 md:p-10 mb-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 scroll-mt-32">
               <div className="px-2">
                  <h1 className="text-2xl font-bold text-gray-950 uppercase tracking-tighter">
                    {activeCategory === "Todos" ? t("catAll") : t(CATEGORY_MAP[activeCategory] as any)}
                  </h1>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">
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
                   key={currentPage + activeCategory + searchQuery} 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   transition={{ duration: 0.3 }}
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
  );
}
