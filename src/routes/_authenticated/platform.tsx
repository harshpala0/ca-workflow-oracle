import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useMe } from "@/lib/session";
import { createFirmWithAdmin, listFirmUsers, platformOverview, setFirmActive } from "@/lib/platform.functions";
import { inr } from "@/lib/compliance";
import { PageHeader, Stat, StatusBadge, fmtDate } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/platform")({
  head: () => ({ meta: [{ title: "Platform control — CA FirmHub" }] }),
  component: Platform,
});

function Platform() {
  const me = useMe();
  const qc = useQueryClient();
  const overviewFn = useServerFn(platformOverview);
  const activeFn = useServerFn(setFirmActive);
  const usersFn = useServerFn(listFirmUsers);
  const createFn = useServerFn(createFirmWithAdmin);
  const [open, setOpen] = useState(false);
  const [viewFirm, setViewFirm] = useState<{ id: string; name: string } | null>(null);
  const [f, setF] = useState({ firm_name: "", full_name: "", email: "", password: "" });

  const q = useQuery({ queryKey: ["platform"], enabled: me.isSuperAdmin, queryFn: () => overviewFn() });
  const users = useQuery({ queryKey: ["platform-users", viewFirm?.id], enabled: !!viewFirm, queryFn: () => usersFn({ data: { firm_id: viewFirm!.id } }) });

  const toggle = useMutation({
    mutationFn: (v: { firm_id: string; active: boolean }) => activeFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: () => createFn({ data: f }),
    onSuccess: () => { toast.success("Firm created"); setOpen(false); setF({ firm_name: "", full_name: "", email: "", password: "" }); qc.invalidateQueries({ queryKey: ["platform"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me.isSuperAdmin) return <p className="text-muted-foreground">This area is for the platform owner only.</p>;
  const t = q.data?.totals;

  return (
    <div>
      <PageHeader title="Platform control" description="All firms on CA FirmHub — onboard a new firm, suspend access, or see who is using it."
        actions={<Button onClick={() => setOpen(true)}>New firm</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Firms" value={t?.firms ?? "—"} accent />
        <Stat label="Active" value={t?.active ?? "—"} />
        <Stat label="Users" value={t?.users ?? "—"} />
        <Stat label="Clients managed" value={t?.clients ?? "—"} />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-3">Firm</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Clients</th><th className="px-4 py-3">Client logins</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3">Status</th><th /></tr>
          </thead>
          <tbody>
            {q.data?.firms.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="px-4 py-3 font-medium">{x.name}</td>
                <td className="tabular px-4 py-3">{fmtDate(x.created_at.slice(0, 10))}</td>
                <td className="px-4 py-3">{x.staff}</td><td className="px-4 py-3">{x.clients}</td><td className="px-4 py-3">{x.client_logins}</td>
                <td className="tabular px-4 py-3 text-right">{inr(x.billed)}</td>
                <td className="px-4 py-3"><StatusBadge value={x.is_active ? "Active" : "Closed"} /></td>
                <td className="space-x-1 px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setViewFirm({ id: x.id, name: x.name })}>Users</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ firm_id: x.id, active: !x.is_active })}>{x.is_active ? "Suspend" : "Reactivate"}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Onboard a new firm</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="mb-1.5 block">Firm name</Label><Input value={f.firm_name} onChange={(e) => setF({ ...f, firm_name: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Admin name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Admin email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Temporary password</Label><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          </div>
          <DialogFooter><Button disabled={create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating…" : "Create firm"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewFirm} onOpenChange={(o) => !o && setViewFirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewFirm?.name} — users</DialogTitle></DialogHeader>
          <ul className="divide-y text-sm">
            {users.data?.map((u) => (
              <li key={u.id} className="flex justify-between py-2"><span>{u.full_name || u.email}<span className="block text-xs text-muted-foreground">{u.email}</span></span><span className="text-xs capitalize text-muted-foreground">{u.roles.join(", ").replace(/_/g, " ")}</span></li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
