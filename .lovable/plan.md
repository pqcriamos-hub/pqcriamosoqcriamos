# BLOCO 37 — o que ainda falta

## Já concluído (verificado no código)

- Parte 1 — área invisível clicável ao lado das fotos: resolvida (`.episode-participant-frame` com `width: fit-content` em `src/pqoq.css`, botão de ampliar dentro do frame em `src/legacy/pqoq-legacy.js`).
- Parte 2 — fotos do participante como elementos modulares individuais: `data-layout-key="episode.<id>.participantImages.<n>"` e `main .episode-participant-figure` no `MODULAR_SELECTOR`.
- Parte 4 — variações de grade: `GRID_KINDS`, preferência em `localStorage`, `<select id="layout-grid-kind">` no dock, `snapStepPx()` usado no `pointerup`, overlay de 12 colunas no CSS.
- Partes 5/6/7 — CSS de proteção (`pointer-events: none` no zoom durante o modo grade) e relatório parcial entregues.

## Falta

### A. Parte 3 — auditoria geral dos elementos modulares (read-only)

Varredura página por página (Home, Episódios, episódio individual, Artistas, Acervo, Sobre, Apoio) listando, para cada elemento visível:

- se é alvo modular (`MODULAR_SELECTOR`), bloqueado (`MODULAR_BLOCKED_SELECTOR`) ou ignorado;
- se possui chave estável (`data-layout-key`) ou cai no fallback de DOM path;
- lacunas encontradas: elementos que deveriam ser arrastáveis e não são, e elementos que arrastam o container errado.

Entrega: tabela por página + lista priorizada de correções, sem alterar código nesta etapa. `src/legacy/pqoq-legacy.js` hoje tem 13 pontos com `data-layout-key`; a auditoria diz onde faltam.

### B. Validação do arraste com sessão de editor

Não foi possível executar no sandbox: o Supabase deste projeto é externo/não gerenciado, sem sessão admin disponível. Opções:

1. Você valida manualmente (ativar grade, arrastar foto/título/texto/botão, salvar, recarregar, resetar item) e me reporta falhas;
2. Você faz login no preview do Lovable para injetar sessão e eu rodo o teste headless no próximo bloco.

## Riscos e rollback

Etapa A é somente leitura (risco baixo, sem rollback necessário). Nenhuma migration, RLS, Storage ou chave de conteúdo é tocada.
