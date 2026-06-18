# Relatório de validação — migração React/Vite

**Data:** 17/06/2026  
**Build:** aprovado  
**Objetivo:** confirmar que o pacote preparado para o Lovable preserva estrutura, visual e funções do protótipo atual

## Build

Comando:

```bash
npm.cmd run build
```

Resultado:

- TypeScript validado;
- 34 módulos transformados;
- build Vite concluído;
- arquivos de produção gerados em `dist`.

## Rotas verificadas

| Rota | Resultado | Conteúdo dinâmico |
|---|---|---|
| `/` | Aprovada | dois episódios recentes |
| `/episodios` | Aprovada | nove episódios |
| `/episodio?id=t01ep06` | Aprovada | episódio e artista corretos |
| `/artistas` | Aprovada | nove artistas |
| `/galeria` | Aprovada | três cards |
| `/sobre` | Aprovada | três cards institucionais |
| `/apoio` | Aprovada | seis cards |

## Interações verificadas

- modal de Joab3 abre corretamente;
- abas do acervo respondem;
- estado público “Portfólio em construção” aparece;
- tecla Escape fecha o modal;
- página individual usa o ID informado;
- navegação principal possui cinco destinos;
- destaque de página ativa funciona;
- nenhuma mensagem de erro foi registrada no console.

## Correção realizada durante a validação

Foi encontrada uma regressão herdada do protótipo: `.admin-row` anulava o `display: none` de `.admin-only`, exibindo uploads e links administrativos na página pública do episódio.

A correção adiciona uma regra específica para esconder `.admin-only` sempre que o `body` não estiver em `admin-mode`. O mesmo ajuste foi aplicado ao CSS do protótipo original em `exports`.

Depois da correção:

- campos administrativos visíveis ao público: zero;
- barra dos donos visível ao público: não;
- título e conteúdo do episódio: preservados.

## Capturas

As capturas integrais estão em `validation/screenshots`:

- `home.png`;
- `episodios.png`;
- `episodio-t01ep06.png`;
- `artistas.png`;
- `galeria.png`;
- `sobre.png`;
- `apoio.png`.

## Limite atual

A autenticação do protótipo foi desativada porque dependia de senha exposta no front-end. O painel visual permanece preservado e será conectado a autenticação real na etapa Lovable/backend.
