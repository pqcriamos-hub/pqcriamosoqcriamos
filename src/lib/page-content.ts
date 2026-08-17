// Declarative registry of the site's "editorial page layer": free texts,
// page photos, global button links and static tag lists.
//
// These fields are rendered by src/pages.tsx and by the legacy scripts through
// data attributes. The registry lets /pqoqadmin edit exactly the same keys the
// inline editor writes, so Supabase stays the single source of truth.

export type PageTextKind = "text" | "rich";

export interface PageTextField {
  /** Stable key stored in site_content -> "editable-content". */
  key: string;
  label: string;
  kind: PageTextKind;
}

export interface PagePhotoField {
  /** Key stored in site_content -> "page-photos". */
  key: string;
  label: string;
}

export interface PageLinkField {
  /** Key stored in site_content -> "link-state". */
  key: string;
  label: string;
  /** Default href present in the markup, shown as placeholder. */
  fallback: string;
}

export interface PageTagField {
  /** Key stored in site_content -> "card-tags" (always "<card>:tags"). */
  key: string;
  label: string;
}

export interface PageGroup {
  id: string;
  label: string;
  /** Public route this group renders on. */
  route: string;
  texts: PageTextField[];
  photos?: PagePhotoField[];
  links?: PageLinkField[];
  tags?: PageTagField[];
}

export const PAGE_GROUPS: PageGroup[] = [
  {
    id: "home",
    label: "Home",
    route: "/",
    texts: [
      { key: "home.eyebrow", label: "Pílula (Nova temporada)", kind: "text" },
      { key: "home.description", label: "Texto principal", kind: "rich" },
      { key: "home.latest.title", label: "Título “Últimos episódios”", kind: "text" },
    ],
    links: [
      { key: "home.watch-now", label: "Botão “Assistir agora”", fallback: "/episodios" },
      { key: "home.listen", label: "Botão “Ouvir episódios”", fallback: "/episodios" },
      { key: "home.artists", label: "Botão “Conhecer artistas”", fallback: "/artistas" },
    ],
  },
  {
    id: "episodes",
    label: "Episódios",
    route: "/episodios",
    texts: [
      { key: "episodes.page.title", label: "Título da página", kind: "text" },
      { key: "episodes.page.intro", label: "Texto introdutório", kind: "rich" },
    ],
  },
  {
    id: "artists",
    label: "Artistas",
    route: "/artistas",
    texts: [
      { key: "artists.page.title", label: "Título da página", kind: "text" },
      { key: "artists.page.intro", label: "Texto introdutório", kind: "rich" },
    ],
  },
  {
    id: "gallery",
    label: "Acervo",
    route: "/acervo",
    texts: [
      { key: "gallery.page.title", label: "Título da página", kind: "text" },
      { key: "gallery.page.intro", label: "Texto introdutório", kind: "rich" },
    ],
  },
  {
    id: "support",
    label: "Apoio",
    route: "/apoio",
    texts: [
      { key: "support.page.title", label: "Título da página", kind: "text" },
      { key: "support.page.intro", label: "Texto introdutório", kind: "rich" },
      { key: "support.fronts.title", label: "Título “Frentes de apoio”", kind: "text" },
      { key: "support.partners.title", label: "Título “Apoiadores e parceiros”", kind: "text" },
    ],
  },
  {
    id: "about",
    label: "Sobre",
    route: "/sobre",
    texts: [
      { key: "about.page.title", label: "Título da página", kind: "text" },
      { key: "about.project.title", label: "O projeto — título", kind: "text" },
      { key: "about.project.p1", label: "O projeto — parágrafo 1", kind: "rich" },
      { key: "about.project.p2", label: "O projeto — parágrafo 2", kind: "rich" },
      { key: "about.project.p3", label: "O projeto — parágrafo 3", kind: "rich" },
      { key: "about.project.p4", label: "O projeto — parágrafo 4", kind: "rich" },
      { key: "about.almi.title", label: "Almi Junior — nome", kind: "text" },
      { key: "about.almi.p1", label: "Almi Junior — parágrafo 1", kind: "rich" },
      { key: "about.almi.p2", label: "Almi Junior — parágrafo 2", kind: "rich" },
      { key: "about.almi.p3", label: "Almi Junior — parágrafo 3", kind: "rich" },
      { key: "about.joao.title", label: "João Lucas Monti — nome", kind: "text" },
      { key: "about.joao.p1", label: "João Lucas Monti — parágrafo 1", kind: "rich" },
      { key: "about.joao.p2", label: "João Lucas Monti — parágrafo 2", kind: "rich" },
      { key: "about.joao.p3", label: "João Lucas Monti — parágrafo 3", kind: "rich" },
    ],
    photos: [
      { key: "about.almi", label: "Foto de Almi Junior" },
      { key: "about.joao", label: "Foto de João Lucas Monti" },
    ],
    tags: [
      { key: "about.project:tags", label: "Tags — O projeto" },
      { key: "about.almi:tags", label: "Tags — Almi Junior" },
      { key: "about.joao:tags", label: "Tags — João Lucas Monti" },
    ],
  },
];

export type EditableContentMap = Record<string, string>;
export type PagePhotosMap = Record<string, string>;
export type LinkStateMap = Record<string, { href?: string }>;
export type CardTagsMap = Record<string, string[]>;
