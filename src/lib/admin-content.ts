import { supabase } from "@/integrations/supabase/client";

// Keys mirrored from site-content-sync's RLS whitelist.
export const ADMIN_CONTENT_KEYS = [
  "editable-content",
  "style-state",
  "artists",
  "episodes",
  "episode-embeds",
  "gallery-cards",
  "page-photos",
  "link-state",
  "layout-state",
  "support-content",
  "card-tags",
] as const;

export type AdminContentKey = (typeof ADMIN_CONTENT_KEYS)[number];

export interface ContentRow {
  key: string;
  published: boolean;
  updated_at: string | null;
  /** Approximate serialized size in bytes. */
  size: number;
  /** Count of items if the value is an array, else null. */
  count: number | null;
}

/** Friendly labels for known content keys. */
export const KEY_LABELS: Record<string, string> = {
  "editable-content": "Textos editáveis",
  "style-state": "Estilos",
  artists: "Artistas",
  episodes: "Episódios",
  "episode-embeds": "Embeds de episódios",
  "gallery-cards": "Acervo (galeria)",
  "page-photos": "Fotos das páginas",
  "link-state": "Links",
  "layout-state": "Layout",
  "support-content": "Apoio",
  "card-tags": "Tags",
};

/** Reads all whitelisted site_content rows with light-weight metadata. */
export async function fetchContentOverview(): Promise<ContentRow[]> {
  const { data, error } = await supabase
    .from("site_content")
    .select("key, value, published, updated_at")
    .in("key", ADMIN_CONTENT_KEYS as unknown as string[]);
  if (error || !data) return [];
  return data.map((row) => {
    let size = 0;
    let count: number | null = null;
    try {
      const serialized = JSON.stringify(row.value);
      size = serialized.length;
      if (Array.isArray(row.value)) count = row.value.length;
    } catch {
      /* ignore */
    }
    return {
      key: row.key,
      published: Boolean(row.published),
      updated_at: row.updated_at ?? null,
      size,
      count,
    };
  });
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
