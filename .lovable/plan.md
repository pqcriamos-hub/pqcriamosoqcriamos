## Causa do erro de build

`src/components/PQOQRoute.tsx` (linha 21) importa dinamicamente `../legacy/pqoq-legacy.js`. Como o projeto usa TypeScript estrito, esse módulo `.js` precisa de um arquivo de declaração de tipos. O arquivo `src/legacy/pqoq-legacy.d.ts` (que existiu antes) **não está mais presente** em `src/legacy/` — só há `pqoq-legacy.js`. Sem ele o compilador lança:

```
TS7016: Could not find a declaration file for module '../legacy/pqoq-legacy.js'.
'/dev-server/src/legacy/pqoq-legacy.js' implicitly has an 'any' type.
```

## Correção mínima (a mais conservadora)

Recriar apenas o arquivo de declaração ausente, sem tocar em nada mais:

**Criar `src/legacy/pqoq-legacy.d.ts`:**
```ts
declare module "../legacy/pqoq-legacy.js";
declare module "*/pqoq-legacy.js";
```

Isso satisfaz o compilador para o import dinâmico. O tipo de `window.PQOQLegacyInit` já está declarado dentro de `PQOQRoute.tsx`, então nada mais precisa mudar.

## O que NÃO será alterado

- Nenhuma mudança em visual, conteúdo, rotas, autenticação, permissões.
- Nenhuma alteração em `pqoq-legacy.js`, `PQOQRoute.tsx`, migrations Supabase ou dados editoriais.
- A lógica de segurança já validada permanece intacta.

## Verificação final

Após criar o arquivo, confirmo que o build volta a passar (sem o erro TS7016) e reporto: causa, arquivos alterados (`src/legacy/pqoq-legacy.d.ts`), correção aplicada e confirmação de build verde.
