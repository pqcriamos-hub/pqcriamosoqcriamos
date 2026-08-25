# BLOCO 37 — Parte 3: auditoria read-only dos elementos modulares

Data: 25/08/2026. Medição em navegador headless (1280×1800) sobre `http://localhost:8080`, sem sessão de editor.
Nenhum arquivo de código, dado, RLS, Storage ou chave de `site_content` foi alterado nesta etapa.

Método: para cada elemento visível (≥ 8×8 px) dentro de `main`, verificou-se
(a) se casa com `MODULAR_SELECTOR`, (b) se está em `MODULAR_BLOCKED_SELECTOR` /
`MODULAR_IGNORE_SELECTOR`, (c) se possui chave estável (`data-layout-key`) ou
depende do fallback de DOM path, e (d) para qual alvo o clique resolve.

## 1. Panorama por página

| Página | Elementos visíveis | Alvos modulares | Com `data-layout-key` | Sem chave (fallback DOM path) |
| --- | --- | --- | --- | --- |
| Home | 12 | 5 | 0 | 5 |
| Episódios | 69 | 49 | 49 | 0 |
| Episódio (t01ep07) | 29 | 9 | 1 | 8 |
| Episódio (t01ep00) | 32 | 9 | 2 | 7 |
| Artistas | 69 | 56 | 56 | 0 |
| Acervo | 13 | 8 | 7 | 1 |
| Sobre | 39 | 22 | 17 | 5 |
| Apoio | 76 | 47 | 37 | 10 |

Observação: na coluna "com chave", Home conta 0 porque `home.eyebrow`,
`home.description` e `home.latest.title` são `data-editable` (chave de texto),
não `data-layout-key` de posição. O arraste desses itens hoje usa DOM path.

## 2. Páginas plenamente cobertas

- **Episódios** — todos os 49 alvos com chave estável (`episode.<id>`, `.thumbnail`, `.meta`, `.title`, `.description`, `.button`).
- **Artistas** — todos os 56 alvos com chave (`artist.<slug>` + `.photo/.meta/.name/.description/.button`).

Nessas duas páginas o clique resolve sempre para o menor alvo; `.grid`,
`.episode-grid`, `.artist-grid` e `main .section` estão corretamente bloqueados,
e `div.artist-actions` (controles admin) sobe para o card em vez de arrastar
os botões de remoção — comportamento desejado.

## 3. Lacunas encontradas (por prioridade)

### P1 — Página do episódio individual (maior déficit)

Sem `data-layout-key`, dependendo do DOM path (posição pode se perder se a ordem do DOM mudar):

| Elemento | Situação |
| --- | --- |
| `a.episode-back-link` ("← Voltar aos episódios") | alvo modular, sem chave |
| `div.episode-cover` | alvo modular, sem chave |
| `div.embed-box.episode-video-box` (player de vídeo) | alvo modular, sem chave |
| `div.audio-box.episode-audio` (player de áudio) | alvo modular, sem chave |
| `h2.lettered` ("Sobre <participante>") | alvo modular, sem chave |
| `button` "Abrir acervo do artista" / "Conhecer os anfitriões" | alvo modular, sem chave |
| `a` "Página Artistas" | alvo modular, sem chave |

Chaves sugeridas: `episode.<id>.backLink`, `.cover`, `.videoBox`, `.audioBox`,
`.participantHeading`, `.artistButton`, `.artistsPageLink`.

Nota: são exatamente os dois botões apontados no BLOCO 29 como salvos com chave
de DOM path (`episodios:button:...>button#0`, `episodios:a:/artistas`). Dar chave
estável a eles é o caminho para não repetir aquele deslocamento.

Fotos do participante já estão corretas: `episode.t01ep00.participantImages.0/1`
e `episode.t01ep07.participantImage.legacy`; `span.episode-participant-frame`,
`img.episode-participant-photo` e `button.participant-photo-zoom` sobem
corretamente para a `figure` (efeito pretendido do BLOCO 37, Parte 2).

### P2 — Home

- `h2.home-latest-title` ("Últimos episódios:") **não é alvo modular**: fica em `aside.home-latest`, fora de `.section`/`.card`, e não tem `data-layout-key` → não pode ser movido.
- `div.pill`, `div.intro-text` e os três `a.button` do hero são arrastáveis, mas sem chave estável.
- Na medição, nenhum `.home-episode` estava presente no DOM da Home; se a lista de últimos episódios aparecer para o editor, seus itens precisam de chave própria (`home.episode.<id>`).

Chaves sugeridas: `home.pill`, `home.intro`, `home.cta.watch/listen/artists`, `home.latest.heading`.

### P3 — Sobre

- `div.tag-list` (3 ocorrências: projeto, Almi, João) — alvo modular sem chave.
- `label.bio-photo.bio-photo-upload` (2 ocorrências) — alvo modular sem chave; é também o alvo de upload, então a chave evita colisão de DOM path após troca de foto.
- Anomalia estrutural: em `about.joao` há um `p` resolvendo para outro `p` (parágrafo aninhado no HTML salvo). Não quebra o arraste, mas é HTML inválido vindo do conteúdo — candidato a limpeza no sanitizador, não no editor.

Chaves sugeridas: `about.<slug>.tags`, `about.<slug>.photo`.

### P4 — Apoio

- `article.card.support-card` (todas as ocorrências) — o **card** não tem chave, enquanto os filhos (`.image`, `.meta`, `.title`, `.description`, `.button`) têm. Mover o card inteiro grava DOM path.
- `div.tag-list` de cada card de apoio — alvo modular sem chave.

Chaves sugeridas: `support.<group>.<id>` para o card e `support.<group>.<id>.tags`.

### P5 — Acervo

- `article.card.gallery-card` — card sem chave (filhos já têm `gallery.<id>.*`). Sugerido: `gallery.<id>`.
- Só um card estava visível na medição (os demais provavelmente despublicados); a mesma lacuna vale para todos.

## 4. O que está correto e não deve mudar

- Nenhum container grande é arrastável: `main`, `main .section`, `.page`, `.grid`, `.about-layout`, `.support-grid`, `.episode-grid`, `.artist-grid`, `.section-head`, `.modal`, `.modal-panel`, `.layout-dock`, `.owner-bar`, `.editor-panel`.
- `iframe` dos players sobe para `.audio-box`/`.embed-box`, evitando arraste dentro do embed.
- Controles administrativos (`.artist-actions`, `.gallery-admin-controls`, `.admin-row`, `.tag-edit-btn`) não iniciam arraste.
- `strong`/`span` internos sobem para o parágrafo/`.tag-list` que os contém.
- Nenhuma chave existente foi renomeada nesta auditoria; qualquer correção futura deve ser **aditiva** e manter a leitura das chaves de DOM path já salvas em `layout-state`.

## 5. Recomendação para o próximo bloco

Bloco aditivo em `src/legacy/pqoq-legacy.js` (e no JSX estático da Home/Sobre onde aplicável) adicionando `data-layout-key` nos itens de P1→P5, mais inclusão de `main .home-latest-title` (ou equivalente) no `MODULAR_SELECTOR`. Sem mudança de CSS, dados ou RLS. Rollback = reverter os arquivos tocados; `layout-state` permanece intacto porque `legacyDragKey` continua sendo lida.

## 6. Pendência de validação (Parte B do plano)

O arraste com sessão de editor não pôde ser exercitado aqui: o Supabase deste projeto é externo/não gerenciado e não há sessão admin no ambiente de teste. Validação manual necessária: ativar grade, arrastar foto/título/texto/botão, salvar, recarregar, conferir posição e usar "Resetar item selecionado".
