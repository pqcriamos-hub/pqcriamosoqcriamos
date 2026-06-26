import { supabase } from "@/integrations/supabase/client";
import {
  adminKeyFor,
  isDraftContentKey,
  sanitizeForPublic,
} from "./content-sanitize";

const STORAGE_PREFIX = "pqoq-site:";

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

async function readRow(key: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return undefined;
  return data.value ?? undefined;
}

function mirrorLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore cache write failures */
  }
}

function readLocalValue(key: string): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

async function upsertRow(
  key: string,
  value: unknown,
  published: boolean,
): Promise<void> {
  const { error } = await supabase.from("site_content").upsert(
    { key, value: value as never, published, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Reads a single site_content value as the signed-in editor. For draft-bearing
 * keys the full admin row is preferred, falling back to the public row.
 */
export async function fetchContentValue<T>(
  key: AdminContentKey,
  fallback: T,
): Promise<T> {
  if (isDraftContentKey(key)) {
    const adminVal = await readRow(adminKeyFor(key));
    if (adminVal !== undefined && adminVal !== null) return adminVal as T;
  }
  const val = await readRow(key);
  return ((val as T) ?? fallback);
}

/**
 * Upserts a site_content value. For draft-bearing keys the full payload is
 * written to the editors-only "<key>-admin" row (published=false) and a
 * sanitized, published-only payload is written to the public "<key>" row.
 */
export async function saveContentValue(
  key: AdminContentKey,
  value: unknown,
): Promise<void> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw new Error("Sessão expirada. Faça login novamente.");

  if (isDraftContentKey(key)) {
    // Full draft payload -> admin-only row.
    await upsertRow(adminKeyFor(key), value, false);
    // Keep the editor's local cache full so inline editing still shows drafts.
    mirrorLocal(key, value);
    // Sanitized payload -> public row.
    const episodes = key === "episode-embeds" ? readLocalValue("episodes") : value;
    await upsertRow(key, sanitizeForPublic(key, value, { episodes }), true);
    if (key === "episodes") {
      const embeds = readLocalValue("episode-embeds");
      if (embeds !== undefined) {
        await upsertRow(
          "episode-embeds",
          sanitizeForPublic("episode-embeds", embeds, { episodes: value }),
          true,
        );
      }
    }
    return;
  }

  await upsertRow(key, value, true);
  mirrorLocal(key, value);
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
  participantAbout?: string;
  tags?: string[];
  published?: boolean;
  latest?: boolean;
}

export interface EpisodeEmbed {
  thumbnail?: string;
  youtube?: string;
  spotify?: string;
  mp3?: string;
  videoEnabled?: boolean;
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

// ---------------------------------------------------------------------------
// Domain types & helpers for Acervo (gallery-cards) and Apoio (support-content).
// Shapes mirror src/legacy/pqoq-editor-plus.js so the public site keeps
// rendering data written here. Do not change field names without updating the
// legacy normalizers.
// ---------------------------------------------------------------------------

export interface GalleryItem {
  id: string;
  title?: string;
  caption?: string;
  description?: string;
  credit?: string;
  link?: string;
  image?: string;
  episode?: string;
  date?: string;
  location?: string;
  tags?: string[];
  published?: boolean;
  sortOrder?: number;
}

export interface GalleryCard {
  id: string;
  slug?: string;
  meta?: string;
  title?: string;
  description?: string;
  intro?: string;
  coverImage?: string;
  published?: boolean;
  sortOrder?: number;
  items?: GalleryItem[];
}

/** A label/href pair, matching the legacy normalizeLinkPairs() shape. */
export interface LinkPair {
  id?: string;
  label?: string;
  href?: string;
}

export interface SupportCard {
  id: string;
  slug?: string;
  title?: string;
  subtitle?: string;
  meta?: string;
  description?: string;
  fullText?: string;
  image?: string;
  relation?: string;
  contact?: string;
  location?: string;
  links?: LinkPair[];
  docs?: LinkPair[];
  /** Legacy public render reads gallery as an array of image URL strings. */
  gallery?: string[];
  tags?: string[];
  published?: boolean;
  sortOrder?: number;
}

export type SupportSection = "fronts" | "partners";

export interface SupportContent {
  fronts: SupportCard[];
  partners: SupportCard[];
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Validates an http(s) URL. Empty string is treated as valid (optional). */
export function isValidUrl(value?: string): boolean {
  if (!value || !value.trim()) return true;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
