import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Platform-owner console. Every handler first verifies the caller holds the super_admin role
// (through the caller's own RLS-scoped client) before touching the privileged client.

async function assertSuperAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "super_admin" }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!data) throw new Error("Platform owners only");
}

export const platformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [firms, profiles, clients, invoices] = await Promise.all([
      supabaseAdmin.from("firms").select("id, name, reg_no, is_active, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("firm_id, client_id"),
      supabaseAdmin.from("clients").select("firm_id"),
      supabaseAdmin.from("invoices").select("firm_id, total_amount"),
    ]);
    const count = (rows: { firm_id: string | null }[] | null, id: string) => (rows ?? []).filter((r) => r.firm_id === id).length;
    const list = (firms.data ?? []).map((f) => ({
      ...f,
      staff: (profiles.data ?? []).filter((p) => p.firm_id === f.id && !p.client_id).length,
      client_logins: (profiles.data ?? []).filter((p) => p.firm_id === f.id && p.client_id).length,
      clients: count(clients.data, f.id),
      billed: (invoices.data ?? []).filter((i) => i.firm_id === f.id).reduce((a, i) => a + Number(i.total_amount ?? 0), 0),
    }));
    return {
      totals: {
        firms: list.length,
        active: list.filter((f) => f.is_active).length,
        users: (profiles.data ?? []).length,
        clients: (clients.data ?? []).length,
      },
      firms: list,
    };
  });

export const setFirmActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { firm_id: string; active: boolean }) => {
    if (!d.firm_id) throw new Error("Firm required");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("firms").update({ is_active: data.active }).eq("id", data.firm_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFirmUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { firm_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email, client_id").eq("firm_id", data.firm_id),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string) }));
  });

export const createFirmWithAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { firm_name: string; full_name: string; email: string; password: string }) => {
    if (!d.firm_name?.trim()) throw new Error("Firm name required");
    if (!d.email?.includes("@")) throw new Error("Valid admin email required");
    if (!d.password || d.password.length < 8) throw new Error("Password must be at least 8 characters");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // No `invited` flag: the signup trigger creates a new firm and makes this user its admin.
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, firm_name: data.firm_name.trim() },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
