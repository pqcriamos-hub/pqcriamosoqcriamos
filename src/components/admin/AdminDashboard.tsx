import { useQuery } from "@tanstack/react-query";
import {
  fetchContentOverview,
  formatBytes,
  KEY_LABELS,
  type ContentRow,
} from "@/lib/admin-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function summaryStat(rows: ContentRow[]) {
  const total = rows.length;
  const published = rows.filter((r) => r.published).length;
  const bytes = rows.reduce((acc, r) => acc + r.size, 0);
  return { total, published, bytes };
}

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content-overview"],
    queryFn: fetchContentOverview,
  });

  const rows = data ?? [];
  const stats = summaryStat(rows);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Chaves de conteúdo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "—" : stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Publicadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "—" : stats.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tamanho total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {isLoading ? "—" : formatBytes(stats.bytes)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo no Supabase</CardTitle>
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
                  <TableHead>Seção</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">
                      {KEY_LABELS[row.key] ?? row.key}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.published ? "default" : "secondary"}>
                        {row.published ? "Publicado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.count ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatBytes(row.size)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.updated_at
                        ? new Date(row.updated_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
