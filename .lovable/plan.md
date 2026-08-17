# BLOCO 9 + 10 — Conectar campos restantes ao /pqoqadmin e validar

## Situação verificada agora (read-only)

Grande parte do BLOCO 9 já está implementada nos blocos anteriores:

- Split público/admin funcionando: `saveContentValue`/`fetchContentValue` gravam e leem `episodes-admin`, `episode-embeds-admin`, `artists-admin`, `gallery-cards-admin`, `support-content-admin`, com sanitização de `published=false` em `content-sanitize.ts`.
- Camada editorial (Home, intros de página, Sobre, fotos, links globais, tags de Sobre) já existe em `page-content.ts` + módulo "Páginas & Textos".
- CRUD conectado de Episódios, Artistas, Acervo e Apoio, com tags por item, links por item em Apoio, uploads via Storage e bloqueio de upload para anônimo.
- "Sobre participante" já é individual por episódio (`episode.participantAbout` + chave `episode:{id}:participant-about`).

Portanto este bloco trata apenas das lacunas reais, sem refazer o que funciona.

## Lacunas a corrigir

1. **Mapa central de campos**: hoje o registro cobre só a camada editorial. Falta um FIELD MAP único cobrindo também entidades (episódios, artistas, acervo, apoio) com id, página, tipo, chave Supabase, path no JSON, escopo, módulo admin, editor inline, render público e fallback.
2. **Episódio individual incompleto**: existe `participantAbout`. Faltam `participantTitle`, `participantBio`, `participantImage`, `participantLinks`, `participantTags`, com fallback para o artista somente quando vazios.
3. **Links de episódio e de artista/acervo**: Apoio já tem editor de links; episódios, artistas e itens de Acervo precisam de links próprios editáveis no admin (nunca em `link-state` global).
4. **Artistas — portfólio/redes/contato** são texto livre; garantir que o modal público renderiza exatamente os mesmos campos (auditar e corrigir render, sem redesenho).
5. **Dashboard incompleto**: falta listar chaves admin junto das públicas, alerta de base64 legado (inclui os ~3,7 MB em `episode-embeds`), campos desconectados, status de Storage e últimas atualizações.
6. **Acessos**: falta mostrar sessão/role/logout com aviso sobre Leaked Password Protection e sobre não expor service_role.

## Plano de execução

### Passo 0 — Snapshot e rollback
- Exportar todas as chaves de `site_content` (públicas e `-admin`) para um arquivo versionado em `Audit/` antes de qualquer escrita.
- Registrar em `MIGRATION_STATUS.md` os arquivos afetados e o procedimento de reversão.
- Nenhum dado do Supabase é apagado; defaults só entram quando a chave está ausente/vazia.

### Passo 1 — FIELD MAP central
- Criar `src/lib/field-map.ts` com o mapa completo (entidades + editorial) e reaproveitar `page-content.ts` como parte dele.
- Módulos do admin e o Dashboard passam a consultar esse mapa (fonte única para relatórios de conexão).

### Passo 2 — Episódio individual
- Ampliar o tipo de episódio em `admin-content.ts` com os campos de participante.
- `EpisodesAdmin.tsx`: campos de título, bio, imagem (upload Storage), links e tags do participante.
- `pqoq-legacy.js`: `renderEpisodePage` lê primeiro os campos do episódio; artista só como fallback; inline salva no item correto do array `episodes`.

### Passo 3 — Links e tags por item
- Episódios e Artistas ganham editor de links (rótulo + URL) no admin, gravado dentro do próprio item.
- Itens de Acervo ganham link opcional por item.
- Render público lê esses campos; `link-state` continua exclusivo dos botões globais.

### Passo 4 — Artistas: paridade admin ↔ modal
- Auditar campo a campo o modal público e corrigir apenas o que não renderiza (portfólio, redes, contato, tags, episódios relacionados).

### Passo 5 — Dashboard e Acessos
- Dashboard: tabela com chave pública + chave admin, itens, tamanho, última atualização, alerta de base64 e alerta de campos sem caminho de edição (derivado do FIELD MAP).
- Acessos: bloco de sessão (e-mail, role, logout) e avisos de segurança.

### Passo 6 — BLOCO 10 (validação)
- Typecheck, lint e build.
- Playwright em aba anônima com localStorage limpo: Home, Episódios, Episódio, Artistas, Acervo, Sobre, Apoio; conferir ausência de payload de rascunho e que nenhum seletor de arquivo abre.
- Entregar a matriz final `Página | Campo | Edita /pqoqadmin | Edita inline | Fonte Supabase | Aparece no público | Status`.
- Os testes de escrita autenticada (editar e ver refletido) precisam ser feitos por você logado — este projeto usa Supabase externo, sem sessão de teste disponível para automação; isso será marcado como pendente de confirmação manual no relatório.

## Riscos e limites

- Risco médio: alterações em `pqoq-legacy.js` (render público) e no schema JSON dos episódios. Mitigação: campos aditivos e opcionais, fallback preservado, nada removido.
- Fora de escopo: redesenho, identidade visual, RLS mais permissiva, publish automático, base64 novo, service_role no front.
