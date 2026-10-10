-- Seções da home: "Sua Coleção Particular" primeiro, depois as vitrines editoriais.
-- Só cria o que ainda não existe (em produção estas seções já foram criadas pelo Studio).

update public.member_rows set sort_order = 0
where kind = 'owned' and title = 'Sua Coleção Particular'
  and not exists (select 1 from public.member_rows where title = 'Top 10 em Alta');

insert into public.member_rows (title, subtitle, kind, card_style, accent_title, sort_order)
select v.title, v.subtitle, 'curated', v.card_style, v.accent_title, v.sort_order
from (values
  ('Top 10 em Alta', 'Acompanhe os presets mais adquiridos.', 'ranked', true, 2),
  ('Para o seu Negócio', 'Presets estratégicos para elevar o valor da sua marca e serviços.', 'poster', false, 3),
  ('Coleção Elite', 'O segredo por trás do visual clean e caro das maiores referências.', 'poster', false, 4),
  ('Destinos em Alta', 'As cores dos lugares mais desejados e instagramáveis do mundo.', 'poster', false, 5),
  ('Originais GORG', 'A harmonia perfeita entre a sua arte e a edição de alta performance.', 'poster', false, 6),
  ('Extras', 'Expanda suas possibilidades com recursos que vão além da fotografia', 'poster', false, 7)
) as v(title, subtitle, card_style, accent_title, sort_order)
where not exists (select 1 from public.member_rows r where r.title = v.title);

update public.member_rows set sort_order = 1 where kind = 'continue' and sort_order = 0;
update public.member_rows set sort_order = 8 where kind = 'locked' and sort_order < 8;
