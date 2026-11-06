import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate } from "@/components/ui-bits";

const STATUS = ["Received", "Acknowledged", "Dispatched", "Returned", "Pending"];

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Document register — CA FirmHub" },
      { name: "description", content: "Track inward and outward client documents and processing status." },
      { property: "og:title", content: "Document register \u2014 CA FirmHub" },
      { property: "og:description", content: "Track inward and outward client documents and processing status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: () => (
    <ResourcePage
      table="doc_register"
      title="Document register"
      description="Inward and outward register of physical and digital documents."
      select="*, clients(name)"
      orderBy="doc_date"
      searchKeys={["doc_name", "doc_category", "party", "reference_no", "clients.name"]}
      filters={{ key: "doc_type", options: ["Inward", "Outward"] }}
      fields={[
        { name: "doc_type", label: "Type", type: "select", options: ["Inward", "Outward"], required: true, default: "Inward" },
        { name: "doc_date", label: "Date", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
        { name: "doc_name", label: "Document", required: true, full: true },
        { name: "client_id", label: "Client", type: "ref", ref: { table: "clients", label: "name" } },
        { name: "doc_category", label: "Category", type: "select", options: ["Notice", "Letter", "Financials", "Return", "Certificate", "Agreement", "Other"] },
        { name: "party", label: "Received from / sent to" },
        { name: "reference_no", label: "Reference no." },
        { name: "status", label: "Status", type: "select", options: STATUS, required: true, default: "Received" },
        { name: "remarks", label: "Remarks", type: "textarea" },
      ]}
      columns={[
        { key: "doc_date", label: "Date", render: (r) => fmtDate(r["doc_date"]) },
        { key: "doc_type", label: "Type", status: true },
        { key: "doc_name", label: "Document", render: (r) => <span className="font-medium">{r["doc_name"]}</span> },
        { key: "clients.name", label: "Client" },
        { key: "party", label: "Party" },
        { key: "reference_no", label: "Ref." },
        { key: "status", label: "Status", status: true },
      ]}
    />
  ),
});
