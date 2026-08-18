# BLOCO 21 — Capa/thumbnail do episódio visível na Home, lista e página individual

## Diagnóstico (verificado no código)

- Fonte oficial já existe e é única: `episode-embeds[episodeId].thumbnail`, com split `episode-embeds-admin` (completo) / `episode-embeds` (sanitizado) em `src/lib/admin-content.ts` + `src/lib/content-sanitize.ts`. Não há campo paralelo.
- `src/legacy/pqoq-legacy.js` já tem o helper `episodeCoverStyle(episode)` (linha ~845), mas **ele não é usado**: `renderHomeEpisodes()` e `renderEpisodeList()` emitem `<div class="episode-thumb lettered">` fixo, sem imagem.
- A lista de episódios só mostra a capa porque `enhanceEpisodeThumbs()` em `src/legacy/pqoq-editor-plus.js` aplica o `background-image` depois — e esse seletor é `.episode-card[data-episode-id]`. A Home usa `.home-episode`, então **fica de fora**: por isso a Home mostra o thumb lettered.
- Página individual (`renderEpisodePage` / `[data-video-box]`) já lê `episode-embeds[...].thumbnail` corretamente.
- Upload do painel (`EpisodesAdmin.tsx` → `onUpload` → `uploadAdminMedia`) e do editor inline (`handleEpisodeThumbUpload` → `uploadEditorMedia`) já gravam no mesmo campo, em Storage, sem base64 novo.

Causa raiz: a capa não é aplicada na renderização base (legacy), apenas em um "enhance" cujo seletor ignora os cards da Home.

## Correção proposta (mínima)

1. `src/legacy/pqoq-legacy.js`
   - Usar `episodeCoverStyle(episode)` nos dois renders (Home e lista) e trocar a classe por `lettered` apenas quando não houver thumbnail; com imagem, renderizar `class="episode-thumb has-cover"` sem o rótulo `T01/EP07` (fallback preservado quando não há imagem).
   - Aceitar `data:image` legado (EP00) sem mudança — a URL entra igual no `background-image`.
   - Escapar a URL no atributo `style` para não quebrar o HTML gerado.

2. `src/legacy/pqoq-editor-plus.js`
   - Ampliar o seletor de `enhanceEpisodeThumbs()` para `.episode-card[data-episode-id], .home-episode[data-episode-id]`, mantendo o input de upload/medidas só no modo editor (classe `admin-only` já existente).
   - Não recriar o rótulo lettered quando existir imagem.

3. `src/pqoq.css` — apenas se necessário: regra `.episode-thumb.has-cover` com `background-size: cover; background-position: center;` e ocultação do texto, preservando o tamanho atual (150x150 lista, 148x148 Home).

4. `src/components/admin/EpisodesAdmin.tsx` — melhoria pontual: preview visual da capa enviada (miniatura) ao lado do input, e manter o valor anterior quando o upload falha (comportamento atual já não sobrescreve em erro; será confirmado).

Sem alterações em RLS, Storage, sanitização, `participantImage`, `artist.image`, `page-photos` ou `gallery-cards`.

## Testes

- Home, `/episodios` e `/episodio?id=...` com episódio que já tem capa: mesma imagem nos três lugares.
- Episódio sem capa: fallback `T01/EP0X` intacto.
- `localStorage` limpo + reload: capas continuam (vêm do Supabase via `hydrateFromRemote`).
- Aba anônima: nenhum seletor de arquivo abre nas thumbs (Playwright).
- Rascunho: thumbnail de episódio despublicado não aparece no payload público.
- `tsgo` typecheck e console sem erro crítico.

## Riscos e rollback

Risco baixo: mudança de template/CSS de renderização, sem banco. Rollback = reverter os 3–4 arquivos citados.
