import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Combined reminders feed: compliance due in next 15 days/overdue, open document requests, unpaid invoices. */
export const pulseQuery = (includeFees: boolean) =>
  queryOptions({
    queryKey: ["pulse", includeFees],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const soon = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
      const [comp, reqs, inv, tasks, counts] = await Promise.all([
        supabase.from("compliance_items").select("id, title, due_date, category, clients(name)").eq("status", "Pending").lte("due_date", soon).order("due_date"),
        supabase.from("doc_requests").select("id, title, due_date, status, clients(name)").neq("status", "Closed").order("due_date"),
        includeFees
          ? supabase.from("invoices").select("id, invoice_no, invoice_date, total_amount, amount_received, clients(name)").neq("payment_status", "Paid").order("invoice_date")
          : Promise.resolve({ data: [] as never[] }),
        supabase.from("tasks").select("id, status, due_date"),
        Promise.all([
          supabase.from("clients").select("id", { count: "exact", head: true }),
          supabase.from("engagements").select("id", { count: "exact", head: true }).eq("status", "Active"),
          supabase.from("queries").select("id", { count: "exact", head: true }).eq("status", "Open"),
        ]),
      ]);
      const t = tasks.data ?? [];
      return {
        today,
        compliance: comp.data ?? [],
        overdue: (comp.data ?? []).filter((c) => c.due_date < today),
        requests: reqs.data ?? [],
        invoices: inv.data ?? [],
        openTasks: t.filter((x) => !["Completed", "Approved"].includes(x.status)).length,
        overdueTasks: t.filter((x) => x.due_date && x.due_date < today && !["Completed", "Approved"].includes(x.status)).length,
        clients: counts[0].count ?? 0,
        engagements: counts[1].count ?? 0,
        openQueries: counts[2].count ?? 0,
      };
    },
  });
