import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContentValue,
  saveContentValue,
  uploadAdminMedia,
  slugify,
  isBase64,
  isPublished,
  formatBytes,
  normalizeParticipantImages,
  MAX_PARTICIPANT_IMAGES,
  type ParticipantImage,
  type EpisodeItem,
  type EpisodeEmbeds,
  type ArtistItem,
  type LinkPair,
  genId,
} from "@/lib/admin-content";

import {
  cascadeSuggestions,
  episodeLinkInfo,
  getEpisodeArtistId,
  isEpisodeZero,
  type CascadeSuggestion,
} from "@/lib/episode-artist-link";
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
import { ArrowDown, ArrowUp, Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

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
      artists: await fetchContentValue<ArtistItem[]>("artists", []),
    }),
  });

  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [embeds, setEmbeds] = useState<EpisodeEmbeds>({});
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [initialPublished, setInitialPublished] = useState<Record<string, boolean>>({});
  const [pendingCascade, setPendingCascade] = useState<CascadeSuggestion[] | null>(null);
  const [cascadeChoice, setCascadeChoice] = useState<Record<string, boolean>>({});
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
      setArtists(data.artists);
      setInitialPublished(
        Object.fromEntries(data.episodes.map((ep) => [ep.id, ep.published !== false])),
      );
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
        String(f || "")
          .toLowerCase()
          .includes(q),
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
    markDirty(episodes.map((e) => (e.id === id ? { ...e, published: !isPublished(e) } : e)));
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
    markDirty(
      episodes.filter((e) => e.id !== id),
      nextEmbeds,
    );
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
    const next = exists ? episodes.map((e) => (e.id === item.id ? item : e)) : [item, ...episodes];
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

  /**
   * Upload de 1..3 fotos do participante DESTE episódio. O caminho no Storage
   * é sempre escopado por episódio, então nunca há reaproveitamento entre
   * episódios, artistas, capas ou Acervo.
   */
  const onUploadParticipantImages = async (files: File[]) => {
    if (!editing || !files.length) return;
    const current = normalizeParticipantImages(editing.participantImages);
    const free = MAX_PARTICIPANT_IMAGES - current.length;
    if (free <= 0) {
      setErrorMsg(`Limite de ${MAX_PARTICIPANT_IMAGES} fotos por episódio atingido.`);
      return;
    }
    const accepted = files.slice(0, free);
    setUploading(true);
    setErrorMsg("");
    try {
      const uploaded: ParticipantImage[] = [];
      for (const file of accepted) {
        const { url, path } = await uploadAdminMedia(
          file,
          `episodes/${editing.id}/participant-images`,
        );
        uploaded.push({
          id: genId("participant-image"),
          url,
          name: file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          storagePath: path,
          uploadedAt: new Date().toISOString(),
          alt: "",
          caption: "",
          credit: "",
          sortOrder: 0,
          published: true,
        });
      }
      setEditing((prev) => {
        if (!prev) return prev;
        const next = [...normalizeParticipantImages(prev.participantImages), ...uploaded].map(
          (item, index) => ({ ...item, sortOrder: index }),
        );
        return { ...prev, participantImages: next };
      });
      if (files.length > accepted.length) {
        setErrorMsg(
          `Apenas ${accepted.length} foto(s) enviada(s): o limite é ${MAX_PARTICIPANT_IMAGES} por episódio.`,
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };


  const persist = async (nextEpisodes: EpisodeItem[], nextArtists: ArtistItem[]) => {
    setSaveState("saving");
    setErrorMsg("");
    try {
      // Normalização no fluxo de salvar: preenche artistId quando o vínculo é
      // resolvível pelo nome. Nunca altera o EP00.
      const normalized = nextEpisodes.map((ep) => {
        if (isEpisodeZero(ep) || String(ep.artistId || "").trim()) return ep;
        const resolved = getEpisodeArtistId(ep, nextArtists);
        return resolved ? { ...ep, artistId: resolved } : ep;
      });
      await saveContentValue("episodes", normalized);
      await saveContentValue("episode-embeds", embeds);
      // Só grava artistas quando a cascata alterou algum published.
      if (nextArtists !== artists) await saveContentValue("artists", nextArtists);
      setSaveState("saved");
      setDirty(false);
      setPendingCascade(null);
      setCascadeChoice({});
      void refetch();
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  };

  const saveAll = async () => {
    const suggestions = cascadeSuggestions(episodes, artists, initialPublished);
    if (suggestions.length) {
      setCascadeChoice({});
      setPendingCascade(suggestions);
      return;
    }
    await persist(episodes, artists);
  };

  /** Aplica as cascatas confirmadas: apenas troca published, nada é apagado. */
  const confirmCascade = async () => {
    const chosen = (pendingCascade ?? []).filter((s) => cascadeChoice[`${s.kind}:${s.artistId}`]);
    let nextArtists = artists;
    if (chosen.length) {
      nextArtists = artists.map((a) => {
        const hide = chosen.some((s) => s.kind === "hide-artist" && s.artistId === a.id);
        const show = chosen.some((s) => s.kind === "publish-artist" && s.artistId === a.id);
        if (show) return { ...a, published: true };
        if (hide) return { ...a, published: false };
        return a;
      });
      setArtists(nextArtists);
    }
    await persist(episodes, nextArtists);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando episódios…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Episódios</h2>
        <div className="flex items-center gap-2">
          {dirty ? <span className="text-xs text-amber-600">Alterações não salvas</span> : null}
          {saveState === "saving" ? (
            <span className="text-xs text-muted-foreground">Salvando…</span>
          ) : null}
          {saveState === "saved" ? <span className="text-xs text-green-600">Salvo</span> : null}
          <Button
            size="sm"
            onClick={() => void saveAll()}
            disabled={!dirty || saveState === "saving"}
          >
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
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
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
                    <TableCell>
                      <div>{ep.artist}</div>
                      {isEpisodeZero(ep) ? (
                        <div className="text-xs text-muted-foreground">
                          institucional (não controla artistas)
                        </div>
                      ) : !episodeLinkInfo(ep, artists, episodes).artist ? (
                        <div className="text-xs text-amber-600">sem artista vinculado</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <button type="button" onClick={() => togglePublish(ep.id)}>
                        <Badge variant={isPublished(ep) ? "default" : "secondary"}>
                          {isPublished(ep) ? "Publicado" : "Rascunho"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => move(ep.id, -1)}
                          title="Subir"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => move(ep.id, 1)}
                          title="Descer"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditor(ep)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => duplicate(ep.id)}
                          title="Duplicar"
                        >
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
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmId(ep.id)}
                          title="Remover"
                        >
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
          artists={artists}
          episodes={episodes}
          onChange={setEditing}
          onChangeEmbed={setEditingEmbed}
          onUpload={onUpload}
          onUploadParticipantImages={onUploadParticipantImages}
          onCancel={() => setEditing(null)}
          onApply={applyEditor}
        />
      ) : null}

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover episódio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o episódio da lista. Clique em "Salvar alterações" para confirmar no
              site.
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

      <AlertDialog
        open={pendingCascade !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPendingCascade(null);
            setCascadeChoice({});
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicação vinculada de artistas</AlertDialogTitle>
            <AlertDialogDescription>
              Nada será apagado. As opções abaixo apenas alteram a visibilidade pública do artista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            {(pendingCascade ?? []).map((s) => {
              const key = `${s.kind}:${s.artistId}`;
              return (
                <label key={key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!cascadeChoice[key]}
                    onChange={(e) =>
                      setCascadeChoice((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                  />
                  <span>
                    <strong>
                      {s.kind === "hide-artist"
                        ? "Também ocultar o artista vinculado"
                        : "Também publicar o artista vinculado"}
                    </strong>
                    <br />
                    <span className="text-muted-foreground">{s.message}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmCascade()}>
              Salvar alterações
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
  artists,
  episodes,
  onChange,
  onChangeEmbed,
  onUpload,
  onUploadParticipantImages,
  onCancel,
  onApply,
}: {
  value: EpisodeItem;
  embed: EpisodeEmbeds[string];
  uploading: boolean;
  artists: ArtistItem[];
  episodes: EpisodeItem[];
  onChange: (e: EpisodeItem) => void;
  onChangeEmbed: (e: EpisodeEmbeds[string]) => void;
  onUpload: (file: File, field: "thumbnail" | "mp3") => void;
  onUploadParticipantImages: (files: File[]) => void;

  onCancel: () => void;
  onApply: () => void;
}) {
  const set = (patch: Partial<EpisodeItem>) => onChange({ ...value, ...patch });
  const setEmbed = (patch: Partial<EpisodeEmbeds[string]>) => onChangeEmbed({ ...embed, ...patch });
  const setLinks = (field: "links" | "participantLinks", next: LinkPair[]) =>
    set({ [field]: next } as Partial<EpisodeItem>);
  const link = episodeLinkInfo(value, artists, episodes);

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h3 className="text-base font-semibold">
          {value.title ? `Editar: ${value.title}` : "Novo episódio"}
        </h3>
        <div className="space-y-1 rounded-md border p-4 text-sm">
          <h4 className="text-sm font-semibold">Artista vinculado</h4>
          {link.isEp00 ? (
            <p className="text-muted-foreground">
              Este episódio é institucional/de apresentação e não controla publicação de artistas.
            </p>
          ) : link.artist ? (
            <>
              <p>
                {link.artist.name || link.artist.id}{" "}
                <span className="text-muted-foreground">({link.artistId})</span>{" "}
                <Badge variant={link.artistPublished ? "default" : "secondary"}>
                  {link.artistPublished ? "Artista publicado" : "Artista oculto"}
                </Badge>
              </p>
              <p className="text-muted-foreground">
                {link.publishedCount} episódio(s) publicado(s) · {link.draftCount}{" "}
                oculto(s)/rascunho (EP00 não é contado).
              </p>
              {link.otherPublishedCount > 0 ? (
                <p className="text-muted-foreground">
                  Este artista possui outros episódios publicados. Ele continuará visível no
                  catálogo.
                </p>
              ) : (
                <p className="text-amber-600">
                  Este é o único episódio publicado vinculado a este artista. Ao despublicar, o
                  painel oferecerá ocultar o artista também.
                </p>
              )}
            </>
          ) : (
            <p className="text-amber-600">Este episódio não possui artista vinculado.</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código">
            <Input value={value.code || ""} onChange={(e) => set({ code: e.target.value })} />
          </Field>
          <Field label="Título">
            <Input value={value.title || ""} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Artista (nome)">
            <Input value={value.artist || ""} onChange={(e) => set({ artist: e.target.value })} />
          </Field>
          <Field label="Artista (id/slug)">
            <Input
              value={value.artistId || ""}
              onChange={(e) => set({ artistId: e.target.value })}
            />
          </Field>
          <Field label="Data">
            <Input value={value.date || ""} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Duração">
            <Input
              value={value.duration || ""}
              onChange={(e) => set({ duration: e.target.value })}
            />
          </Field>
          <Field label="Slug">
            <Input value={value.slug || ""} onChange={(e) => set({ slug: e.target.value })} />
          </Field>
          <Field label="Tags (separadas por vírgula)">
            <Input
              value={(value.tags || []).join(", ")}
              onChange={(e) =>
                set({
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </div>
        <Field label="Descrição curta">
          <Textarea
            value={value.description || ""}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <Field label="Resumo expandido">
          <Textarea
            value={value.summary || ""}
            onChange={(e) => set({ summary: e.target.value })}
          />
        </Field>
        <div className="space-y-4 rounded-md border p-4">
          <h4 className="text-sm font-semibold">
            Participante deste episódio (campos individuais)
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título do bloco">
              <Input
                value={value.participantTitle || ""}
                onChange={(e) => set({ participantTitle: e.target.value })}
                placeholder='Se vazio: "Sobre {nome do artista}"'
              />
            </Field>
            <Field label="Tags do participante (vírgula)">
              <Input
                value={(value.participantTags || []).join(", ")}
                onChange={(e) =>
                  set({
                    participantTags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </div>
          <Field label="Sobre o participante (individual deste episódio)">
            <Textarea
              value={value.participantAbout || ""}
              onChange={(e) => set({ participantAbout: e.target.value })}
              placeholder="Texto exclusivo deste episódio. Se vazio, o site usa a bio do artista como fallback."
            />
          </Field>
          <Field label="Bio complementar do participante (opcional)">
            <Textarea
              value={value.participantBio || ""}
              onChange={(e) => set({ participantBio: e.target.value })}
              placeholder="Só aparece se preenchido. Fallback: bio do artista."
            />
          </Field>
          <ParticipantImagesEditor
            episodeId={value.id}
            legacyImage={value.participantImage}
            images={normalizeParticipantImages(value.participantImages)}
            uploading={uploading}
            onUploadFiles={onUploadParticipantImages}
            onChange={(next) => set({ participantImages: next })}
          />

          <LinkPairEditor
            title="Links do participante"
            pairs={value.participantLinks || []}
            onChange={(next) => setLinks("participantLinks", next)}
          />
        </div>
        <LinkPairEditor
          title="Links do episódio"
          pairs={value.links || []}
          onChange={(next) => setLinks("links", next)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="YouTube URL">
            <Input
              value={embed.youtube || ""}
              onChange={(e) => setEmbed({ youtube: e.target.value })}
            />
          </Field>
          <Field label="Spotify URL">
            <Input
              value={embed.spotify || ""}
              onChange={(e) => setEmbed({ spotify: e.target.value })}
            />
          </Field>
          <Field label="RSS / URL original">
            <Input
              value={value.sourceUrl || ""}
              onChange={(e) => set({ sourceUrl: e.target.value })}
            />
          </Field>
          <Field label="MP3 URL">
            <Input value={embed.mp3 || ""} onChange={(e) => setEmbed({ mp3: e.target.value })} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={embed.videoEnabled !== false}
            onChange={(e) => setEmbed({ videoEnabled: e.target.checked })}
          />
          Exibir player de vídeo
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thumbnail (upload)">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], "thumbnail")}
            />
            {embed.thumbnail ? (
              <div className="flex items-center gap-2">
                <img
                  src={embed.thumbnail}
                  alt="Capa atual do episódio"
                  className="h-16 w-16 rounded border object-cover"
                  loading="lazy"
                />
                <span className="text-xs text-muted-foreground">
                  {isBase64(embed.thumbnail) ? "base64 legado" : "imagem enviada"}
                </span>
              </div>
            ) : null}
          </Field>
          <Field label="Áudio MP3 (upload)">
            <input
              type="file"
              accept="audio/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], "mp3")}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.published !== false}
            onChange={(e) => set({ published: e.target.checked })}
          />
          Publicado
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onApply} disabled={uploading}>
            Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Galeria (1..3) de fotos do participante deste episódio. Reordena, edita
 * legenda/alt/crédito, publica/despublica e remove — sempre escopado ao
 * episódio, sem tocar em artistas, capa ou Acervo.
 */
function ParticipantImagesEditor({
  episodeId,
  legacyImage,
  images,
  uploading,
  onUploadFiles,
  onChange,
}: {
  episodeId: string;
  legacyImage?: string;
  images: ParticipantImage[];
  uploading: boolean;
  onUploadFiles: (files: File[]) => void;
  onChange: (next: ParticipantImage[]) => void;
}) {
  const reindex = (list: ParticipantImage[]) =>
    list.map((item, index) => ({ ...item, sortOrder: index }));
  const patch = (id: string, data: Partial<ParticipantImage>) =>
    onChange(reindex(images.map((img) => (img.id === id ? { ...img, ...data } : img))));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(reindex(next));
  };
  const remove = (id: string) => onChange(reindex(images.filter((img) => img.id !== id)));
  const full = images.length >= MAX_PARTICIPANT_IMAGES;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Fotos do participante (até {MAX_PARTICIPANT_IMAGES})</Label>
        <span className="text-xs text-muted-foreground">
          {images.length}/{MAX_PARTICIPANT_IMAGES} — episódio {episodeId}
        </span>
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading || full}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (files.length) onUploadFiles(files);
        }}
      />
      {full ? (
        <p className="text-xs text-muted-foreground">
          Limite atingido. Remova uma foto para enviar outra.
        </p>
      ) : null}

      {legacyImage && !images.length ? (
        <p className="text-xs text-muted-foreground">
          Foto legada em uso ({isBase64(legacyImage) ? "base64 legado" : "imagem enviada"}). Ela
          continua aparecendo no site como fallback até você enviar fotos nesta galeria.
        </p>
      ) : null}

      {images.length ? (
        <ul className="space-y-3">
          {images.map((img, index) => (
            <li key={img.id} className="flex flex-col gap-3 rounded border p-2 sm:flex-row">
              <img
                src={img.url}
                alt={img.alt || `Foto ${index + 1} do participante`}
                className="h-20 w-20 shrink-0 rounded border object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="truncate text-xs text-muted-foreground">
                  {img.name}
                  {img.size ? ` · ${formatBytes(img.size)}` : ""}
                  {img.uploadedAt ? ` · ${new Date(img.uploadedAt).toLocaleDateString("pt-BR")}` : ""}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    value={img.caption}
                    onChange={(e) => patch(img.id, { caption: e.target.value })}
                    placeholder="Legenda"
                  />
                  <Input
                    value={img.alt}
                    onChange={(e) => patch(img.id, { alt: e.target.value })}
                    placeholder="Texto alternativo"
                  />
                  <Input
                    value={img.credit}
                    onChange={(e) => patch(img.id, { credit: e.target.value })}
                    placeholder="Crédito"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Mover foto para cima"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label="Mover foto para baixo"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <a
                    className="text-xs underline"
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver imagem
                  </a>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={img.published !== false}
                      onChange={(e) => patch(img.id, { published: e.target.checked })}
                    />
                    Publicada
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(img.id)}
                    aria-label="Remover foto do participante"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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

function LinkPairEditor({
  title,
  pairs,
  onChange,
}: {
  title: string;
  pairs: LinkPair[];
  onChange: (next: LinkPair[]) => void;
}) {
  const update = (id: string, patch: Partial<LinkPair>) =>
    onChange(pairs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{title}</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange([...pairs, { id: genId("link"), label: "", href: "" }])}
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar link
        </Button>
      </div>
      {pairs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum link cadastrado.</p>
      ) : (
        pairs.map((pair) => (
          <div key={pair.id} className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-[180px]"
              placeholder="Rótulo"
              value={pair.label || ""}
              onChange={(e) => update(pair.id as string, { label: e.target.value })}
            />
            <Input
              className="flex-1"
              placeholder="https://…"
              value={pair.href || ""}
              onChange={(e) => update(pair.id as string, { href: e.target.value })}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onChange(pairs.filter((p) => p.id !== pair.id))}
              title="Remover link"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
