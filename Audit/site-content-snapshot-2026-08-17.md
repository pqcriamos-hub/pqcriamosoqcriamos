# Snapshot site_content — 17/08/2026 (antes do BLOCO 9)

Inventário lido diretamente do Supabase (`select key, published, updated_at, pg_column_size(value), jsonb_array_length(value)`).
Nenhuma chave foi apagada ou sobrescrita durante o BLOCO 9. Defaults só entram quando a chave está ausente ou vazia.

| chave | published | itens | bytes | updated_at |
| --- | --- | --- | --- | --- |
| artists | true | 9 | 4.662 | 2026-08-17 16:36 |
| artists-admin | false | 9 | 4.662 | 2026-08-17 16:36 |
| editable-content | true | — | 206 | 2026-06-24 17:07 |
| episode-embeds | true | — | 3.697.526 | 2026-08-17 16:20 |
| episode-embeds-admin | false | — | 3.697.526 | 2026-08-17 16:20 |
| episodes | true | 8 | 2.733 | 2026-08-17 16:20 |
| episodes-admin | false | 8 | 2.733 | 2026-08-17 16:20 |
| gallery-cards | true | 3 | 1.386 | 2026-06-26 18:42 |
| gallery-cards-admin | false | 3 | 1.386 | 2026-06-26 18:42 |
| layout-state | true | — | 266 | 2026-06-23 16:35 |
| page-photos | true | — | 1.035 | 2026-08-17 16:33 |
| style-state | true | — | 137 | 2026-06-24 17:07 |
| support-content | true | — | 1.273 | 2026-06-28 07:36 |
| support-content-admin | false | — | 1.273 | 2026-06-28 07:36 |

Alertas registrados:
- `episode-embeds` / `episode-embeds-admin` carregam ~3,7 MB de base64 legado (thumbnail de `t01ep00`). Migração disponível em /pqoqadmin → Dashboard → "Migrar imagens base64" (ação manual do editor).
- `link-state` e `card-tags` ainda não existem; passam a existir no primeiro salvamento em "Páginas & Textos".

Rollback: reverter os arquivos alterados no BLOCO 9 restaura o comportamento anterior; os campos novos dos itens são aditivos e opcionais, portanto o JSON antigo continua válido.
