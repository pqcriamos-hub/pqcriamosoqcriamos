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

// ---------------------------------------------------------------------------
// Generic site_content read/write (authenticated editor, RLS enforced).
// Supabase is the source of truth; localStorage stays a cache/fallback only.
// ---------------------------------------------------------------------------

/** Reads a single site_content value as the signed-in editor. */
export async function fetchContentValue<T>(
  key: AdminContentKey,
  fallback: T,
): Promise<T> {
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return fallback;
  return (data.value as T) ?? fallback;
}

/** Upserts a site_content value. Row stays published so the public can read. */
export async function saveContentValue(
  key: AdminContentKey,
  value: unknown,
): Promise<void> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw new Error("Sessão expirada. Faça login novamente.");
  const { error } = await supabase.from("site_content").upsert(
    {
      key,
      value: value as never,
      published: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  // Mirror to the localStorage cache so the public render picks it up too.
  try {
    localStorage.setItem("pqoq-site:" + key, JSON.stringify(value));
  } catch {
    /* ignore cache write failures */
  }
}

// ---------------------------------------------------------------------------
// Media uploads for the admin panel. Private "site-media" bucket; visitors
// view media through a long-lived signed URL. Never stores base64.
// ---------------------------------------------------------------------------

const MEDIA_BUCKET = "site-media";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

function sanitizeBase(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return (
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40) || "arquivo"
  );
}

function fileExt(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (fromName) return fromName.replace(/[^a-z0-9]/g, "").slice(0, 8);
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };
  return map[file.type] || "bin";
}

/** Uploads an image/audio file and returns a long-lived signed URL. */
export async function uploadAdminMedia(
  file: File,
  prefix: string,
): Promise<{ url: string; path: string }> {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isAudio = AUDIO_TYPES.includes(file.type);
  if (!isImage && !isAudio) throw new Error("Tipo de arquivo não permitido.");
  const limit = isAudio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    throw new Error(`Arquivo grande demais (máx. ${mb} MB).`);
  }
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw new Error("Faça login como editor para enviar mídia.");

  const safePrefix = String(prefix || "uploads")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/^\/+|\/+$/g, "");
  const path = `${safePrefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${sanitizeBase(file.name)}.${fileExt(file)}`;

  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw upErr;

  const { data: signed, error: signErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !signed?.signedUrl) throw signErr || new Error("Erro ao gerar link da mídia.");
  return { url: signed.signedUrl, path };
}

// ---------------------------------------------------------------------------
// Domain types & helpers for Episodes and Artists.
// ---------------------------------------------------------------------------

export interface EpisodeItem {
  id: string;
  slug?: string;
  code?: string;
  title?: string;
  artistId?: string;
  artist?: string;
  date?: string;
  duration?: string;
  description?: string;
  summary?: string;
  sourceUrl?: string;
  tags?: string[];
  published?: boolean;
  latest?: boolean;
}

export interface EpisodeEmbed {
  thumbnail?: string;
  youtube?: string;
  spotify?: string;
  mp3?: string;
}

export type EpisodeEmbeds = Record<string, EpisodeEmbed>;

export interface ArtistItem {
  id: string;
  slug?: string;
  name?: string;
  meta?: string;
  description?: string;
  bio?: string;
  portfolio?: string;
  links?: string;
  contact?: string;
  image?: string;
  tags?: string[];
  published?: boolean;
}

export function isPublished(item: { published?: boolean }): boolean {
  return item.published !== false;
}

export function slugify(text: string): string {
  return (
    String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `item-${Date.now()}`
  );
}

export function isBase64(value?: string): boolean {
  return Boolean(value && value.startsWith("data:"));
}
