-- ════════════════════════════════════════════════════════════════════
-- GORG · Área de Membros
-- Tabelas, segurança (RLS) e buckets de storage do portal do aluno e do
-- Studio do produtor. Tudo prefixado com "member_" para não colidir com as
-- tabelas da loja nem com as da área de membros antiga.
-- ════════════════════════════════════════════════════════════════════

-- ── Produtores (quem pode editar o portal) ─────────────────────────
create table if not exists public.member_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.member_admins enable row level security;

drop policy if exists "member_admins_select_self" on public.member_admins;
create policy "member_admins_select_self" on public.member_admins
  for select to authenticated using (user_id = auth.uid());

-- Produtor = está em member_admins E, se tiver 2FA ativo, entrou com o código (aal2).
create or replace function public.member_is_admin()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.member_admins a where a.user_id = auth.uid())
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (
         select 1 from auth.mfa_factors f
         where f.user_id = auth.uid() and f.status = 'verified'
       )
     );
$$;

-- E-mail confirmado do usuário logado (nunca confia em e-mail enviado pelo cliente).
create or replace function public.member_email()
returns text
language sql stable security definer
set search_path = public, auth
as $$
  select lower(u.email) from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

create or replace function public.member_try_uuid(p text)
returns uuid
language plpgsql immutable
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- ── Configurações do portal (marca, banners, suporte...) ───────────
create table if not exists public.member_settings (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── Produtos / coleções ─────────────────────────────────────────────
create table if not exists public.member_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  subtitle text not null default '',
  description text not null default '',
  cover_url text not null default '',
  banner_url text not null default '',
  logo_url text not null default '',
  accent_color text not null default '#2a2a2e',
  badge text not null default '',
  checkout_url text not null default '',
  price_label text not null default '',
  external_ids text[] not null default '{}',
  is_free boolean not null default false,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_modules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.member_products(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists member_modules_product_idx on public.member_modules(product_id);

create table if not exists public.member_lessons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.member_products(id) on delete cascade,
  module_id uuid not null references public.member_modules(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  video_url text not null default '',
  thumbnail_url text not null default '',
  duration_seconds integer not null default 0,
  attachments jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists member_lessons_product_idx on public.member_lessons(product_id);
create index if not exists member_lessons_module_idx on public.member_lessons(module_id);

create table if not exists public.member_materials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.member_products(id) on delete cascade,
  name text not null default '',
  description text not null default '',
  url text not null default '',
  size bigint not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists member_materials_product_idx on public.member_materials(product_id);

-- ── Vitrines da home ────────────────────────────────────────────────
create table if not exists public.member_rows (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  kind text not null default 'curated' check (kind in ('owned', 'continue', 'curated', 'all', 'locked')),
  card_style text not null default 'poster' check (card_style in ('poster', 'ranked', 'landscape')),
  accent_title boolean not null default false,
  product_ids uuid[] not null default '{}',
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Acessos (por e-mail, para existir antes mesmo da conta ser criada) ──
create table if not exists public.member_access (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  product_id uuid not null references public.member_products(id) on delete cascade,
  source text not null default 'manual',
  external_ref text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, product_id)
);
create index if not exists member_access_email_idx on public.member_access(email);

-- ── Perfis e progresso ──────────────────────────────────────────────
create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists member_profiles_email_idx on public.member_profiles(email);

create table if not exists public.member_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.member_lessons(id) on delete cascade,
  product_id uuid not null references public.member_products(id) on delete cascade,
  completed boolean not null default false,
  position_seconds integer not null default 0,
  duration_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.member_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  status text not null default '',
  message text not null default '',
  email text not null default '',
  payload jsonb
);

-- ── Regra central de acesso a um produto ────────────────────────────
create or replace function public.member_has_access(p_product uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.member_is_admin()
      or exists (
        select 1 from public.member_products p
        where p.id = p_product and p.is_free and p.published
      )
      or exists (
        select 1 from public.member_access a
        where a.product_id = p_product
          and a.email = public.member_email()
          and (a.expires_at is null or a.expires_at > now())
      );
$$;

-- Atualiza "visto por último" e o nome do membro logado (usado no Studio).
create or replace function public.member_touch_profile(p_name text default null)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    return;
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  insert into public.member_profiles (user_id, email, full_name, last_seen_at)
  values (auth.uid(), v_email, coalesce(p_name, ''), now())
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(p_name, ''), public.member_profiles.full_name),
        last_seen_at = now();
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.member_settings enable row level security;
alter table public.member_products enable row level security;
alter table public.member_modules enable row level security;
alter table public.member_lessons enable row level security;
alter table public.member_materials enable row level security;
alter table public.member_rows enable row level security;
alter table public.member_access enable row level security;
alter table public.member_profiles enable row level security;
alter table public.member_progress enable row level security;
alter table public.member_webhook_logs enable row level security;

-- Configurações: leitura pública (a tela de login mostra logo e fundo).
drop policy if exists "member_settings_read" on public.member_settings;
create policy "member_settings_read" on public.member_settings
  for select to anon, authenticated using (true);
drop policy if exists "member_settings_admin" on public.member_settings;
create policy "member_settings_admin" on public.member_settings
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Produtos: membros veem os publicados (inclusive bloqueados, para o upsell).
drop policy if exists "member_products_read" on public.member_products;
create policy "member_products_read" on public.member_products
  for select to authenticated using (published or public.member_is_admin());
drop policy if exists "member_products_admin" on public.member_products;
create policy "member_products_admin" on public.member_products
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Módulos: títulos visíveis (vitrine do que existe dentro da coleção).
drop policy if exists "member_modules_read" on public.member_modules;
create policy "member_modules_read" on public.member_modules
  for select to authenticated using (
    public.member_is_admin()
    or (published and exists (select 1 from public.member_products p where p.id = product_id and p.published))
  );
drop policy if exists "member_modules_admin" on public.member_modules;
create policy "member_modules_admin" on public.member_modules
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Aulas: só quem tem acesso ao produto.
drop policy if exists "member_lessons_read" on public.member_lessons;
create policy "member_lessons_read" on public.member_lessons
  for select to authenticated using (
    public.member_is_admin() or (published and public.member_has_access(product_id))
  );
drop policy if exists "member_lessons_admin" on public.member_lessons;
create policy "member_lessons_admin" on public.member_lessons
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Materiais (downloads): só quem tem acesso ao produto.
drop policy if exists "member_materials_read" on public.member_materials;
create policy "member_materials_read" on public.member_materials
  for select to authenticated using (public.member_has_access(product_id));
drop policy if exists "member_materials_admin" on public.member_materials;
create policy "member_materials_admin" on public.member_materials
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Vitrines.
drop policy if exists "member_rows_read" on public.member_rows;
create policy "member_rows_read" on public.member_rows
  for select to authenticated using (visible or public.member_is_admin());
drop policy if exists "member_rows_admin" on public.member_rows;
create policy "member_rows_admin" on public.member_rows
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Acessos: o membro vê só os dele; o produtor gerencia todos.
drop policy if exists "member_access_read" on public.member_access;
create policy "member_access_read" on public.member_access
  for select to authenticated using (email = public.member_email() or public.member_is_admin());
drop policy if exists "member_access_admin" on public.member_access;
create policy "member_access_admin" on public.member_access
  for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());

-- Perfis: leitura própria / produtor. Escrita só via member_touch_profile().
drop policy if exists "member_profiles_read" on public.member_profiles;
create policy "member_profiles_read" on public.member_profiles
  for select to authenticated using (user_id = auth.uid() or public.member_is_admin());

-- Progresso: cada membro grava o seu, apenas em produtos que possui.
drop policy if exists "member_progress_own" on public.member_progress;
create policy "member_progress_own" on public.member_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.member_has_access(product_id));
drop policy if exists "member_progress_admin_read" on public.member_progress;
create policy "member_progress_admin_read" on public.member_progress
  for select to authenticated using (public.member_is_admin());

-- Logs do webhook: só o produtor lê (a Edge Function grava com service role).
drop policy if exists "member_webhook_logs_admin" on public.member_webhook_logs;
create policy "member_webhook_logs_admin" on public.member_webhook_logs
  for select to authenticated using (public.member_is_admin());

grant execute on function public.member_is_admin() to anon, authenticated;
grant execute on function public.member_has_access(uuid) to authenticated;
grant execute on function public.member_touch_profile(text) to authenticated;

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

drop policy if exists "members_public_admin_insert" on storage.objects;
create policy "members_public_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'members-public' and public.member_is_admin());
drop policy if exists "members_public_admin_update" on storage.objects;
create policy "members_public_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'members-public' and public.member_is_admin());
drop policy if exists "members_public_admin_delete" on storage.objects;
create policy "members_public_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'members-public' and public.member_is_admin());

drop policy if exists "members_private_read" on storage.objects;
create policy "members_private_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'members-private'
    and (
      public.member_is_admin()
      or public.member_has_access(public.member_try_uuid((storage.foldername(name))[1]))
    )
  );
drop policy if exists "members_private_admin_insert" on storage.objects;
create policy "members_private_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'members-private' and public.member_is_admin());
drop policy if exists "members_private_admin_update" on storage.objects;
create policy "members_private_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'members-private' and public.member_is_admin());
drop policy if exists "members_private_admin_delete" on storage.objects;
create policy "members_private_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'members-private' and public.member_is_admin());

-- ── Dados iniciais ──────────────────────────────────────────────────
insert into public.member_settings (id, data) values ('main', '{}'::jsonb)
on conflict (id) do nothing;

insert into public.member_rows (title, subtitle, kind, card_style, accent_title, sort_order)
select * from (values
  ('Continuar assistindo', '', 'continue', 'landscape', false, 0),
  ('Sua Coleção Particular', '', 'owned', 'poster', false, 1),
  ('Desbloqueie novas estéticas', 'Coleções que ainda não fazem parte da sua biblioteca', 'locked', 'poster', false, 2)
) as v(title, subtitle, kind, card_style, accent_title, sort_order)
where not exists (select 1 from public.member_rows);

-- Produtor inicial = o login do painel /admin da loja, que obrigatoriamente
-- usa autenticação em 2 etapas (membros não têm 2FA, então nunca entram aqui).
-- Para adicionar outro produtor depois:
--   insert into public.member_admins (user_id)
--   select id from auth.users where email = 'email@do-produtor.com';
insert into public.member_admins (user_id)
select distinct f.user_id from auth.mfa_factors f where f.status = 'verified'
on conflict (user_id) do nothing;
