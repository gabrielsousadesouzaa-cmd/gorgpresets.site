import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, CheckCircle2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/data/products";
import { useLanguage } from "@/store/languageStore";
import { useMenu } from "@/store/MenuContext";

const buyersBR = [
  { name: "Ana P.", city: "São Paulo, SP" },
  { name: "Mariana S.", city: "Rio de Janeiro, RJ" },
  { name: "Carolina C.", city: "Belo Horizonte, MG" },
  { name: "Amanda T.", city: "Salvador, BA" },
  { name: "Bruna M.", city: "Curitiba, PR" },
  { name: "Gabriela F.", city: "Florianópolis, SC" },
  { name: "Camila R.", city: "Brasília, DF" },
  { name: "Letícia F.", city: "Fortaleza, CE" },
  { name: "Julia L.", city: "Goiânia, GO" },
  { name: "Beatriz A.", city: "Porto Alegre, RS" }
];

const buyersIntl = [
  { name: "Emma W.", city: "New York, USA" },
  { name: "Olivia S.", city: "Los Angeles, USA" },
  { name: "Sophia M.", city: "Toronto, CA" },
  { name: "Juliette L.", city: "Paris, FR" },
  { name: "Isabella R.", city: "Roma, IT" },
  { name: "Sofia G.", city: "Madrid, ES" },
  { name: "Ava J.", city: "London, UK" },
  { name: "Lena M.", city: "Berlin, DE" },
  { name: "Valentina M.", city: "Buenos Aires, AR" },
  { name: "Luciana V.", city: "Santiago, CL" },
  { name: "Victoria N.", city: "Mexico City, MX" },
  { name: "Mia D.", city: "Sydney, AU" },
  { name: "Yuki S.", city: "Tokyo, JP" }
];

const timesPt = ["Há 2 min", "Há 5 min", "Há 12 min", "Há 20 min", "Há 35 min", "Há cerca de 1 hora"];
const timesEn = ["2 mins ago", "5 mins ago", "12 mins ago", "20 mins ago", "35 mins ago", "about 1 hour ago"];
const timesEs = ["Hace 2 min", "Hace 5 min", "Hace 12 min", "Hace 20 min", "Hace 35 min", "Hace 1 hora"];

export function SalesPopup() {
  const { products } = useProducts();
  const { language } = useLanguage();
  const { isProductStickyVisible } = useMenu();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false); // se o user fechar no X, não volta mais
  const [currentSale, setCurrentSale] = useState<{
     buyerInfo: { name: string; city: string; };
     product: Product;
     time: string;
  } | null>(null);

  useEffect(() => {
    // If user dismissed it permanently or no products exist, do nothing
    if (isDismissed || !products || products.length === 0) return;

    const showRandomSale = () => {
      let timesArray = timesPt;
      if (language === 'EN') timesArray = timesEn;
      else if (language === 'ES') timesArray = timesEs;

      // 80% de chance de ser alguém do Brasil
      const isBR = Math.random() < 0.8;
      const buyerList = isBR ? buyersBR : buyersIntl;

      const randomBuyer = buyerList[Math.floor(Math.random() * buyerList.length)];
      const randomTime = timesArray[Math.floor(Math.random() * timesArray.length)];
      
      // Favorecer os Best Sellers, mas aleatório
      const randomProduct = products[Math.floor(Math.random() * products.length)];

      setCurrentSale({
        buyerInfo: randomBuyer,
        product: randomProduct,
        time: randomTime
      });
      setIsVisible(true);

      // Hide after 6 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 6000);
    };

    // Initial delay before first popup
    const initialTimer = setTimeout(() => {
      showRandomSale();
    }, 22000); // Mostra o primeiro popup após 22 seg

    // Set interval for subsequent popups
    const interval = setInterval(() => {
      showRandomSale();
    }, 25000 + Math.random() * 10000); // Intervalo aleatório entre 25s e 35s

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [products, language, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true); // Se ele clicar no X, a gente respeita e não mostra mais na sessão
  };

  const textPurchased = language === 'EN' ? 'purchased' : language === 'ES' ? 'adquirió' : 'adquiriu';

  return (
    <AnimatePresence>
      {isVisible && currentSale && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed left-6 z-[150] w-[calc(100%-48px)] max-w-[260px] md:max-w-[280px] md:left-10"
          style={{ 
            bottom: isProductStickyVisible 
              ? "120px" 
              : (window.innerWidth < 1024 ? "24px" : "40px") 
          }}
        >
          {/* Fundo Glassmorphism Luxuoso */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-2 pr-7 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/50 overflow-hidden group">
            
            {/* Fechar Invisível até hover */}
            <button 
              onClick={handleDismiss} 
              className="absolute top-3 right-3 text-gray-400 hover:text-black transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-95"
            >
              <X size={14} strokeWidth={3} />
            </button>

            {/* Imagem do Produto */}
            <div className="w-11 h-11 md:w-13 md:h-13 rounded-xl overflow-hidden shrink-0 border border-black/5 shadow-sm relative">
              <img 
                src={currentSale.product.image} 
                alt={currentSale.product.name}
                className="w-full h-full object-cover"
              />
              {/* Overlay Sutil */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Informações */}
            <div className="flex flex-col min-w-0 flex-grow pt-0.5">
              <div className="flex items-center gap-1.5 mb-1 md:mb-1.5 leading-none">
                <p className="text-[10px] md:text-[11px] font-bold text-gray-950 truncate max-w-[100px] md:max-w-[120px]">
                  {currentSale.buyerInfo.name}
                </p>
                <span className="text-emerald-500 shrink-0 flex items-center">
                  <CheckCircle2 size={12} strokeWidth={2.5} className="md:w-3.5 md:h-3.5" />
                </span>
                <span className="text-[10px] md:text-[11px] text-gray-500 shrink-0">{textPurchased}</span>
              </div>
              
              <p className="text-[11px] md:text-[13px] font-black uppercase tracking-tighter text-[#d82828] truncate mb-0.5 md:mb-1">
                {currentSale.product.name}
              </p>
              
              <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                <MapPin size={8} className="shrink-0 md:w-2.5 md:h-2.5" />
                <span className="truncate">{currentSale.buyerInfo.city}</span>
                <span className="mx-0.5 md:mx-1">•</span>
                <span className="shrink-0">{currentSale.time}</span>
              </div>
            </div>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
