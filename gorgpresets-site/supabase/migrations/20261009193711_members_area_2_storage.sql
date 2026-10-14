-- GORG · Área de Membros (2/3): buckets de storage e regras de acesso.

-- ── Storage ─────────────────────────────────────────────────────────
-- members-public: capas, banners e logos (URL pública).
-- members-private: vídeos e arquivos de download, em pastas por produto
-- ({product_id}/...). Entregues por URL assinada só para quem tem acesso.
insert into storage.buckets (id, name, public)
values ('members-public', 'members-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('members-private', 'members-private', false)
on conflict (id) do nothing;

create policy "members_public_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'members-public' and public.member_is_admin());
create policy "members_public_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'members-public' and public.member_is_admin());
create policy "members_public_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'members-public' and public.member_is_admin());

create policy "members_private_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'members-private'
    and (
      public.member_is_admin()
      or public.member_has_access(public.member_try_uuid((storage.foldername(name))[1]))
    )
  );
create policy "members_private_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'members-private' and public.member_is_admin());
create policy "members_private_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'members-private' and public.member_is_admin());
create policy "members_private_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'members-private' and public.member_is_admin());
