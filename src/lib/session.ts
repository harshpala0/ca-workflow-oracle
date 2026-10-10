import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "team_leader" | "member" | "client";

export interface Me {
  id: string;
  email: string | null;
  full_name: string;
  firm_id: string;
  firm_name: string;
  client_id: string | null;
  roles: Role[];
  isStaff: boolean;
  isManager: boolean;
  isAdmin: boolean;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*, firms(name)").eq("id", u.user.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    if (error || !profile) throw new Error("Your profile could not be loaded");
    const r = (roles ?? []).map((x) => x.role as Role);
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name || profile.email || "User",
      firm_id: profile.firm_id!,
      firm_name: (profile as { firms?: { name: string } | null }).firms?.name ?? "Firm",
      client_id: profile.client_id,
      roles: r,
      isStaff: r.some((x) => x !== "client"),
      isManager: r.includes("admin") || r.includes("team_leader"),
      isAdmin: r.includes("admin"),
    };
  },
  staleTime: 60_000,
});

export const useMe = () => useSuspenseQuery(meQuery).data;

export async function logActivity(me: Me, action: string, entity: string) {
  await supabase.from("activity_log").insert({ firm_id: me.firm_id, user_id: me.id, action, entity });
}
