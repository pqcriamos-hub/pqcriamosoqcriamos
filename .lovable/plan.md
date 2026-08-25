# BLOCO 35 — Modal "Editar episódio" no /pqoqadmin

## Situação atual (verificada)

- `src/components/admin/EpisodesAdmin.tsx` (1061 linhas) já tem um componente `EpisodeEditor` completo, renderizado **inline abaixo da tabela** quando `editing` não é nulo.
- Esse editor já contém: identificação, artista, descrições, participante (título, sobre, bio, tags, links), `ParticipantImagesEditor` (galeria de fotos com reordenar/legenda/crédito), players (`videoEnabled`, YouTube, Spotify, MP3), thumbnail via `embeds[id].thumbnail`, links do episódio e checkbox de publicação.
- Cascata de publicação/despublicação com artistas já existe (`cascadeSuggestions` + `AlertDialog` de confirmação) e roda no "Salvar alterações" do topo.
- O modal de artista (`ArtistsAdmin.tsx`) já usa `Dialog`, `AlertDialog` de descarte e `openEditor/closeEditor` — é o padrão a replicar.

Conclusão: a maior parte dos requisitos do BLOCO 35 já está implementada em formulário inline. O trabalho é **de apresentação e organização**, não de reescrita de regras.

## O que será feito

### 1. Converter o editor inline em modal central
- Envolver `EpisodeEditor` em `Dialog`/`DialogContent` no mesmo padrão do modal de artista: overlay escuro, card branco arredondado, sombra, X com `aria-label="Fechar edição de episódio"`, título "Editar episódio", subtítulo "Atualize as informações do episódio no acervo".
- Largura ~940px no desktop (`sm:max-w-[940px]`), uma coluna no mobile, scroll interno no corpo, rodapé sempre visível com "Cancelar" e "Salvar alterações".
- Acessibilidade herdada do Radix (`role="dialog"`, `aria-modal`, `aria-labelledby`/`describedby`, foco preso, ESC).

### 2. Guarda de alterações não salvas
- Rastrear snapshot do episódio/embed ao abrir; se houver diferença, fechar por X/ESC/overlay/Cancelar abre `AlertDialog` "Descartar alterações?" (igual ao de artistas). Sem alterações, fecha direto.
- Cancelar nunca grava; "Salvar alterações" do modal aplica no estado e mantém o fluxo de persistência existente.

### 3. Reorganizar em seções nomeadas
Reagrupar os campos já existentes nas 8 seções pedidas, com títulos e subtítulos, sem remover nenhum campo:
1. Identificação (código, título obrigatório, slug + botão "Gerar slug", data, duração, tags, publicado)
2. Artista vinculado
3. Descrições
4. Participante deste episódio
5. Fotos do participante (contador `n/3`, aviso de foto legada quando `participantImage` existe e a galeria está vazia)
6. Links e players
7. Thumbnail / capa
8. Publicação e cascata (com nota de que a cascata é confirmada no salvamento)

### 4. Avisos de vínculo na Seção 2
- EP00 (`t01ep00`): aviso institucional e ações de vínculo automático desabilitadas (regra de `episode-artist-link.ts` já existe e não muda).
- Episódio comum sem artista: alerta "Este episódio não possui artista vinculado."
- `artistId` que não existe no catálogo: alerta e seletor para corrigir.
- Mostrar status do artista e contagem de episódios publicados/ocultos, além de link "abrir artista".

### 5. Salvar no modal
- Sem mudança na camada de dados: continua usando `saveContentValue` com split `episodes`/`episodes-admin` e `episode-embeds`/`episode-embeds-admin`, sanitização e cascata atuais.
- Validação mínima: título obrigatório; slug duplicado bloqueia com mensagem; código apenas recomendado.

### 6. Integração com Saúde do Conteúdo
- Verificar se `ContentHealth.tsx` já tem ponte de navegação para o módulo de Episódios. Se houver, apontar as ações "sem capa", "sem artista", "artistId inexistente" e "sem slug" para abrir este modal com a seção correspondente em destaque. Se não houver ponte, essa parte fica como item separado e será informada no relatório — não vou criar plumbing novo de navegação sem sua autorização.

## Fora do escopo (não será tocado)

RLS, Auth, políticas de Storage, `service_role`, rotas públicas, CSS/visual do site público, sanitização público/admin, lógica de rascunhos, dados reais sem ação do editor. Nenhum base64 novo; uploads seguem indo para Storage nos caminhos atuais.

## Detalhes técnicos

- Arquivo principal: `src/components/admin/EpisodesAdmin.tsx` (modal + seções + guarda de descarte).
- Sem migrations. Sem mudança em `admin-content.ts` (tipos já cobrem `participantImages`, `videoEnabled`, `links`).
- `episode-artist-link.ts` usado apenas para leitura (`cascadeSuggestions`, exceção EP00).
- Estilos via classes Tailwind/shadcn do painel; `src/pqoq.css` não é alterado.

## Testes

Typecheck, lint e build; abrir `/pqoqadmin` → Episódios: editar T01EP00 (aviso institucional, sem sugerir Joab3), editar episódio comum, subir 3 fotos e confirmar bloqueio da quarta, trocar thumbnail, cancelar com alterações pendentes, salvar e conferir `/episodio?ep=...`, Home e lista; checar mobile e console.

## Rollback

Reverter `src/components/admin/EpisodesAdmin.tsx`. Nenhuma alteração de banco a desfazer.
