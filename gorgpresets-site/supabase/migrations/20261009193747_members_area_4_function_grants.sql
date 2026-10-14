-- Funções auxiliares das regras de acesso: só para quem está logado.
revoke execute on function public.member_email() from public, anon;
revoke execute on function public.member_has_access(uuid) from public, anon;
revoke execute on function public.member_touch_profile(text) from public, anon;
grant execute on function public.member_email() to authenticated;
grant execute on function public.member_has_access(uuid) to authenticated;
grant execute on function public.member_touch_profile(text) to authenticated;
