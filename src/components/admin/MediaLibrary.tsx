import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, FileAudio, FileVideo, File as FileIcon, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/admin-content";
import { Toaster } from "@/components/ui/sonner";

const BUCKET = "site-media";
const URL_TTL = 60 * 60 * 24 * 365 * 10;
const MAX_DEPTH = 4;
const MAX_UPLOAD = 100 * 1024 * 1024;
const ACCEPT = "image/*,audio/*,video/mp4,video/webm,application/pdf";

function safeName(n: string) {
  const dot = n.lastIndexOf(".");
  const base = (dot > 0 ? n.slice(0, dot) : n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "arquivo";
  const ext = dot > 0 ? n.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${Date.now()}-${base}${ext ? "." + ext : ""}`;
}

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
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  async function upload(list: FileList | File[] | null) {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    let ok = 0;
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      if (f.size > MAX_UPLOAD) { toast.error(`${f.name}: maior que 100 MB.`); continue; }
      setUploading(`Enviando ${i + 1} de ${arr.length}…`);
      const folder = `biblioteca/${kindOf(f.type, f.name)}`;
      const { error: err } = await supabase.storage.from(BUCKET).upload(`${folder}/${safeName(f.name)}`, f, { contentType: f.type || undefined, upsert: false });
      if (err) toast.error(`${f.name}: ${err.message}`); else ok++;
    }
    setUploading(null);
    if (ok) { toast.success(`${ok} arquivo(s) enviado(s).`); await load(); }
  }

  const counts = useMemo(() => {
    const c = { all: files.length, image: 0, audio: 0, video: 0, other: 0 };
    files.forEach((f) => { c[kindOf(f.mime, f.name)]++; });
    return c;
  }, [files]);

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

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void upload(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-6 text-center text-sm ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/40"}`}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="font-medium">{uploading || "Arraste arquivos aqui ou clique para escolher"}</span>
        <span className="text-xs text-muted-foreground">Imagens, áudios, vídeos MP4/WebM e PDF · até 100 MB cada · vários de uma vez</span>
        <input type="file" multiple accept={ACCEPT} className="hidden" disabled={!!uploading}
          onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
      </label>

      <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {([["all","Todos"],["image","Imagens"],["audio","Áudios"],["video","Vídeos"],["other","Documentos/Outros"]] as const).map(([k,l]) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${kind === k ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {l} <span className="text-xs text-muted-foreground">({counts[k]})</span>
          </button>
        ))}
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
