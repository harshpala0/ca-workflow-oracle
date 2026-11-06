import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { inr } from "@/lib/compliance";
import { PageHeader, StatusBadge, fmtDate } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "My portal — CA FirmHub" },
      { name: "description", content: "Access your client documents, requests and engagement updates." },
      { property: "og:title", content: "My portal \u2014 CA FirmHub" },
      { property: "og:description", content: "Access your client documents, requests and engagement updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: Portal,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card shadow-card">
      <h2 className="border-b px-5 py-4 text-lg font-semibold">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Portal() {
  const me = useMe();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { data } = useQuery({
    queryKey: ["portal", me.client_id],
    queryFn: async () => {
      const [c, r, q, i] = await Promise.all([
        supabase.from("compliance_items").select("id, title, due_date, status").order("due_date").limit(20),
        supabase.from("doc_requests").select("id, title, description, due_date, status").order("created_at", { ascending: false }),
        supabase.from("queries").select("id, query_text, response, status, engagements(title)").order("created_at", { ascending: false }),
        supabase.from("invoices").select("id, invoice_no, invoice_date, total_amount, payment_status").order("invoice_date", { ascending: false }),
      ]);
      return { comp: c.data ?? [], reqs: r.data ?? [], queries: q.data ?? [], invoices: i.data ?? [] };
    },
  });

  const upload = useMutation({
    mutationFn: async ({ requestId, file }: { requestId: string; file: File }) => {
      const path = `${me.firm_id}/${me.client_id}/${requestId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("portal-files").upload(path, file);
      if (up.error) throw up.error;
      const ins = await supabase.from("portal_files").insert({ firm_id: me.firm_id, request_id: requestId, file_path: path, file_name: file.name, uploaded_by: me.id });
      if (ins.error) throw ins.error;
      await supabase.from("doc_requests").update({ status: "Uploaded" }).eq("id", requestId);
    },
    onSuccess: () => { toast.success("Uploaded"); qc.invalidateQueries({ queryKey: ["portal"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const respond = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("queries").update({ response: answers[id] ?? null, status: "Responded", responded_by: me.id, responded_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Response sent"); qc.invalidateQueries({ queryKey: ["portal"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me.client_id) return <p className="text-muted-foreground">This login isn't linked to a client yet. Please contact your CA firm.</p>;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${me.full_name.split(" ")[0]}`} description={`Your account with ${me.firm_name}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Documents requested">
          {data?.reqs.length === 0 && <p className="text-sm text-muted-foreground">No requests right now.</p>}
          <ul className="space-y-3">
            {data?.reqs.map((r) => (
              <li key={r.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <StatusBadge value={r.status} />
                </div>
                {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Needed by {fmtDate(r.due_date)}</span>
                  {r.status !== "Closed" && (
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                      <Upload className="size-3.5" /> Upload
                      <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ requestId: r.id, file: f }); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Questions from your CA">
          {data?.queries.length === 0 && <p className="text-sm text-muted-foreground">No questions.</p>}
          <ul className="space-y-3">
            {data?.queries.map((q) => (
              <li key={q.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{q.query_text}</p>
                  <StatusBadge value={q.status} />
                </div>
                {q.status === "Open" ? (
                  <div className="mt-2 space-y-2">
                    <Textarea placeholder="Your answer" value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                    <Button size="sm" disabled={!answers[q.id]} onClick={() => respond.mutate(q.id)}>Send answer</Button>
                  </div>
                ) : (
                  q.response && <p className="mt-2 border-l-2 border-brass pl-3 text-sm text-muted-foreground">{q.response}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Compliance status">
          <ul className="divide-y">
            {data?.comp.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="tabular w-24 text-muted-foreground">{fmtDate(c.due_date)}</span>
                <span className="flex-1 truncate">{c.title}</span>
                <StatusBadge value={c.status === "Pending" && c.due_date < today ? "Overdue" : c.status} />
              </li>
            ))}
            {data?.comp.length === 0 && <li className="text-sm text-muted-foreground">Nothing scheduled.</li>}
          </ul>
        </Card>
        <Card title="Invoices">
          <ul className="divide-y">
            {data?.invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="tabular">{i.invoice_no}</span>
                <span className="text-muted-foreground">{fmtDate(i.invoice_date)}</span>
                <span className="tabular">{inr(Number(i.total_amount))}</span>
                <StatusBadge value={i.payment_status} />
              </li>
            ))}
            {data?.invoices.length === 0 && <li className="text-sm text-muted-foreground">No invoices.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
