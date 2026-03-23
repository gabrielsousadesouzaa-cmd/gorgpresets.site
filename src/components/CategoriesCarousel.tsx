import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLanguage } from "@/store/languageStore";
import { useProducts } from "@/hooks/useProducts";
import { useMemo } from "react";

function CategoryItem({ name, images, originalName }: { name: string; images: string[]; originalName: string }) {
  const urlSafeName = originalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const displayImages = images.length >= 4 ? images.slice(0, 4) : [
    ...images,
    ...(Array(4 - images.length).fill("https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=400&h=400"))
  ].slice(0, 4);

  return (
    <Link to={`/catalog?category=${urlSafeName}`} className="flex flex-col items-center gap-4 group cursor-pointer block">
      <div className="relative w-full aspect-square rounded-[2rem] border border-black/5 p-2 shadow-lg bg-white hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-1">
        <div className="grid grid-cols-2 grid-rows-2 gap-[2px] w-full h-full rounded-2xl overflow-hidden">
          {displayImages.map((img, i) => (
            <img 
              key={i}
              src={img} 
              alt={name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            />
          ))}
        </div>
      </div>
      <h3 className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-[#333]">
        {name}
      </h3>
    </Link>
  );
}

export function CategoriesCarousel() {
  const { t } = useLanguage();
  const { products } = useProducts();
  const [emblaRef] = useEmblaCarousel({ align: "start", dragFree: true });

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
        images: categoryProducts.map(p => p.image)
      };
    });
  }, [products, t]);

  return (
    <section className="py-8 w-full overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center justify-center text-center mb-10"
        >
          <div className="relative inline-block">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-[#333] pb-1">
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
      </div>

      <div className="md:container md:mx-auto px-0 md:px-8">
        <div className="overflow-visible py-4 -my-4" ref={emblaRef}>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="flex pl-4 md:pl-0 md:justify-center"
          >
            {categoriesWithProducts.map((cat, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                  }
                }}
                className="flex-none pl-6 md:pl-4 lg:pl-6 w-[60%] sm:w-[35%] md:w-[25%] lg:w-[18%] transform-gpu"
              >
                <CategoryItem name={cat.name} images={cat.images} originalName={cat.originalName} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
