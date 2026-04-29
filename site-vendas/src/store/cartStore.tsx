import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "../data/products";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLanguage } from "@/store/languageStore";

export interface CartItem {
  product: Product;
  isFree: boolean;
}

interface CartContextType {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
   getSubtotal: () => number;
   getPromoDiscount: () => number;
   getTotal: () => number;
   getOriginalTotal: () => number;
   getSavings: () => number;
   getItemsWithPromo: () => CartItem[];
 }

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings } = useSiteSettings();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [rawItems, setRawItems] = useState<Product[]>(() => {
    // Tenta carregar do localStorage no início
    const saved = typeof window !== 'undefined' ? localStorage.getItem("gorg_cart") : null;
    return saved ? JSON.parse(saved) : [];
  });

  // Salva no localStorage sempre que o carrinho mudar
  React.useEffect(() => {
    localStorage.setItem("gorg_cart", JSON.stringify(rawItems));
  }, [rawItems]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addItem = (product: Product) => {
    setRawItems((prev) => {
      // Impede duplicata
      if (prev.find((p) => p.id === product.id)) {
        toast.error(language === 'PT' ? "Este preset já está no seu carrinho!" : "This preset is already in your cart!");
        return prev;
      }
      setIsOpen(true); // Abre o carrinho automaticamente
      return [...prev, product];
    });
  };

  const removeItem = (productId: string) => {
    setRawItems((prev) => prev.filter((p) => p.id !== productId));
  };

  const getSubtotal = () => rawItems.reduce((acc, curr) => acc + curr.price, 0);

  const getPromoDiscount = () => {
    const numFree = Math.floor(rawItems.length / 3);
    if (numFree === 0) return 0;
    
    // Pegamos os X itens mais baratos
    const sorted = [...rawItems].sort((a, b) => a.price - b.price);
    return sorted.slice(0, numFree).reduce((acc, curr) => acc + curr.price, 0);
  };

  const getTotal = () => getSubtotal() - getPromoDiscount();

  const getOriginalTotal = () => rawItems.reduce((acc, curr) => acc + (curr.originalPrice || curr.price), 0);
  const getSavings = () => getOriginalTotal() - getTotal();

  const getItemsWithPromo = (): CartItem[] => {
    if (rawItems.length < 3) {
      return rawItems.map((p) => ({ product: p, isFree: false }));
    }

    const numFree = Math.floor(rawItems.length / 3);
    const sorted = [...rawItems].sort((a, b) => a.price - b.price);
    const freeIds = sorted.slice(0, numFree).map(p => p.id);

    return rawItems.map((p) => ({
      product: p,
      isFree: freeIds.includes(p.id),
    }));
  };

  const value = {
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    items: getItemsWithPromo(),
    addItem,
    removeItem,
    getSubtotal,
    getPromoDiscount,
    getTotal,
    getOriginalTotal,
    getSavings,
    getItemsWithPromo,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
