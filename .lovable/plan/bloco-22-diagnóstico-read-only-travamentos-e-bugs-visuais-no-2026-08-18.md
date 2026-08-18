# BLOCO 22 — Diagnóstico read-only: travamentos e bugs visuais no modo edição da página Sobre

Nenhum arquivo de código, CSS, dado do Supabase ou localStorage foi alterado.

## Causa principal encontrada

O editor de tags estáticas da página Sobre (`renderStaticTags` / `readStaticTags` em `src/legacy/pqoq-editor-plus.js`) lê as tags de volta do DOM com um seletor que também captura o invólucro da tag e os botões de controle. Resultado: os símbolos de controle (↑ ↓ ×) são gravados como texto da tag, e cada tag é lida duas vezes (invólucro + texto interno), duplicando itens a cada leitura.

Trecho responsável (linhas ~1396-1404):

```text
querySelectorAll(".tag-edit-text, span:not(.tag-edit-btn)")
```

`.tag-edit` (invólucro) é um `span` e não tem a classe `tag-edit-btn`, então entra no resultado com `textContent` = "Tatuagem ↑ ↓ ×". Os botões são `<button class="tag-edit-btn">`, e o `:not(.tag-edit-btn)` não os exclui do texto do pai.

## Evidência de dados (Supabase, somente leitura)

`card-tags` (531 bytes) contém hoje UMA chave, já corrompida:

```text
about.joao:tags = [
  "Ilustração Tatuagem ↑ ↓ × ↑ ↓ × Tatuagem ↑ ↓ × Tatuagem ↑ ↓ × Tatuagem Design ↑ ↓ × ↑ ↓ × Design ↑ ↓ × Design ↑ ↓ × Design"
]
```

Isto é exatamente o sintoma relatado ("PODCAST seguido de muitos símbolos"). `about.project:tags` e `about.almi:tags` ainda não existem na chave — ou seja, o dano só aparece após a primeira edição de tag no card.

Agravante de desempenho: o handler de `input` das tags (linha ~1826) chama `readStaticTags` + `writeStaticTags` a cada tecla, sem debounce. Cada tecla dispara leitura do DOM inteiro, crescimento do array e um upsert em `site_content`. Isso explica o travamento durante a digitação e por que o valor cresceu tanto.

## Chaves analisadas (tamanho, Supabase)

| Chave | Bytes | Situação |
| --- | --- | --- |
| editable-content | 4.953 | OK, sem HTML inflado |
| page-photos | 1.086 | OK, URLs de Storage, sem base64 |
| card-tags | 531 | CORROMPIDA (about.joao:tags) |
| style-state | 183 | Saudável — 3 entradas (`editable:about.joao.p1` com backgroundColor cinza; `editable:artists.page.intro`; um bio de episódio) |
| layout-state | 187 | 3 entradas, todas de `episodios`, offsets pequenos; nada da página Sobre |
| link-state | ausente | sem registros |

## Não é causado por

- localStorage como fonte de verdade: os valores corrompidos estão no Supabase; o cache local apenas reflete.
- `style-state` ou `layout-state` excessivos/corrompidos — ambos minúsculos e sem entradas da Sobre em `layout-state`.
- Base64 pesado em `page-photos`.
- Loop React ↔ legado: o `MutationObserver` já é desconectado durante `enhancePage()` (correção anterior). O re-render é o do próprio `renderStaticTags`, guardado por `dataset.renderedHtml`.
- Modo modular/grade.

## Causas secundárias (poluição visual)

1. Os três cards da Sobre têm `data-editable` no `<article>` inteiro (`about.project`, `about.almi`, `about.joao`). Como `STYLE_TARGET_SELECTOR` inclui `[data-editable]`, o card inteiro recebe `.style-editable` além de cada parágrafo interno → outlines tracejados aninhados, sensação de "muitas áreas tracejadas" e cliques que selecionam o bloco inteiro em vez do parágrafo.
2. `elementStyleRole` usa `rich:${compactText(textContent)}` como fallback: chave de estilo derivada do texto. Em páginas com muitos parágrafos longos (a Sobre tem 14) a chave muda ao editar o texto, o que pode "perder" estilos e gerar entradas órfãs.
3. A Sobre é a página com mais alvos editáveis por área (14 parágrafos ricos + 4 títulos + 3 blocos-card + 3 listas de tags), o que amplifica todos os efeitos acima em relação a /artistas, /episodios, /apoio e /acervo, cujos textos editáveis são gerados por card e em menor densidade por tela.

## Reprodução exata

1. Abrir `/sobre` no site público.
2. Entrar como editor pelo escudo no rodapé e ativar o modo edição.
3. Clicar em uma tag do card "João Lucas Monti" e digitar/apagar um caractere.
4. Observar: cada tecla grava; as tags se multiplicam e recebem ↑ ↓ ×.
5. Recarregar: as tags voltam já deformadas (dado persistido).

## Correções recomendadas para o próximo bloco

P1 — seguras e urgentes
1. Corrigir `readStaticTags` para ler apenas `[data-static-tag-text]` (e, no modo público, `span` diretos que não sejam controles), eliminando invólucro e botões.
2. No fallback de `renderStaticTags`, ler somente `span:not(.tag-edit):not(.tag-edit-btn):not(.tag-empty)`.
3. Sanitizar na leitura: descartar ↑ ↓ × e caracteres de controle, cortar tags acima de ~40 caracteres e remover duplicatas.
4. Limpar `card-tags["about.joao:tags"]` restaurando `["Ilustração","Tatuagem","Design"]`, mediante confirmação explícita do usuário (único dado corrompido; nenhuma outra chave será tocada).

P2 — performance
5. Debounce (~500 ms) no `input` das tags e gravar por índice em vez de reler o array do DOM.
6. Não aplicar `.style-editable` em `<article data-editable>` (excluir contêineres de card do `STYLE_TARGET_SELECTOR`), reduzindo os outlines aninhados.

P3 — UX
7. Chave estável para tags/parágrafos ricos (evitar chave derivada do texto).
8. Alternância para ocultar outlines em páginas longas e revisão de z-index do popover "Editar campo".

## Correções que NÃO devem ser feitas

- Não apagar `card-tags` inteira nem outras chaves.
- Não remover o editor de tags nem o modo edição.
- Não migrar/renomear chaves de `editable-content`.
- Não mexer em RLS, service_role, ou publicar.

## Riscos

- P1 (1-3): risco baixo — leitura mais restrita, sem escrita nova.
- P1 (4): risco médio (escrita em dado existente) — mitigado por confirmação e backup do valor atual no relatório.
- P2 (6): risco médio-baixo — muda a área de seleção de estilo; entradas antigas de `style-state` em cards permanecem gravadas, apenas deixam de ser alvo.

## Rollback

- Valor atual de `card-tags` está registrado acima em texto integral; pode ser reescrito exatamente como está.
- As mudanças de código ficam restritas a `src/legacy/pqoq-editor-plus.js` e `src/legacy/pqoq-legacy.js`; revertê-las restaura o comportamento atual.

## Arquivos envolvidos

- `src/legacy/pqoq-editor-plus.js` (tags estáticas, handler de input, popover)
- `src/legacy/pqoq-legacy.js` (`STYLE_TARGET_SELECTOR`, `elementStyleRole`, `refreshStyleTargets`)
- `src/pages.tsx` (cards da Sobre com `data-editable` no `<article>`)
- `src/pqoq.css` (outlines do modo edição — apenas em P2/P3)
