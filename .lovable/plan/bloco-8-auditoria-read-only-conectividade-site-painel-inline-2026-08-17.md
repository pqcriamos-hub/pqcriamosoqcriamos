# BLOCO 8 — Auditoria read-only: conectividade site / painel inline / /pqoqadmin

Risco geral: **alto** (dados reais, Supabase, RLS, painel admin, conteúdo público).
Nada foi alterado: apenas leitura de arquivos e consultas SELECT.

## Diagnóstico geral

O eixo **Episódios / Artistas / Acervo / Apoio** está de fato conectado: mesma tabela `site_content`, mesmo par de chaves pública + `-admin`, mesma sanitização de rascunhos. O que **não** está conectado é toda a camada "editorial de página": textos, links, fotos de página, tags e layout continuam vivendo no editor inline e no localStorage, sem módulo no `/pqoqadmin` e, em dois casos, sem nenhuma linha no Supabase.

Evidências coletadas no banco (linhas atuais de `site_content`):

```text
artists / artists-admin              9 itens
episodes / episodes-admin            8 itens
episode-embeds / -admin              3 chaves  — 3,7 MB (base64 legado em t01ep00)
gallery-cards / gallery-cards-admin  3 cards
support-content / -admin             fronts+partners
editable-content                     1 único campo (artists.page.intro)
page-photos, layout-state, style-state  presentes
link-state                           NÃO EXISTE
card-tags                            NÃO EXISTE
```

## Matriz de conectividade (resumo por área)

| Página | Área/campo | Público | Inline | /pqoqadmin | Chave / caminho | Escopo | Status | Problema | Correção | Risco |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | eyebrow, descrição, título "Últimos episódios" | sim | sim (`data-editable`) | **não** | `editable-content.home.*` | global | Parcial | só 1 chave existe no banco; resto vem de default estático em `src/pages.tsx` | módulo "Páginas/Textos" no admin | médio |
| Home | botões "Assistir agora / Ouvir / Conhecer" | sim | parcial (`data-link-editable` só no 1º) | não | `link-state` (**inexistente**) | global | Quebrado | 2 de 3 botões hardcoded; chave nunca criada | criar `link-state` + editor de links | médio |
| Home | cards "Últimos episódios" | sim | via episódio | sim | `episodes` (+`episode-embeds`) | por item | OK | — | — | baixo |
| Episódios (lista) | título/intro da página | sim | sim | **não** | `editable-content.episodes.page.*` | global | Parcial | default estático | módulo Textos | baixo |
| Episódios (lista) | code, título, artista, data, duração, descrição, tags, published, ordem | sim | parcial | sim | `episodes[]` | por item | OK | — | — | baixo |
| Episódio | thumbnail / capa | sim | sim | sim | `episode-embeds[epId].thumbnail` | por item | Parcial | base64 de 3,7 MB persistido em `t01ep00` (público e admin) | migrar essa imagem para Storage | alto (payload) |
| Episódio | YouTube, Spotify, MP3, `videoEnabled`, `sourceUrl`, resumo | sim | sim | sim | `episode-embeds` / `episodes[]` | por item | OK | — | — | baixo |
| Episódio | "Sobre o participante" | sim | sim | sim | `episodes[].participantAbout`; chave de texto `episode:{id}:participant-about` | por item | OK | fallback para `artist.bio` quando vazio (intencional) | manter | baixo |
| Episódio | título do bloco Sobre, participantTitle/Bio/Links/Image | sim (fixo) | não | não | — | — | Pendente | não existem esses campos por episódio | decidir se entram no schema | médio |
| Artistas | nome, meta, bio, portfólio, links, contato, tags, slug | sim | sim | sim | `artists[]` | por item | OK | — | — | baixo |
| Artistas | foto, `published` | sim | sim | verificar rótulo | `artists[].image/published` | por item | Parcial | confirmar upload Storage + toggle no módulo | teste manual | médio |
| Modal artista (4 abas) | Biografia / Portfólio / Redes / Contato | sim | sim | sim | `artists[]` | por item | OK | abas vazias dependem do preenchimento | — | baixo |
| Acervo | rota `/galeria` (sem `/acervo`) | sim | — | — | rota | global | Parcial | rótulo é ACERVO mas URL é `/galeria` | alias `/acervo` | baixo |
| Acervo | cards, capa, meta, intro, itens, tags, sortOrder, published | sim | sim | sim | `gallery-cards[]` | por item | OK | dados atuais ainda são o seed padrão, sem imagens | preencher via admin | baixo |
| Acervo | título/intro da página | sim | sim | não | `editable-content.gallery.*` | global | Parcial | default estático | módulo Textos | baixo |
| Apoio | frentes e parceiros: imagem, título, meta, subtítulo, descrição, texto completo, links, docs, galeria, contato, local, tags, sortOrder | sim | sim | sim | `support-content.fronts/partners` | por item | OK | conteúdo ainda é seed | preencher | baixo |
| Apoio | título/intro da página | sim | sim | não | `editable-content.support.*` | global | Parcial | default estático | módulo Textos | baixo |
| Sobre | blocos O projeto / Almi / João Lucas, textos, fotos, tags | sim | sim | **não** | `editable-content`, `page-photos`, `card-tags` | global | Pendente | nenhum módulo admin; `card-tags` nem existe no banco | módulo "Sobre/Páginas" | médio |
| Tags | episódios/artistas/acervo/apoio | sim | sim | sim | dentro de cada item | por item | OK | — | — | baixo |
| Tags | Sobre e cards editoriais | sim | sim | não | `card-tags` (**inexistente**) | global | Quebrado | nunca persistido no Supabase | incluir no módulo Textos | médio |
| Layout/estilo | posições e formatação inline | sim | sim | não | `layout-state`, `style-state` | global | OK-por-design | não deve ir para o admin | manter | baixo |
| Uploads | todos | — | editor | admin | bucket `site-media`, URL assinada | — | OK | anônimo bloqueado por `canUseEditorialUpload` + listener global | reteste manual | médio |
| Rascunhos | `published=false` | não | — | sim | `*-admin` (RLS editor/admin) | — | OK | sanitização dupla no cliente e na gravação | — | baixo |

## Listas pedidas

- **OK**: episódios (todos os campos do módulo), artistas, modal de artista, acervo, apoio, tags por item, separação público/admin, bloqueio de upload anônimo, RLS.
- **Parciais**: textos de página (`editable-content` com 1 registro), thumbnail com base64 legado, `published`/foto de artista a reconfirmar, rota `/galeria` sem alias `/acervo`.
- **Quebrados**: `link-state` e `card-tags` inexistentes no Supabase — perdem-se ao limpar o navegador.
- **Pendentes**: módulo Sobre/Páginas no `/pqoqadmin`; campos extra de participante por episódio (title/bio/links/image).
- **Só no público, não no admin**: textos de todas as páginas, botões da Home, fotos de `page-photos`, tags editoriais, blocos da página Sobre.
- **Só no admin, sem uso público**: nenhum campo identificado.
- **Ainda dependentes de localStorage**: `link-state`, `card-tags` (sem linha remota); `editable-content` e `page-photos` parcialmente, pois só gravam quando o editor inline salva.
- **Fallback/default estático**: textos de `src/pages.tsx`, merge de `episodesDefault`, seeds de `gallery-cards` e `support-content`.
- **Chave global indevida**: nenhuma restante em episódios (o `episode:{id}:participant-about` já é por item). `card-tags`/`link-state` são globais por design do legado.
- **Base64 legado**: `episode-embeds.t01ep00.thumbnail` (~3,7 MB) — apenas renderizado, não mais gerado.
- **Chaves recomendadas a criar**: `link-state`, `card-tags` (e, se aprovado, `page-texts` como nome próprio para textos de página).

## Causa provável das divergências

O `/pqoqadmin` foi construído sobre os quatro conjuntos "de dados" (episódios, artistas, acervo, apoio). A camada editorial herdada do legado (textos, links, fotos de página, tags de card, layout) nunca ganhou módulo próprio e só é gravada remotamente quando alguém edita inline logado — por isso `editable-content` tem um único campo e `link-state`/`card-tags` sequer existem.

## Plano de correção por prioridade (próxima fase, mediante aprovação)

1. **P1** Módulo "Páginas & Textos" no `/pqoqadmin` (Home, Episódios, Artistas, Acervo, Apoio, Sobre) editando `editable-content`, `page-photos` e `card-tags`, com criação das linhas ausentes sem sobrescrever valores reais.
2. **P1** Editor de links globais gravando `link-state`, e `data-link-editable` nos botões da Home hoje hardcoded.
3. **P2** Migração pontual da thumbnail base64 de `t01ep00` para Storage, reduzindo `episode-embeds` de 3,7 MB para poucos KB.
4. **P2** Alias de rota `/acervo` apontando para a página atual, mantendo `/galeria`.
5. **P3** Decisão sobre campos extra de participante por episódio.

Arquivos previstos: `src/components/admin/*` (novo módulo), `AdminShell.tsx`, `src/lib/admin-content.ts`, `src/pages.tsx` (apenas atributos `data-link-editable`), nova rota `src/routes/acervo.tsx`. Sem alteração de CSS, RLS ou permissões.

## Critérios de aceite, testes e rollback

- Aceite: cada campo público listado como Parcial/Quebrado passa a ter origem em `site_content`; limpar o localStorage não altera o site público; rascunhos continuam invisíveis para anônimos; nenhum dado real sobrescrito por default.
- Testes: typecheck/build; editar cada campo no admin e conferir no público; login anônimo sem acesso a `*-admin` e sem seletor de arquivo; episódio A e B com "Sobre" distintos; mobile e desktop nas telas tocadas.
- Rollback: cada etapa é um commit isolado e aditivo; as novas chaves podem ser removidas sem afetar as existentes; nenhuma migração destrutiva prevista.
