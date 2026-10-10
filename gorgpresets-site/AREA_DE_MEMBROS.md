# Área de Membros GORG

Área de membros própria, no estilo Netflix / Apple TV, com o **Studio do produtor** para editar tudo sem código.

| Endereço | O que é |
| --- | --- |
| `/membros` | Portal do aluno: banner rotativo, vitrines, "Continuar assistindo" |
| `/membros/colecao/:slug` | Página da coleção: módulos, aulas, materiais para download |
| `/membros/colecao/:slug/aula/:id` | Player com progresso salvo, próxima aula automática |
| `/membros/minha-colecao` · `/suporte` · `/perfil` | Biblioteca, suporte (WhatsApp/FAQ) e conta |
| `/membros/studio` | Studio do produtor (só para o login do `/admin`, com 2FA) |

**No Studio:** coleções (capa, banner, cor, selo, preço), módulos e aulas (arrastar para ordenar; vídeo por link do YouTube/Vimeo/Panda/Bunny/Drive ou upload protegido), materiais para download, seções da home (seleção manual, Top 10, coleção do membro, upsell…), aparência (logo, cor, banners com imagem ou vídeo, tela de login, suporte e FAQ), membros (editar, liberar/remover coleções, senha, link de redefinição, reenviar acesso, bloquear, ações em massa), automações (webhook, regras, senha dos alunos, produtos do checkout, venda de teste), e-mails (SMTP ou Resend, modelos de boas-vindas e de acesso retirado em modo visual ou código HTML, prévia e teste) e registros (cada venda com os dados recebidos e cada e-mail enviado ou com falha).

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

## Automações (Studio → Automações)

- **Webhook:** um link só para todas as vendas. No GGCheckout: *Integrações → Webhooks* → cole o link → eventos *PIX pago*, *Cartão pago*, *PIX/Cartão reembolsado* e *chargeback*. Se pedir *Secret*, use o código depois de `token=` (o servidor aceita o token no link, no header `x-secret` ou em `Authorization: Bearer`). Funciona também com Hotmart, Kiwify, Cakto, Eduzz, Perfect Pay, Ticto, Yampi, CartPanda, Shopify e Stripe.
- **Regras:** liberar na compra aprovada, retirar no reembolso, retirar no chargeback, pausar tudo, e juntar compras seguidas num só e-mail.
- **Produtos do checkout (aprendizado automático):** todo produto que chega num webhook aparece sozinho, com nome, plataforma e vendas. Basta ligar o ID às coleções (um ID pode liberar várias). Itens como o "carrinho" podem ser ignorados. Cada produto pode ter um **e-mail próprio**.
- **Senha dos alunos:** aleatória (padrão, enviada por e-mail), senha padrão ou CPF — com a opção de **exigir uma senha nova no primeiro acesso** (o conteúdo só abre depois da troca; a regra vale no banco, não só na tela).
- **Venda de teste:** escolha produtos e um e-mail e veja o fluxo inteiro (liberação, conta e e-mail) sem pagar nada.

## E-mails (Studio → E-mails)

- **Envio:** pelo seu próprio e-mail via **SMTP** (Hostinger: `smtp.hostinger.com`, porta **465**, SSL, usuário = o e-mail) ou pela API do **Resend**. As portas 25 e 587 são bloqueadas no Supabase — use 465. O servidor testa o login antes de salvar; a senha fica guardada só no servidor.
- **Remetente:** nome, e-mail (com SMTP, o mesmo da conta), responder-para e cópia oculta (BCC).
- **Modelos:** boas-vindas (acesso liberado, com login e senha provisória para quem é novo) e acesso retirado (reembolso/chargeback), cada um no modo **visual** ou em **código HTML**, com variáveis (`{primeiro_nome}`, `{produtos}`, `{senha}`, `{link}`, blocos prontos como `{bloco_acesso}`), prévia ao vivo (computador/celular) e envio de teste.
- Se o envio falhar, o acesso é liberado mesmo assim: sem senha conhecida a conta não fica criada pela metade e o comprador entra pelo **Primeiro acesso**. Falhas temporárias fazem o checkout reenviar o webhook.

## Registros (Studio → Registros)

- **Vendas:** cada webhook com o que foi lido (nome, e-mail, telefone, CPF, pedido, valor, pagamento, evento, plataforma), os produtos detectados (ligados, ignorados ou sem coleção — com "ligar" em um clique), as coleções afetadas, a situação do e-mail e o payload bruto. Dá para **reprocessar** um evento (ex: depois de ligar um produto), filtrar e limpar.
- **E-mails:** cada envio com status (enviado ou o motivo da falha), o e-mail exatamente como foi enviado e **reenviar**.

## Membros (Studio → Membros)

Lista com coleções, situação (ativo, sem conta, bloqueado, troca de senha pendente) e último acesso; filtros, busca, seleção múltipla com ações em massa; painel do membro para editar nome/e-mail, liberar/remover coleções (selecionar todas), definir senha, enviar link de redefinição, reenviar acesso (com a senha nova para mandar por WhatsApp), bloquear/desbloquear, excluir e ver o histórico de vendas e e-mails da pessoa.

Opcional, no painel do Supabase:

- **Authentication → URL Configuration:** *Site URL* `https://gorgpresets.site` e, em *Redirect URLs*, `https://gorgpresets.site/membros/perfil`.
- **Authentication → Sign In / Providers:** desligar *Allow new users to sign up* (não é mais um risco, só evita contas soltas).
- Apagar a função `create-pix` e o segredo `BUCKPAY_API_TOKEN` (a ferramenta usada aqui não consegue excluir). Gere um token novo na BuckPay: o antigo esteve escrito no código da função.

## Segurança

- Todas as regras ficam no banco (RLS): o aluno só lê aulas, materiais e vídeos das coleções que comprou; vídeos e arquivos privados são entregues por URL assinada temporária.
- Editar conteúdo exige ser produtor **e** ter passado pelo 2FA.
- O acesso é por e-mail: liberar uma coleção para um e-mail funciona mesmo antes de a pessoa criar a conta, e só vale para contas criadas pela área de membros.
- Conta bloqueada ou com troca de senha pendente não lê conteúdo (regra no banco). Senhas de SMTP, chave do Resend, senha padrão e token do webhook ficam em uma tabela que só o servidor lê.
- "Esqueci minha senha" tem limite de tentativas e responde igual para qualquer e-mail (não revela quem é cliente).
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
supabase/functions/members-api/   index.ts (webhook, contas, membros, e-mails, registros), sale.ts (leitor universal do payload),
                                  mailer.ts (SMTP e Resend), email.ts (modelos — também usados na prévia do Studio),
                                  automation.ts (regras da automação)
```
