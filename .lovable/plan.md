# BLOCO 4 — Validação final do CMS editorial PQOQ

Objetivo: validar o painel editorial e corrigir apenas regressões pequenas, sem novas features, sem redesign, sem mexer em RLS/auth/service_role.

## Limitação importante (descoberta na exploração)
- O projeto usa **Supabase externo/unmanaged** (`LOVABLE_BROWSER_AUTH_STATUS=external_unmanaged`). O sandbox **não consegue criar sessão de editor** automaticamente. Portanto os testes de **modo editor** (login, upload real, CRUD de Galeria/Apoio, salvar) **não podem ser dirigidos por mim** — serão validados via revisão de código + verificação de RLS/Storage, e a confirmação visual final fica com você no site publicado.
- O site já está **publicado e público** (`pqoqcriamos.lovable.app`). Vou comparar a versão pública com a de preview para dizer se um novo Publish é necessário.

## O que eu valido automaticamente

1. **Publish / deploy (Teste 1)**
   - Buscar HTML/markdown da Preview e da URL publicada; comparar se Galeria (modais) e Apoio (2 seções dinâmicas) já estão na versão pública.
   - Relatar claramente: "já publicado" ou "precisa Publish".

2. **Renderização pública (Testes 4, 5, 6, 7 — parte pública)**
   - Via Playwright em `localhost` (rota pública, sem sessão): abrir Galeria, Apoio, Sobre, Episódios.
   - Confirmar: cards Gravações/Capas/Obras; seções Frentes de apoio e Apoiadores; abertura de modais/lightbox; "Ler mais"; Compartilhar; fechar com ESC; campos opcionais vazios não renderizam; **nenhum controle admin visível para anônimo**.
   - Screenshots desktop (1280) e mobile (390) para responsividade.

3. **localStorage como cache (Teste 8)**
   - Carregar a página, limpar `localStorage`, recarregar e confirmar que Galeria/Apoio/Artistas/Episódios/textos continuam vindo do Supabase (hidratação remota).

4. **Segurança / RLS (Teste 9)**
   - `supabase--read_query` nas policies de `site_content` e `storage.objects`: confirmar whitelist explícita de keys, escrita restrita a editor/admin via `has_role`, sem policy de escrita pública/anon.
   - Confirmar que `service_role`/tokens não aparecem no bundle do front (grep no código-fonte).
   - Confirmar bucket `site-media` privado e que helper de upload usa Storage + URL assinada (sem base64).

5. **Console / build / typecheck (Teste 10)**
   - Rodar build/lint disponíveis (o harness já roda typecheck).
   - Capturar erros de console em modo público.

6. **Revisão de código do modo editor (Testes 2, 3, e partes editor de 4–7)**
   - Ler `pqoq-editor-plus.js`, `site-content-sync.ts`, `pages.tsx`: confirmar que os controles editáveis existem (títulos Sobre/Apoio, tags, CRUD, reorder, upload via `PQOQ_MEDIA`, publish/unpublish) e que valores salvos são path/URL de Storage, não `data:image`.

## Correções permitidas (somente regressão)
Apenas: salvamento, hidratação, permissão, upload, render público, modo editor, prévia pública, responsividade, erros de console, campos que deveriam ser editáveis e não são, controles admin vazando no público, dados sumindo após limpar localStorage. Cada correção será mínima e localizada.

## Fora de escopo (não farei)
Novas páginas, redesign, mudança de identidade visual, grade/modular livre, remover/abrir RLS, mexer em auth ou service_role, trocar Supabase.

## Ação externa (apenas relato)
"Leaked Password Protection Disabled" — tratar manualmente no painel Supabase Auth (owner/admin). Não resolvo via código.

## Entregável
Relatório por teste (1–10) com: status publish, evidências de render público, evidências de RLS/Storage/anon bloqueado, evidência de localStorage como cache, console/build, correções aplicadas (se houver), riscos residuais, próximos passos, e como reverter. Os passos de **modo editor** virão com checklist para você confirmar no site publicado, já que a sessão de editor não pode ser automatizada neste ambiente.

## Confirmação necessária de você
Para os testes de modo editor que não consigo automatizar, posso (a) apenas revisar o código e te entregar um checklist manual, ou (b) se você colar/criar um acesso de editor de teste, eu não tenho como usar com segurança aqui — então (a) é o caminho. Confirma que seguimos assim?
