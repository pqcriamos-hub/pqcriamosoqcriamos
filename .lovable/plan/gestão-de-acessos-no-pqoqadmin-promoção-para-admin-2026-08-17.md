# Gestão de acessos no /pqoqadmin + promoção para admin

## Objetivo
1. Elevar `pqcriamos@gmail.com` de `editor` para `admin`.
2. Criar no `/pqoqadmin` um módulo "Acessos" para listar, conceder e revogar papéis editoriais.

## Estado atual verificado
- `public.user_roles` tem 1 registro: `pqcriamos@gmail.com` → `editor` (desde 22/06/2026).
- Enum `app_role` = `admin` | `editor`.
- `user_roles` tem apenas UMA policy: `SELECT` do próprio usuário (`auth.uid() = user_id`). Não existe policy de insert/update/delete — hoje ninguém concede papel pelo app.
- `private.has_role()` já existe e é usada pelas policies de `site_content`.
- Listar e-mails exige `auth.users`, que só é acessível via service role no servidor.

## Etapa 1 — Promoção para admin (dados)
- Inserir a linha `role = 'admin'` para o usuário atual (mantendo `editor`, pois as policies de `site_content` aceitam os dois; nada quebra).

## Etapa 2 — Permissões de gestão (migration, risco médio)
- Nova policy em `user_roles`: `SELECT` liberado para quem é `admin` (via `private.has_role`), para o admin ver todos os papéis.
- `INSERT`/`DELETE` em `user_roles` apenas para `admin`, com trava anti-lockout: um admin não pode remover o próprio papel `admin`.
- Trava de segurança adicional: nunca conceder papel a e-mail não confirmado; a concessão será feita por e-mail já existente em `auth.users`.
- Grants explícitos de Data API preservados/ajustados para `authenticated` e `service_role`.

## Etapa 3 — Módulo "Acessos" no painel
- `src/lib/admin-roles.functions.ts` (novo): server functions com `requireSupabaseAuth`
  - `listAccessRoles` — verifica que o chamador é `admin`, então usa o cliente admin (import dinâmico dentro do handler) para cruzar `user_roles` com o e-mail de `auth.users`.
  - `grantRole` — concede `editor`/`admin` a um e-mail já cadastrado e confirmado.
  - `revokeRole` — remove papel; bloqueia auto-remoção de `admin` e remoção do último `admin`.
- `src/components/admin/AccessAdmin.tsx` (novo): tabela com e-mail, papéis, data; campo para conceder papel; botão revogar com confirmação.
- `src/components/admin/AdminShell.tsx`: novo item de menu "Acessos" (visível somente para `admin`), sem alterar os módulos existentes.
- `src/components/admin/AdminGate.tsx`: passar ao shell se o usuário logado é `admin` (além de editor). Login e fluxo atual permanecem iguais.

## Degradação segura
No ambiente atual o `SUPABASE_SERVICE_ROLE_KEY` não está disponível no sandbox. O módulo seguirá o mesmo padrão já usado no bootstrap: quando a chave não estiver configurada, a tela mostra a lista de papéis via RLS (sem e-mails) e uma mensagem clara em vez de erro/tela branca.

## Fora de escopo
Nenhuma alteração em Episódios, Artistas, Acervo, Apoio, editor inline, site público, uploads ou chaves de `site_content`.

## Testes
- Typecheck/build.
- `/pqoqadmin` como admin: lista aparece, concessão e revogação funcionam, autorrevogação bloqueada.
- Como editor (não admin): menu "Acessos" não aparece e as server functions recusam (403).
- Anônimo: nada muda; nenhum vazamento de e-mail.
- Console sem erros.

## Rollback
- Reverter a migration (drop das novas policies) e remover a linha `admin` de `user_roles`.
- Remover `AccessAdmin.tsx`, `admin-roles.functions.ts` e o item de menu.
