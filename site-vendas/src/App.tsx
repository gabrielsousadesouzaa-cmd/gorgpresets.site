import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { lazy, Suspense } from "react";

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

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>
        <LanguageProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <CartProvider>
              <Toaster position="top-right" expand={true} richColors />
              <BrowserRouter>
                <MenuProvider>
                  <ScrollToTop />
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
            </CartProvider>
          </TooltipProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </SiteSettingsProvider>
  </QueryClientProvider>
  );
}

export default App;

