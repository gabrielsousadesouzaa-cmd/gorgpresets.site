-- GORG · Área de Membros (6): token do webhook no banco + trava de contas.

-- Configurações privadas (só a Edge Function, com service role, lê direto).
create table if not exists public.member_private_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.member_private_settings enable row level security;

-- Token do webhook gerado aqui, sem precisar cadastrar segredo no painel.
insert into public.member_private_settings (key, value)
values ('webhook_token', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

-- O produtor vê o token (para montar o link no Studio) e pode gerar outro.
create or replace function public.member_webhook_token()
returns text
language sql stable security definer
set search_path = public
as $$
  select value from public.member_private_settings
  where key = 'webhook_token' and public.member_is_admin();
$$;

create or replace function public.member_rotate_webhook_token()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.member_is_admin() then
    raise exception 'Apenas o produtor pode gerar um novo token.';
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  update public.member_private_settings set value = v_token, updated_at = now() where key = 'webhook_token';
  return v_token;
end;
$$;

revoke execute on function public.member_webhook_token() from public, anon;
revoke execute on function public.member_rotate_webhook_token() from public, anon;
grant execute on function public.member_webhook_token() to authenticated;
grant execute on function public.member_rotate_webhook_token() to authenticated;

-- Só contas criadas pela área de membros (venda, Studio ou "Primeiro acesso")
-- recebem acesso. A marca fica no app_metadata, que só o servidor consegue
-- gravar — assim um cadastro feito direto no Supabase com o e-mail de um
-- comprador não herda as compras dele.
create or replace function public.member_email()
returns text
language sql stable security definer
set search_path = public, auth
as $$
  select lower(u.email) from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and coalesce(u.raw_app_meta_data ->> 'gorg_member', '') = 'true';
$$;
