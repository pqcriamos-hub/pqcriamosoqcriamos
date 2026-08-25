import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContentValue,
  saveContentValue,
  uploadAdminMedia,
  slugify,
  isBase64,
  isPublished,
  genId,
  type GalleryCard,
  type GalleryItem,
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

function emptyGallery(order: number): GalleryCard {
  const id = genId("gallery");
  return {
    id,
    slug: id,
    meta: "",
    title: "",
    description: "",
    intro: "",
    coverImage: "",
    published: true,
    sortOrder: order,
    items: [],
  };
}

function emptyItem(order: number): GalleryItem {
  return {
    id: genId("item"),
    title: "",
    caption: "",
    description: "",
    credit: "",
    link: "",
    image: "",
    mediaType: "image",
    videoUrl: "",
    posterImage: "",
    episode: "",
    date: "",
    location: "",
    tags: [],
    published: true,
    sortOrder: order,
  };
}

export function AcervoAdmin() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "gallery-cards"],
    queryFn: () => fetchContentValue<GalleryCard[]>("gallery-cards", []),
  });

  const [cards, setCards] = useState<GalleryCard[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<GalleryCard | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setCards(data);
      setDirty(false);
    }
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (statusFilter === "published" && !isPublished(c)) return false;
      if (statusFilter === "draft" && isPublished(c)) return false;
      if (!q) return true;
      return [c.title, c.meta, ...(c.items?.flatMap((i) => i.tags || []) || [])].some((f) =>
        String(f || "").toLowerCase().includes(q),
      );
    });
  }, [cards, search, statusFilter]);

  const markDirty = (next: GalleryCard[]) => {
    setCards(next);
    setDirty(true);
    setSaveState("idle");
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = cards.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[idx], next[target]] = [next[target], next[idx]];
    markDirty(next.map((c, i) => ({ ...c, sortOrder: i })));
  };

  const togglePublish = (id: string) => {
    markDirty(cards.map((c) => (c.id === id ? { ...c, published: !isPublished(c) } : c)));
  };

  const duplicate = (id: string) => {
    const src = cards.find((c) => c.id === id);
    if (!src) return;
    const copyId = genId("gallery");
    const copy: GalleryCard = {
      ...src,
      id: copyId,
      slug: slugify(`${src.title || "galeria"}-copia`),
      title: `${src.title || "Galeria"} (cópia)`,
      published: false,
      sortOrder: cards.length,
      items: (src.items || []).map((it) => ({ ...it, id: genId("item") })),
    };
    markDirty([...cards, copy]);
  };

  const remove = (id: string) => {
    markDirty(cards.filter((c) => c.id !== id));
    setConfirmId(null);
  };

  const applyEditor = () => {
    if (!editing) return;
    const item: GalleryCard = {
      ...editing,
      slug: editing.slug?.trim() || slugify(editing.title || editing.id),
    };
    const exists = cards.some((c) => c.id === item.id);
    const next = exists
      ? cards.map((c) => (c.id === item.id ? item : c))
      : [...cards, item];
    markDirty(next);
    setEditing(null);
  };

  const onUploadCover = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `gallery/${editing.id}/covers`);
      setEditing({ ...editing, coverImage: url });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const onUploadItem = async (itemId: string, file: File) => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `gallery/${editing.id}/items`);
      setEditing({
        ...editing,
        items: (editing.items || []).map((it) =>
          it.id === itemId ? { ...it, image: url } : it,
        ),
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
      await saveContentValue("gallery-cards", cards);
      setSaveState("saved");
      setDirty(false);
      void refetch();
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando acervo…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Acervo</h2>
        <div className="flex items-center gap-2">
          {dirty ? <span className="text-xs text-amber-600">Alterações não salvas</span> : null}
          {saveState === "saving" ? <span className="text-xs text-muted-foreground">Salvando…</span> : null}
          {saveState === "saved" ? <span className="text-xs text-green-600">Salvo</span> : null}
          {saveState === "error" ? <span className="text-xs text-destructive">Erro ao salvar</span> : null}
          <Button size="sm" onClick={() => void saveAll()} disabled={!dirty || saveState === "saving"}>
            Salvar alterações
          </Button>
        </div>
      </div>

      {errorMsg ? <p className="text-sm text-destructive">{errorMsg}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por título, categoria ou tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setEditing(emptyGallery(cards.length))}>
          <Plus className="mr-1 h-4 w-4" /> Novo acervo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhum acervo.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.title || "(sem título)"}</div>
                      {isBase64(c.coverImage) ? (
                        <Badge variant="outline" className="mt-1 text-amber-600">base64 legado</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{c.meta}</TableCell>
                    <TableCell>{c.items?.length || 0}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => togglePublish(c.id)}>
                        <Badge variant={isPublished(c) ? "default" : "secondary"}>
                          {isPublished(c) ? "Publicado" : "Rascunho"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => move(c.id, -1)} title="Subir"><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => move(c.id, 1)} title="Descer"><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing({ ...c, items: [...(c.items || [])] })} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => duplicate(c.id)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                        <a href="/galeria" target="_blank" rel="noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" title="Ver no site">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmId(c.id)} title="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        <GalleryEditor
          value={editing}
          uploading={uploading}
          onChange={setEditing}
          onUploadCover={onUploadCover}
          onUploadItem={onUploadItem}
          onCancel={() => setEditing(null)}
          onApply={applyEditor}
        />
      ) : null}

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acervo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o acervo da lista. Clique em "Salvar alterações" para confirmar no site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && remove(confirmId)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GalleryEditor({
  value,
  uploading,
  onChange,
  onUploadCover,
  onUploadItem,
  onCancel,
  onApply,
}: {
  value: GalleryCard;
  uploading: boolean;
  onChange: (c: GalleryCard) => void;
  onUploadCover: (file: File) => void;
  onUploadItem: (itemId: string, file: File) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const set = (patch: Partial<GalleryCard>) => onChange({ ...value, ...patch });
  const items = value.items || [];
  const [confirmItem, setConfirmItem] = useState<string | null>(null);

  const setItem = (id: string, patch: Partial<GalleryItem>) =>
    set({ items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });

  const moveItem = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((it) => it.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    set({ items: next.map((it, i) => ({ ...it, sortOrder: i })) });
  };

  const duplicateItem = (id: string) => {
    const src = items.find((it) => it.id === id);
    if (!src) return;
    set({ items: [...items, { ...src, id: genId("item"), title: `${src.title || "Item"} (cópia)` }] });
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <h3 className="text-base font-semibold">{value.title ? `Editar: ${value.title}` : "Novo acervo"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título"><Input value={value.title || ""} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Slug"><Input value={value.slug || ""} onChange={(e) => set({ slug: e.target.value })} /></Field>
          <Field label="Categoria / meta"><Input value={value.meta || ""} onChange={(e) => set({ meta: e.target.value })} /></Field>
        </div>
        <Field label="Descrição curta"><Textarea value={value.description || ""} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Descrição curatorial / intro"><Textarea value={value.intro || ""} onChange={(e) => set({ intro: e.target.value })} /></Field>
        <Field label="Capa (upload)">
          <input type="file" accept="image/*" disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onUploadCover(e.target.files[0])} />
          {value.coverImage ? (
            <div className="mt-2 flex items-center gap-2">
              <img src={value.coverImage} alt="" className="h-16 w-24 rounded object-cover" />
              {isBase64(value.coverImage) ? (
                <Badge variant="outline" className="text-amber-600">base64 legado</Badge>
              ) : null}
            </div>
          ) : null}
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.published !== false}
            onChange={(e) => set({ published: e.target.checked })} />
          Publicado
        </label>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Itens internos</h4>
            <Button size="sm" variant="outline"
              onClick={() => set({ items: [...items, emptyItem(items.length)] })}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar item
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{it.title || "(sem título)"}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => moveItem(it.id, -1)} title="Subir"><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => moveItem(it.id, 1)} title="Descer"><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => duplicateItem(it.id)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmItem(it.id)} title="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Título"><Input value={it.title || ""} onChange={(e) => setItem(it.id, { title: e.target.value })} /></Field>
                  <Field label="Crédito"><Input value={it.credit || ""} onChange={(e) => setItem(it.id, { credit: e.target.value })} /></Field>
                  <Field label="Episódio"><Input value={it.episode || ""} onChange={(e) => setItem(it.id, { episode: e.target.value })} /></Field>
                  <Field label="Data"><Input value={it.date || ""} onChange={(e) => setItem(it.id, { date: e.target.value })} /></Field>
                  <Field label="Local"><Input value={it.location || ""} onChange={(e) => setItem(it.id, { location: e.target.value })} /></Field>
                  <Field label="Link"><Input value={it.link || ""} onChange={(e) => setItem(it.id, { link: e.target.value })} /></Field>
                </div>
                <Field label="Legenda"><Input value={it.caption || ""} onChange={(e) => setItem(it.id, { caption: e.target.value })} /></Field>
                <Field label="Descrição expandida"><Textarea value={it.description || ""} onChange={(e) => setItem(it.id, { description: e.target.value })} /></Field>
                <Field label="Tags (vírgula)">
                  <Input value={(it.tags || []).join(", ")}
                    onChange={(e) => setItem(it.id, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
                </Field>
                <Field label="Imagem (upload)">
                  <input type="file" accept="image/*" disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && onUploadItem(it.id, e.target.files[0])} />
                  {it.image ? (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={it.image} alt="" className="h-16 w-24 rounded object-cover" />
                      {isBase64(it.image) ? (
                        <Badge variant="outline" className="text-amber-600">base64 legado</Badge>
                      ) : null}
                    </div>
                  ) : null}
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={it.published !== false}
                    onChange={(e) => setItem(it.id, { published: e.target.checked })} />
                  Publicado
                </label>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onApply} disabled={uploading}>Aplicar</Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmItem !== null} onOpenChange={(o) => !o && setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação remove o item deste acervo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmItem) set({ items: items.filter((it) => it.id !== confirmItem) });
              setConfirmItem(null);
            }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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