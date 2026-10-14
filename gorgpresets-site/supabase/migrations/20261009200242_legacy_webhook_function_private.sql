-- Função da área de membros antiga (nunca usada): fora da API pública.
revoke execute on function public.handle_incoming_webhook(jsonb, text) from public, anon, authenticated;
alter function public.handle_incoming_webhook(jsonb, text) set search_path = public;
