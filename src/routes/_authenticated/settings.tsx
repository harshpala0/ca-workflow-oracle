import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, meQuery } from "@/lib/session";
import { inviteUser } from "@/lib/team.functions";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Team & settings — CA FirmHub" }] }),
  component: Settings,
});

function Settings() {
  const me = useMe();
  const qc = useQueryClient();
  const invite = useServerFn(inviteUser);
  const [firm, setFirm] = useState(me.firm_name);
  const [f, setF] = useState({ email: "", full_name: "", password: "", role: "member" as "member" | "team_leader" | "client", client_id: "" });

  const team = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: p }, { data: r }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, client_id").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("clients").select("id, name").order("name"),
      ]);
      return { people: p ?? [], roles: r ?? [], clients: c ?? [] };
    },
  });

  const add = useMutation({
    mutationFn: () => invite({ data: { ...f, client_id: f.role === "client" ? f.client_id : null } }),
    onSuccess: () => {
      toast.success("User created — share the email and password with them.");
      setF({ email: "", full_name: "", password: "", role: "member", client_id: "" });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Team & settings" description="Firm details, staff and client portal logins." />
      {me.isAdmin && (
        <section className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Firm</h2>
          <form
            className="mt-3 flex max-w-md gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const { error } = await supabase.from("firms").update({ name: firm }).eq("id", me.firm_id);
              if (error) return toast.error(error.message);
              toast.success("Firm updated");
              qc.invalidateQueries({ queryKey: meQuery.queryKey });
            }}
          >
            <Input value={firm} onChange={(e) => setFirm(e.target.value)} />
            <Button>Save</Button>
          </form>
        </section>
      )}

      {me.isAdmin && (
        <section className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Add a user</h2>
          <p className="text-sm text-muted-foreground">Staff get the full workspace; clients only see their own portal.</p>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <div><Label className="mb-1.5 block">Full name</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Temporary password</Label><Input type="text" minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            <div>
              <Label className="mb-1.5 block">Role</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as typeof f.role })}>
                <option value="member">Member</option>
                <option value="team_leader">Team leader</option>
                <option value="client">Client (portal)</option>
              </select>
            </div>
            {f.role === "client" && (
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Client</Label>
                <select required className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })}>
                  <option value="">— Select client —</option>
                  {team.data?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2"><Button disabled={add.isPending}>{add.isPending ? "Creating…" : "Create user"}</Button></div>
          </form>
        </section>
      )}

      <section className="rounded-lg border bg-card shadow-card">
        <h2 className="border-b px-6 py-4 text-lg font-semibold">People</h2>
        <table className="w-full text-sm">
          <tbody>
            {team.data?.people.map((p) => (
              <tr key={p.id} className="border-t first:border-t-0">
                <td className="px-6 py-3 font-medium">{p.full_name || "—"}</td>
                <td className="px-6 py-3 text-muted-foreground">{p.email}</td>
                <td className="px-6 py-3 capitalize">
                  {team.data.roles.filter((r) => r.user_id === p.id).map((r) => r.role.replace("_", " ")).join(", ")}
                  {p.client_id && ` · ${team.data.clients.find((c) => c.id === p.client_id)?.name ?? ""}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
