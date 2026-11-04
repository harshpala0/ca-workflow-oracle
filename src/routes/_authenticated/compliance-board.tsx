import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, StatusBadge, fmtDate } from "@/components/ui-bits";
import { DUE_EVENTS, fyOf } from "@/lib/compliance";
import { useMe } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/compliance-board")({
  head: () => ({
    meta: [
      { title: "Compliance board — CA FirmHub" },
      { name: "description", content: "Overdue, this-week and this-month filings with prior/current FY split and CBDT/ICAI due-date extensions." },
    ],
  }),
  component: Board,
});

type Row = { id: string; title: string; category: string; due_date: string; status: string; client_id: string | null; clients: { name: string } | null };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => iso(new Date(Date.now() + n * 86400000));

function Board() {
  const me = useMe();
  const qc = useQueryClient();
  const [fy, setFy] = useState(fyOf(iso(new Date())));
  const items = useQuery({
    queryKey: ["compliance_items", "board"],
    queryFn: async () =>
      ((await supabase.from("compliance_items").select("id, title, category, due_date, status, client_id, clients(name)").neq("status", "Filed").order("due_date")).data ?? []) as Row[],
  });
  const today = iso(new Date());
  const all = items.data ?? [];
  const overdue = all.filter((r) => r.due_date < today);
  const week = all.filter((r) => r.due_date >= today && r.due_date <= addDays(7));
  const month = all.filter((r) => r.due_date > addDays(7) && r.due_date <= addDays(30));

  const fyStart = Number(fy.slice(0, 4));
  const prevFy = `${fyStart - 1}-${String(fyStart % 100).padStart(2, "0")}`;
  const inWindow = all.filter((r) => fyOf(r.due_date) === fy);
  const titleFy = (t: string) => t.match(/FY (\d{4}-\d{2})/)?.[1];
  const prior = inWindow.filter((r) => titleFy(r.title) === prevFy);
  const current = inWindow.filter((r) => titleFy(r.title) !== prevFy);

  const file = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compliance_items").update({ status: "Filed", filed_on: today }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked as filed"); qc.invalidateQueries({ queryKey: ["compliance_items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const List = ({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) => (
    <div className="rounded-lg border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="tabular text-sm text-muted-foreground">{rows.length}</span>
      </div>
      <ul className="max-h-96 divide-y overflow-auto">
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">{empty}</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.clients?.name ?? "—"} · {r.category} · {fmtDate(r.due_date)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge value={r.due_date < today ? "Overdue" : r.status} />
              <Button size="sm" variant="outline" onClick={() => file.mutate(r.id)}>Filed</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      <PageHeader title="Compliance board" description="What is overdue, due this week and due this month — across every client." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Overdue" value={overdue.length} accent />
        <Stat label="Due in 7 days" value={week.length} />
        <Stat label="Due in 8–30 days" value={month.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <List title="Overdue" rows={overdue} empty="Nothing overdue" />
        <List title="This week" rows={week} empty="Nothing due this week" />
        <List title="This month" rows={month} empty="Nothing else due this month" />
      </div>

      <div className="mt-10 mb-4 flex flex-wrap items-end gap-3">
        <h2 className="text-xl font-semibold">Year-wise split</h2>
        <div className="ml-auto flex items-end gap-2">
          <Label htmlFor="fy" className="text-sm">Financial year</Label>
          <Input id="fy" className="w-28" value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2026-27" />
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Filings falling due between 1 April {fyStart} and 31 March {fyStart + 1}, split into returns for the earlier year (FY {prevFy}) and this year.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <List title={`Earlier year work (FY ${prevFy})`} rows={prior} empty="None pending" />
        <List title={`Current year (FY ${fy})`} rows={current} empty="None pending" />
      </div>

      <Overrides fy={fy} canEdit={me.isManager} firmId={me.firm_id} />
    </div>
  );
}

function Overrides({ fy, canEdit, firmId }: { fy: string; canEdit: boolean; firmId: string }) {
  const qc = useQueryClient();
  const [key, setKey] = useState(DUE_EVENTS[0]!.key);
  const [date, setDate] = useState("");
  const [source, setSource] = useState("CBDT");
  const [ref, setRef] = useState("");
  const list = useQuery({
    queryKey: ["due_overrides", fy],
    queryFn: async () => (await supabase.from("compliance_due_overrides").select("*").eq("financial_year", fy).order("event_key")).data ?? [],
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Pick the extended date");
      const { error } = await supabase.from("compliance_due_overrides").upsert(
        { firm_id: firmId, financial_year: fy, event_key: key, due_date: date, source, notification_ref: ref || null, updated_at: new Date().toISOString() },
        { onConflict: "firm_id,financial_year,event_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Extension saved — new calendars will use this date"); setDate(""); setRef(""); qc.invalidateQueries({ queryKey: ["due_overrides"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("compliance_due_overrides").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["due_overrides"] }),
  });
  const label = (k: string) => DUE_EVENTS.find((e) => e.key === k)?.label ?? k;

  return (
    <div className="mt-10 rounded-lg border bg-card p-5 shadow-card">
      <h2 className="text-xl font-semibold">Due-date extensions (CBDT / ICAI / MCA) — FY {fy}</h2>
      <p className="mt-1 text-sm text-muted-foreground">When a deadline is extended, record it here. Calendars generated for this year then use the extended date.</p>
      {canEdit && (
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <select className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-2" value={key} onChange={(e) => setKey(e.target.value)}>
            {DUE_EVENTS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
            {["CBDT", "ICAI", "MCA", "CBIC", "Other"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <Input placeholder="Circular / notification no." value={ref} onChange={(e) => setRef(e.target.value)} />
          <Button className="sm:col-span-5 sm:w-fit" onClick={() => save.mutate()} disabled={save.isPending}>Save extension</Button>
        </div>
      )}
      <table className="mt-4 w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Filing</th><th>Extended to</th><th>Source</th><th>Reference</th><th /></tr></thead>
        <tbody className="divide-y">
          {(list.data ?? []).length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No extensions — standard due dates apply.</td></tr>}
          {(list.data ?? []).map((o) => (
            <tr key={o.id}>
              <td className="py-2">{label(o.event_key)}</td><td className="tabular">{fmtDate(o.due_date)}</td><td>{o.source}</td><td>{o.notification_ref ?? "—"}</td>
              <td className="text-right">{canEdit && <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => del.mutate(o.id)}><Trash2 className="h-4 w-4" /></Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
