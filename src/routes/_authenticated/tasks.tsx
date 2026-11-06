import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate } from "@/components/ui-bits";

const STATUS = ["Pending", "In Progress", "Completed", "Under Review", "Approved", "Rejected"];

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — CA FirmHub" },
      { name: "description", content: "Assign and track firm tasks, ownership, due dates and status." },
      { property: "og:title", content: "Tasks \u2014 CA FirmHub" },
      { property: "og:description", content: "Assign and track firm tasks, ownership, due dates and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: () => (
    <ResourcePage
      table="tasks"
      title="Tasks"
      description="Work items, assignees and review status."
      select="*, engagements(title, clients(name)), profiles:assignee_id(full_name)"
      searchKeys={["title", "area", "engagements.title", "engagements.clients.name"]}
      filters={{ key: "status", options: STATUS }}
      fields={[
        { name: "title", label: "Task", required: true, full: true },
        { name: "engagement_id", label: "Engagement", type: "ref", ref: { table: "engagements", label: "title" } },
        { name: "assignee_id", label: "Assignee", type: "ref", ref: { table: "profiles", label: "full_name" } },
        { name: "status", label: "Status", type: "select", options: STATUS, required: true, default: "Pending" },
        { name: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"], required: true, default: "Medium" },
        { name: "due_date", label: "Due date", type: "date" },
        { name: "estimated_hours", label: "Estimated hours", type: "number" },
        { name: "area", label: "Area" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "title", label: "Task", render: (r) => <span className="font-medium">{r["title"]}</span> },
        { key: "engagements.clients.name", label: "Client" },
        { key: "engagements.title", label: "Engagement" },
        { key: "profiles.full_name", label: "Assignee" },
        { key: "priority", label: "Priority", status: true },
        { key: "due_date", label: "Due", render: (r) => fmtDate(r["due_date"]) },
        { key: "status", label: "Status", status: true },
      ]}
    />
  ),
});
