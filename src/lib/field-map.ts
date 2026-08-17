// FIELD MAP central do PQOQ.
//
// Fonte única de verdade sobre "onde cada campo editável vive". Cobre tanto as
// entidades (episódios, artistas, acervo, apoio) quanto a camada editorial
// (textos, fotos, links globais e tags), esta última detalhada em
// src/lib/page-content.ts.
//
// Regra do projeto: Supabase/site_content é a fonte oficial; /pqoqadmin e o
// painel editorial inline leem e escrevem as mesmas chaves; localStorage é
// apenas cache/fallback.

import { PAGE_GROUPS } from "./page-content";

export type FieldScope = "global" | "per-item";
export type FieldKind =
  | "text"
  | "rich"
  | "url"
  | "image"
  | "audio"
  | "tags"
  | "links"
  | "flag";

export interface FieldMapEntry {
  /** Identificador estável do campo no mapa. */
  id: string;
  /** Página pública onde aparece. */
  page: string;
  kind: FieldKind;
  /** Chave pública em site_content. */
  key: string;
  /** Chave admin completa (com rascunhos), quando existir. */
  adminKey?: string;
  /** Caminho dentro do JSON. */
  path: string;
  scope: FieldScope;
  /** Módulo do /pqoqadmin responsável. */
  adminModule:
    | "pages"
    | "episodes"
    | "artists"
    | "acervo"
    | "apoio"
    | "dashboard";
  /** Editor inline responsável (seletor/atributo) ou null quando não há. */
  inline: string | null;
  /** Render público responsável. */
  render: string;
  /** Fallback quando o campo está vazio. */
  fallback: string;
}

type EpisodeTuple = [string, FieldKind, string, string | null];

const EPISODE_TUPLES: EpisodeTuple[] = [
  ["title", "text", "title", "[data-editable=episode.<id>.title]"],
  ["description", "rich", "description", "[data-episode-description]"],
  ["summary", "rich", "summary", null],
  ["date", "text", "date", null],
  ["duration", "text", "duration", null],
  ["sourceUrl", "url", "sourceUrl", "[data-episode-source]"],
  ["tags", "tags", "tags", null],
  ["participantTitle", "text", "participantTitle", null],
  ["participantAbout", "rich", "participantAbout", "[data-episode-participant-about]"],
  ["participantBio", "rich", "participantBio", "[data-episode-participant-bio]"],
  ["participantImage", "image", "participantImage", null],
  ["participantLinks", "links", "participantLinks", null],
  ["participantTags", "tags", "participantTags", null],
  ["links", "links", "links", null],
  ["published", "flag", "published", null],
];

const EPISODE_FIELDS: FieldMapEntry[] = EPISODE_TUPLES.map(([id, kind, path, inline]) => ({
  id: `episode.${id}`,
  page: "/episodio",
  kind,
  key: "episodes",
  adminKey: "episodes-admin",
  path: `episodes[].${path}`,
  scope: "per-item" as FieldScope,
  adminModule: "episodes" as const,
  inline,
  render: "pqoq-legacy.js → renderEpisodePage/renderEpisodes",
  fallback:
    id.startsWith("participant")
      ? "artista vinculado (artist.bio) apenas quando vazio"
      : "vazio",
}));

const EPISODE_EMBED_FIELDS: FieldMapEntry[] = [
  ["thumbnail", "image"],
  ["youtube", "url"],
  ["spotify", "url"],
  ["mp3", "audio"],
  ["videoEnabled", "flag"],
].map(([id, kind]) => ({
  id: `episode.embed.${id}`,
  page: "/episodio",
  kind: kind as FieldKind,
  key: "episode-embeds",
  adminKey: "episode-embeds-admin",
  path: `episode-embeds[<episodeId>].${id}`,
  scope: "per-item" as FieldScope,
  adminModule: "episodes" as const,
  inline: "[data-episode-embed] / [data-episode-file]",
  render: "pqoq-legacy.js → renderVideo/renderAudio/renderEpisodeCover",
  fallback: "capa tipográfica PQOQ / player oculto",
}));

const ARTIST_FIELDS: FieldMapEntry[] = [
  ["name", "text", "name", null],
  ["meta", "text", "meta", null],
  ["description", "rich", "description", "[data-artist-field=description]"],
  ["bio", "rich", "bio", "[data-artist-field=bio]"],
  ["portfolio", "rich", "portfolio", "[data-artist-field=portfolio]"],
  ["links", "rich", "links", "[data-artist-field=links]"],
  ["contact", "rich", "contact", "[data-artist-field=contact]"],
  ["image", "image", "image", "[data-artist-image]"],
  ["tags", "tags", "tags", null],
  ["portfolioItems", "links", "portfolioItems[]", "[data-portfolio-field]"],
  ["linkItems", "links", "linkItems[]", "[data-link-field]"],
  ["contactInfo", "text", "contactInfo", "[data-contact-field]"],
  ["published", "flag", "published", null],
].map(([id, kind, path, inline]) => ({
  id: `artist.${id}`,
  page: "/artistas",
  kind: kind as FieldKind,
  key: "artists",
  adminKey: "artists-admin",
  path: `artists[].${path}`,
  scope: "per-item" as FieldScope,
  adminModule: "artists" as const,
  inline: inline as string | null,
  render: "pqoq-legacy.js → renderArtists/renderArtistModalPanels",
  fallback: "vazio / estado vazio editorial",
}));

const ACERVO_FIELDS: FieldMapEntry[] = [
  ["title", "text", "title"],
  ["meta", "text", "meta"],
  ["description", "rich", "description"],
  ["intro", "rich", "intro"],
  ["coverImage", "image", "coverImage"],
  ["items", "links", "items[]"],
  ["items.image", "image", "items[].image"],
  ["items.link", "url", "items[].link"],
  ["items.tags", "tags", "items[].tags"],
  ["published", "flag", "published"],
].map(([id, kind, path]) => ({
  id: `acervo.${id}`,
  page: "/acervo",
  kind: kind as FieldKind,
  key: "gallery-cards",
  adminKey: "gallery-cards-admin",
  path: `gallery-cards[].${path}`,
  scope: "per-item" as FieldScope,
  adminModule: "acervo" as const,
  inline: "pqoq-editor-plus.js → cards do Acervo",
  render: "pqoq-editor-plus.js → mosaico, modal e lightbox",
  fallback: "defaults Gravações / Capas / Obras (apenas se a chave não existir)",
}));

const APOIO_FIELDS: FieldMapEntry[] = [
  ["title", "text", "title"],
  ["subtitle", "text", "subtitle"],
  ["description", "rich", "description"],
  ["fullText", "rich", "fullText"],
  ["image", "image", "image"],
  ["contact", "text", "contact"],
  ["location", "text", "location"],
  ["links", "links", "links[]"],
  ["docs", "links", "docs[]"],
  ["gallery", "image", "gallery[]"],
  ["tags", "tags", "tags"],
  ["published", "flag", "published"],
].map(([id, kind, path]) => ({
  id: `apoio.${id}`,
  page: "/apoio",
  kind: kind as FieldKind,
  key: "support-content",
  adminKey: "support-content-admin",
  path: `support-content.{fronts|partners}[].${path}`,
  scope: "per-item" as FieldScope,
  adminModule: "apoio" as const,
  inline: "pqoq-editor-plus.js → cards de Apoio",
  render: "pqoq-editor-plus.js → cards e modais de Apoio",
  fallback: "defaults de Apoio (apenas se a chave não existir)",
}));

/** Camada editorial derivada de PAGE_GROUPS (textos, fotos, links, tags). */
const EDITORIAL_FIELDS: FieldMapEntry[] = PAGE_GROUPS.flatMap((group) => [
  ...group.texts.map((f) => ({
    id: f.key,
    page: group.route,
    kind: f.kind as FieldKind,
    key: "editable-content",
    path: `editable-content["${f.key}"]`,
    scope: "global" as FieldScope,
    adminModule: "pages" as const,
    inline: `[data-editable="${f.key}"]`,
    render: "src/pages.tsx + pqoq-legacy.js → applyEditableContent",
    fallback: "texto do markup",
  })),
  ...(group.photos || []).map((f) => ({
    id: f.key,
    page: group.route,
    kind: "image" as FieldKind,
    key: "page-photos",
    path: `page-photos["${f.key}"]`,
    scope: "global" as FieldScope,
    adminModule: "pages" as const,
    inline: "[data-photo-slot]",
    render: "pqoq-editor-plus.js → applyPagePhotos",
    fallback: "placeholder editorial",
  })),
  ...(group.links || []).map((f) => ({
    id: f.key,
    page: group.route,
    kind: "url" as FieldKind,
    key: "link-state",
    path: `link-state["${f.key}"].href`,
    scope: "global" as FieldScope,
    adminModule: "pages" as const,
    inline: "[data-link-editable]",
    render: "pqoq-editor-plus.js → applyLinkState",
    fallback: f.fallback,
  })),
  ...(group.tags || []).map((f) => ({
    id: f.key,
    page: group.route,
    kind: "tags" as FieldKind,
    key: "card-tags",
    path: `card-tags["${f.key}"]`,
    scope: "global" as FieldScope,
    adminModule: "pages" as const,
    inline: "[data-tag-list]",
    render: "pqoq-editor-plus.js → applyCardTags",
    fallback: "tags do markup",
  })),
]);

export const FIELD_MAP: FieldMapEntry[] = [
  ...EDITORIAL_FIELDS,
  ...EPISODE_FIELDS,
  ...EPISODE_EMBED_FIELDS,
  ...ARTIST_FIELDS,
  ...ACERVO_FIELDS,
  ...APOIO_FIELDS,
];

/** Todas as chaves públicas usadas pelo mapa. */
export const PUBLIC_KEYS = Array.from(new Set(FIELD_MAP.map((f) => f.key)));

/** Chaves admin (payload completo com rascunhos). */
export const ADMIN_KEYS = Array.from(
  new Set(FIELD_MAP.map((f) => f.adminKey).filter(Boolean) as string[]),
);

/** Campos sem editor inline — úteis para o relatório de conexão. */
export function fieldsWithoutInlineEditor(): FieldMapEntry[] {
  return FIELD_MAP.filter((f) => !f.inline);
}

/** Agrupa o mapa por chave do Supabase. */
export function fieldsByKey(): Record<string, FieldMapEntry[]> {
  const out: Record<string, FieldMapEntry[]> = {};
  for (const field of FIELD_MAP) {
    (out[field.key] ||= []).push(field);
  }
  return out;
}
