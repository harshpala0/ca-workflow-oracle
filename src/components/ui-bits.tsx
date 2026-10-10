import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string | undefined; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

const tone: Record<string, string> = {
  good: "bg-success/12 text-success border-success/30",
  warn: "bg-warning/20 text-warning-foreground border-warning/40",
  bad: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-primary/8 text-primary border-primary/20",
  muted: "bg-muted text-muted-foreground border-border",
};

const map: Record<string, keyof typeof tone> = {
  Active: "info", Completed: "good", Approved: "good", Paid: "good", Filed: "good", Closed: "muted",
  Responded: "info", Uploaded: "info", Acknowledged: "info", Dispatched: "info",
  Pending: "warn", Open: "warn", "In Progress": "info", "Under Review": "warn", Partial: "warn", Received: "muted",
  Unpaid: "bad", Missed: "bad", Rejected: "bad", Overdue: "bad", Returned: "muted", Inward: "info", Outward: "muted",
  High: "bad", Medium: "warn", Low: "muted",
};

export function StatusBadge({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", tone[map[value] ?? "muted"])}>
      {value}
    </span>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-5 shadow-card", accent ? "bg-ink text-primary-foreground border-transparent" : "bg-card")}>
      <div className={cn("text-xs uppercase tracking-wider", accent ? "text-brass" : "text-muted-foreground")}>{label}</div>
      <div className="tabular mt-2 text-3xl font-semibold">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", accent ? "text-primary-foreground/70" : "text-muted-foreground")}>{hint}</div>}
    </div>
  );
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
