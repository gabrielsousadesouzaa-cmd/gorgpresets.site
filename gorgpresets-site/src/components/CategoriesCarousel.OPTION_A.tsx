import useEmblaCarousel from "embla-carousel-react";
import AutoPlay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLanguage } from "@/store/languageStore";
import { useProducts } from "@/hooks/useProducts";
import { useMemo } from "react";

function CategoryCard({ name, images, originalName, count }: {
  name: string;
  images: string[];
  originalName: string;
  count: number;
}) {
  const urlSafeName = originalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const bgImage = images[0] || "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=600&h=900";

  return (
    <Link
      to={`/catalog?category=${urlSafeName}`}
      className="group relative flex flex-col justify-end overflow-hidden rounded-[1.5rem] cursor-pointer block w-full h-full"
    >
      {/* Background full-cover image */}
      <div className="absolute inset-0">
        <img
          src={bgImage}
          alt={name}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      {/* Text overlay */}
      <div className="relative z-10 px-4 pb-5 pt-10">
        <div className="w-6 h-[2px] bg-[#d82828] mb-2 transition-all duration-300 group-hover:w-10" />
        <h3 className="text-sm md:text-base font-black uppercase tracking-[0.1em] text-white leading-none mb-1">
          {name}
        </h3>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors duration-300 group-hover:text-white/70">
          {count} {count === 1 ? "preset" : "presets"}
        </p>
      </div>
    </Link>
  );
}

export function CategoriesCarousel() {
  const { t } = useLanguage();
  const { products } = useProducts();

  const [emblaRef] = useEmblaCarousel(
    { align: "center", dragFree: true, loop: true },
    [AutoPlay({ delay: 3500, stopOnInteraction: true })]
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

  const header = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center justify-center text-center mb-8"
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
  );

  return (
    <section className="pt-4 pb-14 w-full overflow-hidden">

      {/* ── DESKTOP: grid que preenche toda a largura ── */}
      <div className="hidden md:block container mx-auto px-4 md:px-8">
        {header}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-5 gap-3 w-full"
          style={{ height: "280px" }}
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
              className="h-full"
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

      {/* ── MOBILE: carrossel centralizado ── */}
      <div className="md:hidden">
        <div className="px-4">
          {header}
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
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
                className="flex-none w-[140px]"
                style={{ height: "210px" }}
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
