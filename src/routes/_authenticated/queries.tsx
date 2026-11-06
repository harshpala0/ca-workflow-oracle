import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/queries")({
  head: () => ({ meta: [{ title: "Query register — CA FirmHub" },
      { name: "description", content: "Manage engagement queries and client responses." },
      { property: "og:title", content: "Query register \u2014 CA FirmHub" },
      { property: "og:description", content: "Manage engagement queries and client responses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: () => (
    <ResourcePage
      table="queries"
      title="Query register"
      description="Queries raised to clients. Clients answer them from their portal."
      select="*, engagements(title, clients(name))"
      searchKeys={["query_text", "response", "engagements.clients.name"]}
      filters={{ key: "status", options: ["Open", "Responded", "Closed"] }}
      fields={[
        { name: "engagement_id", label: "Engagement", type: "ref", ref: { table: "engagements", label: "title" }, required: true, full: true },
        { name: "query_text", label: "Query", type: "textarea", required: true },
        { name: "response", label: "Response", type: "textarea" },
        { name: "status", label: "Status", type: "select", options: ["Open", "Responded", "Closed"], required: true, default: "Open" },
      ]}
      columns={[
        { key: "engagements.clients.name", label: "Client" },
        { key: "query_text", label: "Query", render: (r) => <span className="line-clamp-2 max-w-md">{r["query_text"]}</span> },
        { key: "response", label: "Response", render: (r) => <span className="line-clamp-2 max-w-sm text-muted-foreground">{r["response"] ?? "—"}</span> },
        { key: "created_at", label: "Raised", render: (r) => fmtDate(r["created_at"]) },
        { key: "status", label: "Status", status: true },
      ]}
    />
  ),
});
