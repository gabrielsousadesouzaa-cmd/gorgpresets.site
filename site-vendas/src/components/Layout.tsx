import { useState, useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SalesPopup } from "./SalesPopup";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-sans transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      <Header />
      <main className="flex-grow w-full min-h-[80vh]">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <SalesPopup />
    </div>
  );
}
