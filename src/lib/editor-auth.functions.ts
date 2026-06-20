import { createServerFn } from "@tanstack/react-start";

const ALLOWED_EDITOR_EMAIL = "pqcriamos@gmail.com";

interface BootstrapInput {
  email: string;
  password: string;
}

/**
 * One-time bootstrap of the single editor account.
 * Public endpoint, but self-guarded:
 *  - only the allowed editor email is accepted
 *  - refuses once any editor/admin already exists
 */
export const bootstrapEditor = createServerFn({ method: "POST" })
  .inputValidator((data: BootstrapInput): BootstrapInput => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    const password = String(data?.password ?? "");
    if (!email) throw new Error("E-mail obrigatório.");
    if (password.length < 8) throw new Error("A senha precisa ter ao menos 8 caracteres.");
    return { email, password };
  })
  .handler(async ({ data }) => {
    if (data.email !== ALLOWED_EDITOR_EMAIL) {
      throw new Error("Este e-mail não está autorizado a ser editor.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existingRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .in("role", ["editor", "admin"])
      .limit(1);

    if (rolesError) throw new Error("Não foi possível verificar contas existentes.");
    if (existingRoles && existingRoles.length > 0) {
      throw new Error("A conta de editor já existe. Use Entrar.");
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      throw new Error(createError?.message ?? "Não foi possível criar a conta.");
    }

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "editor" });

    if (insertError) {
      // Roll back the auth user so bootstrap can be retried cleanly.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Conta criada, mas não foi possível atribuir o papel de editor.");
    }

    return { ok: true as const, email: data.email };
  });