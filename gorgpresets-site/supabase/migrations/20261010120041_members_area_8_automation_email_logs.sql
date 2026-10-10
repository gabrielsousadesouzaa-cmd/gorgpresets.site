-- Área de membros 8: automação do checkout, registro de e-mails e histórico
-- completo do webhook. Só acrescenta (nenhuma tabela ou coluna é removida).

-- ── Produtos do checkout ────────────────────────────────────────────
-- Cada produto que chega num webhook entra aqui sozinho ("aprendizado
-- automático"); o produtor liga o ID às coleções que ele libera.
create table if not exists public.member_checkout_items (
  id uuid primary key default gen_random_uuid(),
  external_id text not null check (length(btrim(external_id)) > 0),
  external_key text generated always as (lower(btrim(external_id))) stored,
  title text not null default '',
  platform text not null default '',
  product_ids uuid[] not null default '{}',
  ignored boolean not null default false,
  -- E-mail de boas-vindas próprio deste produto (null = usa o geral).
  email jsonb,
  sales_count integer not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists member_checkout_items_key on public.member_checkout_items (external_key);
alter table public.member_checkout_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'member_checkout_items' and policyname = 'member_checkout_items_admin') then
    create policy "member_checkout_items_admin" on public.member_checkout_items
      for all to authenticated using (public.member_is_admin()) with check (public.member_is_admin());
  end if;
end $$;

-- IDs já informados nas coleções (aba "Acesso e venda") viram produtos do checkout.
insert into public.member_checkout_items (external_id, title, product_ids)
select min(btrim(x.ext)), min(p.title), array_agg(distinct p.id)
from public.member_products p, unnest(p.external_ids) as x(ext)
where btrim(x.ext) <> ''
group by lower(btrim(x.ext))
on conflict (external_key) do nothing;

-- Registra os produtos vistos num webhook e devolve o cadastro deles.
-- Produto novo com o MESMO nome de uma coleção já entra ligado a ela
-- (aparece como ligado no Studio e pode ser trocado a qualquer momento).
create or replace function public.member_track_items(p_items jsonb, p_platform text, p_count boolean)
returns setof public.member_checkout_items
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.member_checkout_items as c (external_id, title, platform, last_seen_at, sales_count, product_ids)
  select distinct on (lower(btrim(i ->> 'id')))
    btrim(i ->> 'id'), left(coalesce(i ->> 'title', ''), 200), coalesce(p_platform, ''), now(),
    case when p_count then 1 else 0 end,
    coalesce((
      select array_agg(p.id) from public.member_products p
      where btrim(coalesce(i ->> 'title', '')) <> ''
        and lower(btrim(p.title)) = lower(btrim(i ->> 'title'))
    ), '{}')
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as i
  where coalesce(btrim(i ->> 'id'), '') <> ''
  order by lower(btrim(i ->> 'id')), (coalesce(i ->> 'title', '') = '')
  on conflict (external_key) do update set
    title = case when excluded.title <> '' then excluded.title else c.title end,
    platform = case when excluded.platform <> '' then excluded.platform else c.platform end,
    last_seen_at = now(),
    sales_count = c.sales_count + excluded.sales_count;

  return query
    select * from public.member_checkout_items
    where external_key in (
      select lower(btrim(i ->> 'id')) from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as i
    );
end;
$$;

-- ── Histórico do webhook: tudo o que foi lido do checkout ──────────
alter table public.member_webhook_logs
  add column if not exists event text not null default '',
  add column if not exists platform text not null default '',
  add column if not exists order_id text not null default '',
  add column if not exists buyer_name text not null default '',
  add column if not exists buyer_phone text not null default '',
  add column if not exists buyer_document text not null default '',
  add column if not exists amount numeric,
  add column if not exists payment_method text not null default '',
  add column if not exists items jsonb not null default '[]',
  add column if not exists product_ids uuid[] not null default '{}',
  add column if not exists email_status text not null default '',
  add column if not exists email_log_id uuid,
  add column if not exists replay_of uuid;
create index if not exists member_webhook_logs_received_idx on public.member_webhook_logs (received_at desc);
create index if not exists member_webhook_logs_email_idx on public.member_webhook_logs (email);

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'member_webhook_logs' and policyname = 'member_webhook_logs_admin_delete') then
    create policy "member_webhook_logs_admin_delete" on public.member_webhook_logs
      for delete to authenticated using (public.member_is_admin());
  end if;
end $$;

-- ── Registro de e-mails (enviado / falhou, com o HTML enviado) ─────
create table if not exists public.member_email_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'welcome',
  to_email text not null default '',
  subject text not null default '',
  status text not null default 'sent',
  provider text not null default '',
  error text not null default '',
  message_id text not null default '',
  html text not null default '',
  webhook_log_id uuid,
  meta jsonb not null default '{}'
);
create index if not exists member_email_logs_created_idx on public.member_email_logs (created_at desc);
create index if not exists member_email_logs_to_idx on public.member_email_logs (to_email);
alter table public.member_email_logs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'member_email_logs' and policyname = 'member_email_logs_admin_read') then
    create policy "member_email_logs_admin_read" on public.member_email_logs
      for select to authenticated using (public.member_is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'member_email_logs' and policyname = 'member_email_logs_admin_delete') then
    create policy "member_email_logs_admin_delete" on public.member_email_logs
      for delete to authenticated using (public.member_is_admin());
  end if;
end $$;

-- ── Acessos: controle de quem já recebeu o e-mail ───────────────────
-- Acessos novos do webhook entram com notified_at nulo; o envio "reserva"
-- as linhas de uma vez, agrupando várias compras seguidas num só e-mail e
-- impedindo e-mail repetido quando o checkout reenvia o webhook.
alter table public.member_access add column if not exists notified_at timestamptz default now();

-- ── Perfis: dados do comprador e situação da conta ──────────────────
alter table public.member_profiles
  add column if not exists phone text not null default '',
  add column if not exists document text not null default '',
  add column if not exists blocked boolean not null default false,
  add column if not exists must_change_password boolean not null default false;

-- ── Limite de frequência (ex: "Esqueci minha senha") ────────────────
create table if not exists public.member_rate_limits (
  key text primary key,
  hits integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.member_rate_limits enable row level security;

create or replace function public.member_rate_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.member_rate_limits as r (key, hits, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

-- ── Conta bloqueada ou com troca de senha pendente não vê conteúdo ──
create or replace function public.member_email()
returns text
language sql stable security definer
set search_path = public, auth
as $$
  select lower(u.email) from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and coalesce(u.raw_app_meta_data ->> 'gorg_member', '') = 'true'
    and coalesce(u.raw_app_meta_data ->> 'blocked', '') <> 'true'
    and coalesce(u.raw_app_meta_data ->> 'must_change_password', '') <> 'true';
$$;

-- Funções internas: só a Edge Function (service role) usa.
revoke execute on function public.member_track_items(jsonb, text, boolean) from public, anon, authenticated;
revoke execute on function public.member_rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.member_track_items(jsonb, text, boolean) to service_role;
grant execute on function public.member_rate_hit(text, integer, integer) to service_role;
