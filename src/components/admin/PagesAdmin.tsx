import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContentValue,
  saveContentValue,
  uploadAdminMedia,
  isBase64,
} from "@/lib/admin-content";
import {
  PAGE_GROUPS,
  type CardTagsMap,
  type EditableContentMap,
  type LinkStateMap,
  type PagePhotosMap,
} from "@/lib/page-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

export function PagesAdmin() {
  const texts = useQuery({
    queryKey: ["admin", "editable-content"],
    queryFn: () => fetchContentValue<EditableContentMap>("editable-content", {}),
  });
  const photos = useQuery({
    queryKey: ["admin", "page-photos"],
    queryFn: () => fetchContentValue<PagePhotosMap>("page-photos", {}),
  });
  const links = useQuery({
    queryKey: ["admin", "link-state"],
    queryFn: () => fetchContentValue<LinkStateMap>("link-state", {}),
  });
  const tags = useQuery({
    queryKey: ["admin", "card-tags"],
    queryFn: () => fetchContentValue<CardTagsMap>("card-tags", {}),
  });

  const [textMap, setTextMap] = useState<EditableContentMap>({});
  const [photoMap, setPhotoMap] = useState<PagePhotosMap>({});
  const [linkMap, setLinkMap] = useState<LinkStateMap>({});
  const [tagMap, setTagMap] = useState<CardTagsMap>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploading, setUploading] = useState("");
  const [activeGroup, setActiveGroup] = useState(PAGE_GROUPS[0].id);

  useEffect(() => {
    if (texts.data) setTextMap(texts.data);
  }, [texts.data]);
  useEffect(() => {
    if (photos.data) setPhotoMap(photos.data);
  }, [photos.data]);
  useEffect(() => {
    if (links.data) setLinkMap(links.data);
  }, [links.data]);
  useEffect(() => {
    if (tags.data) setTagMap(tags.data);
  }, [tags.data]);

  const group = useMemo(
    () => PAGE_GROUPS.find((g) => g.id === activeGroup) ?? PAGE_GROUPS[0],
    [activeGroup],
  );

  const loading =
    texts.isLoading || photos.isLoading || links.isLoading || tags.isLoading;

  function touch() {
    setDirty(true);
    setSaveState("idle");
    setErrorMsg("");
  }

  async function handleSave() {
    setSaveState("saving");
    setErrorMsg("");
    try {
      // Only whole-map upserts: existing keys not shown here are preserved
      // because each map was loaded from Supabase before editing.
      await saveContentValue("editable-content", textMap);
      await saveContentValue("page-photos", photoMap);
      await saveContentValue("link-state", linkMap);
      await saveContentValue("card-tags", tagMap);
      setSaveState("saved");
      setDirty(false);
      void texts.refetch();
      void photos.refetch();
      void links.refetch();
      void tags.refetch();
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handlePhotoUpload(key: string, file: File) {
    setUploading(key);
    setErrorMsg("");
    try {
      const { url } = await uploadAdminMedia(file, `pages/${key}`);
      setPhotoMap((prev) => ({ ...prev, [key]: url }));
      touch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Páginas &amp; Textos</h1>
          <p className="text-sm text-muted-foreground">
            Textos, fotos, links de botões e tags das páginas públicas. Campos vazios
            mantêm o texto padrão do site.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveState === "saved" && (
            <span className="text-sm text-muted-foreground">Salvo no site</span>
          )}
          {saveState === "error" && (
            <span className="text-sm text-destructive">{errorMsg || "Erro ao salvar."}</span>
          )}
          <Button onClick={() => void handleSave()} disabled={!dirty || saveState === "saving"}>
            <Save className="mr-2 h-4 w-4" />
            {saveState === "saving" ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAGE_GROUPS.map((g) => (
          <Button
            key={g.id}
            size="sm"
            variant={g.id === activeGroup ? "default" : "outline"}
            onClick={() => setActiveGroup(g.id)}
          >
            {g.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando conteúdo…</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Textos — {group.label}
                </h2>
                <a
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  href={group.route}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver página <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {group.texts.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`text-${field.key}`}>{field.label}</Label>
                  {field.kind === "rich" ? (
                    <Textarea
                      id={`text-${field.key}`}
                      rows={4}
                      value={textMap[field.key] ?? ""}
                      placeholder="Vazio: mantém o texto padrão da página"
                      onChange={(e) => {
                        setTextMap((prev) => ({ ...prev, [field.key]: e.target.value }));
                        touch();
                      }}
                    />
                  ) : (
                    <Input
                      id={`text-${field.key}`}
                      value={textMap[field.key] ?? ""}
                      placeholder="Vazio: mantém o texto padrão da página"
                      onChange={(e) => {
                        setTextMap((prev) => ({ ...prev, [field.key]: e.target.value }));
                        touch();
                      }}
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">chave: {field.key}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {group.links?.length ? (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Links de botões
                </h2>
                {group.links.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`link-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`link-${field.key}`}
                      value={linkMap[field.key]?.href ?? ""}
                      placeholder={field.fallback}
                      onChange={(e) => {
                        setLinkMap((prev) => ({
                          ...prev,
                          [field.key]: { ...(prev[field.key] || {}), href: e.target.value },
                        }));
                        touch();
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {group.photos?.length ? (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Fotos da página
                </h2>
                {group.photos.map((field) => {
                  const url = photoMap[field.key] || "";
                  return (
                    <div key={field.key} className="flex flex-wrap items-center gap-4">
                      <div
                        className="h-20 w-20 shrink-0 rounded-md border border-border bg-muted bg-cover bg-center"
                        style={url ? { backgroundImage: `url("${url}")` } : undefined}
                        aria-hidden
                      />
                      <div className="min-w-[220px] flex-1 space-y-1.5">
                        <Label htmlFor={`photo-${field.key}`}>{field.label}</Label>
                        <Input
                          id={`photo-${field.key}`}
                          type="file"
                          accept="image/*"
                          disabled={uploading === field.key}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handlePhotoUpload(field.key, file);
                            e.target.value = "";
                          }}
                        />
                        {isBase64(url) && (
                          <p className="text-[11px] text-destructive">
                            Imagem antiga em base64 — envie novamente para usar o Storage.
                          </p>
                        )}
                      </div>
                      {url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhotoMap((prev) => {
                              const next = { ...prev };
                              delete next[field.key];
                              return next;
                            });
                            touch();
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {group.tags?.length ? (
            <Card>
              <CardContent className="space-y-5 pt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Tags
                </h2>
                {group.tags.map((field) => {
                  const list = tagMap[field.key] ?? [];
                  const update = (next: string[]) => {
                    setTagMap((prev) => ({ ...prev, [field.key]: next }));
                    touch();
                  };
                  return (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        {list.map((tag, i) => (
                          <Badge key={`${field.key}-${i}`} variant="secondary" className="gap-1">
                            {tag || "(vazio)"}
                            <button
                              type="button"
                              aria-label={`Remover tag ${tag}`}
                              onClick={() => update(list.filter((_, idx) => idx !== i))}
                              className="ml-1 text-muted-foreground hover:text-foreground"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                        {!list.length && (
                          <span className="text-xs text-muted-foreground">
                            Sem tags salvas (usa as tags padrão da página).
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nova tag e Enter"
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (!value) return;
                            update([...list, value]);
                            e.currentTarget.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = (
                              e.currentTarget.previousElementSibling as HTMLInputElement | null
                            );
                            const value = input?.value.trim();
                            if (!value || !input) return;
                            update([...list, value]);
                            input.value = "";
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
