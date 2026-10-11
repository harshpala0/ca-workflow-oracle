import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate } from "@/components/ui-bits";

const TYPES = ["Statutory Audit", "Tax Audit", "Internal Audit", "GST Audit", "Income Tax Return", "GST Compliance", "ROC Compliance", "Bookkeeping", "Certification", "Advisory"];
const STATUS = ["Active", "On Hold", "Completed", "Closed"];

export const Route = createFileRoute("/_authenticated/engagements")({
  head: () => ({ meta: [{ title: "Engagements — CA FirmHub" }] }),
  component: () => (
    <ResourcePage
      table="engagements"
      title="Engagements"
      description="Assignments per client and financial year."
      select="*, clients(name)"
      searchKeys={["title", "engagement_type", "financial_year", "clients.name"]}
      filters={{ key: "status", options: STATUS }}
      fields={[
        { name: "title", label: "Title", required: true, full: true },
        { name: "client_id", label: "Client", type: "ref", ref: { table: "clients", label: "name" }, required: true },
        { name: "engagement_type", label: "Type", type: "select", options: TYPES, required: true, default: "Statutory Audit" },
        { name: "financial_year", label: "Financial year", required: true, default: "2026-27" },
        { name: "status", label: "Status", type: "select", options: STATUS, required: true, default: "Active" },
        { name: "period_from", label: "Period from", type: "date" },
        { name: "period_to", label: "Period to", type: "date" },
        { name: "due_date", label: "Due date", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "title", label: "Engagement", render: (r) => <span className="font-medium">{r["title"]}</span> },
        { key: "clients.name", label: "Client" },
        { key: "engagement_type", label: "Type" },
        { key: "financial_year", label: "FY" },
        { key: "due_date", label: "Due", render: (r) => fmtDate(r["due_date"]) },
        { key: "status", label: "Status", status: true },
      ]}
    />
  ),
});
