import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { inMembersArea, inStudio, isMembersHost, isStoreHost } from "./members/lib/paths";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/store/cartStore";
import { CurrencyProvider } from "@/store/currencyStore";
import { LanguageProvider } from "@/store/languageStore";
import { Layout } from "@/components/Layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MenuProvider } from "@/store/MenuContext";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { lazy, Suspense, useEffect } from "react";
import { SiteTracker } from "@/components/SiteTracker";

const Index = lazy(() => import("./pages/Index"));
const Catalog = lazy(() => import("./pages/Catalog"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Shipping = lazy(() => import("./pages/Shipping"));
const Refund = lazy(() => import("./pages/Refund"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MembersApp = lazy(() => import("./members/MembersApp"));

const queryClient = new QueryClient();

import { FlyToCartProvider } from "@/components/FlyToCart";

// A área de membros tem tema escuro; o Studio e a loja usam o tema claro.
function AppToaster() {
  const { pathname } = useLocation();
  const members = inMembersArea(pathname);
  const dark = members && !inStudio(pathname);
  return <Toaster position={members ? "top-center" : "top-right"} expand={true} richColors theme={dark ? "dark" : "light"} />;
}

const membersFallback = <div className="min-h-screen bg-black" />;

/** No endereço próprio, links no formato antigo (/membros/colecao/x) abrem a página certa. */
function DropMembersPrefix() {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/membros(?=\/|$)/, "") || "/";
  return <Navigate to={`${rest}${search}${hash}`} replace />;
}

/**
 * area.gorgpresets.com: só a área de membros, na raiz (/colecao/x, /studio),
 * sem nada da loja (carrinho, cabeçalho, rastreio de visitas). Fora do Google.
 */
function MembersSite() {
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppToaster />
        <ScrollToTop />
        <Routes>
          <Route path="/membros/*" element={<DropMembersPrefix />} />
          <Route
            path="/*"
            element={
              <Suspense fallback={membersFallback}>
                <MembersApp />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function App() {
  if (isMembersHost()) return <MembersSite />;
  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>
        <LanguageProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <CartProvider>
              <FlyToCartProvider>
                <BrowserRouter>
                  <AppToaster />
                  <MenuProvider>
                    <ScrollToTop />
                    <SiteTracker />
                  <Routes>
                    {/* Admin sem Layout */}
                    <Route 
                      path="/admin" 
                      element={
                        <Suspense fallback={<div className="min-h-screen bg-white" />}>
                          <Admin />
                        </Suspense>
                      } 
                    />
                    {/* Área de membros nova: só nas prévias e no computador. Na loja (gorgpresets.com) ainda não
                        existe — ela fica em area.gorgpresets.com e o cabeçalho segue levando para a área antiga
                        até todos os produtos estarem configurados. */}
                    {!isStoreHost() && (
                      <Route
                        path="/membros/*"
                        element={
                          <Suspense fallback={membersFallback}>
                            <MembersApp />
                          </Suspense>
                        }
                      />
                    )}
                    {/* Checkout próprio (BuckPay) removido: as vendas usam o GGCheckout pelo carrinho. */}
                    <Route path="/checkout" element={<Navigate to="/" replace />} />

                    {/* Site Geral com Layout fixo e estático */}
                    <Route 
                      path="*" 
                      element={
                        <Layout>
                          <Suspense fallback={
                            <div className="w-full max-w-[1350px] mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10 animate-in fade-in duration-500">
                              <Skeleton className="w-full h-[65vh] md:h-[70vh] rounded-[2.5rem] md:rounded-[3rem]" />
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                                {[1,2,3,4].map(i => <Skeleton key={i} className="w-full aspect-[4/5] rounded-[1.5rem] md:rounded-[2rem]" />)}
                              </div>
                            </div>
                          }>
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/catalog" element={<Catalog />} />
                              <Route path="/product/:slug" element={<ProductDetail />} />
                              <Route path="/faq" element={<FAQ />} />
                              <Route path="/contact" element={<Contact />} />
                              <Route path="/terms" element={<Terms />} />
                              <Route path="/shipping" element={<Shipping />} />
                              <Route path="/refund" element={<Refund />} />
                              <Route path="/privacy" element={<Privacy />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </Layout>
                      } 
                    />
                  </Routes>
                </MenuProvider>
              </BrowserRouter>
              </FlyToCartProvider>
            </CartProvider>
          </TooltipProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </SiteSettingsProvider>
  </QueryClientProvider>
  );
}

export default App;

