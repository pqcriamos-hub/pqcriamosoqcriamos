// Painel acionável de "Saúde do conteúdo".
//
// Regras respeitadas: leitura e escrita apenas via helpers de admin-content /
// admin-diagnostics (split público/-admin e sanitização preservados). Nenhum
// registro é excluído; as correções assistidas só preenchem slug faltante ou
// limpam um artistId órfão.

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  applyMissingSlugs,
  clearBrokenArtistLinks,
  type HealthCheck,
  type HealthModule,
} from "@/lib/admin-diagnostics";

const MODULE_LABEL: Record<HealthModule, string> = {
  episodes: "Episódios",
  artists: "Artistas",
  acervo: "Acervo",
  apoio: "Apoio",
  pages: "Páginas & Textos",
  dashboard: "Dashboard",
};

const LEVEL_ORDER: Record<HealthCheck["level"], number> = { warn: 0, info: 1, ok: 2 };

function LevelBadge({ level }: { level: HealthCheck["level"] }) {
  return (
    <Badge variant={level === "warn" ? "destructive" : level === "info" ? "secondary" : "default"}>
      {level === "warn" ? "Atenção" : level === "info" ? "Revisar" : "OK"}
    </Badge>
  );
}

export function ContentHealth({
  checks,
  loading,
  onNavigate,
  onRefresh,
}: {
  checks: HealthCheck[];
  loading?: boolean;
  onNavigate?: (module: HealthModule) => void;
  onRefresh?: () => void;
}) {
  const [busy, setBusy] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const sorted = useMemo(
    () =>
      [...checks].sort(
        (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.label.localeCompare(b.label),
      ),
    [checks],
  );
  const pending = sorted.filter((c) => c.level !== "ok");
  const healthy = sorted.filter((c) => c.level === "ok");

  async function runFix(id: string, action: () => Promise<string>) {
    setBusy(id);
    setMsg("");
    setError("");
    try {
      setMsg(await action());
      onRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir a correção.");
    } finally {
      setBusy("");
    }
  }

  function fixButton(check: HealthCheck) {
    if (check.fix === "slugs") {
      return (
        <Button
          size="sm"
          disabled={busy === check.id}
          onClick={() =>
            void runFix(check.id, async () => {
              const n = await applyMissingSlugs();
              return n
                ? `${n} slug(s) gerado(s) a partir do título. Nenhum slug existente foi alterado.`
                : "Nenhum slug pendente encontrado.";
            })
          }
        >
          {busy === check.id ? "Gerando…" : "Gerar slugs faltantes"}
        </Button>
      );
    }
    if (check.fix === "broken-artist-link") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={busy === check.id}
          onClick={() =>
            void runFix(check.id, async () => {
              const n = await clearBrokenArtistLinks();
              return n
                ? `${n} vínculo(s) órfão(s) limpo(s). Selecione o artista correto em Episódios.`
                : "Nenhum vínculo órfão restante.";
            })
          }
        >
          {busy === check.id ? "Limpando…" : "Limpar vínculos órfãos"}
        </Button>
      );
    }
    return null;
  }

  function row(check: HealthCheck) {
    const items = check.items ?? [];
    const isOpen = !!open[check.id];
    const visible = isOpen ? items : items.slice(0, 5);
    return (
      <li key={check.id} className="rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <LevelBadge level={check.level} />
          <span className="font-medium">{check.label}</span>
          {check.module && (
            <Badge variant="outline">Resolver em: {MODULE_LABEL[check.module]}</Badge>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{check.message}</p>
        {check.cause && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Causa provável:</span> {check.cause}
          </p>
        )}
        {check.recommendation && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Como resolver:</span> {check.recommendation}
          </p>
        )}
        {items.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {visible.map((item) => (
              <li key={item.id} className="flex flex-wrap gap-2">
                <span className="font-medium">{item.label}</span>
                {item.detail && <span className="text-muted-foreground">{item.detail}</span>}
              </li>
            ))}
            {items.length > 5 && (
              <li>
                <button
                  type="button"
                  className="text-xs underline underline-offset-4"
                  onClick={() => setOpen((prev) => ({ ...prev, [check.id]: !isOpen }))}
                >
                  {isOpen ? "Mostrar menos" : `Ver todos (${items.length})`}
                </button>
              </li>
            )}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {check.module && check.module !== "dashboard" && onNavigate && (
            <Button size="sm" variant="secondary" onClick={() => onNavigate(check.module!)}>
              Abrir {MODULE_LABEL[check.module]}
            </Button>
          )}
          {fixButton(check)}
        </div>
      </li>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saúde do conteúdo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Verificando…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {pending.length
                ? `${pending.length} ponto(s) para revisar · ${healthy.length} verificação(ões) em ordem.`
                : "Nenhum alerta pendente. Todas as verificações estão em ordem."}
            </p>
            {msg && <p className="text-sm text-foreground">{msg}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {pending.length > 0 && <ul className="space-y-3">{pending.map(row)}</ul>}
            {healthy.length > 0 && (
              <details className="rounded-md border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Verificações em ordem ({healthy.length})
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {healthy.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2">
                      <LevelBadge level={c.level} />
                      <span className="font-medium">{c.label}:</span>
                      <span className="text-muted-foreground">{c.message}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
