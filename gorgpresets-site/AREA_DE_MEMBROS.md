# Área de Membros GORG

Área de membros própria, no estilo Netflix / Apple TV, com o **Studio do produtor** para editar tudo sem código.

| Endereço | O que é |
| --- | --- |
| `/membros` | Portal do aluno: banner rotativo, vitrines, "Continuar assistindo" |
| `/membros/colecao/:slug` | Página da coleção: módulos, aulas, materiais para download |
| `/membros/colecao/:slug/aula/:id` | Player com progresso salvo, próxima aula automática |
| `/membros/minha-colecao` · `/suporte` · `/perfil` | Biblioteca, suporte (WhatsApp/FAQ) e conta |
| `/membros/studio` | Studio do produtor (só para o login do `/admin`, com 2FA) |

**No Studio:** coleções (capa, banner, cor, selo, preço), módulos e aulas (arrastar para ordenar; vídeo por link do YouTube/Vimeo/Panda/Bunny/Drive ou upload protegido), materiais para download, vitrines da home (seleção manual, Top 10, coleção do membro, upsell…), aparência (logo, cor, banners com imagem ou vídeo, tela de login, suporte e FAQ), membros (adicionar, importar lista, liberar coleções, redefinir senha) e integrações (webhook do checkout + histórico).

## Ver agora (modo demonstração)

Abra `/membros?demo=1`. Tudo funciona com dados de exemplo salvos só no seu navegador (`?demo=0` sai do modo demo). Sem as variáveis do Supabase (ex.: rodando localmente) o modo demo é automático.

## Ativar em produção

1. **Banco de dados** — rode `supabase/migrations/20261009120000_members_area.sql` (SQL Editor do Supabase ou `supabase db push`). Ele só **cria** tabelas `member_*` e os buckets `members-public`/`members-private`; não altera nada da loja. O login que hoje usa o `/admin` (com 2FA) vira o produtor.
2. **Função** — `supabase functions deploy members-api --no-verify-jwt`
3. **Segredos** (Supabase → Edge Functions → Secrets):
   - `MEMBERS_WEBHOOK_TOKEN` — uma senha longa (protege o webhook)
   - opcionais, para enviar login por e-mail: `RESEND_API_KEY`, `MEMBERS_EMAIL_FROM`, `MEMBERS_PORTAL_URL` (`https://gorgpresets.site/membros`)
4. **Auth** (Supabase → Authentication):
   - desative *Allow new users to sign up* — as contas são criadas pela função (venda, Studio ou "Primeiro acesso");
   - em *URL Configuration → Redirect URLs*, adicione `https://gorgpresets.site/membros/perfil` (link de "Esqueci minha senha").
5. Entre em `/membros/studio` com o login do `/admin`, monte as coleções e importe os alunos atuais em **Membros → Importar lista**.
6. Cadastre o webhook em **Studio → Integrações** no seu checkout e informe o ID do produto em cada coleção (**Acesso e venda**).

> Vídeos: o upload direto respeita o limite de arquivo do seu plano Supabase (50 MB no gratuito). Para aulas longas, use YouTube não listado, Vimeo ou Panda Video — basta colar o link.

## Segurança

- Todas as regras ficam no banco (RLS): o aluno só lê aulas, materiais e vídeos das coleções que comprou; vídeos e arquivos privados são entregues por URL assinada temporária.
- Editar conteúdo exige ser produtor **e** ter passado pelo 2FA.
- O acesso é por e-mail confirmado: liberar uma coleção para um e-mail funciona mesmo antes de a pessoa criar a conta.
- O `/admin` da loja agora recusa contas que não são de produtor (alunos também têm login).
- **Recomendado:** `supabase/sql/opcional_proteger_tabelas_da_loja.sql` fecha a escrita pública que existe hoje nas tabelas da loja (`products`, `site_settings`, uploads de imagens…) e liga o RLS nas tabelas da área de membros antiga. Revise antes de rodar.

## Código

```
src/members/
  MembersApp.tsx        rotas, proteção de login, 2FA, tema
  lib/                  tipos, regras do catálogo, player, repositórios (Supabase e demo)
  components/           header, banner, vitrines, cards, player, materiais
  pages/                login, home, coleção, aula, biblioteca, suporte, perfil
  studio/               Studio do produtor (páginas, editor de aulas, kit de UI)
supabase/migrations/    tabelas, RLS e storage
supabase/functions/members-api/   webhook, criação de contas, primeiro acesso, recuperação de senha
```
