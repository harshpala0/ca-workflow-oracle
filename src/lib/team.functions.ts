import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { email: string; full_name: string; password: string; role: "team_leader" | "member" | "client"; client_id?: string | null };

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    if (!d.email?.includes("@")) throw new Error("Valid email required");
    if (!d.password || d.password.length < 8) throw new Error("Password must be at least 8 characters");
    if (!["team_leader", "member", "client"].includes(d.role)) throw new Error("Invalid role");
    if (d.role === "client" && !d.client_id) throw new Error("Pick the client this login belongs to");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only firm admins can add users");
    const { data: me } = await supabase.from("profiles").select("firm_id").eq("id", userId).single();
    if (!me?.firm_id) throw new Error("Firm not found");
    if (data.client_id) {
      const { data: c } = await supabase.from("clients").select("id").eq("id", data.client_id).maybeSingle();
      if (!c) throw new Error("Client not found in your firm");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
      app_metadata: { invited: "true", firm_id: me.firm_id, role: data.role, client_id: data.client_id ?? "" },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
