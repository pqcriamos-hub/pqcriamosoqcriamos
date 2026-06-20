import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapEditor } from "@/lib/editor-auth.functions";

declare global {
  interface Window {
    PQOQ_AUTH?: boolean;
    PQOQLegacySetEditing?: (enabled: boolean) => void;
  }
}

function setEditing(enabled: boolean) {
  // The legacy script may load slightly after this component; retry briefly.
  let tries = 0;
  const apply = () => {
    if (window.PQOQLegacySetEditing) {
      window.PQOQLegacySetEditing(enabled);
    } else if (tries++ < 40) {
      setTimeout(apply, 100);
    }
  };
  apply();
}

async function hasEditorRole(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["editor", "admin"])
    .limit(1);
  return Boolean(data && data.length > 0);
}

/**
 * Wires the footer "Acesso editorial" panel to real Supabase auth.
 * Renders nothing; it only attaches behavior to the existing DOM controls.
 */
export function EditorAuthBridge() {
  const bootstrap = useServerFn(bootstrapEditor);

  useEffect(() => {
    // Signal to the legacy script that the real auth bridge owns login/logout.
    window.PQOQ_AUTH = true;

    const emailEl = document.getElementById("admin-email") as HTMLInputElement | null;
    const passwordEl = document.getElementById("admin-password") as HTMLInputElement | null;
    const messageEl = document.getElementById("admin-message");
    const loginBtn = document.getElementById("admin-login");
    const logoutBtn = document.getElementById("admin-logout");
    const createBtn = document.getElementById("admin-create");

    const setMessage = (text: string) => {
      if (messageEl) messageEl.textContent = text;
    };

    const onLogin = async () => {
      const email = emailEl?.value.trim() ?? "";
      const password = passwordEl?.value ?? "";
      if (!email || !password) {
        setMessage("Informe e-mail e senha.");
        return;
      }
      setMessage("Entrando…");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setMessage("Login ou senha incorretos.");
        return;
      }
      if (!(await hasEditorRole(data.user.id))) {
        await supabase.auth.signOut();
        setMessage("Esta conta não tem acesso de editor.");
        return;
      }
      setEditing(true);
      setMessage("Modo administrador ativo.");
    };

    const onLogout = async () => {
      await supabase.auth.signOut();
      setEditing(false);
      setMessage("Modo administrador desativado.");
    };

    const onCreate = async () => {
      const email = emailEl?.value.trim() ?? "";
      const password = passwordEl?.value ?? "";
      if (!email || !password) {
        setMessage("Informe e-mail e senha para criar a conta.");
        return;
      }
      setMessage("Criando conta…");
      try {
        await bootstrap({ data: { email, password } });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          setMessage("Conta criada. Agora clique em Entrar.");
          return;
        }
        setEditing(true);
        setMessage("Conta criada com sucesso. Modo administrador ativo.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Não foi possível criar a conta.");
      }
    };

    loginBtn?.addEventListener("click", onLogin);
    logoutBtn?.addEventListener("click", onLogout);
    createBtn?.addEventListener("click", onCreate);

    // Restore edit mode on reload if a valid editor session exists.
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (active && user && (await hasEditorRole(user.id))) {
        setEditing(true);
      }
    });

    return () => {
      active = false;
      loginBtn?.removeEventListener("click", onLogin);
      logoutBtn?.removeEventListener("click", onLogout);
      createBtn?.removeEventListener("click", onCreate);
    };
  }, [bootstrap]);

  return null;
}