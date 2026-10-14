-- GORG · Área de Membros (3/3): dados iniciais e produtor inicial.

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
