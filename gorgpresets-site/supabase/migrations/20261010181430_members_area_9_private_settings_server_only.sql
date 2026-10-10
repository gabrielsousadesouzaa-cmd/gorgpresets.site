-- Segredos da área de membros (token do webhook, SMTP, chave do Resend, senha padrão):
-- só o servidor (service_role) e as funções security definer leem. RLS sem políticas
-- já bloqueava; aqui o acesso direto à tabela também sai de anon e authenticated.
revoke all on table public.member_private_settings from anon, authenticated;
grant select, insert, update, delete on table public.member_private_settings to service_role;
