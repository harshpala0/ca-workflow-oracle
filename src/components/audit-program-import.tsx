import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ListChecks, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { BASIC_AUDIT_PROGRAMS, PROCEDURE_HEADERS, parseProcedureRows } from "@/lib/audit-programs";
import { programSchema, type Program } from "@/lib/import-rules";
import { readImportFile, downloadImportTemplate } from "@/lib/import-files";
import { applyAuditProgram, saveAuditProgram } from "@/lib/import.functions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";

export function AuditProgramImport({ engagementId }: { engagementId?: string }) {
  const me = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("basic:0");
  const [selectedEngagements, setSelectedEngagements] = useState<string[]>(engagementId ? [engagementId] : []);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [draft, setDraft] = useState<Program>({ name: "", engagement_type: "Statutory Audit", items: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const save = useServerFn(saveAuditProgram);
  const apply = useServerFn(applyAuditProgram);
  const programs = useQuery({ queryKey: ["audit_programs"], enabled: open && me.isStaff, queryFn: async () => {
    const { data, error } = await supabase.from("audit_programs").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map(p => ({ id: p.id, ...programSchema.parse(p) }));
  } });
  const engagements = useQuery({ queryKey: ["engagements", "program-select"], enabled: open && me.isStaff, queryFn: async () => {
    const { data, error } = await supabase.from("engagements").select("id,title,engagement_type,financial_year").order("title");
    if (error) throw error;
    return data ?? [];
  } });
  const program = key === "new" ? draft : key.startsWith("basic:") ? BASIC_AUDIT_PROGRAMS[Number(key.split(":")[1])] : programs.data?.find(p => p.id === key);
  const included = (program?.items ?? []).map((_, i) => i).filter(i => !excluded.includes(i));
  if (!me.isStaff) return null;
  async function submit(applyNow: boolean) {
    if (!program) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const parsed = programSchema.parse(program);
      const id = key === "new" || key.startsWith("basic:") ? (await save({ data: parsed })).id : key;
      setKey(id);
      await qc.invalidateQueries({ queryKey: ["audit_programs"] });
      if (applyNow) {
        setResult(await apply({ data: { program_id: id, engagement_ids: selectedEngagements, item_indexes: included } }));
        await qc.invalidateQueries({ queryKey: ["tasks"] });
      } else toast.success("Program saved");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><ListChecks className="size-4" /> Import audit tasks</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
      <DialogHeader><DialogTitle>Audit programs & procedures</DialogTitle></DialogHeader>
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Label htmlFor="audit-program">Program</Label><select id="audit-program" className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={key} onChange={e => { setKey(e.target.value); setExcluded([]); setResult(null); }}>
        <optgroup label="Basic working-paper procedures">{BASIC_AUDIT_PROGRAMS.map((p, i) => <option key={p.name} value={`basic:${i}`}>{p.name}</option>)}</optgroup>
        <optgroup label="Firm programs">{programs.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup><option value="new">New / import program</option>
      </select></div><Button variant="outline" onClick={() => { setKey("new"); setExcluded([]); setResult(null); }}><Plus className="size-4" /> New program</Button></div>
      {key === "new" && <>
        <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="program-name">Program name</Label><Input id="program-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div><div><Label htmlFor="program-type">Engagement type</Label><Input id="program-type" value={draft.engagement_type} onChange={e => setDraft({ ...draft, engagement_type: e.target.value })} /></div></div>
        <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Label htmlFor="procedure-file">Procedure Excel / CSV</Label><Input id="procedure-file" type="file" accept=".csv,.xlsx" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setError(""); try { const rows = await readImportFile(file); setDraft(parseProcedureRows(rows, draft.name || file.name.replace(/\.[^.]+$/, ""), draft.engagement_type)); } catch (e) { setError((e as Error).message); } }} /></div><Button variant="outline" onClick={() => downloadImportTemplate(PROCEDURE_HEADERS, [], "audit_procedures_template.xlsx").catch(e => toast.error(e.message))}><Download className="size-4" /> Template</Button></div>
      </>}
      {(error || programs.error || engagements.error) && <p role="alert" className="text-sm text-destructive">{error || programs.error?.message || engagements.error?.message}</p>}
      <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
        <fieldset><legend className="mb-2 font-medium text-sm">Engagements ({selectedEngagements.length})</legend><div className="max-h-80 overflow-auto space-y-2">{engagements.data?.filter(e => !engagementId || e.id === engagementId).map(e => <label key={e.id} className="flex items-start gap-2 border-b py-2 text-sm"><input type="checkbox" className="mt-1" checked={selectedEngagements.includes(e.id)} onChange={ev => { setSelectedEngagements(ev.target.checked ? [...selectedEngagements, e.id] : selectedEngagements.filter(id => id !== e.id)); setResult(null); }} /><span className="min-w-0 break-words">{e.title}<span className="block text-xs text-muted-foreground">{e.engagement_type} · {e.financial_year}</span></span></label>)}</div></fieldset>
        <div><div className="mb-2 flex items-center justify-between"><span className="font-medium text-sm">Procedures ({included.length})</span><Button size="sm" variant="ghost" onClick={() => setExcluded(excluded.length ? [] : (program?.items ?? []).map((_, i) => i))}>{excluded.length ? "Select all" : "Clear selection"}</Button></div>
          <div className="max-h-80 overflow-auto border rounded-md"><table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-2" /><th className="p-2">Area / procedure</th><th className="p-2">Reference</th><th className="p-2">Priority</th></tr></thead><tbody>{program?.items.map((item, i) => <tr key={i} className="border-t"><td className="p-2"><input aria-label={`Select procedure ${i + 1}`} type="checkbox" checked={!excluded.includes(i)} onChange={e => { setExcluded(e.target.checked ? excluded.filter(x => x !== i) : [...excluded, i]); setResult(null); }} /></td><td className="p-2"><span className="block text-xs text-muted-foreground">{item.area}</span>{item.title}</td><td className="p-2">{item.reference || "—"}</td><td className="p-2">{item.priority}</td></tr>)}</tbody></table></div>
        </div>
      </div>
      {result && <p role="status" className="border-t pt-3 text-sm">{result["tasks_created"]} tasks created · {result["tasks_skipped"]} existing procedures skipped</p>}
      <DialogFooter>{key === "new" && <Button variant="outline" disabled={busy || !draft.items.length} onClick={() => submit(false)}>Save program</Button>}<Button variant="outline" onClick={() => setOpen(false)}>Close</Button><Button disabled={busy || !included.length || !selectedEngagements.length} onClick={() => submit(true)}><Upload className="size-4" />{busy ? "Importing…" : "Import selected tasks"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}