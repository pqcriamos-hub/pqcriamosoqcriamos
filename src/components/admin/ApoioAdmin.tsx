import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContentValue,
  saveContentValue,
  uploadAdminMedia,
  slugify,
  isBase64,
  isPublished,
  isValidUrl,
  genId,
  type SupportContent,
  type SupportCard,
  type SupportSection,
  type LinkPair,
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

const EMPTY: SupportContent = { fronts: [], partners: [] };

function emptyCard(order: number): SupportCard {
  const id = genId("support");
  return {
    id,
    slug: id,
    title: "",
    subtitle: "",
    meta: "",
    description: "",
    fullText: "",
    image: "",
    relation: "",
    contact: "",
    location: "",
    links: [],
    docs: [],
    gallery: [],
    tags: [],
    published: true,
    sortOrder: order,
  };
}

export function ApoioAdmin() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "support-content"],
    queryFn: () => fetchContentValue<SupportContent>("support-content", EMPTY),
  });

  const [content, setContent] = useState<SupportContent>(EMPTY);
  const [section, setSection] = useState<SupportSection>("fronts");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<SupportCard | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setContent({ fronts: data.fronts || [], partners: data.partners || [] });
      setDirty(false);
    }
  }, [data]);

  const list = content[section] || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (statusFilter === "published" && !isPublished(c)) return false;
      if (statusFilter === "draft" && isPublished(c)) return false;
      if (!q) return true;
      return [c.title, c.subtitle, c.meta, ...(c.tags || [])].some((f) =>
        String(f || "").toLowerCase().includes(q),
      );
    });
  }, [list, search, statusFilter]);

  const setList = (next: SupportCard[]) => {
    setContent({ ...content, [section]: next });
    setDirty(true);
    setSaveState("idle");
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = list.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= list.length) return;
    const next = [...list];
    [next[idx], next[target]] = [next[target], next[idx]];
    setList(next.map((c, i) => ({ ...c, sortOrder: i })));
  };

  const togglePublish = (id: string) =>
    setList(list.map((c) => (c.id === id ? { ...c, published: !isPublished(c) } : c)));

  const duplicate = (id: string) => {
    const src = list.find((c) => c.id === id);
    if (!src) return;
    setList([
      ...list,
      {
        ...src,
        id: genId("support"),
        slug: slugify(`${src.title || "apoio"}-copia`),
        title: `${src.title || "Card"} (cópia)`,
        published: false,
        sortOrder: list.length,
        links: (src.links || []).map((l) => ({ ...l })),
        docs: (src.docs || []).map((l) => ({ ...l })),
        gallery: [...(src.gallery || [])],
      },
    ]);
  };

  const remove = (id: string) => {
    setList(list.filter((c) => c.id !== id));
    setConfirmId(null);
  };

  const applyEditor = () => {
    if (!editing) return;
    const item: SupportCard = {
      ...editing,
      slug: editing.slug?.trim() || slugify(editing.title || editing.id),
    };
    const exists = list.some((c) => c.id === item.id);
    setList(exists ? list.map((c) => (c.id === item.id ? item : c)) : [...list, item]);
    setEditing(null);
  };

  const onUploadMain = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `support/${editing.id}/main`);
      setEditing({ ...editing, image: url });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const onUploadGallery = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `support/${editing.id}/gallery`);
      setEditing({ ...editing, gallery: [...(editing.gallery || []), url] });
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
      await saveContentValue("support-content", content);
      setSaveState("saved");
      setDirty(false);
      void refetch();
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando apoio…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Apoio</h2>
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

      <div className="flex gap-2">
        <Button size="sm" variant={section === "fronts" ? "default" : "outline"}
          onClick={() => { setSection("fronts"); setEditing(null); }}>
          Frentes de apoio
        </Button>
        <Button size="sm" variant={section === "partners" ? "default" : "outline"}
          onClick={() => { setSection("partners"); setEditing(null); }}>
          Apoiadores e parceiros
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por título, subtítulo ou tag…"
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
        <Button size="sm" onClick={() => setEditing(emptyCard(list.length))}>
          <Plus className="mr-1 h-4 w-4" /> Novo card
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhum card.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.title || "(sem título)"}</div>
                      {isBase64(c.image) ? (
                        <Badge variant="outline" className="mt-1 text-amber-600">base64 legado</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{c.meta}</TableCell>
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
                        <Button size="icon" variant="ghost" onClick={() => setEditing(structuredCloneCard(c))} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => duplicate(c.id)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                        <a href="/apoio" target="_blank" rel="noreferrer"
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
        <SupportEditor
          value={editing}
          uploading={uploading}
          onChange={setEditing}
          onUploadMain={onUploadMain}
          onUploadGallery={onUploadGallery}
          onCancel={() => setEditing(null)}
          onApply={applyEditor}
        />
      ) : null}

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover card?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o card da lista. Clique em "Salvar alterações" para confirmar no site.
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

function structuredCloneCard(c: SupportCard): SupportCard {
  return {
    ...c,
    links: (c.links || []).map((l) => ({ ...l, id: l.id || genId("links") })),
    docs: (c.docs || []).map((l) => ({ ...l, id: l.id || genId("docs") })),
    gallery: [...(c.gallery || [])],
    tags: [...(c.tags || [])],
  };
}

function SupportEditor({
  value,
  uploading,
  onChange,
  onUploadMain,
  onUploadGallery,
  onCancel,
  onApply,
}: {
  value: SupportCard;
  uploading: boolean;
  onChange: (c: SupportCard) => void;
  onUploadMain: (file: File) => void;
  onUploadGallery: (file: File) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const set = (patch: Partial<SupportCard>) => onChange({ ...value, ...patch });
  const links = value.links || [];
  const docs = value.docs || [];
  const gallery = value.gallery || [];

  const setPair = (kind: "links" | "docs", id: string, patch: Partial<LinkPair>) =>
    set({ [kind]: (value[kind] || []).map((p) => (p.id === id ? { ...p, ...patch } : p)) } as Partial<SupportCard>);
  const addPair = (kind: "links" | "docs") =>
    set({ [kind]: [...(value[kind] || []), { id: genId(kind), label: "", href: "" }] } as Partial<SupportCard>);
  const removePair = (kind: "links" | "docs", id: string) =>
    set({ [kind]: (value[kind] || []).filter((p) => p.id !== id) } as Partial<SupportCard>);

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <h3 className="text-base font-semibold">{value.title ? `Editar: ${value.title}` : "Novo card"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título"><Input value={value.title || ""} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Slug"><Input value={value.slug || ""} onChange={(e) => set({ slug: e.target.value })} /></Field>
          <Field label="Subtítulo"><Input value={value.subtitle || ""} onChange={(e) => set({ subtitle: e.target.value })} /></Field>
          <Field label="Meta"><Input value={value.meta || ""} onChange={(e) => set({ meta: e.target.value })} /></Field>
        </div>
        <Field label="Descrição curta"><Textarea value={value.description || ""} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Texto completo"><Textarea value={value.fullText || ""} onChange={(e) => set({ fullText: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Relação com o PQOQ"><Textarea value={value.relation || ""} onChange={(e) => set({ relation: e.target.value })} /></Field>
          <Field label="Contato"><Textarea value={value.contact || ""} onChange={(e) => set({ contact: e.target.value })} /></Field>
        </div>
        <Field label="Localização / mapa"><Input value={value.location || ""} onChange={(e) => set({ location: e.target.value })} /></Field>
        <Field label="Tags (vírgula)">
          <Input value={(value.tags || []).join(", ")}
            onChange={(e) => set({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Imagem / logo (upload)">
          <input type="file" accept="image/*" disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onUploadMain(e.target.files[0])} />
          {value.image ? (
            <div className="mt-2 flex items-center gap-2">
              <img src={value.image} alt="" className="h-16 w-24 rounded object-cover" />
              {isBase64(value.image) ? <Badge variant="outline" className="text-amber-600">base64 legado</Badge> : null}
            </div>
          ) : null}
        </Field>

        {/* Links */}
        <PairEditor kind="links" title="Links oficiais" pairs={links}
          onAdd={() => addPair("links")} onSet={(id, p) => setPair("links", id, p)} onRemove={(id) => removePair("links", id)} />
        {/* Docs */}
        <PairEditor kind="docs" title="Documentos / anexos" pairs={docs}
          onAdd={() => addPair("docs")} onSet={(id, p) => setPair("docs", id, p)} onRemove={(id) => removePair("docs", id)} />

        {/* Gallery */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Galeria interna</h4>
            <input type="file" accept="image/*" disabled={uploading}
              onChange={(e) => e.target.files?.[0] && onUploadGallery(e.target.files[0])} />
          </div>
          {gallery.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma imagem.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {gallery.map((url, i) => (
                <div key={`${url}-${i}`} className="relative">
                  <img src={url} alt="" className="h-20 w-28 rounded object-cover" />
                  {isBase64(url) ? (
                    <Badge variant="outline" className="absolute left-1 top-1 text-amber-600">base64</Badge>
                  ) : null}
                  <div className="mt-1 flex justify-center gap-1">
                    <Button size="icon" variant="ghost" disabled={i === 0}
                      onClick={() => {
                        const next = [...gallery];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        set({ gallery: next });
                      }} title="Subir"><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={i === gallery.length - 1}
                      onClick={() => {
                        const next = [...gallery];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        set({ gallery: next });
                      }} title="Descer"><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => set({ gallery: gallery.filter((_, j) => j !== i) })} title="Remover">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

function PairEditor({
  kind,
  title,
  pairs,
  onAdd,
  onSet,
  onRemove,
}: {
  kind: "links" | "docs";
  title: string;
  pairs: LinkPair[];
  onAdd: () => void;
  onSet: (id: string, patch: Partial<LinkPair>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>
      {pairs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item.</p>
      ) : (
        pairs.map((p) => {
          const pid = p.id || `${kind}-${p.href}`;
          const invalid = !isValidUrl(p.href);
          return (
            <div key={pid} className="flex flex-wrap items-start gap-2">
              <Input className="max-w-[200px]" placeholder="Rótulo" value={p.label || ""}
                onChange={(e) => onSet(pid, { label: e.target.value })} />
              <div className="flex-1 space-y-1">
                <Input placeholder="https://…" value={p.href || ""}
                  onChange={(e) => onSet(pid, { href: e.target.value })}
                  className={invalid ? "border-destructive" : ""} />
                {invalid ? <span className="text-xs text-destructive">URL inválida</span> : null}
              </div>
              <Button size="icon" variant="ghost" onClick={() => onRemove(pid)} title="Remover">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })
      )}
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