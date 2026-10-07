import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, FileAudio, FileVideo, File as FileIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/admin-content";
import { Toaster } from "@/components/ui/sonner";

const BUCKET = "site-media";
const URL_TTL = 60 * 60 * 24 * 365 * 10;
const MAX_DEPTH = 4;

interface MediaFile {
  path: string;
  name: string;
  size: number;
  mime: string;
  createdAt: string;
  url?: string;
}

type Kind = "all" | "image" | "audio" | "video" | "other";

function kindOf(mime: string, name: string): Exclude<Kind, "all"> {
  const m = mime || "";
  if (m.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(name)) return "image";
  if (m.startsWith("audio/") || /\.(mp3|wav|ogg)$/i.test(name)) return "audio";
  if (m.startsWith("video/") || /\.(mp4|webm)$/i.test(name)) return "video";
  return "other";
}

async function listAll(prefix = "", depth = 0): Promise<MediaFile[]> {
  const out: MediaFile[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000, offset, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    if (!data?.length) break;
    for (const it of data) {
      const full = prefix ? `${prefix}/${it.name}` : it.name;
      if (!it.id) {
        if (depth < MAX_DEPTH) out.push(...(await listAll(full, depth + 1)));
      } else if (it.name !== ".emptyFolderPlaceholder") {
        const meta = (it.metadata || {}) as { size?: number; mimetype?: string };
        out.push({
          path: full,
          name: it.name,
          size: Number(meta.size) || 0,
          mime: String(meta.mimetype || ""),
          createdAt: it.created_at || it.updated_at || "",
        });
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

export function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<Kind>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAll();
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (list.length) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(list.map((f) => f.path), URL_TTL);
        const map = new Map((data || []).map((d) => [d.path, d.signedUrl]));
        list.forEach((f) => (f.url = map.get(f.path) || undefined));
      }
      setFiles(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao listar arquivos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((f) => {
      if (q && !f.path.toLowerCase().includes(q)) return false;
      if (date && !f.createdAt.startsWith(date)) return false;
      if (kind !== "all" && kindOf(f.mime, f.name) !== kind) return false;
      return true;
    });
  }, [files, query, date, kind]);

  async function copy(url?: string) {
    if (!url) return toast.error("URL indisponível para este arquivo.");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <section className="space-y-4">
      <Toaster position="bottom-right" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Mídias &amp; Arquivos</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando…" : `${filtered.length} de ${files.length} arquivo(s)`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Buscar por nome ou pasta…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Input
          type="date"
          className="w-44"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Filtrar por data"
        />
        <select
          className="rounded-md border border-input bg-background px-2 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          aria-label="Tipo"
        >
          <option value="all">Todos os tipos</option>
          <option value="image">Imagens</option>
          <option value="audio">Áudios</option>
          <option value="video">Vídeos</option>
          <option value="other">Outros</option>
        </select>
        {query || date || kind !== "all" ? (
          <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setDate(""); setKind("all"); }}>
            Limpar
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum arquivo encontrado.</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {filtered.map((f) => {
          const k = kindOf(f.mime, f.name);
          return (
            <div key={f.path} className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex aspect-square items-center justify-center bg-muted"
              >
                {k === "image" && f.url ? (
                  <img src={f.url} alt={f.name} loading="lazy" className="h-full w-full object-cover" />
                ) : k === "video" ? (
                  <FileVideo className="h-10 w-10 text-muted-foreground" />
                ) : k === "audio" ? (
                  <FileAudio className="h-10 w-10 text-muted-foreground" />
                ) : (
                  <FileIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </a>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs font-medium" title={f.path}>{f.name}</p>
                <p className="truncate text-[11px] text-muted-foreground" title={f.path}>
                  {f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "/"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {f.createdAt ? new Date(f.createdAt).toLocaleDateString("pt-BR") : "—"} · {formatBytes(f.size)}
                </p>
                <Button size="sm" variant="secondary" className="h-7 w-full text-xs" onClick={() => void copy(f.url)}>
                  <Copy className="mr-1 h-3 w-3" /> Copiar URL
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
