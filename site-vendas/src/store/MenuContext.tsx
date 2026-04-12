import { createContext, useContext, useState, ReactNode } from "react";

interface MenuContextType {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isProductStickyVisible: boolean;
  setIsProductStickyVisible: (visible: boolean) => void;
  closeAll: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProductStickyVisible, setIsProductStickyVisible] = useState(false);

  const closeAll = () => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setIsProductStickyVisible(false);
  };

  return (
    <MenuContext.Provider value={{ 
      isMenuOpen, setIsMenuOpen, 
      isSearchOpen, setIsSearchOpen, 
      isProductStickyVisible, setIsProductStickyVisible,
      closeAll 
    }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}
