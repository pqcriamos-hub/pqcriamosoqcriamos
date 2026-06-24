import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContentValue,
  saveContentValue,
  uploadAdminMedia,
  slugify,
  isBase64,
  isPublished,
  type EpisodeItem,
  type EpisodeEmbeds,
} from "@/lib/admin-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

function emptyEpisode(): EpisodeItem {
  const id = `ep-${Date.now().toString(36)}`;
  return {
    id,
    slug: id,
    code: "",
    title: "",
    artist: "",
    artistId: "",
    date: "",
    duration: "",
    description: "",
    summary: "",
    sourceUrl: "",
    tags: [],
    published: true,
  };
}

export function EpisodesAdmin() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "episodes"],
    queryFn: async () => ({
      episodes: await fetchContentValue<EpisodeItem[]>("episodes", []),
      embeds: await fetchContentValue<EpisodeEmbeds>("episode-embeds", {}),
    }),
  });

  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [embeds, setEmbeds] = useState<EpisodeEmbeds>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<EpisodeItem | null>(null);
  const [editingEmbed, setEditingEmbed] = useState<EpisodeEmbeds[string]>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setEpisodes(data.episodes);
      setEmbeds(data.embeds);
      setDirty(false);
    }
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return episodes.filter((ep) => {
      if (statusFilter === "published" && !isPublished(ep)) return false;
      if (statusFilter === "draft" && isPublished(ep)) return false;
      if (!q) return true;
      return [ep.title, ep.code, ep.artist].some((f) =>
        String(f || "").toLowerCase().includes(q),
      );
    });
  }, [episodes, search, statusFilter]);

  const markDirty = (next: EpisodeItem[], nextEmbeds?: EpisodeEmbeds) => {
    setEpisodes(next);
    if (nextEmbeds) setEmbeds(nextEmbeds);
    setDirty(true);
    setSaveState("idle");
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = episodes.findIndex((e) => e.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= episodes.length) return;
    const next = [...episodes];
    [next[idx], next[target]] = [next[target], next[idx]];
    markDirty(next);
  };

  const togglePublish = (id: string) => {
    markDirty(
      episodes.map((e) => (e.id === id ? { ...e, published: !isPublished(e) } : e)),
    );
  };

  const duplicate = (id: string) => {
    const src = episodes.find((e) => e.id === id);
    if (!src) return;
    const newId = `ep-${Date.now().toString(36)}`;
    const copy: EpisodeItem = {
      ...src,
      id: newId,
      slug: newId,
      title: `${src.title || "Episódio"} (cópia)`,
      published: false,
    };
    const idx = episodes.findIndex((e) => e.id === id);
    const next = [...episodes];
    next.splice(idx + 1, 0, copy);
    const nextEmbeds = { ...embeds };
    if (embeds[id]) nextEmbeds[newId] = { ...embeds[id] };
    markDirty(next, nextEmbeds);
  };

  const remove = (id: string) => {
    const nextEmbeds = { ...embeds };
    delete nextEmbeds[id];
    markDirty(episodes.filter((e) => e.id !== id), nextEmbeds);
    setConfirmId(null);
  };

  const openEditor = (ep?: EpisodeItem) => {
    const item = ep ? { ...ep } : emptyEpisode();
    setEditing(item);
    setEditingEmbed({ ...(embeds[item.id] || {}) });
  };

  const applyEditor = () => {
    if (!editing) return;
    const item: EpisodeItem = {
      ...editing,
      slug: editing.slug?.trim() || slugify(editing.title || editing.id),
    };
    const exists = episodes.some((e) => e.id === item.id);
    const next = exists
      ? episodes.map((e) => (e.id === item.id ? item : e))
      : [item, ...episodes];
    const nextEmbeds = { ...embeds, [item.id]: editingEmbed };
    markDirty(next, nextEmbeds);
    setEditing(null);
  };

  const onUpload = async (file: File, field: "thumbnail" | "mp3") => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `episodes/${editing.id}/${field}`);
      setEditingEmbed((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const saveAll = async () => {
    setSaveState("saving");
    setErrorMsg("");
    try {
      await saveContentValue("episodes", episodes);
      await saveContentValue("episode-embeds", embeds);
      setSaveState("saved");
      setDirty(false);
      void refetch();
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando episódios…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Episódios</h2>
        <div className="flex items-center gap-2">
          {dirty ? (
            <span className="text-xs text-amber-600">Alterações não salvas</span>
          ) : null}
          {saveState === "saving" ? (
            <span className="text-xs text-muted-foreground">Salvando…</span>
          ) : null}
          {saveState === "saved" ? (
            <span className="text-xs text-green-600">Salvo</span>
          ) : null}
          <Button size="sm" onClick={() => void saveAll()} disabled={!dirty || saveState === "saving"}>
            Salvar alterações
          </Button>
        </div>
      </div>

      {errorMsg ? <p className="text-sm text-destructive">{errorMsg}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por título, código ou artista…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="default" onClick={() => openEditor()}>
          <Plus className="mr-1 h-4 w-4" /> Novo episódio
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Episódio</TableHead>
                <TableHead>Artista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhum episódio.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell>
                      <div className="font-medium">{ep.title || "(sem título)"}</div>
                      <div className="text-xs text-muted-foreground">{ep.code}</div>
                      {isBase64(embeds[ep.id]?.thumbnail) ? (
                        <Badge variant="outline" className="mt-1 text-amber-600">
                          thumb base64 legado
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{ep.artist}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => togglePublish(ep.id)}>
                        <Badge variant={isPublished(ep) ? "default" : "secondary"}>
                          {isPublished(ep) ? "Publicado" : "Rascunho"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => move(ep.id, -1)} title="Subir">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => move(ep.id, 1)} title="Descer">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditor(ep)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => duplicate(ep.id)} title="Duplicar">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <a
                          href={`/episodio?ep=${ep.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                          title="Ver no site"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmId(ep.id)} title="Remover">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing ? (
        <EpisodeEditor
          value={editing}
          embed={editingEmbed}
          uploading={uploading}
          onChange={setEditing}
          onChangeEmbed={setEditingEmbed}
          onUpload={onUpload}
          onCancel={() => setEditing(null)}
          onApply={applyEditor}
        />
      ) : null}

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover episódio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o episódio da lista. Clique em "Salvar alterações" para confirmar no site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && remove(confirmId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EpisodeEditor({
  value,
  embed,
  uploading,
  onChange,
  onChangeEmbed,
  onUpload,
  onCancel,
  onApply,
}: {
  value: EpisodeItem;
  embed: EpisodeEmbeds[string];
  uploading: boolean;
  onChange: (e: EpisodeItem) => void;
  onChangeEmbed: (e: EpisodeEmbeds[string]) => void;
  onUpload: (file: File, field: "thumbnail" | "mp3") => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const set = (patch: Partial<EpisodeItem>) => onChange({ ...value, ...patch });
  const setEmbed = (patch: Partial<EpisodeEmbeds[string]>) =>
    onChangeEmbed({ ...embed, ...patch });

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h3 className="text-base font-semibold">
          {value.title ? `Editar: ${value.title}` : "Novo episódio"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código"><Input value={value.code || ""} onChange={(e) => set({ code: e.target.value })} /></Field>
          <Field label="Título"><Input value={value.title || ""} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Artista (nome)"><Input value={value.artist || ""} onChange={(e) => set({ artist: e.target.value })} /></Field>
          <Field label="Artista (id/slug)"><Input value={value.artistId || ""} onChange={(e) => set({ artistId: e.target.value })} /></Field>
          <Field label="Data"><Input value={value.date || ""} onChange={(e) => set({ date: e.target.value })} /></Field>
          <Field label="Duração"><Input value={value.duration || ""} onChange={(e) => set({ duration: e.target.value })} /></Field>
          <Field label="Slug"><Input value={value.slug || ""} onChange={(e) => set({ slug: e.target.value })} /></Field>
          <Field label="Tags (separadas por vírgula)">
            <Input
              value={(value.tags || []).join(", ")}
              onChange={(e) => set({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            />
          </Field>
        </div>
        <Field label="Descrição curta">
          <Textarea value={value.description || ""} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Resumo expandido">
          <Textarea value={value.summary || ""} onChange={(e) => set({ summary: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="YouTube URL"><Input value={embed.youtube || ""} onChange={(e) => setEmbed({ youtube: e.target.value })} /></Field>
          <Field label="Spotify URL"><Input value={embed.spotify || ""} onChange={(e) => setEmbed({ spotify: e.target.value })} /></Field>
          <Field label="RSS / URL original"><Input value={value.sourceUrl || ""} onChange={(e) => set({ sourceUrl: e.target.value })} /></Field>
          <Field label="MP3 URL"><Input value={embed.mp3 || ""} onChange={(e) => setEmbed({ mp3: e.target.value })} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thumbnail (upload)">
            <input type="file" accept="image/*" disabled={uploading}
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], "thumbnail")} />
            {embed.thumbnail ? (
              <span className="text-xs text-muted-foreground">{isBase64(embed.thumbnail) ? "base64 legado" : "imagem enviada"}</span>
            ) : null}
          </Field>
          <Field label="Áudio MP3 (upload)">
            <input type="file" accept="audio/*" disabled={uploading}
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], "mp3")} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.published !== false}
            onChange={(e) => set({ published: e.target.checked })} />
          Publicado
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onApply} disabled={uploading}>Aplicar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
