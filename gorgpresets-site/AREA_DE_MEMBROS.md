# Área de Membros GORG

Área de membros própria, no estilo Netflix / Apple TV, com o **Studio do produtor** para editar tudo sem código.

| Endereço | O que é |
| --- | --- |
| `/membros` | Portal do aluno: banner rotativo, vitrines, "Continuar assistindo" |
| `/membros/colecao/:slug` | Página da coleção: módulos, aulas, materiais para download |
| `/membros/colecao/:slug/aula/:id` | Player com progresso salvo, próxima aula automática |
| `/membros/minha-colecao` · `/suporte` · `/perfil` | Biblioteca, suporte (WhatsApp/FAQ) e conta |
| `/membros/studio` | Studio do produtor (só para o login do `/admin`, com 2FA) |

**No Studio:** coleções (capa, banner, cor, selo, preço), módulos e aulas (arrastar para ordenar; vídeo por link do YouTube/Vimeo/Panda/Bunny/Drive ou upload protegido), materiais para download, seções da home (seleção manual, Top 10, coleção do membro, upsell…), aparência (logo, cor, banners com imagem ou vídeo, tela de login, suporte e FAQ), membros (adicionar, importar lista, liberar coleções, redefinir senha), e-mails (boas-vindas com prévia ao vivo e envio de teste) e integrações (webhook do checkout + histórico).

**Editar na própria página:** logado como produtor, a home mostra o botão **Editar página** (ou abra `/membros?editar=1`). Dá para mudar título e subtítulo das seções clicando neles, subir/descer, ocultar, excluir, adicionar seções em qualquer posição, escolher e reordenar as coleções de cada seção e editar/criar/remover banners — tudo salvo na hora.

**Seções da home (ordem padrão):** Sua Coleção Particular (o que o membro comprou) · Continuar assistindo · Top 10 em Alta · Para o seu Negócio · Coleção Elite · Destinos em Alta · Originais GORG · Extras · Desbloqueie novas estéticas. Seções de seleção manual vazias não aparecem para os membros.

## Ver agora (modo demonstração)

Abra `/membros?demo=1`. Tudo funciona com dados de exemplo salvos só no seu navegador (`?demo=0` sai do modo demo). Sem as variáveis do Supabase (ex.: rodando localmente) o modo demo é automático.

## Produção — status

Tudo ativado no Supabase (projeto `ibsnizsdascywkonvcvu`) em 09/10/2026 — migrações em `supabase/migrations/20261009*`:

- tabelas `member_*`, regras de acesso (RLS) e buckets `members-public` / `members-private`;
- o login do `/admin` (com 2FA) é o produtor;
- Edge Function `members-api` publicada; o token do webhook é gerado no banco e o link completo aparece em **Studio → Integrações** (botão "Gerar novo" troca o token);
- só contas criadas pela área de membros (venda, Studio ou "Primeiro acesso") recebem acesso — um cadastro feito direto no Supabase com o e-mail de um comprador não herda as compras;
- tabelas da loja (`products`, `site_settings`, `sales_settings`, `site_visits`, `lessons`) e uploads de imagens: escrita só do produtor; RLS ligado nas 5 tabelas da área de membros antiga;
- função `create-pix` (BuckPay) desativada (responde 410, sem token) e checkout próprio removido do site — as vendas seguem pelo GGCheckout.

Para usar, depois do deploy: entre em `/membros/studio` com o login do `/admin`, preencha **Aparência → Suporte** (WhatsApp), monte as coleções, importe os alunos em **Membros → Importar lista** e cadastre o link de **Integrações** no seu checkout (informando o ID do produto em cada coleção, aba **Acesso e venda**).

## E-mail de boas-vindas (Resend)

A cada compra aprovada no GGCheckout, o webhook libera as coleções, cria a conta do comprador e envia um e-mail com o login e uma senha provisória (cliente que já tem conta recebe só o aviso das coleções novas). Webhooks repetidos não reenviam o e-mail.

1. Crie uma conta grátis em [resend.com](https://resend.com) (3.000 e-mails/mês, 100/dia).
2. **Domains → Add Domain** → `gorgpresets.site` (região São Paulo) → copie os registros DNS (MX e TXT `send`, TXT `resend._domainkey`) para o provedor do domínio → **Verify**. Recomendado: um TXT `_dmarc` com `v=DMARC1; p=none;`.
3. **API Keys → Create API Key** (permissão *Sending access*) e cole em **Studio → E-mails**. A chave fica no banco, só a Edge Function lê.
4. Em **Studio → E-mails**, preencha o remetente (ex: `acesso@gorgpresets.site`), ajuste o texto e clique em **Enviar teste**.

Se o envio falhar (ex: domínio ainda não verificado), o acesso é liberado mesmo assim e o comprador entra pelo **Primeiro acesso**; o motivo aparece em **Integrações → Últimos eventos**. O "Esqueci minha senha" também passa a sair pelo Resend.

## GGCheckout

Em **Integrações → Webhooks** do GGCheckout, cadastre o link de **Studio → Integrações** com os eventos *PIX pago*, *Cartão pago*, *PIX/Cartão reembolsado* e *chargeback*. Se pedir um *Secret*, use o código depois de `token=` (o servidor aceita o token no link, no header `x-secret` ou em `Authorization: Bearer`). Em cada coleção, informe o ID do produto do GGCheckout em **Acesso e venda**.

Opcional, no painel do Supabase:

- **Authentication → URL Configuration:** *Site URL* `https://gorgpresets.site` e, em *Redirect URLs*, `https://gorgpresets.site/membros/perfil`.
- **Authentication → Sign In / Providers:** desligar *Allow new users to sign up* (não é mais um risco, só evita contas soltas).
- Apagar a função `create-pix` e o segredo `BUCKPAY_API_TOKEN` (a ferramenta usada aqui não consegue excluir). Gere um token novo na BuckPay: o antigo esteve escrito no código da função.

> Vídeos: o upload direto respeita o limite de arquivo do seu plano Supabase (50 MB no gratuito). Para aulas longas, use YouTube não listado, Vimeo ou Panda Video — basta colar o link.

## Segurança

- Todas as regras ficam no banco (RLS): o aluno só lê aulas, materiais e vídeos das coleções que comprou; vídeos e arquivos privados são entregues por URL assinada temporária.
- Editar conteúdo exige ser produtor **e** ter passado pelo 2FA.
- O acesso é por e-mail: liberar uma coleção para um e-mail funciona mesmo antes de a pessoa criar a conta, e só vale para contas criadas pela área de membros.
- O `/admin` da loja recusa contas que não são de produtor (alunos também têm login) e as tabelas da loja só aceitam escrita do produtor.

## Código

```
src/members/
  MembersApp.tsx        rotas, proteção de login, 2FA, tema
  lib/                  tipos, regras do catálogo, player, repositórios (Supabase e demo)
  components/           header, banner, vitrines, cards, player, materiais
  pages/                login, home, coleção, aula, biblioteca, suporte, perfil
  studio/               Studio do produtor (páginas, editor de aulas, kit de UI)
  studio/inline/        modo "Editar página" da home (carregado só para o produtor)
supabase/migrations/    tabelas, RLS e storage (já aplicadas)
supabase/functions/members-api/   webhook, criação de contas, primeiro acesso, recuperação de senha, e-mails (email.ts = modelo usado no envio e na prévia do Studio)
```
