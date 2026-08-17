import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatBytes, KEY_LABELS } from "@/lib/admin-content";
import {
  clearLocalContentCache,
  downloadSnapshot,
  fetchDiagnosticRows,
  fieldMapReport,
  findLegacyBase64,
  healthChecks,
  moduleMetrics,
  type ContentDiagRow,
} from "@/lib/admin-diagnostics";
import { MediaMaintenance } from "./MediaMaintenance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function lastUpdate(rows: ContentDiagRow[]): string {
  const dates = rows
    .map((r) => r.updated_at)
    .filter(Boolean)
    .sort() as string[];
  const latest = dates[dates.length - 1];
  return latest ? new Date(latest).toLocaleString("pt-BR") : "—";
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({ email, isAdmin }: { email?: string; isAdmin?: boolean }) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "diagnostic-rows"],
    queryFn: fetchDiagnosticRows,
  });
  const [cacheMsg, setCacheMsg] = useState("");

  const rows = useMemo(() => data ?? [], [data]);
  const publicRows = rows.filter((r) => !r.isAdminRow);
  const adminRows = rows.filter((r) => r.isAdminRow);
  const totalBytes = rows.reduce((acc, r) => acc + r.size, 0);

  const base64 = useMemo(() => findLegacyBase64(rows), [rows]);
  const checks = useMemo(() => healthChecks(rows, base64), [rows, base64]);
  const metrics = useMemo(() => moduleMetrics(rows), [rows]);
  const fieldReport = useMemo(() => fieldMapReport(), []);

  const dash = isLoading ? "—" : undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chaves públicas" value={dash ?? String(publicRows.length)} />
        <Stat
          label="Chaves admin (rascunhos)"
          value={dash ?? String(adminRows.length)}
          hint="Somente editores autenticados leem estas linhas."
        />
        <Stat label="Tamanho total" value={dash ?? formatBytes(totalBytes)} />
        <Stat label="Última atualização" value={dash ?? lastUpdate(rows)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo por módulo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Publicados</TableHead>
                  <TableHead className="text-right">Rascunhos</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <TableRow key={m.label}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right">{m.total}</TableCell>
                    <TableCell className="text-right">{m.published || "—"}</TableCell>
                    <TableCell className="text-right">{m.drafts || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.detail ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saúde do conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Verificando…</p>
          ) : (
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start gap-2 text-sm">
                  <Badge
                    variant={
                      c.level === "warn"
                        ? "destructive"
                        : c.level === "info"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {c.level === "warn" ? "Atenção" : c.level === "info" ? "Revisar" : "OK"}
                  </Badge>
                  <span className="font-medium">{c.label}:</span>
                  <span className="text-muted-foreground">{c.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status da conexão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Supabase: conectado (leitura e escrita via RLS).</p>
          <p>Sessão: {email ? `autenticada como ${email}` : "não identificada"}.</p>
          <p>Permissão detectada: {isAdmin ? "administrador" : "editor"}.</p>
          <p>Storage: bucket privado com links assinados de longa duração.</p>
          <p>
            O armazenamento local do navegador é apenas cache: a fonte oficial dos dados é sempre o
            Supabase.
          </p>
        </CardContent>
      </Card>

      <MediaMaintenance findings={base64} loading={isLoading} onRefresh={() => void refetch()} />

      <Card>
        <CardHeader>
          <CardTitle>Chaves no Supabase</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma chave salva ainda. O site usa os valores padrão até a primeira edição.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">
                      {KEY_LABELS[row.baseKey] ?? row.baseKey}
                      {row.isAdminRow && " (rascunhos)"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isAdminRow ? "secondary" : "default"}>
                        {row.isAdminRow ? "Admin" : "Público"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.count ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatBytes(row.size)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.updated_at ? new Date(row.updated_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos mapeados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {fieldReport.total} campos catalogados · {fieldReport.withAdminModule} com módulo no
            painel · {fieldReport.withoutInline} sem edição inline · {fieldReport.withoutAdminKey}{" "}
            sem linha de rascunho própria.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Página</TableHead>
                <TableHead className="text-right">Campos</TableHead>
                <TableHead className="text-right">Sem edição inline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldReport.byPage.map((p) => (
                <TableRow key={p.page}>
                  <TableCell className="font-medium">{p.page}</TableCell>
                  <TableCell className="text-right">{p.total}</TableCell>
                  <TableCell className="text-right">{p.withoutInline || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache e backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isRefetching}
              onClick={() => void refetch()}
            >
              {isRefetching ? "Recarregando…" : "Recarregar dados do Supabase"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const removed = clearLocalContentCache();
                setCacheMsg(
                  removed
                    ? `${removed} item(ns) de cache local removido(s) neste navegador.`
                    : "Nenhum cache local encontrado.",
                );
              }}
            >
              Limpar cache local
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!rows.length}
              onClick={() => downloadSnapshot(rows, "public")}
            >
              Exportar snapshot público
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!rows.length}
              onClick={() => downloadSnapshot(rows, "all")}
            >
              Exportar snapshot completo
            </Button>
          </div>
          {cacheMsg && <p className="text-sm text-muted-foreground">{cacheMsg}</p>}
          <p className="text-xs text-muted-foreground">
            Limpar o cache não apaga nada no Supabase. Os snapshots são baixados no seu computador e
            não contêm senhas nem chaves de acesso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
