import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate, StatusBadge } from "@/components/ui-bits";
import { COMPLIANCE_PACKS, generateCompliance, type CompliancePack } from "@/lib/compliance";
import { useMe } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/compliance")({
  head: () => ({ meta: [{ title: "Statute calendar — CA FirmHub" }] }),
  component: Compliance,
});

const today = () => new Date().toISOString().slice(0, 10);

function Compliance() {
  const me = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [fy, setFy] = useState(2026);
  const [packs, setPacks] = useState<CompliancePack[]>(["GST", "TDS", "Income Tax"]);
  const clients = useQuery({
    queryKey: ["ref", "clients", "name"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  const gen = useMutation({
    mutationFn: async () => {
      const rows = generateCompliance(fy, packs).map((d) => ({ ...d, client_id: clientId, firm_id: me.firm_id }));
      const { error } = await supabase.from("compliance_items").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} due dates added`);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["compliance_items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markFiled = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compliance_items").update({ status: "Filed", filed_on: today() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_items"] }),
  });

  return (
    <>
      <ResourcePage
        table="compliance_items"
        title="Statute calendar"
        description="GST, TDS, Income Tax, Tax Audit and ROC due dates per client."
        select="*, clients(name)"
        orderBy="due_date"
        ascending
        searchKeys={["title", "category", "clients.name"]}
        filters={{ key: "category", options: COMPLIANCE_PACKS }}
        headerExtra={<Button variant="outline" onClick={() => setOpen(true)}><CalendarPlus className="size-4" /> Generate for client</Button>}
        rowActions={(r) => r["status"] === "Pending" ? (
          <Button size="sm" variant="ghost" onClick={() => markFiled.mutate(r["id"])}><Check className="size-4" /> Filed</Button>
        ) : null}
        fields={[
          { name: "title", label: "Compliance", required: true, full: true },
          { name: "client_id", label: "Client", type: "ref", ref: { table: "clients", label: "name" } },
          { name: "category", label: "Category", type: "select", options: COMPLIANCE_PACKS, required: true, default: "GST" },
          { name: "due_date", label: "Due date", type: "date", required: true },
          { name: "financial_year", label: "FY" },
          { name: "status", label: "Status", type: "select", options: ["Pending", "Filed", "Missed"], required: true, default: "Pending" },
          { name: "filed_on", label: "Filed on", type: "date" },
          { name: "remarks", label: "Remarks", type: "textarea" },
        ]}
        columns={[
          { key: "due_date", label: "Due", render: (r) => <span className="tabular">{fmtDate(r["due_date"])}</span> },
          { key: "title", label: "Compliance", render: (r) => <span className="font-medium">{r["title"]}</span> },
          { key: "clients.name", label: "Client" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r["status"] === "Pending" && r["due_date"] < today() ? "Overdue" : r["status"]} /> },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate compliance calendar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Client</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Select client —</option>
                {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block">Financial year starting (April)</Label>
              <Input type="number" value={fy} onChange={(e) => setFy(Number(e.target.value))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Applicable compliances</Label>
              <div className="flex flex-wrap gap-2">
                {COMPLIANCE_PACKS.map((p) => (
                  <button key={p} type="button"
                    onClick={() => setPacks(packs.includes(p) ? packs.filter((x) => x !== p) : [...packs, p])}
                    className={`rounded-full border px-3 py-1 text-sm ${packs.includes(p) ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!clientId || packs.length === 0 || gen.isPending} onClick={() => gen.mutate()}>
              {gen.isPending ? "Generating…" : `Generate ${generateCompliance(fy, packs).length} due dates`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
