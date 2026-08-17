import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapEditor, getBootstrapStatus } from "@/lib/editor-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GateState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "denied" }
  | { status: "authorized"; email: string; userId: string; isAdmin: boolean };

async function fetchRoles(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["editor", "admin"]);
  return (data ?? []).map((r) => r.role as string);
}

async function hasEditorRole(userId: string): Promise<boolean> {
  return (await fetchRoles(userId)).length > 0;
}

export function AdminGate({
  children,
}: {
  children: (ctx: {
    email: string;
    userId: string;
    isAdmin: boolean;
    signOut: () => Promise<void>;
  }) => ReactNode;
}) {
  const bootstrap = useServerFn(bootstrapEditor);
  const bootstrapStatus = useServerFn(getBootstrapStatus);
  const [state, setState] = useState<GateState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);

  const resolveSession = async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setState({ status: "anon" });
      return;
    }
    const roles = await fetchRoles(user.id);
    if (roles.length > 0) {
      setState({
        status: "authorized",
        email: user.email ?? "",
        userId: user.id,
        isAdmin: roles.includes("admin"),
      });
    } else {
      setState({ status: "denied" });
    }
  };

  useEffect(() => {
    void resolveSession();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void resolveSession();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Check (without ever exposing the key) whether editor bootstrap is
  // configured in this environment. Failures default to "unavailable".
  useEffect(() => {
    let active = true;
    bootstrapStatus()
      .then((res) => {
        if (active) setBootstrapAvailable(Boolean(res?.available));
      })
      .catch(() => {
        if (active) setBootstrapAvailable(false);
      });
    return () => {
      active = false;
    };
  }, [bootstrapStatus]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ status: "anon" });
  };

  const onLogin = async () => {
    if (!email.trim() || !password) {
      setMessage("Informe e-mail e senha.");
      return;
    }
    setBusy(true);
    setMessage("Entrando…");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      setMessage("E-mail ou senha inválidos.");
      setBusy(false);
      return;
    }
    const roles = await fetchRoles(data.user.id);
    if (roles.length === 0) {
      await supabase.auth.signOut();
      setMessage("Sem permissão editorial.");
      setState({ status: "anon" });
      setBusy(false);
      return;
    }
    setMessage("");
    setState({
      status: "authorized",
      email: data.user.email ?? "",
      userId: data.user.id,
      isAdmin: roles.includes("admin"),
    });
    setBusy(false);
  };

  const onCreate = async () => {
    if (!email.trim() || !password) {
      setMessage("Informe e-mail e senha para criar a conta.");
      return;
    }
    setBusy(true);
    setMessage("Criando conta…");
    try {
      await bootstrap({ data: { email: email.trim(), password } });
      await onLogin();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível criar a conta.");
      setBusy(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando acesso…</p>
      </div>
    );
  }

  if (state.status === "authorized") {
    return (
      <>
        {children({
          email: state.email,
          userId: state.userId,
          isAdmin: state.isAdmin,
          signOut,
        })}
      </>
    );
  }

  if (state.status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sem permissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sua conta está autenticada, mas não possui papel de editor.
            </p>
            <Button variant="outline" onClick={signOut}>
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Painel administrativo PQOQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-gate-email">E-mail</Label>
            <Input
              id="admin-gate-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-gate-password">Senha</Label>
            <Input
              id="admin-gate-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onLogin();
              }}
            />
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onLogin()} disabled={busy}>
              Entrar
            </Button>
            {bootstrapAvailable ? (
              <Button variant="outline" onClick={() => void onCreate()} disabled={busy}>
                Criar conta de editor
              </Button>
            ) : null}
          </div>
          {!bootstrapAvailable ? (
            <p className="text-xs text-muted-foreground">
              Funções de criação automática de editor estão indisponíveis neste
              ambiente. Use uma conta de editor existente.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
