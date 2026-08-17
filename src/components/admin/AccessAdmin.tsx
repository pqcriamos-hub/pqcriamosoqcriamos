import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";

type Role = "editor" | "admin";

interface AccessRow {
  id: string;
  user_id: string;
  email: string | null;
  role: Role;
  created_at: string;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function AccessAdmin({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.rpc("admin_list_access");
    if (err) {
      setError("Não foi possível carregar os acessos.");
      setRows([]);
    } else {
      setRows((data ?? []) as AccessRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const adminCount = rows.filter((r) => r.role === "admin").length;

  const onGrant = async () => {
    const target = email.trim().toLowerCase();
    if (!target) {
      setMessage("Informe o e-mail da conta.");
      return;
    }
    setBusy(true);
    setMessage("Concedendo acesso…");
    const { data: userId, error: lookupError } = await supabase.rpc("admin_lookup_user_id", {
      _email: target,
    });
    if (lookupError || !userId) {
      setMessage(
        "Conta não encontrada ou e-mail não confirmado. A pessoa precisa criar a conta e confirmar o e-mail primeiro.",
      );
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId as string, role });
    if (insertError) {
      setMessage(
        insertError.code === "23505" || insertError.message.includes("duplicate")
          ? "Essa conta já possui esse papel."
          : "Não foi possível conceder o acesso.",
      );
      setBusy(false);
      return;
    }
    setMessage(`Acesso de ${role} concedido a ${target}.`);
    setEmail("");
    setBusy(false);
    await load();
  };

  const onRevoke = async (row: AccessRow) => {
    if (row.user_id === currentUserId && row.role === "admin") {
      setMessage("Você não pode remover o seu próprio papel de admin.");
      return;
    }
    if (row.role === "admin" && adminCount <= 1) {
      setMessage("É necessário manter ao menos um admin.");
      return;
    }
    if (
      !window.confirm(
        `Remover o papel "${row.role}" de ${row.email ?? row.user_id}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    const { error: delError } = await supabase.from("user_roles").delete().eq("id", row.id);
    if (delError) {
      setMessage("Não foi possível remover o acesso.");
    } else {
      setMessage("Acesso removido.");
    }
    setBusy(false);
    await load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Acessos editoriais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando acessos…
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum papel registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">E-mail</th>
                    <th className="py-2 pr-4 font-medium">Papel</th>
                    <th className="py-2 pr-4 font-medium">Concedido em</th>
                    <th className="py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2 pr-4">
                        {row.email ?? <span className="text-muted-foreground">—</span>}
                        {row.user_id === currentUserId ? (
                          <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4">{row.role}</td>
                      <td className="py-2 pr-4">{formatDate(row.created_at)}</td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void onRevoke(row)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conceder acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A pessoa precisa já ter uma conta com e-mail confirmado no Supabase Auth.
          </p>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="access-email">E-mail</Label>
              <Input
                id="access-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-role">Papel</Label>
              <select
                id="access-role"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <Button disabled={busy} onClick={() => void onGrant()}>
              Conceder
            </Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
