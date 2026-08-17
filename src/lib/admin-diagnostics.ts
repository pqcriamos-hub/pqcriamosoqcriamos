// Diagnóstico e manutenção do /pqoqadmin (somente leitura, exceto a migração
// de mídia disparada manualmente pelo editor).
//
// Regras do projeto respeitadas aqui:
// - Supabase/site_content é a fonte da verdade; localStorage é só cache.
// - Escrita apenas via saveContentValue(), que mantém o split público/-admin
//   e a sanitização de rascunhos.
// - Nenhum segredo, token ou variável de ambiente é lido ou exposto.

import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_CONTENT_KEYS,
  fetchContentValue,
  isBase64,
  isValidUrl,
  saveContentValue,
  uploadAdminMedia,
  type AdminContentKey,
  type ArtistItem,
  type EpisodeEmbeds,
  type EpisodeItem,
  type GalleryCard,
  type SupportContent,
} from "./admin-content";
import { adminKeyFor, DRAFT_CONTENT_KEYS, isItemPublished } from "./content-sanitize";
import { FIELD_MAP } from "./field-map";

const STORAGE_PREFIX = "pqoq-site:";

/** Chaves lidas no diagnóstico: públicas + contrapartes admin. */
export const DIAGNOSTIC_KEYS: string[] = [
  ...ADMIN_CONTENT_KEYS,
  ...DRAFT_CONTENT_KEYS.map((k) => adminKeyFor(k)),
];

export interface ContentDiagRow {
  key: string;
  /** Chave pública correspondente (remove o sufixo -admin). */
  baseKey: string;
  isAdminRow: boolean;
  published: boolean;
  updated_at: string | null;
  size: number;
  count: number | null;
  value: unknown;
}

function baseKeyOf(key: string): string {
  return key.endsWith("-admin") ? key.slice(0, -"-admin".length) : key;
}

/** Lê todas as chaves de diagnóstico com valor completo. Nunca lança. */
export async function fetchDiagnosticRows(): Promise<ContentDiagRow[]> {
  const { data, error } = await supabase
    .from("site_content")
    .select("key, value, published, updated_at")
    .in("key", DIAGNOSTIC_KEYS);
  if (error || !data) return [];
  return data.map((row) => {
    let size = 0;
    let count: number | null = null;
    try {
      size = JSON.stringify(row.value ?? null).length;
      if (Array.isArray(row.value)) count = row.value.length;
    } catch {
      /* valor não serializável: mantém 0 */
    }
    return {
      key: row.key,
      baseKey: baseKeyOf(row.key),
      isAdminRow: row.key.endsWith("-admin"),
      published: Boolean(row.published),
      updated_at: row.updated_at ?? null,
      size,
      count,
      value: row.value ?? null,
    };
  });
}

export function rowByKey(rows: ContentDiagRow[], key: string): ContentDiagRow | undefined {
  return rows.find((r) => r.key === key);
}

/** Valor preferencial do editor: linha -admin quando existe, senão a pública. */
export function editorValue(rows: ContentDiagRow[], baseKey: string): unknown {
  const admin = rowByKey(rows, adminKeyFor(baseKey));
  if (admin && admin.value !== null && admin.value !== undefined) return admin.value;
  return rowByKey(rows, baseKey)?.value ?? null;
}

// ---------------------------------------------------------------------------
// Métricas por módulo
// ---------------------------------------------------------------------------

export interface ModuleMetric {
  label: string;
  total: number;
  published: number;
  drafts: number;
  detail?: string;
}

function splitPublished(list: unknown): { total: number; published: number; drafts: number } {
  const arr = Array.isArray(list) ? list : [];
  const published = arr.filter(isItemPublished).length;
  return { total: arr.length, published, drafts: arr.length - published };
}

function countKeys(value: unknown): number {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>).length
    : 0;
}

export function moduleMetrics(rows: ContentDiagRow[]): ModuleMetric[] {
  const episodes = splitPublished(editorValue(rows, "episodes"));
  const artists = splitPublished(editorValue(rows, "artists"));
  const cards = editorValue(rows, "gallery-cards");
  const gallery = splitPublished(cards);
  const galleryItems = Array.isArray(cards)
    ? (cards as GalleryCard[]).reduce((acc, c) => acc + (c?.items?.length ?? 0), 0)
    : 0;
  const support = (editorValue(rows, "support-content") ?? {}) as Partial<SupportContent>;
  const fronts = splitPublished(support.fronts);
  const partners = splitPublished(support.partners);

  return [
    {
      label: "Episódios",
      ...episodes,
      detail: `${countKeys(editorValue(rows, "episode-embeds"))} embeds`,
    },
    { label: "Artistas", ...artists },
    { label: "Acervo (cards)", ...gallery, detail: `${galleryItems} itens internos` },
    { label: "Apoio — frentes", ...fronts },
    { label: "Apoio — apoiadores", ...partners },
    {
      label: "Camada editorial",
      total:
        countKeys(rowByKey(rows, "editable-content")?.value) +
        countKeys(rowByKey(rows, "page-photos")?.value) +
        countKeys(rowByKey(rows, "link-state")?.value) +
        countKeys(rowByKey(rows, "card-tags")?.value),
      published: 0,
      drafts: 0,
      detail: [
        `${countKeys(rowByKey(rows, "editable-content")?.value)} textos`,
        `${countKeys(rowByKey(rows, "page-photos")?.value)} fotos`,
        `${countKeys(rowByKey(rows, "link-state")?.value)} links`,
        `${countKeys(rowByKey(rows, "card-tags")?.value)} tags`,
      ].join(" · "),
    },
  ];
}

// ---------------------------------------------------------------------------
// Detecção de base64 legado, item a item
// ---------------------------------------------------------------------------

export interface Base64Finding {
  /** Identificador estável usado como key na UI. */
  id: string;
  /** Chave onde o valor foi encontrado (pode ser a -admin). */
  key: string;
  /** Chave pública base, usada para gravar via saveContentValue. */
  baseKey: string;
  /** Caminho dentro do JSON. */
  path: (string | number)[];
  pathLabel: string;
  mime: string;
  kind: "image" | "audio" | "outro";
  bytes: number;
  /** Rótulo humano do item relacionado. */
  itemLabel: string;
}

const BASE64_SCAN_KEYS = [
  "episode-embeds",
  "episodes",
  "artists",
  "gallery-cards",
  "support-content",
  "page-photos",
];

function mimeOf(dataUrl: string): string {
  return /^data:([^;,]+)/.exec(dataUrl)?.[1] || "application/octet-stream";
}

function kindOf(mime: string): Base64Finding["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "outro";
}

/** Tamanho aproximado em bytes do payload de um dataURL. */
function dataUrlBytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(",");
  const payload = idx >= 0 ? dataUrl.length - idx - 1 : dataUrl.length;
  return Math.round(payload * 0.75);
}

function labelForItem(value: unknown, fallback: string): string {
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    for (const field of ["title", "name", "label", "slug", "id"]) {
      if (typeof v[field] === "string" && v[field]) return v[field] as string;
    }
  }
  return fallback;
}

function walk(
  node: unknown,
  path: (string | number)[],
  parent: unknown,
  out: Base64Finding[],
  ctx: { key: string; baseKey: string },
  depth: number,
): void {
  if (depth > 8) return;
  if (typeof node === "string") {
    if (!isBase64(node)) return;
    const mime = mimeOf(node);
    out.push({
      id: `${ctx.key}:${path.join(".")}`,
      key: ctx.key,
      baseKey: ctx.baseKey,
      path: [...path],
      pathLabel: `${ctx.key}.${path.join(".")}`,
      mime,
      kind: kindOf(mime),
      bytes: dataUrlBytes(node),
      itemLabel: labelForItem(parent, String(path[path.length - 2] ?? path[0] ?? "—")),
    });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, [...path, i], node, out, ctx, depth + 1));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      walk(v, [...path, k], node, out, ctx, depth + 1);
    }
  }
}

/** Varre as chaves de mídia e devolve cada valor base64 encontrado. */
export function findLegacyBase64(rows: ContentDiagRow[]): Base64Finding[] {
  const out: Base64Finding[] = [];
  for (const row of rows) {
    if (!BASE64_SCAN_KEYS.includes(row.baseKey)) continue;
    walk(row.value, [], null, out, { key: row.key, baseKey: row.baseKey }, 0);
  }
  // Um mesmo campo aparece na linha pública e na -admin: mantém um por caminho.
  const seen = new Set<string>();
  return out.filter((f) => {
    const sig = `${f.baseKey}.${f.path.join(".")}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Migração de um único campo base64 -> Storage
// ---------------------------------------------------------------------------

function dataUrlToFile(dataUrl: string, name: string): File {
  const [header, base64] = dataUrl.split(",", 2);
  const mime = /data:([^;]+)/.exec(header || "")?.[1] || "image/jpeg";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "jpg";
  return new File([bytes], `${name}.${ext}`, { type: mime });
}

function getPath(root: unknown, path: (string | number)[]): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
}

/** Clona superficialmente ao longo do caminho e grava o novo valor. */
function setPath(root: unknown, path: (string | number)[], value: unknown): unknown {
  if (!path.length) return value;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = [...root];
    copy[head as number] = setPath(copy[head as number], rest, value);
    return copy;
  }
  const copy = { ...((root as Record<string, unknown>) ?? {}) };
  copy[String(head)] = setPath(copy[String(head)], rest, value);
  return copy;
}

function storagePrefixFor(finding: Base64Finding): string {
  const parts = finding.path.filter((p) => typeof p === "string") as string[];
  const slug = parts.slice(0, 2).join("/") || "media";
  return `${finding.baseKey}/${slug}`;
}

/**
 * Migra UM campo base64 para o Storage. Lê o valor atual do Supabase,
 * envia o arquivo e só então grava a chave (público + -admin). Em caso de
 * falha nada é gravado e o base64 permanece intacto.
 */
export async function migrateBase64Finding(
  finding: Base64Finding,
): Promise<{ url: string; bytesFreed: number }> {
  const current = await fetchContentValue<unknown>(finding.baseKey as AdminContentKey, null);
  const raw = getPath(current, finding.path);
  if (typeof raw !== "string" || !isBase64(raw)) {
    throw new Error("Este campo já não contém base64. Recarregue o diagnóstico.");
  }
  const name = `migrado-${finding.path.join("-").replace(/[^a-z0-9-]+/gi, "-")}`.slice(0, 60);
  const file = dataUrlToFile(raw, name);
  const { url } = await uploadAdminMedia(file, storagePrefixFor(finding));
  const next = setPath(current, finding.path, url);
  await saveContentValue(finding.baseKey as AdminContentKey, next);
  return { url, bytesFreed: dataUrlBytes(raw) };
}

// ---------------------------------------------------------------------------
// Saúde do conteúdo
// ---------------------------------------------------------------------------

export type HealthLevel = "ok" | "warn" | "info";

export interface HealthCheck {
  id: string;
  label: string;
  level: HealthLevel;
  message: string;
}

const LARGE_KEY_BYTES = 512 * 1024;

export function healthChecks(rows: ContentDiagRow[], base64: Base64Finding[]): HealthCheck[] {
  const checks: HealthCheck[] = [];

  checks.push(
    base64.length
      ? {
          id: "base64",
          label: "Mídia em base64",
          level: "warn",
          message: `${base64.length} campo(s) ainda guardam a imagem/áudio dentro do conteúdo. Migre em "Manutenção de mídia".`,
        }
      : {
          id: "base64",
          label: "Mídia em base64",
          level: "ok",
          message: "Nenhuma mídia embutida em base64.",
        },
  );

  const present = new Set(rows.map((r) => r.key));
  const missing = ADMIN_CONTENT_KEYS.filter((k) => !present.has(k));
  checks.push({
    id: "missing-keys",
    label: "Chaves ausentes",
    level: missing.length ? "info" : "ok",
    message: missing.length
      ? `Ainda sem registro no Supabase: ${missing.join(", ")}. Passam a existir no primeiro salvamento.`
      : "Todas as chaves conhecidas existem no Supabase.",
  });

  const missingAdmin = DRAFT_CONTENT_KEYS.filter((k) => !present.has(adminKeyFor(k)));
  checks.push({
    id: "missing-admin",
    label: "Chaves admin (rascunhos)",
    level: missingAdmin.length ? "info" : "ok",
    message: missingAdmin.length
      ? `Sem linha -admin: ${missingAdmin.join(", ")}. Criada no primeiro salvamento do módulo.`
      : "Todas as seções com rascunho têm a linha -admin correspondente.",
  });

  const heavy = rows.filter((r) => r.size > LARGE_KEY_BYTES);
  checks.push({
    id: "heavy",
    label: "Chaves muito grandes",
    level: heavy.length ? "warn" : "ok",
    message: heavy.length
      ? heavy.map((r) => `${r.key} (${Math.round(r.size / 1024)} KB)`).join(", ")
      : "Nenhuma chave acima de 512 KB.",
  });

  const episodes = (editorValue(rows, "episodes") ?? []) as EpisodeItem[];
  const embeds = (editorValue(rows, "episode-embeds") ?? {}) as EpisodeEmbeds;
  const noThumb = Array.isArray(episodes)
    ? episodes.filter((ep) => ep?.id && !embeds?.[ep.id]?.thumbnail)
    : [];
  checks.push({
    id: "episode-thumb",
    label: "Episódios sem capa",
    level: noThumb.length ? "info" : "ok",
    message: noThumb.length
      ? noThumb.map((ep) => ep.title || ep.id).join(", ")
      : "Todos os episódios têm capa.",
  });

  const artists = (editorValue(rows, "artists") ?? []) as ArtistItem[];
  const noPhoto = Array.isArray(artists) ? artists.filter((a) => !a?.image) : [];
  checks.push({
    id: "artist-photo",
    label: "Artistas sem foto",
    level: noPhoto.length ? "info" : "ok",
    message: noPhoto.length
      ? noPhoto.map((a) => a.name || a.id).join(", ")
      : "Todos os artistas têm foto.",
  });

  const cards = (editorValue(rows, "gallery-cards") ?? []) as GalleryCard[];
  const noCover = Array.isArray(cards) ? cards.filter((c) => !c?.coverImage) : [];
  checks.push({
    id: "acervo-cover",
    label: "Acervo sem capa",
    level: noCover.length ? "info" : "ok",
    message: noCover.length
      ? noCover.map((c) => c.title || c.id).join(", ")
      : "Todos os cards do acervo têm capa.",
  });

  const noSlug = [
    ...(Array.isArray(episodes) ? episodes : [])
      .filter((e) => !e?.slug)
      .map((e) => `episódio ${e.id}`),
    ...(Array.isArray(artists) ? artists : [])
      .filter((a) => !a?.slug)
      .map((a) => `artista ${a.id}`),
    ...(Array.isArray(cards) ? cards : []).filter((c) => !c?.slug).map((c) => `acervo ${c.id}`),
  ];
  checks.push({
    id: "slugs",
    label: "Itens sem slug",
    level: noSlug.length ? "info" : "ok",
    message: noSlug.length ? noSlug.join(", ") : "Todos os itens têm slug.",
  });

  const badLinks: string[] = [];
  const collect = (label: string, href?: string) => {
    if (href && !isBase64(href) && !isValidUrl(href) && !href.startsWith("/")) {
      badLinks.push(`${label}: ${href}`);
    }
  };
  for (const ep of Array.isArray(episodes) ? episodes : []) {
    collect(`episódio ${ep.title || ep.id}`, ep.sourceUrl);
    (ep.links ?? []).forEach((l) => collect(`link de ${ep.title || ep.id}`, l?.href));
    (ep.participantLinks ?? []).forEach((l) =>
      collect(`participante de ${ep.title || ep.id}`, l?.href),
    );
  }
  for (const a of Array.isArray(artists) ? artists : []) {
    (a.linkItems ?? []).forEach((l) => collect(`artista ${a.name || a.id}`, l?.href));
  }
  for (const c of Array.isArray(cards) ? cards : []) {
    collect(`acervo ${c.title || c.id}`, undefined);
    (c.items ?? []).forEach((it) => collect(`item de ${c.title || c.id}`, it?.link));
  }
  checks.push({
    id: "links",
    label: "Links inválidos",
    level: badLinks.length ? "warn" : "ok",
    message: badLinks.length ? badLinks.join(" · ") : "Nenhum link inválido encontrado.",
  });

  return checks;
}

// ---------------------------------------------------------------------------
// Conectividade do field map
// ---------------------------------------------------------------------------

export interface FieldMapReport {
  total: number;
  withAdminModule: number;
  withoutInline: number;
  withoutAdminKey: number;
  byPage: { page: string; total: number; withoutInline: number }[];
}

export function fieldMapReport(): FieldMapReport {
  const byPage = new Map<string, { total: number; withoutInline: number }>();
  for (const f of FIELD_MAP) {
    const entry = byPage.get(f.page) ?? { total: 0, withoutInline: 0 };
    entry.total += 1;
    if (!f.inline) entry.withoutInline += 1;
    byPage.set(f.page, entry);
  }
  return {
    total: FIELD_MAP.length,
    withAdminModule: FIELD_MAP.filter((f) => f.adminModule !== "dashboard").length,
    withoutInline: FIELD_MAP.filter((f) => !f.inline).length,
    withoutAdminKey: FIELD_MAP.filter((f) => !f.adminKey).length,
    byPage: [...byPage.entries()]
      .map(([page, v]) => ({ page, ...v }))
      .sort((a, b) => a.page.localeCompare(b.page)),
  };
}

// ---------------------------------------------------------------------------
// Cache local e exportação
// ---------------------------------------------------------------------------

/** Remove só o cache local do site neste navegador. Não toca no Supabase. */
export function clearLocalContentCache(): number {
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      localStorage.removeItem(k);
      removed += 1;
    }
  } catch {
    /* navegador sem localStorage */
  }
  return removed;
}

/** Dispara o download de um snapshot JSON das chaves escolhidas. */
export function downloadSnapshot(rows: ContentDiagRow[], scope: "public" | "all"): void {
  const selected = scope === "all" ? rows : rows.filter((r) => !r.isAdminRow);
  const payload = {
    exportedAt: new Date().toISOString(),
    scope,
    keys: selected.map((r) => ({
      key: r.key,
      published: r.published,
      updated_at: r.updated_at,
      value: r.value,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pqoq-site-content-${scope}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
