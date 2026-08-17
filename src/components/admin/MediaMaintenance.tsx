import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, migrateBase64Media } from "@/lib/admin-content";
import { migrateBase64Finding, type Base64Finding } from "@/lib/admin-diagnostics";

type ItemState = { status: "idle" | "running" | "done" | "error" | "ignored"; message?: string };

export function MediaMaintenance({
  findings,
  loading,
  onRefresh,
}: {
  findings: Base64Finding[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [bulk, setBulk] = useState<{ running: boolean; message: string }>({
    running: false,
    message: "",
  });

  const totalBytes = findings.reduce((acc, f) => acc + f.bytes, 0);

  async function migrateOne(finding: Base64Finding) {
    setStates((s) => ({ ...s, [finding.id]: { status: "running" } }));
    try {
      const { bytesFreed } = await migrateBase64Finding(finding);
      setStates((s) => ({
        ...s,
        [finding.id]: {
          status: "done",
          message: `Migrado para o Storage (${formatBytes(bytesFreed)} liberados).`,
        },
      }));
      onRefresh();
    } catch (err) {
      setStates((s) => ({
        ...s,
        [finding.id]: {
          status: "error",
          message: err instanceof Error ? err.message : "Falha na migração.",
        },
      }));
    }
  }

  async function migrateAll() {
    setBulk({ running: true, message: "" });
    try {
      const result = await migrateBase64Media();
      setBulk({
        running: false,
        message: result.skipped
          ? "Nenhuma imagem em base64 nas chaves cobertas pelo atalho."
          : `${result.migrated.length} item(ns) migrado(s).` +
            (result.errors.length ? ` Falhas: ${result.errors.join("; ")}` : ""),
      });
      onRefresh();
    } catch (err) {
      setBulk({
        running: false,
        message: err instanceof Error ? err.message : "Erro na migração.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manutenção de mídia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Imagens e áudios antigos salvos dentro do conteúdo (base64) deixam as páginas pesadas. A
          migração envia o arquivo para o Storage privado e troca apenas aquele campo pelo link
          assinado. Nada é alterado sem o seu clique; se o envio falhar, o conteúdo original é
          mantido.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Analisando conteúdo…</p>
        ) : findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma mídia em base64 encontrada. Conteúdo saudável.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{findings.length}</strong> campo(s) com mídia embutida ·{" "}
              {formatBytes(totalBytes)} no total.
            </p>
            <ul className="space-y-2">
              {findings.map((f) => {
                const state = states[f.id]?.status ?? "idle";
                return (
                  <li key={f.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{f.kind === "audio" ? "Áudio" : "Imagem"}</Badge>
                      <span className="font-medium">{f.itemLabel}</span>
                      <span className="text-muted-foreground">{formatBytes(f.bytes)}</span>
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {f.pathLabel}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={state === "running" || state === "done"}
                        onClick={() => void migrateOne(f)}
                      >
                        {state === "running"
                          ? "Migrando…"
                          : state === "done"
                            ? "Migrado"
                            : "Migrar para o Storage"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={state === "running" || state === "done"}
                        onClick={() =>
                          setStates((s) => ({
                            ...s,
                            [f.id]: { status: "ignored", message: "Ignorado nesta sessão." },
                          }))
                        }
                      >
                        Ignorar por enquanto
                      </Button>
                      {states[f.id]?.message && (
                        <span
                          className={
                            state === "error"
                              ? "text-xs text-destructive"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {states[f.id]?.message}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={bulk.running}
            onClick={() => void migrateAll()}
          >
            {bulk.running ? "Migrando…" : "Atalho: migrar capas e fotos de página"}
          </Button>
          {bulk.message && <span className="text-sm text-muted-foreground">{bulk.message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
