# BLOCO 38 — Diagnóstico read-only (Acervo limpo, vídeo, enquadramento em Apoio, botão de doação)

Nenhum arquivo de código, dado do Supabase, migration, RLS ou Storage foi alterado neste bloco. Apenas leitura.

## 1. Causa dos textos automáticos no Acervo

Confirmado por leitura de código, em dois pontos:

1. `src/legacy/pqoq-legacy.js:1193` (portfólio) e principalmente `src/legacy/pqoq-editor-plus.js:307-327` — função `normalizeGalleryItem()`, que roda em TODA leitura de `gallery-cards`, tanto no modo edição quanto no público:
   - `title: item.title || \`Item ${index + 1}\``
   - `caption: item.caption || "Legenda editavel do item da galeria."`
   - `credit: item.credit || "Acervo"`
2. `src/legacy/pqoq-editor-plus.js:841-859` — `addGalleryItem()` cria o item já com `title: "Novo item"`, `caption: "Legenda editavel do item da galeria."`, `credit: "Acervo"`. Ou seja, o placeholder é **persistido** no Supabase no momento da criação.

E no nível do card (`galleryCards()`, linhas ~340-356): `meta: "Nova categoria"`, `title: \`Nova galeria N\``, `description: "Descricao editavel da galeria."`, `intro: "Apresentacao editavel da galeria."`.

Respostas diretas:
- Vêm do seed inicial? Sim, parcialmente (`galleryDefaults`).
- Vêm do render como fallback? Sim — é a causa principal, `normalizeGalleryItem`/`galleryCards`.
- Vêm do editor inline? Sim, ao adicionar item (`addGalleryItem`) o texto é gravado.
- Vêm do `/pqoqadmin`? Não. `AcervoAdmin.tsx` (`emptyItem`/`emptyGallery`) cria tudo vazio — está correto.
- Vêm de dados antigos persistidos? Sim, itens criados pelo inline já têm o placeholder salvo.
- Aparecem no público? Sim, porque a normalização acontece antes do render público.
- “Descrição expandida” / “Episódio relacionado” são **labels de formulários admin** (`galleryItemTemplate`, bloco `admin-only`) — só aparecem em modo admin; não são texto público.

Campos que devem aceitar vazio: `title`, `caption`, `description`, `credit`, `link`, `episode`, `date`, `location`, `tags`.
Obrigatório: apenas a mídia do item (imagem ou vídeo) — com moldura visual neutra como fallback. No card (galeria) mantém-se `id` e `slug` derivado.

## 2. Espaços vazios nos cards internos

- `.gallery-asset-copy` (`src/pqoq.css:1480`) usa `display:grid; gap:10px; padding:16px` — mesmo com `h3`/`p` vazios, os nós existem e o `gap` reserva espaço.
- `.gallery-asset-image` (`:1409`) tem `min-height:240px` e um fundo decorativo — correto como moldura, mas hoje mostra a palavra “Imagem” também fora do admin.
- “Ler mais” só aparece com descrição (`hasMore`) — está correto.
- Bloco `.gallery-item-admin` é `admin-only`; não vaza no público (confirmado nas classes de `body.public-preview`).

Correção proposta: não emitir os nós de texto quando o valor está vazio (render condicional), em vez de emitir vazio; e esconder o rótulo “Imagem” quando não estiver em admin.

## 3. Schema atual dos itens e schema recomendado para vídeo

Atual (`gallery-cards[].items[]`, `GalleryItem` em `src/lib/admin-content.ts`): `id, title, caption, description, credit, link, image, episode, date, location, tags, published, sortOrder`. **Só imagem.** Não existe `mediaType`, `video`, `videoUrl`, `posterImage`, `provider`, `duration`, `thumbnail` nem `focalPoint`.

Acréscimo mínimo e aditivo (imagens antigas continuam funcionando por ausência dos campos):

```text
mediaType?: "image" | "video"     // ausente = "image"
videoUrl?: string                  // upload (URL assinada) ou link externo
videoProvider?: "file" | "youtube" | "vimeo"
posterImage?: string               // usa image quando ausente
```

Locais de edição de vídeo: `/pqoqadmin → Acervo → editar acervo → item interno` (principal), editor inline do Acervo (secundário), render no modal público e no lightbox. `ContentHealth` passa a checar “item sem mídia”.

## 4. Upload e links de vídeo

Helpers atuais aceitam apenas imagem e áudio: `uploadAdminMedia` (`src/lib/admin-content.ts:216`) e `uploadEditorMedia` (`src/lib/site-content-sync.ts`), bucket privado `site-media`, URL assinada de 10 anos, limites 8 MB (imagem) / 50 MB (áudio).

Recomendação desta fase:
- Upload: `video/mp4` e `video/webm`, limite 100 MB. MOV fica fora (compatibilidade de navegador ruim).
- Links: YouTube e Vimeo por embed com `allowfullscreen` + `referrerpolicy="strict-origin-when-cross-origin"`, extraindo apenas o ID (nunca inserindo URL arbitrária em `iframe src`).
- Link direto externo: aceito somente `https` terminando em `.mp4`/`.webm`, renderizado em `<video>`.
- O bucket aceita vídeo (não há restrição de MIME no código; a validação é do lado do cliente). As políticas atuais permitem upload por editor/admin autenticado; URL assinada funciona igual para vídeo.

## 5. Enquadramento das imagens em Apoio

- `.support-card-thumb` (`src/pqoq.css:1919`): `aspect-ratio:16/9` + `background: center/cover`. O `center` fixo é exatamente o que corta rostos.
- Modal: `.support-modal-image` e `.support-gallery-thumb` (`pqoq-editor-plus.js:1319,1342`) também usam `background-image` com `cover`.
- `focalPoint` **não existe** em nenhum lugar do projeto hoje.

Solução sem alterar a imagem original: adicionar `focalPoint` opcional em `SupportCard` e escrever `background-position: X% Y%` (e `background-size: calc(100% * zoom)`), com default `50/50/1`. Edição no `/pqoqadmin → Apoio` (controles X/Y/zoom com prévia) e, opcionalmente, no editor inline numa fase seguinte. Mesmo modelo poderá ser reaproveitado depois em capas de episódio e no Acervo.

```text
focalPoint: { x: 50, y: 50, zoom: 1 }
```

## 6. Botão flutuante de doação

Elementos fixos já existentes: `.modal` (z 100+), `.style-popover` (z alto, admin), `.layout-dock` (bottom 18px, centralizado, só em admin), `.gallery-toast` (fixo), `.layout-grid-overlay`, além do badge do Lovable (canto inferior direito) e da barra de owner do preview. O “acesso editorial” fica no rodapé (não é flutuante).

Posição recomendada: **canto inferior esquerdo**, `bottom: 20px; left: 20px; z-index: 90` — evita o badge do Lovable à direita e não colide com o `layout-dock` central. Regras adicionais: oculto em `body.admin-mode`/`layout-grid-mode` e em `/pqoqadmin`; oculto enquanto um modal/lightbox está aberto; `prefers-reduced-motion` desliga a pulsação; `button` real com `aria-label`, foco visível e `Esc` fechando o modal.

## 7. Modelo de dados do modal

Chave recomendada: `donation-widget` (o formato proposto pelo usuário serve integralmente). Todo o conteúdo é público por natureza, então **não precisa de `-admin`**; usa apenas a chave pública com `published`. A chave Pix fica **opcional** e controlada por `showPix` — sem Pix cadastrado nada é exibido; nunca gravar dados bancários além da chave que o próprio editor escolher publicar. QR Code entra como upload no bucket `site-media` (nunca base64).

Atenção: a whitelist de chaves está **dentro das políticas RLS** de `site_content`. Incluir `donation-widget` exigirá uma migration recriando as policies com a chave adicional (fase de implementação, não agora).

## 8. Onde editar o modal

- `/pqoqadmin`: nova seção “Doação / Apoio flutuante” dentro do módulo **Apoio** (evita criar um módulo novo). Campos: ativar/desativar, título, subtítulo, texto, rótulo e link do botão, chave Pix + mostrar/ocultar, QR Code (upload), texto de compartilhamento, posição, animação on/off.
- Modo edição do site: textos do modal editáveis via `data-editable` com chaves `donation.*`, gravando na mesma chave. Upload de QR Code só para admin autenticado (`canUseEditorialUpload()`), bloqueado para anônimo e em prévia pública.

## 9. Arquivos envolvidos

`src/legacy/pqoq-editor-plus.js`, `src/legacy/pqoq-legacy.js`, `src/pqoq.css`, `src/lib/admin-content.ts`, `src/lib/site-content-sync.ts`, `src/components/admin/AcervoAdmin.tsx`, `src/components/admin/ApoioAdmin.tsx`, `src/components/admin/ContentHealth.tsx`, `src/routes/*` (montagem do widget global), + 1 migration para a whitelist RLS.

## 10. Riscos

- Médio: remover fallbacks pode deixar itens legados visualmente “nus” até o editor preencher — mitigado por moldura de mídia e limpeza opcional dos placeholders já gravados (com autorização).
- Médio: vídeo aumenta peso/custo de Storage — mitigado por limite de 100 MB e preferência por YouTube.
- Alto: alterar a whitelist de RLS toca policies — migration aditiva, recriando policies com o mesmo predicado + nova chave.
- Baixo: botão flutuante pode colidir com UI — mitigado por posição à esquerda e ocultação em admin/modal.

## 11. Fases de implementação propostas

- **38A** Acervo limpo: remover fallbacks de texto em `normalizeGalleryItem`/`galleryCards`, `addGalleryItem` criando campos vazios, render condicional, CSS de card compacto.
- **38B** Vídeo no Acervo: campos aditivos, editor no `/pqoqadmin`, render em modal e lightbox, upload MP4/WebM + YouTube/Vimeo.
- **38C** `focalPoint` em Apoio: campo, controles no admin, aplicação em card/modal/galeria.
- **38D** Widget de doação: migration da whitelist, chave `donation-widget`, botão + modal globais, seção no `/pqoqadmin`, textos editáveis inline.
- **38E** QA: desktop/mobile, admin/anônimo, ausência de placeholders no público, sem erro de console.

## 12. Rollback

Cada fase é isolada e reversível por reversão dos arquivos daquela fase. A migration da whitelist tem rollback recriando as policies sem `donation-widget`. Nenhum dado existente é apagado; a limpeza de placeholders legados só ocorre se autorizada e será precedida por snapshot em `Audit/`.
