# BLOCO 29 — Diagnóstico read-only: responsividade mobile

Nenhum arquivo de código, dado, RLS ou registro do Supabase foi alterado. Apenas leitura de CSS/JS e medição em navegador headless (360, 390, 430, 768 e 1280 px) em Home, Episódios, episódio individual, Artistas, Acervo, Apoio, Sobre e /pqoqadmin.

## 1. Diagnóstico geral

O layout base é sólido: em todas as páginas públicas e no /pqoqadmin, `document.documentElement.scrollWidth` é igual a `window.innerWidth` em 360/390/430/768/1280 px. **Não existe overflow horizontal de página.** Os problemas são localizados: (a) offsets salvos do modo modular aplicados em telas pequenas, (b) grades de duas colunas dentro de modais que não empilham no mobile, (c) lightbox dimensionado por viewport de desktop, (d) tipografia justificada.

## 2. Páginas com problema

| Página | Situação |
| --- | --- |
| Episódio individual | Botões sobrepostos (confirmado) |
| Modal do Acervo | Conteúdo saindo 105 px além da área útil (confirmado) |
| Lightbox Acervo/Portfólio | Faixas terracota e altura excessiva (confirmado por CSS) |
| Apoio (modo modular) | Risco confirmado: mesma causa do episódio |
| Home, Episódios, Artistas, Sobre, /pqoqadmin | Sem quebra estrutural |

## 3. Sobreposições — causa medida

Em `/episodio?id=t01ep07` a 360 e 390 px:

```text
"Página Artistas"        top 2065  x 42→178
"RSS" / "Spotify"        top 2072  x 86→218   <-- colisão
"Abrir acervo do artista" top 2022
```

Causa raiz: `layout-state` (localStorage `pqoq-site:layout-state`) aplica `translate: 0px 37.78px` inline nos elementos
`episodios:button:...>button#0` e `episodios:a:/artistas`. O offset foi salvo em desktop e é reaplicado sem escala no mobile, empurrando os dois botões sobre a `.platform-row.episode-participant-links`. Não é bug de CSS.

## 4. Overflow dentro de modais

Modal do Acervo em 390 px (`.gallery-modal-panel` = 342 px, `.modal-body` = 338 px):

```text
.gallery-modal-intro / .meta / .gallery-modal-actions  →  left 344, right 495
```

Causa: `.gallery-modal-hero { grid-template-columns: minmax(280px, 360px) minmax(0, 1fr) }` (src/pqoq.css:1398). A primeira coluna tem mínimo de 280 px, então a segunda é empurrada para fora dos 338 px disponíveis. Nenhum media query mobile redefine `.gallery-modal-hero`, `.support-modal-hero` (:1906) nem `.gallery-modal-panel`. `.modal-panel` tem `overflow: auto`, então o conteúdo é cortado/rola lateralmente em vez de empilhar. O mesmo vale para `.modal-head h2` com `clamp(32px, 4vw, 52px)` competindo com o botão fechar.

## 5. Lightbox (Acervo e Portfólio)

- `.lightbox-image` (:1611) usa `background-image` + `background-size: contain` sobre `background-color: var(--terracotta)` com `min-height: min(78vh, 720px)`. Em retrato, a imagem "cabe" na largura e sobra altura → **faixas terracota grandes acima/abaixo**. Não é bug de dados.
- `.lightbox-figure` só perde a segunda coluna abaixo de 720 px (:1687), mas mantém `max-height: calc(100vh - 40px)` com `overflow: auto`, empilhando imagem 78vh + copy → altura total muito acima da tela.
- `.lightbox-panel` é flex com `.lightbox-nav` (38 px no mobile) nas laterais dentro de `width: calc(100vw - 28px)` → setas quase colando nas bordas e roubando largura da imagem.
- `.lightbox-close` e `.lightbox-zoom` usam `top: -16px` (fora do painel); com painel ocupando quase toda a altura no mobile, ficam em zona de risco de corte.

## 6. Texto

- `text-align: justify` em 8 pontos do CSS (linhas 180, 276, 304, 561, 574, 1437, 1537), incluindo `.gallery-modal-intro` e os blocos do episódio — em ~338 px de largura isso gera buracos grandes entre palavras (percepção de "letter/word-spacing excessivo"). **Não há `word-spacing` nem `letter-spacing` anômalos**: os valores medidos são `normal` nos parágrafos; `letter-spacing` só aparece em chips/labels em caixa alta (0.02–0.08em), coerente.
- Títulos de modal e `.gallery-modal-copy h3` usam `clamp(30px, 4vw, 42px)`: no mobile ficam no piso de 30 px, grandes para 338 px.
- `.episode-participant-photo` tem `max-width: 240px` e o card "Sobre o participante" não tem limite de altura → bloco visualmente muito alto, como relatado.
- `.platform-chip` tem `font-size: 10px` e `min-height: 34px`; o alvo de toque fica abaixo dos 44 px recomendados.

## 7. layout-state e style-state no mobile

- **layout-state: está afetando o mobile.** Confirmado inline `translate` de origem desktop em dois elementos do episódio. Por desenho, `pqoq-editor-plus.js` reaplica offsets sem breakpoint, então qualquer elemento movido em desktop pode colidir/estourar em Apoio e demais páginas.
- **style-state: sem efeito nocivo detectado.** Nenhum `backgroundColor`/`transform` problemático foi observado nas páginas medidas após a limpeza do BLOCO 25.

## 8. Header mobile

`@media (max-width: 780px)` empilha `.site-header` e reduz o logo para 190 px. A nav quebra em duas linhas (Episódios/Artistas/ACERVO + Sobre/Apoio) com gap consistente de 12 px e altura de toque de 46 px. **Sem overflow** (maior direita = 321 px em 360 px de viewport). Aceitável como está.

## 9. Correções recomendadas (por prioridade, para o próximo bloco)

**P1 — offsets do modo modular no mobile (risco alto de sobreposição)**
- Não aplicar `translate` de `layout-state` abaixo de ~780 px (ou aplicar escala/opt-out por breakpoint), preservando os dados salvos intactos.

**P2 — modais no mobile**
- Media query ≤ 780 px: `.gallery-modal-hero` e `.support-modal-hero` para `grid-template-columns: 1fr`; reduzir padding de `.modal-body`/`.modal-head`; `.modal-panel` em `width: 100vw - 16px` e `max-height: 100dvh - 24px`; reduzir `clamp` dos títulos.

**P3 — lightbox**
- ≤ 780 px: `.lightbox-image` com `min-height` menor (ex. `52vh`) e fundo neutro/escuro; `.lightbox-figure` com `max-height: 100dvh`; `.lightbox-nav` sobreposta à imagem (absolute) em vez de ocupar largura; reposicionar `.lightbox-close`/`.lightbox-zoom` para dentro do painel.

**P4 — tipografia e cards**
- Trocar `justify` por `left` abaixo de 780 px; limitar altura do card do participante com "ler mais"; `.platform-chip` com alvo de 40–44 px.

## 10. O que não deve ser alterado

Visual desktop, tokens de `:root`, fontes, logo, ícones, header/nav, estrutura de rotas, dados de `site_content`, `layout-state`, `style-state`, RLS, Storage, `/pqoqadmin` (sem quebra detectada) e a lógica de publicação/sanitização.

## 11. Rollback

Todas as correções propostas são media queries aditivas em `src/pqoq.css` mais um guard de breakpoint em `src/legacy/pqoq-editor-plus.js`. Rollback = reverter esses dois arquivos ao commit anterior; nenhuma migration, nenhum dado tocado.

## Próximo bloco

BLOCO 30 — P1 + P2: neutralizar offsets do modular no mobile e empilhar os modais (Acervo, Apoio/artista) em ≤ 780 px.
