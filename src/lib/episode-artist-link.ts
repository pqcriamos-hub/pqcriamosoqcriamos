// Relação Episódio ↔ Artista.
//
// Regras centrais (BLOCO 18):
// - Despublicar é ocultar (published=false), nunca excluir.
// - O EP00 é institucional/de apresentação: não controla publicação de
//   artistas e não conta como episódio vinculado de nenhum artista.
// - "Publicado" segue a regra legada: published !== false.

import type { ArtistItem, EpisodeItem } from "./admin-content";

/** Ids/códigos tratados como EP00 (institucional). */
export function isEpisodeZero(episode?: Pick<EpisodeItem, "id" | "code"> | null): boolean {
  if (!episode) return false;
  const norm = (v?: string) => String(v || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const id = norm(episode.id);
  const code = norm(episode.code);
  if (id === "t01ep00" || code === "t01ep00") return true;
  return id.endsWith("ep00") || code.endsWith("ep00");
}

/** Publicado com compatibilidade legada (campo ausente === publicado). */
export function isItemVisible(item?: { published?: boolean } | null): boolean {
  return !!item && item.published !== false;
}

function normId(value?: string): string {
  return String(value || "").trim().toLowerCase();
}

/**
 * Id do artista vinculado ao episódio. Retorna "" para EP00 (exceção) e para
 * episódios sem vínculo confiável.
 */
export function getEpisodeArtistId(
  episode?: EpisodeItem | null,
  artists: ArtistItem[] = [],
): string {
  if (!episode || isEpisodeZero(episode)) return "";
  const direct = String(episode.artistId || "").trim();
  if (direct) {
    const match = artists.find(
      (a) => normId(a.id) === normId(direct) || normId(a.slug) === normId(direct),
    );
    return match ? match.id : direct;
  }
  const byName = artists.find((a) => a.name && normId(a.name) === normId(episode.artist));
  return byName ? byName.id : "";
}

/** Artista vinculado resolvido (id ou slug). EP00 nunca resolve artista. */
export function getEpisodeArtist(
  episode?: EpisodeItem | null,
  artists: ArtistItem[] = [],
): ArtistItem | undefined {
  const id = getEpisodeArtistId(episode, artists);
  if (!id) return undefined;
  return artists.find((a) => normId(a.id) === normId(id) || normId(a.slug) === normId(id));
}

/** Episódios vinculados a um artista, excluindo o EP00. */
export function getEpisodesForArtist(
  artistId: string,
  episodes: EpisodeItem[] = [],
  artist?: ArtistItem,
): EpisodeItem[] {
  const target = normId(artistId);
  if (!target) return [];
  const slug = normId(artist?.slug);
  const name = normId(artist?.name);
  return episodes.filter((ep) => {
    if (isEpisodeZero(ep)) return false;
    const link = normId(ep.artistId);
    if (link) return link === target || (!!slug && link === slug);
    return !!name && normId(ep.artist) === name;
  });
}

/** Episódios publicados vinculados ao artista, excluindo o EP00. */
export function getPublishedEpisodesForArtist(
  artistId: string,
  episodes: EpisodeItem[] = [],
  artist?: ArtistItem,
): EpisodeItem[] {
  return getEpisodesForArtist(artistId, episodes, artist).filter(isItemVisible);
}

/** true se o artista tem pelo menos um episódio publicado (sem contar EP00). */
export function artistHasPublishedEpisodes(
  artistId: string,
  episodes: EpisodeItem[] = [],
  artist?: ArtistItem,
): boolean {
  return getPublishedEpisodesForArtist(artistId, episodes, artist).length > 0;
}

export interface ArtistEpisodeStats {
  linked: EpisodeItem[];
  published: EpisodeItem[];
  drafts: EpisodeItem[];
  publishedCount: number;
  draftCount: number;
}

export function artistEpisodeStats(
  artist: ArtistItem,
  episodes: EpisodeItem[] = [],
): ArtistEpisodeStats {
  const linked = getEpisodesForArtist(artist.id, episodes, artist);
  const published = linked.filter(isItemVisible);
  const drafts = linked.filter((ep) => !isItemVisible(ep));
  return {
    linked,
    published,
    drafts,
    publishedCount: published.length,
    draftCount: drafts.length,
  };
}

export interface EpisodeLinkInfo {
  isEp00: boolean;
  artist?: ArtistItem;
  artistId: string;
  artistPublished: boolean;
  /** Publicados do artista contando este episódio como está hoje. */
  publishedCount: number;
  /** Publicados do artista ignorando este episódio. */
  otherPublishedCount: number;
  draftCount: number;
}

/** Informações de vínculo usadas na UI de episódios. */
export function episodeLinkInfo(
  episode: EpisodeItem,
  artists: ArtistItem[] = [],
  episodes: EpisodeItem[] = [],
): EpisodeLinkInfo {
  const isEp00 = isEpisodeZero(episode);
  const artist = isEp00 ? undefined : getEpisodeArtist(episode, artists);
  if (!artist) {
    return {
      isEp00,
      artist: undefined,
      artistId: isEp00 ? "" : String(episode.artistId || ""),
      artistPublished: false,
      publishedCount: 0,
      otherPublishedCount: 0,
      draftCount: 0,
    };
  }
  const stats = artistEpisodeStats(artist, episodes);
  return {
    isEp00,
    artist,
    artistId: artist.id,
    artistPublished: isItemVisible(artist),
    publishedCount: stats.publishedCount,
    otherPublishedCount: stats.published.filter((ep) => ep.id !== episode.id).length,
    draftCount: stats.draftCount,
  };
}

export type CascadeKind = "hide-artist" | "publish-artist";

export interface CascadeSuggestion {
  kind: CascadeKind;
  episodeId: string;
  episodeLabel: string;
  artistId: string;
  artistName: string;
  message: string;
}

/**
 * Compara o estado inicial e o atual dos episódios e sugere cascatas de
 * publicação/ocultação de artistas. Nunca sugere nada para o EP00 nem para
 * artistas com outros episódios publicados.
 */
export function cascadeSuggestions(
  episodes: EpisodeItem[],
  artists: ArtistItem[],
  initialPublished: Record<string, boolean>,
): CascadeSuggestion[] {
  const out: CascadeSuggestion[] = [];
  for (const ep of episodes) {
    if (isEpisodeZero(ep)) continue;
    const before = initialPublished[ep.id];
    const now = isItemVisible(ep);
    if (before === undefined || before === now) continue;
    const info = episodeLinkInfo(ep, artists, episodes);
    if (!info.artist) continue;
    const label = ep.code || ep.title || ep.id;
    const artistName = info.artist.name || info.artist.id;
    if (!now && info.artistPublished && info.otherPublishedCount === 0) {
      out.push({
        kind: "hide-artist",
        episodeId: ep.id,
        episodeLabel: label,
        artistId: info.artist.id,
        artistName,
        message: `Este é o único episódio publicado vinculado a ${artistName}. Deseja também ocultar o artista da página pública de Artistas? O registro continuará disponível no painel.`,
      });
    }
    if (now && !info.artistPublished) {
      out.push({
        kind: "publish-artist",
        episodeId: ep.id,
        episodeLabel: label,
        artistId: info.artist.id,
        artistName,
        message: `O episódio ${label} está vinculado a ${artistName}, que está oculto. Deseja publicar também o artista?`,
      });
    }
  }
  return out;
}
