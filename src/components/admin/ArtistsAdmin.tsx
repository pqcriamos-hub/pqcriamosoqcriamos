import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContentValue,
  saveContentValue,
  uploadAdminMedia,
  slugify,
  isBase64,
  isPublished,
  type ArtistItem,
  type EpisodeItem,
  type ArtistPortfolioItem,
  type ArtistLinkItem,
  genId,
  isValidUrl,
} from "@/lib/admin-content";
import {
  artistEpisodeStats,
  isItemVisible,
  isEpisodeZero,
  getEpisodesForArtist,
} from "@/lib/episode-artist-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2, Wand2, X } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

function emptyArtist(): ArtistItem {
  const id = `art-${Date.now().toString(36)}`;
  return {
    id,
    slug: id,
    name: "",
    meta: "",
    description: "",
    bio: "",
    portfolio: "",
    links: "",
    contact: "",
    image: "",
    tags: [],
    published: true,
  };
}

export function ArtistsAdmin() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "artists"],
    queryFn: async () => ({
      artists: await fetchContentValue<ArtistItem[]>("artists", []),
      episodes: await fetchContentValue<EpisodeItem[]>("episodes", []),
    }),
  });

  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "no-episodes">(
    "all",
  );
  const [editing, setEditing] = useState<ArtistItem | null>(null);
  const [original, setOriginal] = useState<ArtistItem | null>(null);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [originalLinkedIds, setOriginalLinkedIds] = useState<string[]>([]);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const openEditor = (artist: ArtistItem, isNew = false) => {
    const ids = isNew ? [] : getEpisodesForArtist(artist.id, episodes, artist).map((ep) => ep.id);
    setEditing({ ...artist });
    setOriginal({ ...artist });
    setLinkedIds(ids);
    setOriginalLinkedIds(ids);
    setModalError("");
  };

  const closeEditor = () => {
    setEditing(null);
    setOriginal(null);
    setLinkedIds([]);
    setOriginalLinkedIds([]);
    setModalError("");
    setConfirmDiscard(false);
  };

  const modalDirty =
    !!editing &&
    (JSON.stringify(editing) !== JSON.stringify(original) ||
      JSON.stringify([...linkedIds].sort()) !== JSON.stringify([...originalLinkedIds].sort()));

  const requestClose = () => {
    if (modalDirty) setConfirmDiscard(true);
    else closeEditor();
  };

  useEffect(() => {
    if (data) {
      setArtists(data.artists);
      setEpisodes(data.episodes);
      setDirty(false);
    }
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artists.filter((a) => {
      if (statusFilter === "published" && !isPublished(a)) return false;
      if (statusFilter === "draft" && isPublished(a)) return false;
      if (statusFilter === "no-episodes" && artistEpisodeStats(a, episodes).publishedCount > 0) {
        return false;
      }
      if (!q) return true;
      return [a.name, a.meta, ...(a.tags || [])].some((f) =>
        String(f || "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [artists, episodes, search, statusFilter]);

  const markDirty = (next: ArtistItem[]) => {
    setArtists(next);
    setDirty(true);
    setSaveState("idle");
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = artists.findIndex((a) => a.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= artists.length) return;
    const next = [...artists];
    [next[idx], next[target]] = [next[target], next[idx]];
    markDirty(next);
  };

  const togglePublish = (id: string) => {
    markDirty(artists.map((a) => (a.id === id ? { ...a, published: !isPublished(a) } : a)));
  };

  const remove = (id: string) => {
    markDirty(artists.filter((a) => a.id !== id));
    setConfirmId(null);
  };

  /** Salva o artista (e os vínculos de episódio) diretamente no Supabase. */
  const saveEditor = async () => {
    if (!editing) return;
    const name = String(editing.name || "").trim();
    if (!name) {
      setModalError("Informe o nome do artista.");
      return;
    }
    const slug = (editing.slug?.trim() || slugify(name)).toLowerCase();
    if (artists.some((a) => a.id !== editing.id && (a.slug || "").toLowerCase() === slug)) {
      setModalError("Já existe outro artista com este slug.");
      return;
    }
    const badUrl = [
      editing.contactInfo?.link,
      ...(editing.linkItems || []).map((l) => l.href),
      ...(editing.portfolioItems || []).map((p) => p.link),
    ].find((u) => !isValidUrl(u));
    if (badUrl) {
      setModalError(`Link inválido: ${badUrl}`);
      return;
    }

    const item: ArtistItem = { ...editing, name, slug };
    const exists = artists.some((a) => a.id === item.id);
    const nextArtists = exists
      ? artists.map((a) => (a.id === item.id ? item : a))
      : [...artists, item];

    const linkSet = new Set(linkedIds);
    const prevSet = new Set(originalLinkedIds);
    const episodesChanged = episodes.some(
      (ep) => !isEpisodeZero(ep) && linkSet.has(ep.id) !== prevSet.has(ep.id),
    );
    const nextEpisodes = episodesChanged
      ? episodes.map((ep) => {
          if (isEpisodeZero(ep)) return ep;
          if (linkSet.has(ep.id)) return { ...ep, artistId: item.id, artist: item.name };
          if (prevSet.has(ep.id)) return { ...ep, artistId: "" };
          return ep;
        })
      : episodes;

    setModalSaving(true);
    setModalError("");
    try {
      await saveContentValue("artists", nextArtists);
      if (episodesChanged) await saveContentValue("episodes", nextEpisodes);
      setArtists(nextArtists);
      setEpisodes(nextEpisodes);
      setDirty(false);
      setSaveState("saved");
      closeEditor();
      void refetch();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setModalSaving(false);
    }
  };

  const onUpload = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `artists/${editing.id}/photo`);
      setEditing({ ...editing, image: url });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  /** Upload de imagem de uma obra do portfólio ou de um link/rede. */
  const onUploadItem = async (kind: "portfolioItems" | "linkItems", itemId: string, file: File) => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `artists/${editing.id}/${kind}`);
      setEditing((prev) => {
        if (!prev) return prev;
        const list = (prev[kind] || []) as { id: string }[];
        return {
          ...prev,
          [kind]: list.map((it) => (it.id === itemId ? { ...it, image: url } : it)),
        } as ArtistItem;
      });
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
      await saveContentValue("artists", artists);
      setSaveState("saved");
      setDirty(false);
      void refetch();
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando artistas…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Artistas</h2>
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
          placeholder="Buscar por nome ou tag…"
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
            <SelectItem value="no-episodes">Sem episódios publicados</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setEditing(emptyArtist())}>
          <Plus className="mr-1 h-4 w-4" /> Novo artista
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Atuação</TableHead>
                <TableHead>Episódios</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhum artista.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => {
                  const stats = artistEpisodeStats(a, episodes);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.name || "(sem nome)"}</div>
                        {isBase64(a.image) ? (
                          <Badge variant="outline" className="mt-1 text-amber-600">
                            foto base64 legado
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{a.meta}</TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {stats.publishedCount} publicado(s) · {stats.draftCount} oculto(s)
                        </div>
                        {stats.publishedCount === 0 ? (
                          <div className="text-xs text-amber-600">
                            {isPublished(a)
                              ? "Publicado sem episódio publicado"
                              : "Nenhum episódio publicado"}
                          </div>
                        ) : null}
                        {!isPublished(a) && stats.publishedCount > 0 ? (
                          <div className="text-xs text-amber-600">
                            Artista oculto com episódios publicados
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => togglePublish(a.id)}>
                          <Badge variant={isPublished(a) ? "default" : "secondary"}>
                            {isPublished(a) ? "Publicado" : "Rascunho"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => move(a.id, -1)}
                            title="Subir"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => move(a.id, 1)}
                            title="Descer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditing({ ...a })}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <a
                            href="/artistas"
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
                            onClick={() => setConfirmId(a.id)}
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing ? (
        <ArtistEditor
          value={editing}
          uploading={uploading}
          relatedEpisodes={artistEpisodeStats(editing, episodes).linked}
          onChange={setEditing}
          onUpload={onUpload}
          onUploadItem={onUploadItem}
          onCancel={() => setEditing(null)}
          onApply={applyEditor}
        />
      ) : null}

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover artista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o artista da lista. Clique em "Salvar alterações" para confirmar no
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
    </div>
  );
}

function ArtistEditor({
  value,
  uploading,
  relatedEpisodes,
  onChange,
  onUpload,
  onUploadItem,
  onCancel,
  onApply,
}: {
  value: ArtistItem;
  uploading: boolean;
  relatedEpisodes: EpisodeItem[];
  onChange: (a: ArtistItem) => void;
  onUpload: (file: File) => void;
  onUploadItem: (kind: "portfolioItems" | "linkItems", itemId: string, file: File) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const set = (patch: Partial<ArtistItem>) => onChange({ ...value, ...patch });
  const portfolioItems = value.portfolioItems || [];
  const linkItems = value.linkItems || [];
  const contactInfo = value.contactInfo || {};
  const setPortfolio = (next: ArtistPortfolioItem[]) => set({ portfolioItems: next });
  const setLinkItems = (next: ArtistLinkItem[]) => set({ linkItems: next });
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h3 className="text-base font-semibold">
          {value.name ? `Editar: ${value.name}` : "Novo artista"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={value.name || ""} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Slug">
            <Input value={value.slug || ""} onChange={(e) => set({ slug: e.target.value })} />
          </Field>
          <Field label="Formação / atuação">
            <Input value={value.meta || ""} onChange={(e) => set({ meta: e.target.value })} />
          </Field>
          <Field label="Tags (vírgula)">
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
        <Field label="Bio curta">
          <Textarea
            value={value.description || ""}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <Field label="Bio expandida">
          <Textarea value={value.bio || ""} onChange={(e) => set({ bio: e.target.value })} />
        </Field>
        <Field label="Portfólio / acervo">
          <Textarea
            value={value.portfolio || ""}
            onChange={(e) => set({ portfolio: e.target.value })}
          />
        </Field>
        <Field label="Links / redes">
          <Textarea value={value.links || ""} onChange={(e) => set({ links: e.target.value })} />
        </Field>
        <Field label="Contato profissional">
          <Textarea
            value={value.contact || ""}
            onChange={(e) => set({ contact: e.target.value })}
          />
        </Field>

        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Portfólio (obras do modal)</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPortfolio([
                  ...portfolioItems,
                  { id: genId("portfolio"), title: "", caption: "", link: "", image: "" },
                ])
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Adicionar obra
            </Button>
          </div>
          {portfolioItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma obra cadastrada.</p>
          ) : (
            portfolioItems.map((item) => (
              <div key={item.id} className="space-y-2 rounded border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Título">
                    <Input
                      value={item.title || ""}
                      onChange={(e) =>
                        setPortfolio(
                          portfolioItems.map((p) =>
                            p.id === item.id ? { ...p, title: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Link">
                    <Input
                      value={item.link || ""}
                      onChange={(e) =>
                        setPortfolio(
                          portfolioItems.map((p) =>
                            p.id === item.id ? { ...p, link: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
                <Field label="Legenda">
                  <Textarea
                    value={item.caption || ""}
                    onChange={(e) =>
                      setPortfolio(
                        portfolioItems.map((p) =>
                          p.id === item.id ? { ...p, caption: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      onUploadItem("portfolioItems", item.id, e.target.files[0])
                    }
                  />
                  {item.image ? (
                    <span className="text-xs text-muted-foreground">
                      {isBase64(item.image) ? "base64 legado" : "imagem enviada"}
                    </span>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPortfolio(portfolioItems.filter((p) => p.id !== item.id))}
                    title="Remover obra"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Redes &amp; links (aba do modal)</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setLinkItems([
                  ...linkItems,
                  { id: genId("link"), title: "", caption: "", href: "", image: "" },
                ])
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Adicionar link
            </Button>
          </div>
          {linkItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma rede cadastrada.</p>
          ) : (
            linkItems.map((item) => (
              <div key={item.id} className="space-y-2 rounded border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Título">
                    <Input
                      value={item.title || ""}
                      onChange={(e) =>
                        setLinkItems(
                          linkItems.map((l) =>
                            l.id === item.id ? { ...l, title: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="URL">
                    <Input
                      value={item.href || ""}
                      onChange={(e) =>
                        setLinkItems(
                          linkItems.map((l) =>
                            l.id === item.id ? { ...l, href: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
                <Field label="Legenda">
                  <Input
                    value={item.caption || ""}
                    onChange={(e) =>
                      setLinkItems(
                        linkItems.map((l) =>
                          l.id === item.id ? { ...l, caption: e.target.value } : l,
                        ),
                      )
                    }
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) =>
                      e.target.files?.[0] && onUploadItem("linkItems", item.id, e.target.files[0])
                    }
                  />
                  {item.image ? (
                    <span className="text-xs text-muted-foreground">imagem enviada</span>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setLinkItems(linkItems.filter((l) => l.id !== item.id))}
                    title="Remover link"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-3">
          <Field label="Contato — e-mail">
            <Input
              value={contactInfo.email || ""}
              onChange={(e) => set({ contactInfo: { ...contactInfo, email: e.target.value } })}
            />
          </Field>
          <Field label="Contato — telefone/WhatsApp">
            <Input
              value={contactInfo.phone || ""}
              onChange={(e) => set({ contactInfo: { ...contactInfo, phone: e.target.value } })}
            />
          </Field>
          <Field label="Contato — link principal">
            <Input
              value={contactInfo.link || ""}
              onChange={(e) => set({ contactInfo: { ...contactInfo, link: e.target.value } })}
            />
          </Field>
        </div>

        <Field label="Foto (upload)">
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          {value.image ? (
            <span className="text-xs text-muted-foreground">
              {isBase64(value.image) ? "base64 legado" : "imagem enviada"}
            </span>
          ) : null}
        </Field>
        <div className="space-y-2 rounded-md border p-4">
          <h4 className="text-sm font-semibold">Episódios relacionados</h4>
          <p className="text-xs text-muted-foreground">
            O EP00 (institucional) não entra nesta relação.
          </p>
          {relatedEpisodes.length === 0 ? (
            <p className="text-xs text-amber-600">
              Este artista não possui episódios vinculados.
              {value.published !== false
                ? " Ele está publicado no catálogo mesmo sem episódio publicado."
                : ""}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {relatedEpisodes.map((ep) => (
                <li key={ep.id} className="flex flex-wrap items-center gap-2">
                  <span>
                    {ep.code ? `${ep.code} — ` : ""}
                    {ep.title || ep.id}
                  </span>
                  <Badge variant={isItemVisible(ep) ? "default" : "secondary"}>
                    {isItemVisible(ep) ? "Publicado" : "Oculto"}
                  </Badge>
                  <a
                    className="text-xs underline"
                    href={`/episodio?id=${ep.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    abrir episódio
                  </a>
                </li>
              ))}
            </ul>
          )}
          {relatedEpisodes.length > 0 && relatedEpisodes.every((ep) => !isItemVisible(ep)) ? (
            <p className="text-xs text-amber-600">
              Nenhum episódio publicado vinculado a este artista.
            </p>
          ) : null}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
