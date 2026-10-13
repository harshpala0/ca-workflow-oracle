import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/lib/session";
import { pulseQuery } from "@/lib/pulse";
import { inr, outstanding } from "@/lib/compliance";
import { PageHeader, Stat, StatusBadge, fmtDate } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CA FirmHub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const { data } = useQuery({ ...pulseQuery(me.isManager), enabled: me.isStaff });
  if (!me.isStaff) return <Navigate to="/portal" />;
  const due = (data?.invoices ?? []).reduce((s, i) => s + outstanding({ ...i, total_amount: Number(i.total_amount), payment_status: "Unpaid" }), 0);

  return (
    <div className="space-y-8">
      <PageHeader title={`Good day, ${me.full_name.split(" ")[0]}`} description={`${me.firm_name} · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Due in 15 days" value={data?.compliance.length ?? "—"} hint={`${data?.overdue.length ?? 0} overdue`} accent />
        <Stat label="Active clients" value={data?.clients ?? "—"} hint={`${data?.engagements ?? 0} active engagements`} />
        <Stat label="Open tasks" value={data?.openTasks ?? "—"} hint={`${data?.overdueTasks ?? 0} past due date`} />
        {me.isManager ? <Stat label="Fees outstanding" value={inr(due)} hint={`${data?.invoices.length ?? 0} invoices`} /> : <Stat label="Open queries" value={data?.openQueries ?? "—"} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-lg border bg-card shadow-card lg:col-span-3">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-semibold">Upcoming compliance</h2>
            <Link to="/compliance" className="text-sm text-muted-foreground hover:text-foreground">View calendar →</Link>
          </div>
          <ul>
            {data?.compliance.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing due in the next 15 days. Generate a calendar from the statute calendar page.</li>}
            {data?.compliance.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center gap-4 border-t px-5 py-3 first:border-t-0">
                <div className="tabular w-24 text-sm text-muted-foreground">{fmtDate(c.due_date)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.clients?.name}</div>
                </div>
                <StatusBadge value={c.due_date < data.today ? "Overdue" : "Pending"} />
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border bg-card shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-semibold">Client document requests</h2>
            <Link to="/portal-inbox" className="text-sm text-muted-foreground hover:text-foreground">All →</Link>
          </div>
          <ul>
            {data?.requests.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No open requests.</li>}
            {data?.requests.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-t px-5 py-3 first:border-t-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.clients?.name} · due {fmtDate(r.due_date)}</div>
                </div>
                <StatusBadge value={r.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
