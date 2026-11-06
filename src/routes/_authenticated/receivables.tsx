import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ageBucket, inr, outstanding, type AgeBucket } from "@/lib/compliance";
import { PageHeader, Stat, fmtDate } from "@/components/ui-bits";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/receivables")({
  head: () => ({ meta: [{ title: "Receivables — CA FirmHub" },
      { name: "description", content: "Monitor outstanding client balances and ageing." },
      { property: "og:title", content: "Receivables \u2014 CA FirmHub" },
      { property: "og:description", content: "Monitor outstanding client balances and ageing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: Receivables,
});

const BUCKETS: AgeBucket[] = ["0-30", "31-60", "61-90", "90+"];

function Receivables() {
  const me = useMe();
  const { data = [] } = useQuery({
    queryKey: ["invoices", "receivables"],
    enabled: me.isManager,
    queryFn: async () =>
      (await supabase.from("invoices").select("id, invoice_no, invoice_date, total_amount, amount_received, payment_status, clients(name)").neq("payment_status", "Paid")).data ?? [],
  });
  if (!me.isManager) return <p className="text-muted-foreground">Only admins and team leaders can see receivables.</p>;

  const rows = data.map((i) => ({ ...i, due: outstanding({ ...i, total_amount: Number(i.total_amount) }), bucket: ageBucket(i.invoice_date) }));
  const total = (b?: AgeBucket) => rows.filter((r) => !b || r.bucket === b).reduce((s, r) => s + r.due, 0);
  const byClient = Object.values(
    rows.reduce<Record<string, { name: string; amounts: Record<AgeBucket, number> }>>((acc, r) => {
      const name = r.clients?.name ?? "—";
      acc[name] ??= { name, amounts: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 } };
      acc[name].amounts[r.bucket] += r.due;
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Receivables ageing" description="Outstanding fees by how long they have been due." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total outstanding" value={inr(total())} accent />
        {BUCKETS.map((b) => <Stat key={b} label={`${b} days`} value={inr(total(b))} />)}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-3">Client</th>{BUCKETS.map((b) => <th key={b} className="px-4 py-3 text-right">{b}</th>)}<th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {byClient.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No outstanding invoices.</td></tr>}
            {byClient.map((c) => (
              <tr key={c.name} className="border-t">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                {BUCKETS.map((b) => <td key={b} className={`tabular px-4 py-3 text-right ${b === "90+" && c.amounts[b] ? "text-destructive" : ""}`}>{c.amounts[b] ? inr(c.amounts[b]) : "—"}</td>)}
                <td className="tabular px-4 py-3 text-right font-semibold">{inr(Object.values(c.amounts).reduce((a, b) => a + b, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Oldest unpaid: {rows.length ? fmtDate(rows.map((r) => r.invoice_date).sort()[0]) : "—"}</p>
    </div>
  );
}
