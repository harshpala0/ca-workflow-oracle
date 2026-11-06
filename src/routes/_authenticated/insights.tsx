import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { inr } from "@/lib/compliance";
import { PageHeader, Stat } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "Insight reports — CA FirmHub" },
      { name: "description", content: "Review practice reports and operational trends across firm work." },
      { property: "og:title", content: "Insight reports \u2014 CA FirmHub" },
      { property: "og:description", content: "Review practice reports and operational trends across firm work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: Insights,
});

function Bars({ rows }: { rows: { label: string; value: number; text?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.length === 0 && <li className="text-sm text-muted-foreground">No data yet.</li>}
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="mb-1 flex justify-between"><span>{r.label}</span><span className="tabular text-muted-foreground">{r.text ?? r.value}</span></div>
          <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Insights() {
  const me = useMe();
  const { data } = useQuery({
    queryKey: ["insights"],
    enabled: me.isManager,
    queryFn: async () => {
      const [inv, eng, comp, tasks, logs, prof] = await Promise.all([
        supabase.from("invoices").select("invoice_date, total_amount, amount_received, clients(name)"),
        supabase.from("engagements").select("engagement_type, status"),
        supabase.from("compliance_items").select("category, status, due_date"),
        supabase.from("tasks").select("status"),
        supabase.from("time_logs").select("user_id, hours"),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      return { inv: inv.data ?? [], eng: eng.data ?? [], comp: comp.data ?? [], tasks: tasks.data ?? [], logs: logs.data ?? [], prof: prof.data ?? [] };
    },
  });
  if (!me.isManager) return <p className="text-muted-foreground">Reports are available to admins and team leaders.</p>;
  if (!data) return <PageHeader title="Insight reports" />;

  const today = new Date().toISOString().slice(0, 10);
  const billed = data.inv.reduce((a, i) => a + Number(i.total_amount ?? 0), 0);
  const received = data.inv.reduce((a, i) => a + Number(i.amount_received ?? 0), 0);
  const tally = (rows: string[]) => Object.entries(rows.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})).map(([label, value]) => ({ label, value }));
  const byMonth = Object.entries(data.inv.reduce<Record<string, number>>((m, i) => { const k = i.invoice_date.slice(0, 7); m[k] = (m[k] ?? 0) + Number(i.total_amount ?? 0); return m; }, {}))
    .sort().slice(-6).map(([label, value]) => ({ label, value, text: inr(value) }));
  const byClient = Object.entries(data.inv.reduce<Record<string, number>>((m, i) => { const k = i.clients?.name ?? "—"; m[k] = (m[k] ?? 0) + Number(i.total_amount ?? 0); return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value, text: inr(value) }));
  const hours = Object.entries(data.logs.reduce<Record<string, number>>((m, l) => { m[l.user_id] = (m[l.user_id] ?? 0) + Number(l.hours); return m; }, {}))
    .map(([id, value]) => ({ label: data.prof.find((p) => p.id === id)?.full_name || data.prof.find((p) => p.id === id)?.email || "Staff", value, text: `${value.toFixed(1)} h` }));
  const filed = data.comp.filter((c) => c.status === "Filed").length;
  const overdue = data.comp.filter((c) => c.status === "Pending" && c.due_date < today).length;

  const card = "rounded-lg border bg-card p-5 shadow-card";
  return (
    <div>
      <PageHeader title="Insight reports" description="A practice overview — fees, compliance, workload and staff hours." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Fees billed" value={inr(billed)} accent />
        <Stat label="Collected" value={inr(received)} hint={billed ? `${Math.round((received / billed) * 100)}% of billed` : "—"} />
        <Stat label="Compliance filed" value={`${filed}/${data.comp.length}`} />
        <Stat label="Overdue filings" value={overdue} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}><h2 className="mb-4 text-lg font-semibold">Billing by month</h2><Bars rows={byMonth} /></section>
        <section className={card}><h2 className="mb-4 text-lg font-semibold">Top clients by fees</h2><Bars rows={byClient} /></section>
        <section className={card}><h2 className="mb-4 text-lg font-semibold">Engagements by type</h2><Bars rows={tally(data.eng.map((e) => e.engagement_type))} /></section>
        <section className={card}><h2 className="mb-4 text-lg font-semibold">Tasks by status</h2><Bars rows={tally(data.tasks.map((t) => t.status))} /></section>
        <section className={card}><h2 className="mb-4 text-lg font-semibold">Compliance by category</h2><Bars rows={tally(data.comp.map((c) => c.category))} /></section>
        <section className={card}><h2 className="mb-4 text-lg font-semibold">Hours logged by staff</h2><Bars rows={hours} /></section>
      </div>
    </div>
  );
}
