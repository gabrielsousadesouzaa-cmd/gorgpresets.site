import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';

// ─── Sistema de geolocalização com cache em sessão ──────────────────────────
async function getGeoData(): Promise<{ ip: string; city: string }> {
  const fallback = { ip: 'Desconhecido', city: 'Desconhecida' };
  
  // Tenta recuperar do cache da sessão para evitar chamadas repetitivas
  const cached = sessionStorage.getItem('visit_geo_cache');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch { /* ignora erro de parse */ }
  }

  const apis = [
    { url: 'http://ip-api.com/json/?fields=status,city,regionName,country,query', map: (d: any) => ({ ip: d.query, city: [d.city, d.regionName, d.country].filter(Boolean).join(', ') }) },
    { url: 'https://ipapi.co/json/', map: (d: any) => ({ ip: d.ip, city: [d.city, d.region, d.country_name].filter(Boolean).join(', ') }) },
    { url: 'https://freeipapi.com/api/json', map: (d: any) => ({ ip: d.ipAddress, city: [d.cityName, d.regionName, d.countryName].filter(Boolean).join(', ') }) }
  ];

  for (const api of apis) {
    try {
      const res = await fetch(api.url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const d = await res.json();
        const result = api.map(d);
        if (result.city) {
          sessionStorage.setItem('visit_geo_cache', JSON.stringify(result));
          return result;
        }
      }
    } catch { continue; }
  }

  return fallback;
}


// ─── Componente de rastreamento ───────────────────────────────────────────────
export function SiteTracker() {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      // Ignorar a página de admin
      if (location.pathname.startsWith('/admin')) return;

      // Evita log duplo de páginas (apenas primeira entrada por sessão)
      if (sessionStorage.getItem('visit_tracked_main')) return;

      // Garante session ID único por aba
      let sessionId = sessionStorage.getItem('visit_session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('visit_session_id', sessionId);
      }

      try {
        const { ip, city } = await getGeoData();

        const userAgent = navigator.userAgent;
        let device = 'Computador';
        if (/mobile/i.test(userAgent)) device = 'Celular';
        if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';
        if (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) device = 'Tablet';

        if (!supabase) return;

        const { error } = await supabase.from('site_visits').insert([{
          session_id: sessionId,
          ip: ip,
          location: city,
          device: device,
          path: location.pathname,
          user_agent: userAgent,
          referrer: document.referrer || 'Direto',
        }]);

        if (!error) {
          sessionStorage.setItem('visit_tracked_main', 'true');
        }
      } catch (err) {
        console.warn('Erro ao registrar visita');
      }
    };

    // Atrasa levemente o tracking para não bloquear o LCP da página
    const timer = setTimeout(trackVisit, 2500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}

// trackCheckoutClick foi movido para: @/components/trackCheckout
