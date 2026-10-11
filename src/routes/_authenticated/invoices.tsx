import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate } from "@/components/ui-bits";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — CA FirmHub" }] }),
  component: Invoices,
});

function Invoices() {
  const me = useMe();
  if (!me.isManager) return <p className="text-muted-foreground">Only admins and team leaders can see billing.</p>;
  return (
    <ResourcePage
      table="invoices"
      title="Invoices"
      description="Fee invoices with GST. Totals are calculated automatically."
      select="*, clients(name)"
      orderBy="invoice_date"
      searchKeys={["invoice_no", "description", "clients.name"]}
      filters={{ key: "payment_status", options: ["Unpaid", "Partial", "Paid"] }}
      fields={[
        { name: "invoice_no", label: "Invoice no.", required: true },
        { name: "invoice_date", label: "Invoice date", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
        { name: "client_id", label: "Client", type: "ref", ref: { table: "clients", label: "name" }, required: true },
        { name: "engagement_id", label: "Engagement", type: "ref", ref: { table: "engagements", label: "title" } },
        { name: "amount", label: "Professional fee (₹, before GST)", type: "number", required: true },
        { name: "gst_percent", label: "GST %", type: "number", required: true, default: 18 },
        { name: "payment_status", label: "Payment status", type: "select", options: ["Unpaid", "Partial", "Paid"], required: true, default: "Unpaid" },
        { name: "amount_received", label: "Amount received (₹)", type: "number", default: 0 },
        { name: "payment_date", label: "Payment date", type: "date" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "invoice_no", label: "No.", render: (r) => <span className="tabular font-medium">{r["invoice_no"]}</span> },
        { key: "invoice_date", label: "Date", render: (r) => fmtDate(r["invoice_date"]) },
        { key: "clients.name", label: "Client" },
        { key: "amount", label: "Fee", money: true },
        { key: "gst_amount", label: "GST", money: true },
        { key: "total_amount", label: "Total", money: true },
        { key: "amount_received", label: "Received", money: true },
        { key: "payment_status", label: "Status", status: true },
      ]}
    />
  );
}
