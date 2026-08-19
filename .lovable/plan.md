# Adendo Bloco 31 — Grade modular com arraste de elementos individuais

## Situação atual (verificada no código)

- `MODULAR_SELECTOR` em `src/legacy/pqoq-editor-plus.js` (linhas 31-50) lista poucos alvos: `main .card`, `.button`, `.page-title`, `.pill`, `.intro-text`, `.home-episode`, `.episode-cover`, `.embed-box`, `.audio-box`, `.artist-avatar`, `.bio-photo`, `.episode-thumb`, filhos diretos de `main .section` (h2, h3, p, .meta), `.section-head`, `.portfolio-tile`, `header .nav a`.
- O `pointerdown` usa `event.target.closest(MODULAR_SELECTOR)`: títulos e textos dentro de um card (ex.: "Almi Junior", bio, `.tag-list`) não são alvos, então o `closest` sobe e arrasta o **card inteiro**. `.section-head` também é alvo, o que move título + intro juntos.
- Não existe seleção explícita: o arraste começa no primeiro `pointerdown`, sem destaque do item nem tecla ESC.
- O CSS marca **todos** os `[data-drag-key]` e `[data-editable]` com contorno no modo modular (`src/pqoq.css` 1765-1773), poluindo a página.
- `dragKey()` já é estável (dataset/id/DOM path, sem textContent) e `legacyDragKey` mantém leitura de posições antigas — isso será preservado.
- Não há reset por item; há apenas o dock "Ativar grade / Desativar grade e salvar".

## O que será feito

### 1. Alvos modulares mais precisos
- Ampliar o conjunto de alvos para elementos individuais: `[data-editable]`, `[data-rich]`, `.page-title`, títulos de card (h2/h3 dentro de `.card`), `.tag-list`, imagens/fotos editoriais (`.bio-photo`, `.artist-avatar`, `.episode-thumb`, `.gallery-thumb`, `.support-image`, imagens com `data-photo-key`/`data-gallery-*`/`data-support-*`), `.button`, `.pill`, `.portfolio-tile`, `.gallery-card`, cards de acervo/apoio/artista/episódio.
- Remover `.section-head` como alvo direto (título e intro passam a mover separadamente) e reforçar a exclusão de containers: `main`, seções, `.page`, grids (`.grid`, `.about-layout`, `.support-grid`), `.modal`, `.style-popover`, `.layout-dock`, `.editor-panel`, `.owner-bar` e controles admin.
- Regra de resolução: ao clicar, escolher o **menor** alvo modular sob o cursor; só subir para o card quando o clique cair em borda/área vazia do card.

### 2. Seleção explícita antes do arraste
- 1º clique seleciona (classe `is-modular-selected`), o arraste move apenas o selecionado.
- Clique fora ou ESC limpa a seleção.
- `input`, `textarea`, `select`, `label` de upload, botões do editor e links de navegação não iniciam arraste.

### 3. Chaves estáveis de layout
- Ordem de prioridade: `data-layout-key` → `data-editable` → `data-photo-key` → `data-artist-id`/`data-episode-id`/`data-gallery-id`/`data-support-id` + campo → `id` + tipo → DOM path (fallback atual).
- `legacyDragKey` continua sendo lida, para não perder posições já salvas. Nenhuma chave órfã é apagada.

### 4. `data-layout-key` nos renders públicos
- Adicionar atributos estáveis em `src/legacy/pqoq-legacy.js` (e no JSX estático da página Sobre, se necessário) para: fotos/títulos/textos/tags de Sobre; título, intro, imagem, título, texto e botão de cada card de Apoio; foto, nome, meta, bio e botão de Artistas; thumbnail, título, descrição e botão de Episódios; capa, título, descrição, botão e item interno do Acervo.
- Exemplos: `about.joao.photo`, `about.joao.title`, `support.front.ufsb.button`, `episode.t01ep07.thumbnail`, `gallery.gravacoes.cover`.

### 5. Visual do modo modular
- Trocar o contorno global por: contorno discreto **apenas** no item selecionado, com alça "mover" e etiqueta curta ("Movendo: foto de João").
- Grade e dock permanecem como estão.

### 6. Persistência e reset
- Salvar somente o offset da chave movida; nenhum transform em container pai; nada de sobrescrever o `layout-state` inteiro.
- Adicionar "Resetar item selecionado" no dock; reset geral (se aplicado) pede confirmação.

### 7. Segurança
- Sem alteração de RLS, sem `service_role`. Todo o modo modular continua atrás de `isAdmin()` + `admin-mode`; anônimo não vê dock nem consegue arrastar, e o clique de arraste não dispara upload.

## Testes
- Playwright em Sobre, Apoio, Artistas, Episódios e Acervo: mover foto, título, texto, botão e imagem individualmente; confirmar que card/coluna/grid/seção não se movem; salvar, recarregar e conferir posições; resetar.
- Não regressão com grade desativada: navegação, modais, botões, uploads e editor inline.
- Typecheck, lint, build e console limpos.

## Arquivos afetados
`src/legacy/pqoq-editor-plus.js` (seletores, seleção, dragKey, dock/reset), `src/legacy/pqoq-legacy.js` (atributos `data-layout-key`), `src/pqoq.css` (estados visuais do modo modular).

## Risco e rollback
Risco médio (interação de edição, sem mudança de dados/esquema). Rollback: reverter os três arquivos; o `layout-state` salvo permanece intacto e chaves antigas continuam sendo lidas.