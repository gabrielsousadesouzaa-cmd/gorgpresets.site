-- Proteger as tabelas da LOJA (aplicada em 09/10/2026)
--
-- As regras de products, site_settings, sales_settings, site_visits,
-- lessons e dos buckets product-images/assets aceitavam escrita de
-- QUALQUER visitante (a chave anon vai no código do site). Aqui as mesmas
-- regras passam a exigir o produtor (login do /admin com 2FA). A leitura
-- pública da vitrine continua igual.

-- Produtos
alter policy "Acesso total para o Admin" on public.products
  to authenticated using (public.member_is_admin()) with check (public.member_is_admin());
alter policy "Permitir atualização pelo admin" on public.products
  to authenticated using (public.member_is_admin()) with check (public.member_is_admin());
alter policy "Permitir deletar pelo admin" on public.products
  to authenticated using (public.member_is_admin());
alter policy "Permitir inserção pelo admin" on public.products
  to authenticated with check (public.member_is_admin());

-- Configurações do site: leitura pública separada, escrita do produtor.
create policy "site_settings_read" on public.site_settings for select using (true);
alter policy "Acesso Publico" on public.site_settings
  to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

alter policy "Admin All" on public.sales_settings
  to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Analytics: visitantes registram visitas; só o produtor lê e apaga.
alter policy "Enable select for authenticated users" on public.site_visits
  using (public.member_is_admin());
create policy "site_visits_producer_delete" on public.site_visits
  for delete to authenticated using (public.member_is_admin());

-- Aulas da área de membros antiga.
alter policy "Admin All" on public.lessons
  to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Uploads de imagens da loja.
alter policy "Permitir Tudo 16wiy3a_1" on storage.objects
  to authenticated with check (bucket_id = 'product-images' and public.member_is_admin());
alter policy "Permitir Tudo 16wiy3a_2" on storage.objects
  to authenticated using (bucket_id = 'product-images' and public.member_is_admin());
alter policy "Permitir Tudo 16wiy3a_3" on storage.objects
  to authenticated using (bucket_id = 'product-images' and public.member_is_admin());
alter policy "Admin Upload Assets" on storage.objects
  to authenticated with check (bucket_id = 'assets' and public.member_is_admin());
