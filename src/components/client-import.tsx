import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { CLIENT_HEADERS, currentImportFY, fySchema, parseClientRows, PACK_CODES } from "@/lib/import-rules";
import { readImportFile, downloadImportTemplate } from "@/lib/import-files";
import { importClients } from "@/lib/import.functions";
import { useMe } from "@/lib/session";

export function ClientImport() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [fy, setFY] = useState(currentImportFY);
  const [defaults, setDefaults] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const run = useServerFn(importClients);
  const qc = useQueryClient();
  let preview: ReturnType<typeof parseClientRows> = [];
  let parseError = "";
  try { if (raw.length) preview = parseClientRows(raw, defaults.join(",")); } catch (e) { parseError = (e as Error).message; }
  const invalid = preview.filter(x => x.error);
  if (!me.isStaff) return null;
  async function submit() {
    setBusy(true); setError("");
    try {
      const rows = preview.flatMap(x => x.value ? [x.value] : []);
      setResult(await run({ data: { financial_year: fySchema.parse(fy), rows } }));
      await qc.invalidateQueries();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Upload className="size-4" /> Bulk import</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>Import clients & engagements</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div><Label htmlFor="import-fy">Financial year</Label><Input id="import-fy" value={fy} onChange={e => { setFY(e.target.value); setResult(null); }} /></div>
          <Button variant="outline" onClick={() => downloadImportTemplate(CLIENT_HEADERS, [], "clients_import_template.xlsx").catch(e => toast.error(e.message))}><Download className="size-4" /> Excel template</Button>
        </div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Default compliance packs</legend><div className="flex flex-wrap gap-3">{PACK_CODES.map(code => <label key={code} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={defaults.includes(code)} onChange={e => { setDefaults(e.target.checked ? [...defaults, code] : defaults.filter(x => x !== code)); setResult(null); }} />{code}</label>)}</div></fieldset>
        <div><Label htmlFor="client-import-file">Excel or CSV file</Label><Input id="client-import-file" type="file" accept=".xlsx,.csv" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]; setRaw([]); setError(""); setResult(null);
          if (!file) return;
          setBusy(true);
          try { const rows = await readImportFile(file); if (rows.length > 1000) throw new Error("Import up to 1,000 rows at a time."); setRaw(rows); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
        }} /></div>
        {(error || parseError) && <p role="alert" className="text-sm text-destructive">{error || parseError}</p>}
        {!!preview.length && <>
          <div className="flex gap-4 text-sm"><span>{preview.length} rows</span><span>{preview.reduce((n, x) => n + (x.value?.engagements.length ?? 0), 0)} engagements</span><span className={invalid.length ? "text-destructive" : "text-muted-foreground"}>{invalid.length} invalid rows</span></div>
          <div className="max-h-72 overflow-auto border rounded-md"><table className="w-full text-sm"><thead className="bg-muted text-left"><tr>{["Row", "Client", "PAN", "Engagements", "Packs / errors"].map(x => <th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{preview.map(x => <tr key={x.row} className="border-t"><td className="p-2">{x.row}</td><td className="p-2">{x.value?.name ?? "—"}</td><td className="p-2">{x.value?.pan}</td><td className="p-2">{x.value?.engagements.map(y => y.label).join(", ")}</td><td className={`p-2 ${x.error ? "text-destructive" : ""}`}>{x.error || x.value?.packs.join(", ")}</td></tr>)}</tbody></table></div>
        </>}
        {result && <div role="status" className="border-t pt-3 text-sm">{result["clients_created"]} clients created · {result["clients_reused"]} reused · {result["engagements_created"]} engagements created · {result["engagements_skipped"]} duplicate engagements skipped · {result["calendar_added"]} calendar items added</div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Close</Button><Button disabled={busy || !preview.length || !!invalid.length || !!parseError || !!result} onClick={submit}><Upload className="size-4" />{busy ? "Importing…" : "Import all"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}