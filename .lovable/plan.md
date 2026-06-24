# Player de vídeo: liga/desliga + remover moldura

Duas mudanças nos episódios:

1. Opção para **ativar/desativar** o player de vídeo em cada episódio (no painel `/pqoqadmin`).
2. **Remover a moldura/borda/linhas pretas** em volta do campo do player de vídeo, deixando visível apenas o player.

## 1. Liga/desliga do player de vídeo

- Adicionar um campo `videoEnabled?: boolean` ao tipo `EpisodeEmbed` em `src/lib/admin-content.ts`. Quando ausente, é tratado como ligado (padrão = ligado), preservando episódios já existentes.
- No editor de episódio do painel (`src/components/admin/EpisodesAdmin.tsx`), adicionar um checkbox **"Exibir player de vídeo"** junto aos campos de YouTube/MP3. O valor é salvo dentro de `episode-embeds` (mesma estrutura já usada hoje).
- Na renderização pública (`src/legacy/pqoq-legacy.js`, função `renderVideo` e `renderEpisodePage`):
  - Se `videoEnabled === false`, o bloco de vídeo do episódio (`.episode-video-box`) não é exibido para o visitante — a página segue mostrando capa, áudio/Spotify e o restante normalmente.
  - No modo administrador a área continua acessível para reativar quando necessário.

Comportamento: episódios que ainda não têm vídeo configurado continuam mostrando a mensagem atual; o toggle apenas controla a visibilidade do espaço do player.

## 2. Remover a moldura do player

No `src/pqoq.css`:
- Remover a borda preta (`border: var(--line)`) e os fundos que criam o efeito de moldura no `.episode-video-box` (e nos estados `has-video`/`has-thumbnail`), deixando apenas o conteúdo do player/iframe visível, sem caixa em volta.
- Ajustar para que, quando houver vídeo, o iframe ocupe a área sem o frame externo. Quando estiver vazio (sem vídeo e em preparação), manter um espaço discreto apenas onde fizer sentido.

Isso elimina as linhas/retângulos pretos vistos ao redor do player na página do episódio.

## Arquivos alterados
- `src/lib/admin-content.ts` — novo campo `videoEnabled` em `EpisodeEmbed`.
- `src/components/admin/EpisodesAdmin.tsx` — checkbox de liga/desliga do player.
- `src/legacy/pqoq-legacy.js` — respeitar o toggle ao renderizar o vídeo.
- `src/pqoq.css` — remover a moldura/borda do player de vídeo.

## Notas técnicas
- A persistência usa o mesmo fluxo já existente (`saveContentValue("episode-embeds", ...)`), com sanitização pública/admin já implementada — nenhuma migration nova é necessária.
- Padrão "ligado" garante que nenhum episódio existente perca o vídeo após a mudança.
- Após implementar: build/typecheck e verificação visual na página de episódio (vídeo visível sem moldura, e oculto quando desativado).
