import { supabase } from '@/lib/supabase';

/**
 * Registra um clique em botão de checkout no Supabase.
 * Pode ser chamado de qualquer componente sem importar o SiteTracker inteiro.
 */
export const trackCheckoutClick = async (productName?: string, type: 'SOLO' | 'CART' = 'SOLO') => {
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

    if (!supabase) return;

    await supabase.from('site_visits').insert([{
      session_id: sessionId,
      ip: 'Checkout Click',
      location: 'Intent',
      device: device,
      path: productName ? `${type}_CHECKOUT_CLICK:${productName}` : `${type}_CHECKOUT_CLICK`,
      user_agent: userAgent,
    }]);
  } catch (err) {
    console.warn('Erro ao registrar click checkout', err);
  }
};
