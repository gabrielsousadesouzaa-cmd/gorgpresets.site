import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SalesPopup } from "./SalesPopup";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />
      <main className="flex-grow w-full">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <SalesPopup />
    </div>
  );
}
