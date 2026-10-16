import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useMe } from "@/lib/session";
import { AUDIT_SECTIONS, type AuditField, type AuditSection } from "@/lib/audit-sections";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/audit-papers")({
  head: () => ({ meta: [{ title: "Audit working papers — CA FirmHub" }] }),
  component: AuditPapers,
});

type Table = string[][];
type SectionData = Record<string, string | Table>;
type PaperData = Record<string, SectionData>;
interface ClientInfo {
  client: string; period: string; task: string;
  prepared_name: string; prepared_init: string; reviewed_name: string; reviewed_init: string; approved_name: string; approved_init: string;
}
const emptyInfo: ClientInfo = { client: "", period: "", task: "Statutory Audit", prepared_name: "", prepared_init: "", reviewed_name: "", reviewed_init: "", approved_name: "", approved_init: "" };
const chapters = Array.from(new Set(AUDIT_SECTIONS.map((s) => s.chapter)));
const selectCls = "h-9 w-full rounded-md border border-input bg-card px-2 text-sm";

function AuditPapers() {
  const me = useMe();
  const qc = useQueryClient();
  const [engId, setEngId] = useState("");
  const [secId, setSecId] = useState<string | null>(null);
  const [info, setInfo] = useState<ClientInfo>(emptyInfo);
  const [data, setData] = useState<PaperData>({});
  const [dirty, setDirty] = useState(false);

  const engagements = useQuery({
    queryKey: ["audit-engagements"],
    queryFn: async () => (await supabase.from("engagements").select("id, title, financial_year, period_to, clients(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const eng = engagements.data?.find((e) => e.id === engId);

  const paper = useQuery({
    queryKey: ["audit-paper", engId],
    enabled: !!engId,
    queryFn: async () => (await supabase.from("audit_papers").select("*").eq("engagement_id", engId).maybeSingle()).data,
  });

  useEffect(() => {
    if (!engId || paper.isLoading) return;
    const saved = paper.data;
    setInfo({
      ...emptyInfo,
      client: eng?.clients?.name ?? "",
      period: eng ? `Year ended ${eng.period_to ?? eng.financial_year}` : "",
      ...((saved?.client_info as Partial<ClientInfo>) ?? {}),
    });
    setData((saved?.data as PaperData) ?? {});
    setDirty(false);
    setSecId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engId, paper.data, paper.isLoading]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("audit_papers").upsert(
        { firm_id: me.firm_id, engagement_id: engId, client_info: info as unknown as Json, data: data as unknown as Json, updated_by: me.id, updated_at: new Date().toISOString() },
        { onConflict: "engagement_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Working papers saved"); setDirty(false); qc.invalidateQueries({ queryKey: ["audit-paper", engId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const section = AUDIT_SECTIONS.find((s) => s.id === secId) ?? null;
  const setVal = (sid: string, fid: string, v: string | Table) => { setData((d) => ({ ...d, [sid]: { ...(d[sid] ?? {}), [fid]: v } })); setDirty(true); };
  const progress = useMemo(() => AUDIT_SECTIONS.filter((s) => data[s.id] && Object.keys(data[s.id]!).length > 0).length, [data]);

  return (
    <div>
      <PageHeader
        title="Audit working papers"
        description="Chapter-wise audit file — appointment, planning, execution, reporting and completion — kept per engagement."
        actions={engId && (
          <>
            <Button variant="outline" onClick={() => printBooklet(info, data)}><Printer className="size-4" /> Print booklet</Button>
            <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}><Save className="size-4" /> {save.isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}</Button>
          </>
        )}
      />
      <div className="mb-6 max-w-xl">
        <Label className="mb-1.5 block">Engagement</Label>
        <select className={selectCls} value={engId} onChange={(e) => setEngId(e.target.value)}>
          <option value="">— Choose an engagement —</option>
          {engagements.data?.map((e) => <option key={e.id} value={e.id}>{e.clients?.name} · {e.title} ({e.financial_year})</option>)}
        </select>
        {engagements.data?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Create an engagement first (Engagements page), then open its working papers here.</p>}
      </div>

      {engId && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <nav className="rounded-lg border bg-card p-3 shadow-card lg:max-h-[75vh] lg:overflow-y-auto">
            <button onClick={() => setSecId(null)} className={cn("mb-2 w-full rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted", !secId && "bg-muted")}>
              Overview <span className="float-right text-xs text-muted-foreground">{progress}/{AUDIT_SECTIONS.length}</span>
            </button>
            {chapters.map((ch) => (
              <div key={ch} className="mb-3">
                <div className="px-2 pb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{ch.split(":")[1]?.trim() ?? ch}</div>
                {AUDIT_SECTIONS.filter((s) => s.chapter === ch).map((s) => (
                  <button key={s.id} onClick={() => setSecId(s.id)}
                    className={cn("flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", secId === s.id && "bg-muted font-medium")}>
                    <span className="tabular w-14 shrink-0 text-xs text-muted-foreground">{s.id}</span>
                    <span className="flex-1">{s.title}</span>
                    {data[s.id] && Object.keys(data[s.id]!).length > 0 && <span className="text-success">•</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="min-w-0">
            {!section ? (
              <Overview info={info} setInfo={(i) => { setInfo(i); setDirty(true); }} onOpen={setSecId} />
            ) : (
              <SectionView key={section.id} section={section} info={info} setInfo={(i) => { setInfo(i); setDirty(true); }}
                values={data[section.id] ?? {}} setVal={(fid, v) => setVal(section.id, fid, v)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Overview({ info, setInfo, onOpen }: { info: ClientInfo; setInfo: (i: ClientInfo) => void; onOpen: (id: string) => void }) {
  const f = (k: keyof ClientInfo, label: string) => (
    <div><Label className="mb-1.5 block text-xs">{label}</Label><Input value={info[k]} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} /></div>
  );
  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-lg font-semibold">Client & engagement details</h2>
        <div className="grid gap-4 sm:grid-cols-3">{f("client", "Client")}{f("task", "Engagement")}{f("period", "Period")}</div>
        <h3 className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">Sign-offs</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {f("prepared_name", "Prepared by")}{f("prepared_init", "Initials")}
          {f("reviewed_name", "Reviewed by")}{f("reviewed_init", "Initials")}
          {f("approved_name", "Approved by")}{f("approved_init", "Initials")}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {chapters.map((ch) => {
          const secs = AUDIT_SECTIONS.filter((s) => s.chapter === ch);
          return (
            <button key={ch} onClick={() => onOpen(secs[0]!.id)} className="rounded-lg border bg-card p-5 text-left shadow-card hover:border-primary">
              <div className="text-xs uppercase tracking-wider text-brass">{ch.split(":")[0]}</div>
              <div className="mt-1 text-lg font-semibold">{ch.split(":")[1]?.trim()}</div>
              <div className="mt-2 text-sm text-muted-foreground">{secs.length} sections</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionView({ section, info, setInfo, values, setVal }: {
  section: AuditSection; info: ClientInfo; setInfo: (i: ClientInfo) => void; values: SectionData; setVal: (fid: string, v: string | Table) => void;
}) {
  const idx = AUDIT_SECTIONS.findIndex((s) => s.id === section.id);
  void idx;
  return (
    <section className="rounded-lg border bg-card shadow-card">
      <div className="border-b px-5 py-4">
        <div className="text-xs uppercase tracking-wider text-brass">{section.chapter}</div>
        <h2 className="text-xl font-semibold">{section.id} · {section.title}</h2>
        {section.desc && <p className="text-sm text-muted-foreground">{section.desc}</p>}
      </div>
      <div className="space-y-5 p-5">
        {section.fields.map((f, i) => (
          <FieldView key={i} field={f} section={section} info={info} setInfo={setInfo} values={values} setVal={setVal} />
        ))}
      </div>
    </section>
  );
}

function FieldView({ field, section, info, setInfo, values, setVal }: {
  field: AuditField; section: AuditSection; info: ClientInfo; setInfo: (i: ClientInfo) => void; values: SectionData; setVal: (fid: string, v: string | Table) => void;
}) {
  if (field.type === "header") {
    return (
      <div className="grid gap-3 rounded-md bg-muted/50 p-3 sm:grid-cols-3">
        <div><Label className="text-xs">Section</Label><Input readOnly value={section.id} /></div>
        <div><Label className="text-xs">Client</Label><Input value={info.client} onChange={(e) => setInfo({ ...info, client: e.target.value })} /></div>
        <div><Label className="text-xs">Period</Label><Input value={info.period} onChange={(e) => setInfo({ ...info, period: e.target.value })} /></div>
      </div>
    );
  }
  if (field.type === "table") {
    const rows = (values[field.id] as Table | undefined) ?? field.rows.map((r) => [...r]);
    const update = (r: number, c: number, v: string) => setVal(field.id, rows.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row)));
    const addRow = () => setVal(field.id, [...rows, field.colTypes.map((t) => (t === "yn-inline" ? "yes" : t === "risk" ? "medium" : ""))]);
    const delRow = (r: number) => setVal(field.id, rows.filter((_, ri) => ri !== r));
    return (
      <div className="rounded-md border">
        <h3 className="border-b px-4 py-2.5 text-sm font-semibold">{field.label}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>{field.cols.map((c, i) => <th key={i} className="px-3 py-2" style={{ width: field.colWidths[i] }}>{c}</th>)}<th /></tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-t align-top">
                  {field.cols.map((_, ci) => {
                    const t = field.colTypes[ci]!;
                    const v = row[ci] ?? "";
                    return (
                      <td key={ci} className="px-2 py-1.5">
                        {t === "row-num" ? <span className="tabular text-muted-foreground">{ri + 1}</span>
                          : t === "textarea" ? <Textarea rows={2} value={v} onChange={(e) => update(ri, ci, e.target.value)} />
                          : t === "risk" ? (
                            <select className={cn(selectCls, v === "high" && "text-destructive", v === "low" && "text-success")} value={v} onChange={(e) => update(ri, ci, e.target.value)}>
                              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                            </select>)
                          : t === "yn-inline" ? (
                            <select className={selectCls} value={v} onChange={(e) => update(ri, ci, e.target.value)}>
                              <option value="yes">Yes</option><option value="no">No</option><option value="na">N/A</option>
                            </select>)
                          : t === "select-status" ? (
                            <select className={selectCls} value={v} onChange={(e) => update(ri, ci, e.target.value)}>
                              {["", "Complete", "In Progress", "N/A", "Issue"].map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                            </select>)
                          : <Input type={t === "date" ? "date" : t === "number" ? "number" : "text"} value={v} onChange={(e) => update(ri, ci, e.target.value)} />}
                      </td>
                    );
                  })}
                  <td className="px-1 py-1.5"><button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => delRow(ri)} aria-label="Remove row">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t p-2"><Button size="sm" variant="ghost" onClick={addRow}>+ Add row</Button></div>
      </div>
    );
  }
  const v = (values[field.id] as string | undefined) ?? "";
  return (
    <div>
      <Label className="mb-1.5 block">{field.label}</Label>
      {field.type === "textarea" ? <Textarea rows={4} placeholder={field.placeholder} value={v} onChange={(e) => setVal(field.id, e.target.value)} />
        : field.type === "select" ? (
          <select className={selectCls} value={v} onChange={(e) => setVal(field.id, e.target.value)}>
            <option value="">— Select —</option>{field.options.map((o) => <option key={o}>{o}</option>)}
          </select>)
        : field.type === "yn" ? (
          <div className="flex gap-2">
            {[["yes", "Yes"], ["no", "No"], ["na", "N/A"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setVal(field.id, k!)}
                className={cn("rounded-md border px-4 py-1.5 text-sm", v === k ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{l}</button>
            ))}
          </div>)
        : <Input type={field.type === "date" ? "date" : "text"} placeholder={field.placeholder} value={v} onChange={(e) => setVal(field.id, e.target.value)} />}
    </div>
  );
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const yn = (v: string) => ({ yes: "Yes", no: "No", na: "N/A" })[v] ?? v;

function printBooklet(info: ClientInfo, data: PaperData) {
  let html = `<div class="cover"><h1>Audit Working Papers</h1><h2>${esc(info.client) || "[Client]"}</h2><h3>${esc(info.task)} — ${esc(info.period) || "[Period]"}</h3>
    <table class="sig"><tr><th></th><th>Name</th><th>Initials</th></tr>
    <tr><td>Prepared by</td><td>${esc(info.prepared_name)}</td><td>${esc(info.prepared_init)}</td></tr>
    <tr><td>Reviewed by</td><td>${esc(info.reviewed_name)}</td><td>${esc(info.reviewed_init)}</td></tr>
    <tr><td>Approved by</td><td>${esc(info.approved_name)}</td><td>${esc(info.approved_init)}</td></tr></table></div>`;
  for (const s of AUDIT_SECTIONS) {
    const v = data[s.id] ?? {};
    html += `<div class="sec"><div class="ch">${esc(s.chapter)}</div><h2>${esc(s.id)} · ${esc(s.title)}</h2>`;
    for (const f of s.fields) {
      if (f.type === "header") continue;
      if (f.type === "table") {
        const rows = (v[f.id] as Table | undefined) ?? f.rows;
        html += `<h3>${esc(f.label)}</h3><table><tr>${f.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${rows
          .map((r, ri) => `<tr>${f.cols.map((_, ci) => `<td>${f.colTypes[ci] === "row-num" ? ri + 1 : esc(["yn-inline"].includes(f.colTypes[ci]!) ? yn(r[ci] ?? "") : r[ci])}</td>`).join("")}</tr>`).join("")}</table>`;
      } else {
        const val = (v[f.id] as string | undefined) ?? "";
        html += `<p><b>${esc(f.label)}:</b> ${esc(f.type === "yn" ? yn(val) : val) || "—"}</p>`;
      }
    }
    html += "</div>";
  }
  const w = window.open("", "_blank");
  if (!w) { toast.error("Allow pop-ups to print the booklet"); return; }
  w.document.write(`<!doctype html><title>Audit working papers</title><style>
    body{font-family:Georgia,serif;font-size:11pt;color:#111;margin:24px}
    .cover{text-align:center;padding:80px 0;page-break-after:always}.cover h1{font-size:30pt}
    .sig{margin:40px auto;width:70%}.sec{page-break-before:always}.ch{font-size:9pt;text-transform:uppercase;color:#8a6d2f}
    table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #888;padding:4px 6px;text-align:left;vertical-align:top;font-size:10pt}th{background:#eee}
  </style>${html}<script>window.onload=()=>window.print()</script>`);
  w.document.close();
}
