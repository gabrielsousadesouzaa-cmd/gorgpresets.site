import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';

export function SiteTracker() {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      // Create a unique session ID
      let sessionId = sessionStorage.getItem('visit_session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('visit_session_id', sessionId);
      }

      // Evita log duplo de páginas (apenas primeira entrada)
      if (sessionStorage.getItem('visit_tracked_main')) return;
      
      // Ignorar a página de admin
      if (location.pathname.startsWith('/admin')) return;

      try {
        let ip = 'Desconhecido';
        let city = 'Desconhecida';
        
        try {
          // Usando API gratuita para IP (limitada mas funciona pra testes)
          // Se falhar o ip continua 'Desconhecido' mas logamos o resto do acesso
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
             const data = await res.json();
             ip = data.ip || ip;
             city = `${data.city || ''} ${data.region || ''} ${data.country_name || ''}`.trim() || city;
          }
        } catch (e) {
          console.warn("Failed to get IP data");
        }

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
          user_agent: userAgent
        }]);

        if (!error) {
          sessionStorage.setItem('visit_tracked_main', 'true');
        }
      } catch (err) {
        console.warn("Erro ao registrar visita");
      }
    };

    // Atrasar levemente o tracking para não atrasar o carregamento da tela
    const timer = setTimeout(trackVisit, 2000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}

export const trackCheckoutClick = async () => {
  try {
    let sessionId = sessionStorage.getItem('visit_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('visit_session_id', sessionId);
    }

    const userAgent = navigator.userAgent;
    let device = 'Computador';
    if (/mobile/i.test(userAgent)) device = 'Celular';
    if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';
    if (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) device = 'Tablet';

    await supabase.from('site_visits').insert([{
      session_id: sessionId,
      ip: 'Checkout Click',
      location: 'Intent',
      device: device,
      path: 'CHECKOUT_CLICK',
      user_agent: userAgent
    }]);
  } catch (err) {
    console.warn("Erro ao registrar click checkout", err);
  }
};
