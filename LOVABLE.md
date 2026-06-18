# Contrato obrigatório para o Lovable

## Natureza da tarefa

Este projeto já existe. A tarefa é **migrar e evoluir**, não recriar.

## Fonte única da verdade

- Visual: `src/pqoq.css`.
- Estrutura React: `src/pages.tsx` e `src/components/SiteChrome.tsx`.
- Rotas: `src/routes` e `src/components/PQOQRoute.tsx`.
- Comportamento atual: `src/legacy/pqoq-legacy.js`.
- Marca: `public/assets/brand`.
- Infraestrutura: TanStack Start fornecido pelo projeto Lovable; não substituir.
- Governança: documentos do snapshot e da pasta `Audit` do projeto original.

## Regra zero

Nenhuma tarefa pode alterar o visual atual sem autorização humana expressa.

## É proibido

- redesenhar páginas;
- mudar fontes;
- trocar logotipo ou ilustrações;
- substituir ícones existentes;
- alterar cores, sombras, bordas, raios ou espaçamentos;
- substituir o CSS por tema padrão;
- aplicar componentes shadcn/ui sobre a interface existente;
- substituir ícones por Lucide;
- “modernizar”, simplificar ou reinterpretar o estilo;
- mudar textos ou ordem dos blocos sem solicitação;
- remover funcionalidades existentes;
- inserir credenciais no front-end;
- usar `localStorage` como banco definitivo.

## Deve ser preservado exatamente

- `Architects Daughter` nos títulos manuscritos;
- `Work Sans` nos textos e controles;
- variáveis CSS de `:root`;
- textura e gradientes de fundo;
- largura, borda e sombra da página;
- cabeçalho e logo;
- botões com borda e sombra deslocada;
- cards, grids, títulos em formato de pílula e cores;
- páginas e rotas;
- visão pública e visão dos donos;
- editor visual;
- artistas e modal com quatro abas;
- episódios, players, thumbnails e embeds;
- responsividade atual.

## Estratégia obrigatória

1. Antes de alterar, listar arquivos afetados.
2. Fazer snapshot/commit.
3. Alterar apenas o necessário.
4. Não misturar mudança de backend com redesenho.
5. Comparar a página alterada com a referência anterior.
6. Informar testes, riscos e rollback.

## Primeira fase no Lovable

A primeira fase deve somente:

- instalar e executar o projeto existente;
- confirmar todas as rotas;
- preservar TanStack Start, arquivos de raiz e geração de rotas;
- preservar a renderização;
- conectar autenticação e banco sem mudar componentes visuais;
- migrar o comportamento legado gradualmente para React.

## Critério de aceite visual

A mudança é rejeitada se houver diferença não autorizada em:

- fonte;
- tamanho;
- cor;
- ícone;
- imagem;
- posição;
- largura ou altura;
- espaçamento;
- borda;
- sombra;
- quebra de linha;
- ordem dos elementos.

## Prompt inicial recomendado

```text
Este é um projeto existente e visualmente aprovado.

Não crie um novo site e não aplique um novo design. Use o código importado como fonte única da verdade. Leia LOVABLE.md antes de alterar qualquer arquivo.

Nesta primeira tarefa, apenas execute o projeto, identifique as rotas e informe se há erros. Não altere CSS, fontes, ícones, imagens, estrutura, textos ou componentes visuais.

Ao final, informe:
- arquivos inspecionados;
- rotas validadas;
- erros encontrados;
- mudanças estritamente necessárias para funcionamento;
- riscos e rollback.
```
