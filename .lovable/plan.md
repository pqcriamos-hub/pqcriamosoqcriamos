# Adendo BLOCO 28/29 — EP00 não pode abrir o artista Joab3

## Causa confirmada
Em `src/legacy/pqoq-legacy.js`, linha 884:

```text
findArtist(id) => artists().find(id) || artistsDefault.find(id) || artists()[0]
```

O último `|| artists()[0]` é um fallback cego: quando o episódio não tem `artistId`
(caso do EP00), a função devolve o **primeiro artista da lista**, que hoje é o Joab3.

Esse mesmo `findArtist` alimenta:
- `renderEpisodePage()` (linha 1359) — título "Sobre ...", foto e o botão
  `data-open-artist="${artist?.id || episode.artistId}"` (linha 1410);
- `openEpisode()` (linha 1428) — bloco "Biografia do artista" + botão "Ir para Acervo";
- `openArtist()` (linha 1235) — abre o modal com o artista já resolvido errado;
- linha 1718 (fluxo de acervo/artista).

O botão "Página Artistas" é apenas `<a href="/artistas">` — ele não abre modal;
o modal do Joab3 vem do botão "Abrir acervo do artista".

A regra `isEpisodeZero` existe em `src/lib/episode-artist-link.ts`, mas é usada só
no painel `/pqoqadmin`; o site público legado nunca a consulta.

## Correção proposta

1. **Remover o fallback cego**: `findArtist(id)` passa a devolver `undefined`
   quando não há id ou não há correspondência. Sem `artists()[0]`.
2. **Porta EP00 no legado**: adicionar helper local `isEpisodeZeroLegacy(episode)`
   com a mesma normalização de `episode-artist-link.ts` (`t01ep00` / termina em `ep00`),
   e nunca resolver artista para esses episódios.
3. **Botões da página individual do episódio**:
   - EP00: substituir "Abrir acervo do artista" por
     `<a class="button primary small" href="/sobre">Conhecer os anfitriões</a>`;
     nenhum `data-open-artist`, nenhuma chamada a `openArtist`.
   - Episódio comum com artista resolvido: comportamento atual preservado.
   - Episódio comum sem artista vinculado: botão oculto (sem versão desabilitada,
     para não poluir o layout aprovado).
   - "Página Artistas" permanece `<a href="/artistas">`, sem modal.
4. **Título/foto/bio do painel do episódio**: quando não houver artista resolvido,
   usar apenas os dados próprios do episódio (`participantTitle`, `participantAbout`,
   `participantBio`, `participantImage`, `participantTags`, `participantLinks`).
   Nada de `artist?.bio` herdado do Joab3.
5. **`openArtist(id)`**: sair silenciosamente se `id` vazio ou artista não encontrado.
6. **`openEpisode(id)` (modal da lista)**: tornar o bloco "Biografia do artista"
   condicional — hoje ele acessa `artist.id`/`artist.bio` direto e passaria a
   quebrar sem o fallback; para EP00 e episódios sem artista, o bloco não é renderizado.

## Escopo e limites
- Arquivo alterado: `src/legacy/pqoq-legacy.js` apenas.
- Sem migration, sem Edge Function, sem mudança de RLS, sem mudança de CSS/visual.
- Nada de alteração no `/pqoqadmin` nem em `episode-artist-link.ts`.
- As múltiplas fotos do participante por episódio **não** entram neste adendo;
  seguem como bloco separado.

## Testes
- `/episodio?id=t01ep00`: não aparece "Abrir acervo do artista"; aparece
  "Conhecer os anfitriões" apontando para `/sobre`; nenhum modal de artista abre;
  "Página Artistas" apenas navega.
- `/episodio?id=t01ep07` (Joab3): modal do Joab3 abre corretamente.
- Episódio de outro artista: abre o artista correto.
- Episódio sem `artistId`: nenhum modal, nenhum fallback.
- Modal da lista de episódios (`openEpisode`) sem erro no console para EP00.
- Visitante anônimo e modo editor.
- Typecheck/build e console limpos.

## Rollback
Reverter `src/legacy/pqoq-legacy.js` (restaurar `|| artists()[0]` em `findArtist`
e o markup original do bloco `.artist-actions`).
