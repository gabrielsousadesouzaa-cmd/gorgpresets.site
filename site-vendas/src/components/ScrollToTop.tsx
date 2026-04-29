import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Desativa a restauração automática do scroll do navegador
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Scroll imediato para o topo
    window.scrollTo(0, 0);
    
    // Garantia para renderizações assíncronas ou animações pesadas
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
    }, 10);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
