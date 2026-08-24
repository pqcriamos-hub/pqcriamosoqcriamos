# BLOCO 32 — SEO interno + Saúde do Conteúdo acionável

## Diagnóstico read-only (confirmado agora)

- Não existe `public/robots.txt` nem `public/sitemap.xml` (apenas `public/assets` e `favicon.ico`).
- `/acervo` e `/galeria` têm **title e description idênticos** (`ACERVO — PQOQ Criamos`), cada um com canonical/og:url para si mesmo — daí a duplicidade apontada.
- `og:image` e `twitter:image` estão em `__root.tsx`, o que sobrescreve a preview de todas as rotas filhas (é a origem das "social tags genéricas").
- Headings quebrados em `src/pages.tsx`: `/sobre` vai de `h1` direto para `h3` ("O projeto", "Almi Junior", "João Lucas Monti"); `/acervo`/`/galeria` e `/apoio` também têm `h3` em cards sem `h2` de seção em alguns pontos.
- Acessibilidade: só 3 `aria-label` em `src/pages.tsx`; os botões de fechar modal, lightbox, anterior/próxima, ampliar e remover vivem em `src/legacy/pqoq-legacy.js` (9 aria-labels) e `pqoq-editor-plus.js` (22) — a maioria dos botões de ícone está sem nome acessível.
- Saúde do conteúdo hoje é uma lista de strings: `healthChecks()`/`relationChecks()` em `src/lib/admin-diagnostics.ts` retornam apenas `{ id, label, level, message }`, sem itens estruturados nem ações. `AdminDashboard.tsx` renderiza como `<li>` com badge.
- Já existem as peças necessárias para ação: `slugify()`, `isPublished()`, `saveContentValue()` (com split público/`-admin` e sanitização) em `src/lib/admin-content.ts`, e `episode-artist-link.ts` com a exceção do EP00.

Risco: **médio/alto** (SEO público + gravação no Supabase pelo painel). Rollback: reverter os arquivos listados; nenhuma migration, nenhuma policy, nenhum dado apagado.

## Fase A — SEO interno

1. **Titles/descriptions** exatamente como especificados no pedido, por rota (`index`, `episodios`, `artistas`, `acervo`, `galeria`, `sobre`, `apoio`, `pqoqadmin` com noindex).
2. **Canonical**: `/galeria` passa a apontar canonical + `og:url` para `https://pqoqcriamos.lovable.app/acervo`; `/acervo` mantém canonical próprio. `/galeria` continua existindo e funcionando.
3. **Social tags**: remover `og:image`/`twitter:image` do `__root.tsx` (fonte da preview genérica) e declarar `og:image`/`twitter:image` com a imagem social do projeto nas rotas folha públicas, junto de `og:title`/`og:description`/`og:type`/`og:url` e `twitter:card` espelhando o title/description finais de cada página. JSON-LD existente preservado.
4. **`public/robots.txt`** novo: `Allow: /`, `Disallow: /pqoqadmin`, `Sitemap: https://pqoqcriamos.lovable.app/sitemap.xml`.
5. **`public/sitemap.xml`** estático com as rotas públicas (`/`, `/episodios`, `/artistas`, `/acervo`, `/sobre`, `/apoio`). `/galeria` fica fora por ser alias canonicalizado; nenhuma rota admin, nenhum rascunho.

## Fase B — Headings e acessibilidade

6. `src/pages.tsx`: um único `h1` por página; seções principais viram `h2` (em `/sobre`: "O projeto", "Almi Junior", "João Lucas Monti"), subitens seguem `h3`. Aparência mantida via classes CSS já existentes (ajuste pontual em `src/pqoq.css` só se o `h2` herdar tamanho diferente).
7. Cards renderizados em `src/legacy/pqoq-legacy.js` ganham nível coerente (`h3` sob um `h2` de seção).
8. `aria-label` (+ `title` onde ajuda) nos botões de ícone: fechar modal/lightbox, anterior/próxima, ampliar/reduzir, remover tag/item, e botões de ícone do `/pqoqadmin` (editar, duplicar, excluir, subir/descer). Sem mudança visual.

## Fase C — Saúde do conteúdo acionável

9. `admin-diagnostics.ts`: `HealthCheck` ganha campos opcionais aditivos — `severity`, `description`, `cause`, `recommendation`, `items[] ({ id, label, kind, target })` e `actions[] (tipo declarativo)`. As mensagens atuais continuam preenchidas, então nada quebra.
10. Novo `src/components/admin/ContentHealth.tsx` renderizando o painel: agrupado por severidade (Atenção / Revisar / OK), alertas colapsáveis, contagem, chips por item com "abrir", e botões "Atualizar diagnóstico", "Rever tudo", "Exportar relatório de saúde" (JSON/Markdown, sem tokens). `AdminDashboard.tsx` passa a usar esse componente no lugar da lista atual.
11. **Navegação**: cada chip/ação abre o módulo correto do `AdminShell` já focado no item (episódio, artista, acervo, páginas & textos) via estado de "item alvo" no shell.
12. **Slugs**: ação "Gerar slugs automaticamente" com **prévia obrigatória** (item atual | slug sugerido | ação), botões Aplicar todos / Editar manualmente / Cancelar. Usa `slugify()`, nunca sobrescreve slug existente, garante unicidade com sufixo curto, fallback para o código (`t01ep05`). Salva por `saveContentValue()` (admin completo + público sanitizado).
13. **Episódio sem artista / artistId inexistente**: modal de resolução assistida com opções — escolher artista existente (sugestão só quando a correspondência é inequívoca, ex. `eriane-emerentino` → Eriane Emerentino), criar artista com esse slug, remover vínculo, editar episódio, manter sem artista. Nunca vincula automaticamente em caso de ambiguidade; EP00 nunca entra nesse fluxo.
14. **Artista publicado sem episódio publicado**: apenas ações editoriais (editar artista, ver episódios vinculados, vincular episódio, ocultar, manter publicado). "Manter como exceção" grava `healthIgnore` no item, gravado na chave `-admin` e removido do payload público pela sanitização.
15. **EP00**: permanece `ok`, com apenas "Editar EP00" e "Abrir página pública".
16. **Demais alertas** ganham ações de navegação: base64 e chaves grandes → "Abrir manutenção de mídia"; chaves ausentes (`link-state`) → "Criar link-state agora" (estrutura inferida dos links atuais da Home, sem sobrescrever se já existir); sem capa/foto → "Editar item".
17. Toda gravação: valida sessão editor/admin (o `AdminGate` já cobre), salva no Supabase, respeita split público/admin, re-executa o diagnóstico e mostra feedback Salvando/Salvo/Erro. Nada de correção em massa sem confirmação; `localStorage` continua só cache.

## Arquivos afetados

`src/routes/{index,episodios,artistas,acervo,galeria,sobre,apoio,pqoqadmin,__root}.tsx`, `public/robots.txt` (novo), `public/sitemap.xml` (novo), `src/pages.tsx`, `src/pqoq.css` (só se necessário), `src/legacy/pqoq-legacy.js`, `src/lib/admin-diagnostics.ts`, `src/lib/admin-content.ts` (helpers de slug único / healthIgnore), `src/components/admin/AdminDashboard.tsx`, `src/components/admin/AdminShell.tsx`, novo `src/components/admin/ContentHealth.tsx`.

## Fora deste bloco

Google Search Console, DNS, domínio, RLS/policies, Supabase Auth, Edge Functions, redesign, remoção de `/galeria` e limpeza automática de chaves órfãs.

## Testes

Playwright/preview: title, description, OG e canonical de cada rota pública; canonical de `/galeria` → `/acervo`; hierarquia h1/h2/h3 em `/sobre`; `aria-label` nos botões de fechar/navegar/ampliar; `/robots.txt` e `/sitemap.xml`; `/pqoqadmin` noindex e bloqueio anônimo; no painel: agrupamento por severidade, prévia e aplicação de slug com confirmação no Supabase e no site público, resolução de `artistId` inexistente (T01EP02), exceção editorial de artista sem episódio, EP00 intacto, exportação do relatório; typecheck, lint e build; console público e admin sem erro crítico.
