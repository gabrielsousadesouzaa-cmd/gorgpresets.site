import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';

// ─── Sistema de geolocalização com 3 APIs em cascata ──────────────────────────
async function getGeoData(): Promise<{ ip: string; city: string }> {
  const fallback = { ip: 'Desconhecido', city: 'Desconhecida' };

  // API 1: ip-api.com — sem chave, 45 req/min grátis, muito confiável
  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,city,regionName,country,query', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.status === 'success' && d.city) {
        return {
          ip: d.query || fallback.ip,
          city: [d.city, d.regionName, d.country].filter(Boolean).join(', '),
        };
      }
    }
  } catch { /* silently try next */ }

  // API 2: ipapi.co — 1000 req/dia grátis
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.city) {
        return {
          ip: d.ip || fallback.ip,
          city: [d.city, d.region, d.country_name].filter(Boolean).join(', '),
        };
      }
    }
  } catch { /* silently try next */ }

  // API 3: freeipapi.com — 60 req/min grátis
  try {
    const res = await fetch('https://freeipapi.com/api/json', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.cityName) {
        return {
          ip: d.ipAddress || fallback.ip,
          city: [d.cityName, d.regionName, d.countryName].filter(Boolean).join(', '),
        };
      }
    }
  } catch { /* all failed */ }

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
