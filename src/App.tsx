import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/store/cartStore";
import { CurrencyProvider } from "@/store/currencyStore";
import { LanguageProvider } from "@/store/languageStore";
import { CurrencyModal } from "@/components/CurrencyModal";
import { CurrencySuggester } from "@/components/CurrencySuggester";
import { Layout } from "@/components/Layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MenuProvider } from "@/store/MenuContext";
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
      <LanguageProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <CartProvider>
              <Toaster position="top-right" expand={true} richColors />
              <BrowserRouter>
                <MenuProvider>
                  <ScrollToTop />
                  <CurrencySuggester />
                  <CurrencyModal />
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
                          <Suspense fallback={<div className="h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#d82828] border-t-transparent rounded-full animate-spin" /></div>}>
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/catalog" element={<Catalog />} />
                              <Route path="/product/:id" element={<ProductDetail />} />
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
    </QueryClientProvider>
  );
}

export default App;

