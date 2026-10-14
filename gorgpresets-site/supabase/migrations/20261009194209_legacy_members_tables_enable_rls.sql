-- Tabelas da área de membros antiga (não usadas pelo site): sem acesso pela chave pública.
alter table public.profiles enable row level security;
alter table public.webhook_configs enable row level security;
alter table public.webhook_logs enable row level security;
alter table public.portal_settings enable row level security;
alter table public.modules_presets enable row level security;
