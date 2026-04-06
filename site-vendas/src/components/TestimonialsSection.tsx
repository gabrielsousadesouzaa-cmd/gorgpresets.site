import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "@/store/languageStore";
import { useSiteSettings } from "@/hooks/useSiteSettings";


function TestimonialItem({ testimonial, index }: { testimonial: any, index: number }) {
  const { getLocalized, t } = useSiteSettings();
  return (
    <div
      className="bg-card p-6 md:p-8 rounded-[2rem] shadow-md border border-border/50 h-full flex flex-col md:hover:shadow-xl card-hover"
    >
      <div className="flex gap-1 mb-4 text-yellow-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={16} fill="currentColor" strokeWidth={1} />
        ))}
      </div>

      <div className="flex-1 mb-6">
        <p className="text-sm md:text-base italic text-muted-foreground/90 leading-relaxed font-normal">
          "{getLocalized(testimonial.content) || (t as any)(`test${index + 1}Text`)}"
        </p>
      </div>

      <div className="flex items-center gap-4 mt-auto">
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className="w-12 h-12 min-w-[3rem] min-h-[3rem] shrink-0 rounded-full object-cover border-2 border-[#d82828] bg-secondary pointer-events-none select-none"
          loading="eager"
          draggable={false}
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.src = `https://api.dicebear.com/7.x/notionists/svg?seed=${testimonial.name}&backgroundColor=transparent`;
          }}
        />
        <div>
          <h4 className="font-semibold text-sm text-foreground tracking-wide">
            {testimonial.name}
          </h4>
          <p className="text-xs text-muted-foreground font-normal uppercase tracking-widest mt-0.5">
            {testimonial.role}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const { t } = useLanguage();
  const { settings } = useSiteSettings();
  const testimonials = settings.testimonials;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center" },
    [
      Autoplay({
        delay: 5000,
        stopOnInteraction: false,
      }),
    ]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <section className="pt-4 md:pt-6 pb-8 relative w-full overflow-hidden">
      <div className="md:container md:mx-auto px-4 md:px-8 flex justify-center text-center mb-8">
        <div className="relative inline-block">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-950 uppercase tracking-tighter mb-2">
            {t("testiTitle1")}{t("testiTitle2")}
          </h2>
          <motion.div 
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-[3px] bg-[#d82828] origin-center"
          />
        </div>
      </div>

      <div className="md:container px-0 md:px-8 relative">
        {/* Carrossel */}
        <div className="overflow-hidden py-12 -my-12 px-8 -mx-8" ref={emblaRef}>
          <div className="flex cursor-grab active:cursor-grabbing px-4">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="flex-none px-3 w-[82%] sm:w-[45%] md:w-[33.33%] lg:w-[25%]"
              >
                <TestimonialItem testimonial={testimonial} index={idx} />
              </div>
            ))}
          </div>
        </div>

        {/* Setas (Apenas Desktop) */}
        <div className="hidden md:flex justify-between absolute top-1/2 -translate-y-1/2 w-[105%] left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="rounded-full w-12 h-12 border-border bg-background shadow-lg hover:scale-105 transition-transform pointer-events-auto"
          >
            <ChevronLeft size={24} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="rounded-full w-12 h-12 border-border bg-background shadow-lg hover:scale-105 transition-transform pointer-events-auto"
          >
            <ChevronRight size={24} />
          </Button>
        </div>
      </div>
    </section>
  );
}
