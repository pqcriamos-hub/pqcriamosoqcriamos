# BLOCO 13 — Concluir Passo 5: Dashboard, Acessos e Manutenção de Mídia

Fecha o `/pqoqadmin` como centro de gestão: métricas reais, saúde do conteúdo,
diagnóstico do field map, manutenção de mídia item a item e uma aba "Acessos"
mais clara. Nenhuma alteração automática de dados: toda escrita depende de
clique explícito do editor.

## Estado atual verificado

- `src/lib/admin-content.ts` já tem `fetchContentOverview` (só chaves públicas),
  `formatBytes`, `uploadAdminMedia`, `isBase64`, `isValidUrl` e um
  `migrateBase64Media()` que migra tudo de uma vez (episode-embeds + page-photos).
- `src/components/admin/AdminDashboard.tsx` mostra 3 cards (chaves, publicadas,
  tamanho), a tabela de chaves e um card único "Migrar imagens base64".
- `src/components/admin/AccessAdmin.tsx` faz apenas concessão/revogação de papéis
  via `admin_list_access` / `admin_lookup_user_id`; não mostra sessão nem avisos.
- `src/lib/field-map.ts` já expõe `FIELD_MAP`, `PUBLIC_KEYS`, `ADMIN_KEYS`,
  `fieldsWithoutInlineEditor()` e `fieldsByKey()`, ainda sem consumo na UI.
- Snapshot de 17/08 confirma `episode-embeds` e `episode-embeds-admin` com
  3.697.526 bytes (thumbnail base64 de `t01ep00`) e ausência de `link-state` e
  `card-tags`.

## O que será feito

### 1. Métricas reais no Dashboard
- Ler chaves públicas **e** `-admin` no overview (hoje só públicas), com contagem
  de chaves públicas, chaves admin, tamanho total e última atualização.
- Card "Conteúdo por módulo": episódios, artistas, acervos (e itens internos),
  frentes de apoio e apoiadores separados por publicado/rascunho; contagem de
  textos editáveis, fotos de página, links globais e tags estáticas.
- Todo cálculo tolerante a chave ausente/vazia (mostra 0 ou "—", nunca quebra).

### 2. Saúde do conteúdo
Painel com verificações somente-leitura: base64 legado, chaves ausentes,
chaves muito grandes (limite configurável), links inválidos, imagens ausentes,
slugs vazios, episódios sem thumbnail, artistas sem foto, acervos sem capa,
apoio sem logo e campos pendentes do field map.

### 3. Status de conexão
Supabase conectado, e-mail autenticado, papel detectado, Storage disponível,
RLS ativo e aviso de que o localStorage é apenas cache. Sem tokens ou variáveis.

### 4. Detecção de base64 legado item a item
Novo scanner que varre `episode-embeds(-admin)`, `artists(-admin)`,
`gallery-cards(-admin)`, `support-content(-admin)` e `page-photos`, retornando
para cada achado: chave, caminho no JSON (ex. `episode-embeds.t01ep00.thumbnail`),
tipo (`data:image` / `data:audio`), tamanho aproximado e item relacionado.

### 5. Manutenção de mídia com ação por item
Lista de achados com botões "Migrar para Storage" e "Ignorar por enquanto" e
status individual. A migração de um item:
converte o dataURL em arquivo, envia via `uploadAdminMedia` para caminho seguro
(ex. `episodes/t01ep00/thumbnails/`), obtém a signed URL, substitui **apenas**
aquele campo, grava a chave pública e a `-admin` correspondente, e em caso de
falha mantém o base64 intacto sem salvar nada. O botão antigo "migrar tudo"
continua disponível como atalho.

### 6. Caso t01ep00
O scanner listará `episode-embeds.t01ep00.thumbnail` (~3,7 MB). A migração será
executada com clique explícito e validada depois na Home, na lista de episódios
e na página individual, com comparação de tamanho antes/depois.

### 7. Acessos mais claro
Acima da tabela de papéis: e-mail, papel, status da sessão, botões "Sair" e
"Voltar ao site", resumo de permissões (ler público, editar, upload, salvar em
`site_content`) e avisos sobre rota oculta ≠ segurança, `service_role` fora do
front-end, bucket privado com URLs assinadas e o lembrete manual de ativar
Leaked Password Protection. Nada de token, senha ou variável de ambiente.

### 8. Field map no Dashboard
Painel de conectividade a partir de `src/lib/field-map.ts`: total de campos,
campos OK, pendentes, sem módulo admin, sem editor inline, sem render público e
agrupamento por página.

### 9. Ações de cache e exportação
"Recarregar dados do Supabase", "Limpar cache local deste navegador",
"Exportar snapshot JSON das chaves públicas" e "Exportar snapshot JSON completo
do editor" — download local, sem segredos e sem escrever no banco.

## Detalhes técnicos

- Arquivos: `src/lib/admin-content.ts` (overview com chaves admin, scanner
  `findLegacyBase64()`, `migrateBase64Field()` por item, export de snapshot),
  `src/lib/field-map.ts` (helpers de diagnóstico se necessário),
  `src/components/admin/AdminDashboard.tsx` (reescrito em subcomponentes),
  `src/components/admin/MediaMaintenance.tsx` (novo), `AccessAdmin.tsx`,
  `AdminShell.tsx` (passar e-mail/papel/sign-out para Acessos e, se preciso,
  nova entrada "Manutenção").
- Sem migrations, sem mudança de RLS/policies, sem bucket novo, sem
  `service_role` no front-end. Escrita só por `saveContentValue`, que preserva o
  split público/admin e a sanitização de rascunhos.
- Validação: `tsgo --noEmit`, ESLint/Prettier, build e Playwright em
  `/pqoqadmin`, `/`, `/episodios` e `/episodio` conferindo console limpo.

## Riscos e rollback

- Risco médio apenas na migração de mídia (escreve em `episode-embeds` e
  `episode-embeds-admin`). Mitigação: backup em memória, escrita só após upload
  bem-sucedido, um campo por vez.
- Rollback: reverter os arquivos deste bloco; para desfazer uma migração de
  mídia, o base64 original está no snapshot/histórico e o arquivo migrado
  permanece no Storage.
