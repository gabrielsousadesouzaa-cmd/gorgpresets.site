-- ════════════════════════════════════════════════════════════════════
-- OPCIONAL (recomendado) — proteger as tabelas da LOJA
--
-- Hoje as políticas de products, site_settings, sales_settings e dos buckets
-- product-images/assets aceitam escrita de QUALQUER visitante (a chave anon
-- vai no código do site).
-- Este script deixa a escrita só para o produtor (mesma regra do Studio,
-- com 2FA). A leitura pública da vitrine continua igual.
--
-- Pré-requisito: migrações members_area_* já aplicadas (feito em 09/10/2026).
-- Revise antes de rodar. Para desfazer, recrie as políticas antigas.
-- ════════════════════════════════════════════════════════════════════

-- Produtos: leitura pública (mantida), escrita só do produtor.
drop policy if exists "Acesso total para o Admin" on public.products;
drop policy if exists "Permitir atualização pelo admin" on public.products;
drop policy if exists "Permitir deletar pelo admin" on public.products;
drop policy if exists "Permitir inserção pelo admin" on public.products;
create policy "products_producer_write" on public.products
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Configurações do site.
drop policy if exists "Acesso Publico" on public.site_settings;
create policy "site_settings_read" on public.site_settings for select using (true);
create policy "site_settings_producer_write" on public.site_settings
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

drop policy if exists "Admin All" on public.sales_settings;
create policy "sales_settings_producer_write" on public.sales_settings
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Analytics: visitantes registram visitas; só o produtor lê e apaga.
drop policy if exists "Enable select for authenticated users" on public.site_visits;
create policy "site_visits_producer_read" on public.site_visits
  for select to authenticated using (public.member_is_admin());
create policy "site_visits_producer_delete" on public.site_visits
  for delete to authenticated using (public.member_is_admin());

-- Área de membros antiga (não é mais usada pelo site). O RLS das outras
-- tabelas antigas já foi ligado na migração legacy_members_tables_enable_rls.
drop policy if exists "Admin All" on public.lessons;

-- Uploads de imagens da loja: só o produtor envia/troca/apaga.
drop policy if exists "Permitir Tudo 16wiy3a_1" on storage.objects;
drop policy if exists "Permitir Tudo 16wiy3a_2" on storage.objects;
drop policy if exists "Permitir Tudo 16wiy3a_3" on storage.objects;
drop policy if exists "Admin Upload Assets" on storage.objects;
create policy "store_images_producer_insert" on storage.objects
  for insert to authenticated with check (bucket_id in ('product-images', 'assets') and public.member_is_admin());
create policy "store_images_producer_update" on storage.objects
  for update to authenticated using (bucket_id in ('product-images', 'assets') and public.member_is_admin());
create policy "store_images_producer_delete" on storage.objects
  for delete to authenticated using (bucket_id in ('product-images', 'assets') and public.member_is_admin());
