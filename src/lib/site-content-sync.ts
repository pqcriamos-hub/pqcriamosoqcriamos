import { supabase } from "@/integrations/supabase/client";

const STORAGE_PREFIX = "pqoq-site:";
// Keys allowed by the site_content RLS whitelist.
const SYNC_KEYS = [
  "editable-content",
  "style-state",
  "artists",
  "episodes",
  "episode-embeds",
  "gallery-cards",
  "page-photos",
  "link-state",
  "layout-state",
] as const;
// NOTE: "style-popover-position" is intentionally NOT synced. It only stores
// the screen position of the editor's floating popover — a per-editor UI
// preference, not site content. Keeping it local avoids one editor's window
// position leaking to every visitor.

declare global {
  interface Window {
    PQOQ_REMOTE?: {
      save: (key: string, value: unknown) => void;
      onStatus?: (status: "saving" | "saved" | "error", key: string) => void;
    };
    PQOQ_MEDIA?: {
      upload: (
        file: File,
        prefix: string,
      ) => Promise<{ url: string; path: string }>;
    };
  }
}

/**
 * Loads published site content from Supabase into localStorage so every
 * visitor sees editor changes without a manual publish step.
 */
export async function hydrateFromRemote(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", SYNC_KEYS as unknown as string[]);
    if (error || !data) return;
    for (const row of data) {
      try {
        localStorage.setItem(
          STORAGE_PREFIX + row.key,
          JSON.stringify(row.value),
        );
      } catch {
        /* ignore individual write failures */
      }
    }
  } catch {
    /* offline / not configured — fall back to local content */
  }
}

/**
 * Exposes a best-effort remote save used by the legacy editor. Writes are
 * accepted by RLS only for the authenticated editor; for everyone else they
 * silently no-op.
 */
export function installRemoteSync(): void {
  if (typeof window === "undefined") return;
  const emit = (status: "saving" | "saved" | "error", key: string) => {
    try {
      window.PQOQ_REMOTE?.onStatus?.(status, key);
    } catch {
      /* ignore listener errors */
    }
  };
  window.PQOQ_REMOTE = {
    save: (key, value) => {
      if (!(SYNC_KEYS as unknown as string[]).includes(key)) return;
      void (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return; // only editors persist remotely
          emit("saving", key);
          const { error } = await supabase
            .from("site_content")
            .upsert(
              { key, value: value as never, published: true, updated_at: new Date().toISOString() },
              { onConflict: "key" },
            );
          if (error) {
            emit("error", key);
            return;
          }
          emit("saved", key);
        } catch {
          emit("error", key);
        }
      })();
    },
  };

  // Default status indicator: reflect remote-save state in the editor panel
  // message area, unless a custom listener has already been attached.
  if (!window.PQOQ_REMOTE.onStatus) {
    window.PQOQ_REMOTE.onStatus = (status) => {
      const el = document.getElementById("admin-message");
      if (!el) return;
      if (status === "saving") el.textContent = "Salvando…";
      else if (status === "saved") el.textContent = "Salvo no site";
      else el.textContent = "Erro ao salvar no Supabase";
    };
  }

  installMediaUpload();
}

// ---------------------------------------------------------------------------
// Media uploads (Phase 2): editor uploads go to Supabase Storage bucket
// "site-media". The bucket is private; visitors view media through long-lived
// signed URLs that the authenticated editor generates at upload time. The JSON
// in site_content stores only the resulting URL (never base64).
// ---------------------------------------------------------------------------

const MEDIA_BUCKET = "site-media";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50 MB
// 10 years — effectively permanent for a public site, refreshed on re-upload.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

function mediaMessage(text: string): void {
  const el = document.getElementById("admin-message");
  if (el) el.textContent = text;
}

function sanitizeFileBase(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return (
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40) || "arquivo"
  );
}

function fileExtension(file: File): string {
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
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
  };
  return map[file.type] || "bin";
}

export function installMediaUpload(): void {
  if (typeof window === "undefined" || window.PQOQ_MEDIA) return;
  window.PQOQ_MEDIA = {
    upload: async (file, prefix) => {
      const isImage = IMAGE_TYPES.includes(file.type);
      const isAudio = AUDIO_TYPES.includes(file.type);
      if (!isImage && !isAudio) {
        mediaMessage("Tipo de arquivo não permitido.");
        throw new Error("unsupported-type");
      }
      const limit = isAudio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > limit) {
        const mb = Math.round(limit / (1024 * 1024));
        mediaMessage(`Arquivo grande demais (máx. ${mb} MB).`);
        throw new Error("too-large");
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        mediaMessage("Faça login como editor para enviar mídia.");
        throw new Error("not-authenticated");
      }

      mediaMessage("Enviando mídia…");
      const safePrefix = String(prefix || "uploads")
        .replace(/[^a-zA-Z0-9/_-]+/g, "-")
        .replace(/^\/+|\/+$/g, "");
      const path = `${safePrefix}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${sanitizeFileBase(file.name)}.${fileExtension(file)}`;

      const { error: upErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        mediaMessage("Erro ao enviar mídia.");
        throw upErr;
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !signed?.signedUrl) {
        mediaMessage("Erro ao gerar link da mídia.");
        throw signErr || new Error("sign-failed");
      }

      mediaMessage("Upload concluído");
      return { url: signed.signedUrl, path };
    },
  };
}
