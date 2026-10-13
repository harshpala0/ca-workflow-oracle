import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useMe } from "@/lib/session";
import { pulseQuery } from "@/lib/pulse";
import { ageBucket, inr, outstanding } from "@/lib/compliance";
import { PageHeader, StatusBadge, fmtDate } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [{ title: "Reminders — CA FirmHub" }] }),
  component: Reminders,
});

function wa(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function Reminders() {
  const me = useMe();
  const { data } = useQuery(pulseQuery(me.isManager));
  const items = [
    ...(data?.compliance ?? []).map((c) => ({
      key: "c" + c.id, kind: "Compliance", title: c.title, who: c.clients?.name ?? "—", date: c.due_date,
      status: c.due_date < (data?.today ?? "") ? "Overdue" : "Pending",
      msg: `Reminder from ${me.firm_name}: ${c.title} is due on ${fmtDate(c.due_date)}. Please share the required details.`,
    })),
    ...(data?.requests ?? []).filter((r) => r.status === "Open").map((r) => ({
      key: "r" + r.id, kind: "Documents", title: r.title, who: r.clients?.name ?? "—", date: r.due_date ?? "",
      status: "Open", msg: `Reminder from ${me.firm_name}: please upload "${r.title}" on your client portal.`,
    })),
    ...(data?.invoices ?? []).map((i) => {
      const due = outstanding({ ...i, total_amount: Number(i.total_amount), payment_status: "Unpaid" });
      return {
        key: "i" + i.id, kind: "Fees", title: `Invoice ${i.invoice_no} · ${inr(due)} · ${ageBucket(i.invoice_date)} days`, who: i.clients?.name ?? "—",
        date: i.invoice_date, status: "Unpaid", msg: `Reminder from ${me.firm_name}: invoice ${i.invoice_no} of ${inr(due)} is pending. Kindly arrange payment.`,
      };
    }),
  ].sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));

  return (
    <div>
      <PageHeader title="Reminders" description="Compliance due soon, pending client documents and unpaid fees — in one list." />
      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th /></tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">All clear.</td></tr>}
            {items.map((i) => (
              <tr key={i.key} className="border-t">
                <td className="tabular px-4 py-3">{fmtDate(i.date)}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.kind}</td>
                <td className="px-4 py-3 font-medium">{i.title}</td>
                <td className="px-4 py-3">{i.who}</td>
                <td className="px-4 py-3"><StatusBadge value={i.status} /></td>
                <td className="px-4 py-3 text-right">
                  <a href={wa(i.msg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-success hover:underline">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
