import useEmblaCarousel from "embla-carousel-react";
import AutoPlay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLanguage } from "@/store/languageStore";
import { useProducts } from "@/hooks/useProducts";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";

function CategoryCard({ name, images, originalName, count }: {
  name: string;
  images: string[];
  originalName: string;
  count: number;
}) {
  const urlSafeName = originalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const bgImage = images[0] || "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=800&h=600";

  return (
    <Link
      to={`/catalog?category=${urlSafeName}`}
      className="group relative flex flex-col justify-end overflow-hidden rounded-[2rem] md:rounded-[2.5rem] cursor-pointer block"
      style={{ aspectRatio: "3/4" }}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={bgImage}
          alt={name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
      </div>

      {/* Dark gradient overlay (Editorial style from Option A) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent transition-all duration-500 group-hover:from-black/90 group-hover:via-black/30" />

      {/* Text Content (Option A text + Option C polish) */}
      <div className="relative z-10 px-5 md:px-6 pb-6 md:pb-8 pt-10">
        
        {/* Animated Red Line (Option A) */}
        <div className="w-6 md:w-8 h-[2px] md:h-[3px] bg-[#d82828] mb-3 transition-all duration-500 ease-out group-hover:w-12 md:group-hover:w-16" />

        {/* Category name */}
        <h3 className="text-lg md:text-xl font-black uppercase tracking-[0.1em] text-white leading-none mb-1.5 md:mb-2">
          {name}
        </h3>

        {/* Counter and Animated Arrow */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50 transition-colors duration-300 group-hover:text-white/80">
            {count} {count === 1 ? "preset" : "presets"}
          </p>
          
          <ArrowRight 
            size={16} 
            className="text-white opacity-0 -translate-x-4 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:translate-x-0" 
          />
        </div>
      </div>
    </Link>
  );
}

export function CategoriesCarousel() {
  const { t } = useLanguage();
  const { products } = useProducts();

  const [emblaRef] = useEmblaCarousel(
    { align: "center", dragFree: false, loop: true },
    [AutoPlay({ delay: 3000, stopOnInteraction: false })]
  );

  const CATEGORIES_DATA = [
    { key: "cat1", originalName: "NEGÓCIOS" },
    { key: "cat2", originalName: "LIFESTYLE" },
    { key: "cat3", originalName: "ESSENTIAL" },
    { key: "cat4", originalName: "TRAVEL" },
    { key: "cat5", originalName: "CREATIVE" },
  ];

  const categoriesWithProducts = useMemo(() => {
    return CATEGORIES_DATA.map(config => {
      const categoryProducts = products.filter(p =>
        (p.category || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
        config.originalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );
      return {
        name: t(config.key as any),
        originalName: config.originalName,
        images: categoryProducts.map(p => p.image),
        count: categoryProducts.length,
      };
    });
  }, [products, t]);

  return (
    <section className="pt-4 pb-16 w-full overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center justify-center text-center mb-10"
        >
          <div className="relative inline-block">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-950 uppercase tracking-tighter mb-2">
              {t("categories")}
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "80%" }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-[3px] bg-[#d82828] mx-auto"
            />
          </div>
        </motion.div>

        {/* ── DESKTOP: Grid Responsivo ── */}
        <div className="hidden md:block">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
            className="grid grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {categoriesWithProducts.map((cat, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
              >
                <CategoryCard
                  name={cat.name}
                  images={cat.images}
                  originalName={cat.originalName}
                  count={cat.count}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── MOBILE: Carrossel ── */}
      <div className="md:hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
            }}
            className="flex gap-3 px-4"
          >
            {categoriesWithProducts.map((cat, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                className="flex-none w-[42vw] max-w-[170px]"
              >
                <CategoryCard
                  name={cat.name}
                  images={cat.images}
                  originalName={cat.originalName}
                  count={cat.count}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
