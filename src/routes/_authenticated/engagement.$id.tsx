import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { buildBooklet } from "@/lib/booklet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, StatusBadge, fmtDate } from "@/components/ui-bits";
import type { Json } from "@/integrations/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const TASK_STATUS = ["Pending", "In Progress", "Completed", "Under Review", "Approved", "Rejected"];
const sel = "h-9 w-full rounded-md border border-input bg-card px-2 text-sm";

export const Route = createFileRoute("/_authenticated/engagement/$id")({
  head: () => ({ meta: [{ title: "Engagement — CA FirmHub" }, { name: "description", content: "Engagement tasks, day logs and booklet." }] }),
  component: EngagementPage,
});

function EngagementPage() {
  const { id } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const eng = useQuery({
    queryKey: ["engagements", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("engagements").select("*, clients(*)").eq("id", id).single();
      if (error) throw error;
      return data as Row;
    },
  });
  const tasks = useQuery({
    queryKey: ["tasks", "eng", id],
    enabled: me.isStaff,
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*, profiles:assignee_id(full_name)").eq("engagement_id", id).order("created_at");
      return (data ?? []) as Row[];
    },
  });
  const logs = useQuery({
    queryKey: ["time_logs", "eng", id],
    enabled: me.isStaff,
    queryFn: async () => {
      const ids = (tasks.data ?? []).map((t) => t["id"]);
      if (!ids.length) return [] as Row[];
      const { data } = await supabase.from("time_logs").select("*").in("task_id", ids);
      return (data ?? []) as Row[];
    },
  });
  const dayLogs = useQuery({
    queryKey: ["day_logs", id],
    queryFn: async () => {
      const { data } = await supabase.from("day_logs").select("*").eq("engagement_id", id).order("log_date", { ascending: false });
      return (data ?? []) as Row[];
    },
  });
  const staff = useQuery({
    queryKey: ["ref", "profiles", "staff"],
    enabled: me.isStaff,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, client_id").is("client_id", null).order("full_name");
      return (data ?? []) as Row[];
    },
  });

  const hours = new Map<string, number>();
  for (const l of logs.data ?? []) hours.set(l["task_id"], (hours.get(l["task_id"]) ?? 0) + Number(l["hours"]));

  async function download() {
    if (!eng.data) return;
    setBusy(true);
    try {
      const [{ data: qs }] = await Promise.all([supabase.from("queries").select("*").eq("engagement_id", id).order("created_at")]);
      const blob = await buildBooklet({
        firmName: me.firm_name, engagement: eng.data, tasks: tasks.data ?? [], timeLogs: logs.data ?? [],
        queries: (qs ?? []) as Row[], dayLogs: [...(dayLogs.data ?? [])].reverse(),
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${String(eng.data["title"]).replace(/[^\w-]+/g, "_")}_booklet.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (eng.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!eng.data) return <p className="text-muted-foreground">Engagement not found.</p>;
  const e = eng.data;

  return (
    <div className="space-y-8">
      <Link to="/engagements" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All engagements
      </Link>
      <PageHeader
        title={e["title"]}
        description={`${e["clients"]?.["name"] ?? ""} · ${e["engagement_type"]} · FY ${e["financial_year"]} · Due ${fmtDate(e["due_date"])}`}
        actions={me.isStaff && (
          <Button onClick={download} disabled={busy}>
            <FileDown className="size-4" /> {busy ? "Preparing…" : "Word booklet"}
          </Button>
        )}
      />

      {me.isStaff && (
        <TasksSection engagementId={id} tasks={tasks.data ?? []} hours={hours} staff={staff.data ?? []}
          onChange={() => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["time_logs"] }); }} />
      )}

      <DayLogsSection engagementId={id} logs={dayLogs.data ?? []} onChange={() => qc.invalidateQueries({ queryKey: ["day_logs", id] })} />
    </div>
  );
}

function TasksSection({ engagementId, tasks, hours, staff, onChange }: {
  engagementId: string; tasks: Row[]; hours: Map<string, number>; staff: Row[]; onChange: () => void;
}) {
  const me = useMe();
  const blank = { title: "", area: "", assignee_id: "", due_date: "", estimated_hours: "", priority: "Medium" };
  const [f, setF] = useState<Row>(blank);
  const [logFor, setLogFor] = useState<Row | null>(null);
  const [hrs, setHrs] = useState({ hours: "", note: "", log_date: new Date().toISOString().slice(0, 10) });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        firm_id: me.firm_id, engagement_id: engagementId, title: f["title"], area: f["area"] || null,
        assignee_id: f["assignee_id"] || null, due_date: f["due_date"] || null, priority: f["priority"],
        estimated_hours: f["estimated_hours"] ? Number(f["estimated_hours"]) : null, created_by: me.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Task added"); setF(blank); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: onChange,
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onChange,
    onError: (e: Error) => toast.error(e.message),
  });
  const logTime = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_logs").insert({
        firm_id: me.firm_id, task_id: logFor!["id"], user_id: me.id, hours: Number(hrs.hours), note: hrs.note || null, log_date: hrs.log_date,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Hours logged"); setLogFor(null); setHrs({ ...hrs, hours: "", note: "" }); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <h2 className="mb-3 font-display text-xl">Tasks</h2>
      <form
        className="mb-4 grid gap-2 rounded-lg border bg-card p-3 shadow-card sm:grid-cols-6"
        onSubmit={(ev) => { ev.preventDefault(); add.mutate(); }}
      >
        <Input className="sm:col-span-2" placeholder="New task, e.g. Vouch cash payments" required value={f["title"]} onChange={(ev) => setF({ ...f, title: ev.target.value })} />
        <Input placeholder="Area (e.g. Cash & Bank)" value={f["area"]} onChange={(ev) => setF({ ...f, area: ev.target.value })} />
        <select className={sel} value={f["assignee_id"]} onChange={(ev) => setF({ ...f, assignee_id: ev.target.value })}>
          <option value="">Assign to…</option>
          {staff.map((s) => <option key={s["id"]} value={s["id"]}>{s["full_name"]}</option>)}
        </select>
        <Input type="date" value={f["due_date"]} onChange={(ev) => setF({ ...f, due_date: ev.target.value })} />
        <Button type="submit" disabled={add.isPending}><Plus className="size-4" /> Add task</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Task</th><th className="px-3 py-2">Area</th><th className="px-3 py-2">Assignee</th><th className="px-3 py-2">Due</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2">Status</th><th /></tr>
          </thead>
          <tbody>
            {tasks.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No tasks for this engagement yet.</td></tr>}
            {tasks.map((t) => (
              <tr key={t["id"]} className="border-t">
                <td className="px-3 py-2 font-medium">{t["title"]}</td>
                <td className="px-3 py-2">{t["area"] ?? "—"}</td>
                <td className="px-3 py-2">{t["profiles"]?.["full_name"] ?? "—"}</td>
                <td className="px-3 py-2">{fmtDate(t["due_date"])}</td>
                <td className="px-3 py-2 text-right tabular">{hours.get(t["id"]) ?? 0}{t["estimated_hours"] ? ` / ${t["estimated_hours"]}` : ""}</td>
                <td className="px-3 py-2">
                  <select className={sel} value={t["status"]} onChange={(ev) => setStatus.mutate({ id: t["id"], status: ev.target.value })}>
                    {TASK_STATUS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setLogFor(t)}><Clock className="size-4" /> Log hours</Button>
                  <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => confirm("Delete this task?") && del.mutate(t["id"])}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!logFor} onOpenChange={(o) => !o && setLogFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log hours — {logFor?.["title"]}</DialogTitle></DialogHeader>
          <form className="grid gap-3" onSubmit={(ev) => { ev.preventDefault(); logTime.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Date</Label><Input type="date" required value={hrs.log_date} onChange={(ev) => setHrs({ ...hrs, log_date: ev.target.value })} /></div>
              <div><Label className="mb-1.5 block">Hours</Label><Input type="number" step="0.25" min="0.25" required value={hrs.hours} onChange={(ev) => setHrs({ ...hrs, hours: ev.target.value })} /></div>
            </div>
            <div><Label className="mb-1.5 block">What was done</Label><Textarea value={hrs.note} onChange={(ev) => setHrs({ ...hrs, note: ev.target.value })} /></div>
            <DialogFooter><Button type="submit" disabled={logTime.isPending}>Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type Col = { key: string; label: string; options?: string[] };
const WORK: Col[] = [{ key: "area", label: "Area" }, { key: "summary", label: "Work done" }, { key: "staff", label: "Staff" }];
const SAMPLING: Col[] = [{ key: "area", label: "Area" }, { key: "population", label: "Population" }, { key: "sample", label: "Sample" }, { key: "materiality", label: "% Materiality" }, { key: "filter", label: "Filter" }];
const OBS: Col[] = [{ key: "party", label: "Party/Ledger" }, { key: "ref_no", label: "Ref" }, { key: "amount", label: "Amount" }, { key: "observation", label: "Observation" }, { key: "response", label: "Mgmt response" }, { key: "status", label: "Status", options: ["Open", "Resolved", "Closed"] }];
const PEND: Col[] = [{ key: "doc", label: "Document requested" }, { key: "responsible", label: "Responsible" }, { key: "status", label: "Status", options: ["Pending", "Received", "Partial"] }];

function RowsEditor({ title, cols, rows, onChange, readOnly }: { title: string; cols: Col[]; rows: Row[]; onChange: (r: Row[]) => void; readOnly?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label>{title}</Label>
        {!readOnly && <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...rows, Object.fromEntries(cols.map((c) => [c.key, c.options?.[0] ?? ""]))])}><Plus className="size-4" /> Row</Button>}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr>{cols.map((c) => <th key={c.key} className="px-2 py-1.5 font-medium">{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={99} className="px-2 py-3 text-center text-xs text-muted-foreground">No rows</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {cols.map((c) => (
                  <td key={c.key} className="p-1">
                    {readOnly ? <span className="px-1">{r[c.key] || "—"}</span> : c.options ? (
                      <select className={sel} value={r[c.key] ?? ""} onChange={(ev) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.key]: ev.target.value } : x)))}>
                        {c.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <Input value={r[c.key] ?? ""} onChange={(ev) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.key]: ev.target.value } : x)))} />
                    )}
                  </td>
                ))}
                {!readOnly && <td className="p-1"><Button type="button" size="icon" variant="ghost" aria-label="Remove row" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DayLogsSection({ engagementId, logs, onChange }: { engagementId: string; logs: Row[]; onChange: () => void }) {
  const me = useMe();
  const [edit, setEdit] = useState<Row | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const readOnly = !me.isStaff || !!edit?.["is_confirmed"];

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        firm_id: me.firm_id, engagement_id: engagementId, log_date: edit!["log_date"], auditor_name: edit!["auditor_name"],
        work: edit!["work"] as Json, sampling: edit!["sampling"] as Json, observations: edit!["observations"] as Json,
        pending_docs: edit!["pending_docs"] as Json, next_plan: edit!["next_plan"] || null,
      };
      const { error } = edit!["id"]
        ? await supabase.from("day_logs").update(payload).eq("id", edit!["id"])
        : await supabase.from("day_logs").insert({ ...payload, created_by: me.id });
      if (error) throw new Error(error.code === "23505" ? "A day log already exists for this date — open it instead." : error.message);
    },
    onSuccess: () => { toast.success("Day log saved"); setEdit(null); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const confirmLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("day_logs").update({ is_confirmed: true, confirmed_by: me.full_name, confirmed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Confirmed and locked"); setEdit(null); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Daily record</h2>
          <p className="text-sm text-muted-foreground">One log per audit day: work done, sampling, observations, pending documents. Once confirmed it is locked.</p>
        </div>
        {me.isStaff && (
          <Button onClick={() => setEdit({ log_date: today, auditor_name: me.full_name, work: [], sampling: [], observations: [], pending_docs: [], next_plan: "" })}>
            <Plus className="size-4" /> Today's log
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {logs.length === 0 && <p className="text-sm text-muted-foreground">No day logs yet.</p>}
        {logs.map((l) => (
          <button key={l["id"]} type="button" onClick={() => setEdit(l)} className="rounded-lg border bg-card p-3 text-left shadow-card hover:bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-medium">{fmtDate(l["log_date"])}</span>
              <StatusBadge value={l["is_confirmed"] ? "Confirmed" : "Pending"} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {l["auditor_name"] ?? "—"} · {(l["work"] ?? []).length} areas · {(l["observations"] ?? []).length} observations
              {l["confirmed_by"] ? ` · confirmed by ${l["confirmed_by"]}` : ""}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Day log {edit?.["log_date"] ? `— ${fmtDate(edit["log_date"])}` : ""}</DialogTitle></DialogHeader>
          {edit && (
            <form className="grid gap-4" onSubmit={(ev) => { ev.preventDefault(); save.mutate(); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="mb-1.5 block">Auditor</Label><Input disabled={readOnly} value={edit["auditor_name"] ?? ""} onChange={(ev) => setEdit({ ...edit, auditor_name: ev.target.value })} /></div>
                <div><Label className="mb-1.5 block">Date</Label><Input type="date" disabled={readOnly || !!edit["id"]} required value={edit["log_date"]} onChange={(ev) => setEdit({ ...edit, log_date: ev.target.value })} /></div>
              </div>
              <RowsEditor title="Work done" cols={WORK} rows={edit["work"]} readOnly={readOnly} onChange={(r) => setEdit({ ...edit, work: r })} />
              <RowsEditor title="Sampling" cols={SAMPLING} rows={edit["sampling"]} readOnly={readOnly} onChange={(r) => setEdit({ ...edit, sampling: r })} />
              <RowsEditor title="Observations & queries" cols={OBS} rows={edit["observations"]} readOnly={readOnly} onChange={(r) => setEdit({ ...edit, observations: r })} />
              <RowsEditor title="Documents pending from client" cols={PEND} rows={edit["pending_docs"]} readOnly={readOnly} onChange={(r) => setEdit({ ...edit, pending_docs: r })} />
              <div><Label className="mb-1.5 block">Next day plan</Label><Textarea disabled={readOnly} value={edit["next_plan"] ?? ""} onChange={(ev) => setEdit({ ...edit, next_plan: ev.target.value })} /></div>
              <DialogFooter>
                {edit["id"] && !edit["is_confirmed"] && (
                  <Button type="button" variant="outline" onClick={() => confirm("Confirm this day log? It will be locked.") && confirmLog.mutate(edit["id"])}>
                    <CheckCircle2 className="size-4" /> Confirm & lock
                  </Button>
                )}
                {!readOnly && <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
