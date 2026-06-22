import { supabase } from "@/integrations/supabase/client";

const STORAGE_PREFIX = "pqoq-site:";
// Keys allowed by the site_content RLS whitelist.
const SYNC_KEYS = [
  "editable-content",
  "style-state",
  "artists",
  "episodes",
  "episode-embeds",
] as const;

declare global {
  interface Window {
    PQOQ_REMOTE?: {
      save: (key: string, value: unknown) => void;
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
  window.PQOQ_REMOTE = {
    save: (key, value) => {
      if (!(SYNC_KEYS as unknown as string[]).includes(key)) return;
      void (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return; // only editors persist remotely
          await supabase
            .from("site_content")
            .upsert(
              { key, value: value as never, published: true, updated_at: new Date().toISOString() },
              { onConflict: "key" },
            );
        } catch {
          /* best-effort */
        }
      })();
    },
  };
}
