## Objetivo

Transformar o painel "Acesso editorial" (cadeado no rodapé) — hoje um placeholder que só mostra "A autenticação segura será conectada na etapa Lovable" — em um login real via Supabase. Criar a conta de editor `pqcriamos@gmail.com` e fazer com que **somente essa conta** desbloqueie o modo de edição.

## Como vai funcionar

```text
Rodapé → cadeado "Acesso editorial"
  ├─ Primeira vez:  [Criar conta de editor]  → define a senha → cria a conta
  └─ Depois:        e-mail + senha → [Entrar] → modo de edição liberado
                                     [Sair]    → volta ao modo público
```

- **Login**: e-mail + senha (Supabase Auth).
- **Acesso**: apenas a conta `pqcriamos@gmail.com` recebe o papel de `editor`. Cadastro público fica desativado — ninguém mais consegue se tornar editor.
- **Onde**: reaproveitando o painel atual no rodapé (nenhuma página nova).

## Etapas

### 1. Criação da conta (uma única vez)
Como "só a minha conta" deve poder editar, a conta é criada por um processo controlado, não por cadastro aberto:
- Uma função de servidor de "bootstrap" cria a conta apenas se: (a) o e-mail for exatamente `pqcriamos@gmail.com` e (b) ainda não existir nenhum editor/admin no sistema. Depois disso ela se recusa a criar qualquer outra conta.
- Ao criar, a conta já recebe o papel de `editor` na tabela de papéis (`user_roles`), que é o que as regras de segurança (RLS) já existentes exigem.
- No painel do rodapé aparece um botão **"Criar conta de editor"**: você digita a senha desejada uma vez e a conta é criada e confirmada automaticamente.

### 2. Login / logout reais
- O botão **Entrar** passa a autenticar de verdade no Supabase (e-mail + senha).
- Após entrar, o sistema confirma que a conta tem papel de editor; só então libera o modo de edição.
- O botão **Sair** encerra a sessão e volta ao modo público.
- A sessão é lembrada: ao recarregar a página já logado, o modo de edição continua disponível.
- Mensagens claras no painel: "Modo administrador ativo", "Login ou senha incorretos", "Conta criada com sucesso", etc.

### 3. Integração com o editor existente
O código legado (`pqoq-legacy.js`) hoje liga/desliga o modo de edição via uma função interna. O plano expõe essa função de forma controlada para que o novo login real a acione, **sem alterar o comportamento visual do editor** (edição inline, barra de estilo, etc. continuam iguais). O handler placeholder antigo deixa de rodar quando o login real está presente, evitando conflito de cliques.

## Detalhes técnicos

- **Nova função de servidor** `src/lib/editor-auth.functions.ts`:
  - `bootstrapEditor({ email, password })` — sem `requireSupabaseAuth` (endpoint público), mas **auto-protegida**: rejeita se já existir qualquer linha com papel `editor`/`admin`, e rejeita se o e-mail ≠ `pqcriamos@gmail.com`. Usa o cliente admin (`supabaseAdmin`, carregado com `await import(...)` dentro do handler) para `auth.admin.createUser({ email, password, email_confirm: true })` e em seguida `insert` em `user_roles` com papel `editor`.
- **Novo componente cliente** `src/components/EditorAuthBridge.tsx`, montado dentro de `SiteFooter` (logo, presente em todas as páginas):
  - Liga os botões `#admin-login`, `#admin-logout` e um novo `#admin-create` aos métodos `supabase.auth.signInWithPassword`, `supabase.auth.signOut` e à função `bootstrapEditor` (via `useServerFn`).
  - Após login, verifica o papel lendo `user_roles` (a RLS já permite ler o próprio papel) e chama a função exposta pelo legado para entrar no modo edição.
  - No mount, checa sessão existente e religa o modo edição se houver papel válido.
- **Ajuste mínimo em `src/components/SiteChrome.tsx`**: adicionar o botão "Criar conta de editor" (`#admin-create`) no `editor-panel` e montar `<EditorAuthBridge />`.
- **Ajuste mínimo em `src/legacy/pqoq-legacy.js`**: em `initAdmin()`, quando existir o bridge (`window.PQOQ_AUTH`), não registrar os handlers placeholder de login/logout; expor `setAdminEditing` em `window` para o bridge acionar. O botão "Resetar" (limpeza de rascunhos locais) permanece inalterado.
- **Sem migration**: a tabela `user_roles`, o enum `app_role` e as políticas RLS já existem. `attachSupabaseAuth` já está registrado em `src/start.ts`.
- **Segurança**: nenhuma chave de serviço vai para o navegador (criação roda só no servidor); a regra "só uma conta editora" é garantida no servidor; as políticas RLS validadas anteriormente não são alteradas.

## Fora de escopo
- Não muda o visual nem o conteúdo do site.
- Não altera as políticas RLS / migrations já validadas.
- Não conecta a persistência de conteúdo ao Supabase (a edição continua como está hoje); este plano cobre apenas autenticação e liberação do modo de edição. Posso fazer a sincronização de conteúdo num passo seguinte, se você quiser.

Ao final você poderá: abrir o cadeado → criar a conta `pqcriamos@gmail.com` com uma senha → entrar e editar.