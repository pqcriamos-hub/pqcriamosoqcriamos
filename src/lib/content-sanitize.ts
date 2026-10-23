// Shared public/admin content sanitization.
//
// Drafts (published === false) live ONLY in the admin-only "*-admin"
// site_content rows (RLS readable by editors/admins). The public rows that
// anonymous visitors read MUST contain published items only. These helpers
// produce the public-safe version of each content payload.
//
// Legacy rule: items WITHOUT a `published` field are treated as published, so
// older content is never hidden by accident.

export const DRAFT_CONTENT_KEYS = [
  "episodes",
  "episode-embeds",
  "artists",
  "gallery-cards",
  "support-content",
] as const;

export type DraftContentKey = (typeof DRAFT_CONTENT_KEYS)[number];

export function isDraftContentKey(key: string): key is DraftContentKey {
  return (DRAFT_CONTENT_KEYS as readonly string[]).includes(key);
}

/** Admin-only counterpart key for a public content key. */
export function adminKeyFor(key: string): string {
  return `${key}-admin`;
}

interface Publishable {
  published?: boolean;
  [k: string]: unknown;
}

/** Legacy-safe published check: missing field === published. */
export function isItemPublished(item: unknown): boolean {
  if (!item || typeof item !== "object") return true;
  return (item as Publishable).published !== false;
}

export function sanitizeEpisodesForPublic(episodes: unknown): unknown {
  if (!Array.isArray(episodes)) return episodes;
  return episodes.filter(isItemPublished).map((ep) => {
    if (!ep || typeof ep !== "object") return ep;
    const e = { ...(ep as Record<string, unknown>) };
    // Fotos do participante em rascunho não vão para o payload público.
    if (Array.isArray(e.participantImages)) {
      e.participantImages = (e.participantImages as unknown[]).filter(isItemPublished);
    }
    return e;
  });
}


function publishedEpisodeIdSet(episodes: unknown): Set<string> {
  const ids = new Set<string>();
  if (Array.isArray(episodes)) {
    for (const ep of episodes) {
      if (ep && typeof ep === "object" && isItemPublished(ep)) {
        const id = (ep as { id?: unknown }).id;
        if (typeof id === "string") ids.add(id);
      }
    }
  }
  return ids;
}

/**
 * Keep only embeds belonging to a published episode. When the episodes list is
 * unknown (undefined), embeds are returned unchanged to avoid data loss.
 */
export function sanitizeEmbedsForPublic(
  embeds: unknown,
  episodes?: unknown,
): unknown {
  if (!embeds || typeof embeds !== "object" || Array.isArray(embeds)) return embeds;
  if (episodes === undefined) return embeds;
  const ids = publishedEpisodeIdSet(episodes);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(embeds as Record<string, unknown>)) {
    if (ids.has(key)) out[key] = value;
  }
  return out;
}

export function sanitizeArtistsForPublic(artists: unknown): unknown {
  if (!Array.isArray(artists)) return artists;
  return artists.filter(isItemPublished).map((artist) => {
    if (!artist || typeof artist !== "object") return artist;
    const value = { ...(artist as Record<string, unknown>) };
    if (Array.isArray(value.portfolioItems)) value.portfolioItems = value.portfolioItems.filter(isItemPublished);
    return value;
  });
}

export function sanitizeGalleryCardsForPublic(cards: unknown): unknown {
  if (!Array.isArray(cards)) return cards;
  return cards.filter(isItemPublished).map((card) => {
    if (!card || typeof card !== "object") return card;
    const c = { ...(card as Record<string, unknown>) };
    if (Array.isArray(c.items)) {
      c.items = (c.items as unknown[]).filter(isItemPublished);
    }
    return c;
  });
}

function sanitizeSupportCards(list: unknown): unknown {
  if (!Array.isArray(list)) return list;
  return list.filter(isItemPublished).map((card) => {
    if (!card || typeof card !== "object") return card;
    const c = { ...(card as Record<string, unknown>) };
    if (Array.isArray(c.gallery)) {
      // gallery may be string URLs (legacy) or objects with published flags.
      c.gallery = (c.gallery as unknown[]).filter((g) =>
        typeof g === "string" ? true : isItemPublished(g),
      );
    }
    return c;
  });
}

export function sanitizeSupportContentForPublic(content: unknown): unknown {
  if (!content || typeof content !== "object" || Array.isArray(content)) return content;
  const c = content as Record<string, unknown>;
  return {
    ...c,
    fronts: sanitizeSupportCards(c.fronts),
    partners: sanitizeSupportCards(c.partners),
  };
}

/** Dispatch sanitization by content key. `ctx.episodes` is the full episodes list. */
export function sanitizeForPublic(
  key: string,
  value: unknown,
  ctx: { episodes?: unknown } = {},
): unknown {
  switch (key) {
    case "episodes":
      return sanitizeEpisodesForPublic(value);
    case "episode-embeds":
      return sanitizeEmbedsForPublic(value, ctx.episodes);
    case "artists":
      return sanitizeArtistsForPublic(value);
    case "gallery-cards":
      return sanitizeGalleryCardsForPublic(value);
    case "support-content":
      return sanitizeSupportContentForPublic(value);
    default:
      return value;
  }
}
