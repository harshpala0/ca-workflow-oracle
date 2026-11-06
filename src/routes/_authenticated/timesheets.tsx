import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate } from "@/components/ui-bits";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/timesheets")({
  head: () => ({ meta: [{ title: "Timesheets — CA FirmHub" },
      { name: "description", content: "Record and review staff time logged against firm work." },
      { property: "og:title", content: "Timesheets \u2014 CA FirmHub" },
      { property: "og:description", content: "Record and review staff time logged against firm work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: Timesheets,
});

function Timesheets() {
  const me = useMe();
  return (
    <ResourcePage
      table="time_logs"
      title="Timesheets"
      description="Hours logged against tasks."
      select="*, tasks(title), profiles:user_id(full_name)"
      orderBy="log_date"
      searchKeys={["note", "tasks.title", "profiles.full_name"]}
      transform={(v) => ({ ...v, user_id: me.id })}
      fields={[
        { name: "log_date", label: "Date", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
        { name: "hours", label: "Hours", type: "number", required: true },
        { name: "task_id", label: "Task", type: "ref", ref: { table: "tasks", label: "title" }, full: true },
        { name: "note", label: "Note", type: "textarea" },
      ]}
      columns={[
        { key: "log_date", label: "Date", render: (r) => fmtDate(r["log_date"]) },
        { key: "profiles.full_name", label: "Staff" },
        { key: "tasks.title", label: "Task" },
        { key: "hours", label: "Hours", align: "right" },
        { key: "note", label: "Note" },
      ]}
    />
  );
}
