# Entrega — apoio e lançamento conjunto

## 1. Resumo e resultado
Botão de apoio com fundo creme, texto escuro e borda escura, usando os tokens existentes. Contraste calculado entre #fff4bf e #1f1a08: superior a 15:1.

No editor de episódios, a data pode ser sincronizada com o artista e o acervo relacionado. Acervos e itens possuem campos de vínculo por ID do artista ou ID/slug/código completo do episódio e data própria. Obras do portfólio aparecem na página individual do episódio, com ampliação de imagens pelo fluxo existente. Vídeos relacionados possuem atalho ao acervo completo.

## 2. Arquivos alterados/criados
- src/pqoq.css
- src/lib/release-schedule.ts
- src/lib/admin-content.ts
- src/lib/content-sanitize.ts
- src/components/admin/EpisodesAdmin.tsx
- src/components/admin/AcervoAdmin.tsx
- src/legacy/pqoq-legacy.js
- src/legacy/pqoq-editor-plus.js
- src/routes/episodio.tsx
- src/routes/pqoqadmin.tsx
- validation/release-schedule.test.ts
- AGENTS.md, roadmap.md e este relatório.

## 3. Migrations e Edge Functions
Nenhuma. Não houve mudança de schema, policies, bucket, Auth ou dependências. Campos opcionais no conteúdo editorial existente; fonte oficial permanece Supabase, com o cache legado existente.

## 4. Como programar
1. No Acervo, vincule o card inteiro ou os itens específicos ao ID/código/slug completo do episódio ou ID do artista. Vínculo de card inteiro agenda todos os seus itens; vínculo de item agenda somente aquele item.
2. Prepare o portfólio na ficha do artista.
3. No episódio, selecione o artista e defina a data/hora. Mantenha marcadas as opções de sincronização desejadas, aplique no modal e salve a lista.
4. Se o artista estiver em rascunho, confirme a publicação sugerida. Cards/itens em rascunho continuam ocultos até serem marcados como publicados no Acervo.
5. Ao abrir ou atualizar o site a partir da data, episódio, artista e conteúdo programado passam a aparecer. Não existe atualização automática de páginas já abertas.

## 5. Fluxos preservados
EP00 não participa da cascata. Conteúdo sem data continua visível conforme o estado publicado/rascunho anterior. Artistas já públicos não são retirados do ar. Obras já públicas sem data desses artistas permanecem visíveis. Rascunhos de portfólio são removidos da cópia pública; rascunhos não são publicados automaticamente. Exclusão, uploads e permissões existentes não foram alterados.

## 6. Testes executados
- bun test validation/release-schedule.test.ts: 7 testes aprovados; horário exato, legado, rascunhos, artista já público, EP00, alteração/remoção de data e vínculo exato.
- Sinal automático de compilação: build OK, sem execução manual de build/typecheck.
- Chromium: Home, Episódios, Artistas, Acervo e Apoio reais renderizados sem erros de execução de página.
- Botão real: creme rgb(255,244,191), texto rgb(31,26,8); modal abre. Conferido em 1280x1800 e 390x844, sem overflow horizontal.
- Simulação de leitura pública interceptada somente no navegador, sem gravação no Supabase: antes do horário, episódio/artista/acervo ausentes e link direto com pré-estreia; depois do horário e atualização, os três visíveis, obras na página individual e lightboxes de portfólio/acervo funcionando; sem erros de execução e sem overflow mobile.
- Salvamento autenticado e leitura posterior de dados reais NÃO testados: Supabase externo não gerenciado, sem sessão disponível. Simulação não substitui teste autenticado.

## 7. Riscos residuais
Risco médio no fluxo editorial: múltiplas gravações existentes não são uma transação única. Uma falha pode deixar parte das linhas salva; o painel mostra erro e permite tentar novamente, sem anunciar sucesso parcial. Edições simultâneas por administradores mantêm o risco preexistente de sobrescrita.

Agendamento é visibilidade no navegador, não embargo confidencial: dados programados já constam da cópia pública e o relógio do visitante decide a exibição. Data/hora usa o fuso local do dispositivo do editor. Alterar uma estreia pode afetar cards/itens explicitamente vinculados e selecionados. Vínculos em títulos/tags não são inferidos.

## 8. Rollback
Para interromper uma estreia específica, coloque o conteúdo em rascunho. Para publicar imediatamente, remova a data do episódio com a sincronização desejada e salve; revise também estados de publicação dos relacionados. Para desfazer o código, restaure os arquivos listados à versão anterior por meio do histórico do projeto. Campos opcionais salvos não exigem migration de rollback; registre as datas anteriores antes de alterá-las.

## 9. Não regressão
Confirmada somente nos testes e caminhos públicos listados. Não é possível afirmar não regressão total do salvamento autenticado, permissões remotas ou navegadores não testados. Auth, RLS e Storage não foram modificados.