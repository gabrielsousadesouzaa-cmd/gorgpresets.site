-- A checagem de produtor só é usada por quem está logado.
revoke execute on function public.member_is_admin() from public, anon;
grant execute on function public.member_is_admin() to authenticated;
