import type { ArtistItem, EpisodeItem, GalleryCard, GalleryItem } from "./admin-content";
import { getEpisodeArtistId, isEpisodeZero } from "./episode-artist-link";

export function isScheduledFuture(item: { publishAt?: string } | null | undefined, now = Date.now()): boolean {
  const time = Date.parse(item?.publishAt || "");
  return Number.isFinite(time) && time > now;
}

export function isPublicLive(item: { published?: boolean; publishAt?: string } | null | undefined, now = Date.now()): boolean {
  return !!item && item.published !== false && !isScheduledFuture(item, now);
}

const normalized = (value?: string) => String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

/** Vínculos exatos, sem adivinhar por títulos, tags ou ordem de artistas. */
export function isReleaseRelated(item: Pick<GalleryItem, "episode" | "artistId">, episode: EpisodeItem, artistId = ""): boolean {
  if (isEpisodeZero(episode)) return false;
  const reference = normalized(item.episode);
  return (!!reference && [episode.id, episode.code, episode.slug].some((key) => !!key && normalized(key) === reference)) ||
    (!!artistId && normalized(item.artistId) === normalized(artistId));
}

/** Preserva rascunhos e artistas já no ar; o acervo explicitamente selecionado recebe a data. */
export function scheduleReleaseBundle(
  episode: EpisodeItem,
  previous: EpisodeItem | undefined,
  artists: ArtistItem[],
  cards: GalleryCard[],
  options: { artist: boolean; acervo: boolean },
  now = Date.now(),
): { artists: ArtistItem[]; cards: GalleryCard[] } {
  if (isEpisodeZero(episode) || (!episode.publishAt && !previous?.publishAt)) return { artists, cards };
  const artistId = getEpisodeArtistId(episode, artists);
  const artist = artists.find((item) => item.id === artistId);
  const nextArtists = artists.map((item) => {
    if (item.id !== artistId) return item;
    // Não retira do ar um artista já lançado em outro episódio.
    const synchronizeArtist = options.artist && !isPublicLive(item, now);
    const portfolioItems = options.acervo ? item.portfolioItems?.map((work) => {
      // Obras de artistas já públicos sem data continuam públicas.
      if (isPublicLive(item, now) && isPublicLive(work, now) && !work.publishAt) return work;
      return { ...work, publishAt: episode.publishAt };
    }) : item.portfolioItems;
    return { ...item, ...(synchronizeArtist ? { publishAt: episode.publishAt } : {}), portfolioItems };
  });
  const nextCards = options.acervo ? cards.map((card) => {
    const relatedCard = isReleaseRelated(card, episode, artistId);
    const items = card.items?.map((item) =>
      (relatedCard || isReleaseRelated(item, episode, artistId)) ? { ...item, publishAt: episode.publishAt } : item,
    );
    return { ...card, ...(relatedCard ? { publishAt: episode.publishAt } : {}), items };
  }) : cards;
  return { artists: artist ? nextArtists : artists, cards: nextCards };
}