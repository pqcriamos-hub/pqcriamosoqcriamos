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
}
