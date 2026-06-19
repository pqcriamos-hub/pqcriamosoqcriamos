# Auditoria de seguranca Supabase

Base de trabalho: commit `91a237af4f6b4b92ddbc373658a9aacfdd9adbd0`

## Arquivos afetados

- `supabase/migrations/20260618124500_harden_editor_security.sql`
- `src/integrations/supabase/auth-middleware.ts`

## Schemas utilizados

- `public`: tabelas e enum existentes (`user_roles`, `site_content`, `app_role`)
- `private`: funcao privilegiada `has_role`

## Politicas RLS entregues

- `public.user_roles`
- `Authenticated users can read their own roles`
- nenhuma policy de `insert`, `update` ou `delete` para `authenticated`

- `public.site_content`
- `Public can read published site content`
- `Editors can read whitelisted site content`
- `Editors can insert site content`
- `Editors can update site content`
- `Editors can delete site content`

## Grants e revokes

- `private`
- `REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated`
- `GRANT USAGE ON SCHEMA private TO authenticated`

- `private.has_role`
- `REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC`
- `GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated`

- `public.user_roles`
- `REVOKE ALL` de `PUBLIC`, `anon` e `authenticated`
- `GRANT SELECT` apenas para `authenticated`
- `GRANT ALL` para `service_role`

- `public.site_content`
- `REVOKE ALL` de `PUBLIC`, `anon` e `authenticated`
- `GRANT SELECT` para `anon`
- `GRANT SELECT, INSERT, UPDATE, DELETE` para `authenticated`
- `GRANT ALL` para `service_role`

## Dois alertas corrigidos

1. Funcao privilegiada em area exposta
Antes, `has_role` podia ficar no schema `public`, que eh exposto pela Data API. A correcao move a funcao para `private`, restringe o schema e remove a versao publica.

2. `search_path` mutavel em `SECURITY DEFINER`
Uma funcao com privilegios elevados nao deve depender do `search_path` da sessao. A correcao define `SET search_path = ''` e usa nomes totalmente qualificados, como `public.user_roles`.

Observacao: o nome exato desses alertas pode variar no painel do Supabase, mas o endurecimento aplicado cobre precisamente esses dois vetores.

## Security Advisor

Nao foi possivel executar o Security Advisor a partir deste ambiente porque o projeto nao tem CLI do Supabase instalada nem acesso funcional ao banco via MCP/SQL Editor daqui.

Resultado verificavel no repositorio: a migration remove os dois problemas-alvo do `has_role`.
Resultado pendente no painel do Supabase: confirmar que os alertas relacionados a schema exposto e `search_path` deixaram de aparecer apos aplicar a migration.

## Testes recomendados

### 1. anon

```sql
set local role anon;

select key
from public.site_content
order by key;
-- esperado: apenas linhas publicadas e apenas as chaves
-- editable-content, style-state, artists, episodes, episode-embeds

select * from public.user_roles;
-- esperado: erro de permissao
```

### 2. usuario autenticado sem papel

```sql
set local role authenticated;
select set_config('request.jwt.claim.sub', '<uuid-usuario-existente-sem-papel>', true);

select *
from public.user_roles;
-- esperado: zero linhas, ou apenas as linhas do proprio usuario se existirem

update public.site_content
set key = key
where key = 'editable-content';
-- esperado: 0 linhas afetadas

insert into public.user_roles (user_id, role)
values ('<uuid-usuario-existente-sem-papel>', 'editor');
-- esperado: erro de permissao ou violacao de policy
```

### 3. editor existente

```sql
begin;

set local role authenticated;
select set_config('request.jwt.claim.sub', '<uuid-editor-existente>', true);

select key
from public.site_content
where key in ('editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds')
order by key;
-- esperado: leitura permitida inclusive para rascunhos

update public.site_content
set key = key
where key = 'editable-content';
-- esperado: update permitido

rollback;
```

## Observacao operacional

- A migration assume que `public.app_role`, `public.user_roles` e `public.site_content` ja existem no banco remoto do projeto.
- A leitura publica exige uma flag booleana chamada `published` ou `is_published`.
- Nenhum usuario foi criado e nenhum papel foi atribuido nesta etapa.
