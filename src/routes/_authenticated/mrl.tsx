import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Printer } from "lucide-react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-bits";
import { statutoryLetter, taxAuditLetter, type MrlData } from "@/lib/mrl-letters";
import { useMe } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/mrl")({
  head: () => ({
    meta: [
      { title: "Representation letters — CA FirmHub" },
      { name: "description", content: "Draft management representation letters for tax audit (Form 3CD) and statutory audit (SA 580, CARO, IFC)." },
      { property: "og:title", content: "Representation letters \u2014 CA FirmHub" },
      { property: "og:description", content: "Draft management representation letters for tax audit (Form 3CD) and statutory audit (SA 580, CARO, IFC)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mrl,
});

type Kind = "tax" | "statutory";
const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

const FIELDS: { key: keyof MrlData; label: string; kinds: Kind[]; yesNo?: boolean; options?: string[] }[] = [
  { key: "clientName", label: "Client name", kinds: ["tax", "statutory"] },
  { key: "yearEnd", label: "Year ended", kinds: ["tax", "statutory"] },
  { key: "letterDate", label: "Letter date", kinds: ["tax", "statutory"] },
  { key: "auditorName", label: "Auditor / firm name", kinds: ["tax", "statutory"] },
  { key: "auditorAddress", label: "Auditor address", kinds: ["tax", "statutory"] },
  { key: "signatoryName", label: "Signatory name", kinds: ["tax", "statutory"] },
  { key: "signatoryDesignation", label: "Signatory designation", kinds: ["tax", "statutory"] },
  { key: "engagementDate", label: "Engagement letter date", kinds: ["statutory"] },
  { key: "hasBranches", label: "Has branches?", kinds: ["statutory"], yesNo: true },
  { key: "cashBalance", label: "Cash balance at year end (Rs.)", kinds: ["statutory"] },
  { key: "includeIFC", label: "Include internal financial controls clauses?", kinds: ["statutory"], yesNo: true },
  { key: "panName", label: "Name as per PAN", kinds: ["tax"] },
  { key: "pan", label: "PAN", kinds: ["tax"] },
  { key: "gstin", label: "GSTIN", kinds: ["tax"] },
  { key: "businessAddress", label: "Principal place of business", kinds: ["tax"] },
  { key: "natureOfBusiness", label: "Nature of business", kinds: ["tax"] },
  { key: "accountingMethod", label: "Method of accounting", kinds: ["tax"], options: ["mercantile", "cash"] },
  { key: "changeInAccounting", label: "Change in accounting method?", kinds: ["tax"], yesNo: true },
  { key: "indirectTax", label: "Liable to indirect taxes?", kinds: ["tax"], yesNo: true },
  { key: "opted115", label: "Opted for 115BA/BAA/BAB/BAC/BAD?", kinds: ["tax"], yesNo: true },
  { key: "booksList", label: "Books maintained", kinds: ["tax"] },
  { key: "partners", label: "Partners / members & profit-sharing ratio", kinds: ["tax"] },
];

function Mrl() {
  const me = useMe();
  const [kind, setKind] = useState<Kind>("tax");
  const [d, setD] = useState<MrlData>({
    clientName: "", yearEnd: "31 March 2026", letterDate: today, auditorName: me.firm_name, auditorAddress: "",
    signatoryName: "", signatoryDesignation: "Partner / Director", engagementDate: "", hasBranches: "No", cashBalance: "",
    includeIFC: "Yes", panName: "", pan: "", gstin: "", businessAddress: "", natureOfBusiness: "", accountingMethod: "mercantile",
    changeInAccounting: "No", indirectTax: "Yes", opted115: "No", booksList: "Cash book, Bank book, Journal, Ledger, Sales & Purchase registers", partners: "",
  });
  const clients = useQuery({
    queryKey: ["ref", "clients", "mrl"],
    queryFn: async () => (await supabase.from("clients").select("*").order("name")).data ?? [],
  });
  const pick = (id: string) => {
    const c = (clients.data ?? []).find((x) => x.id === id) as Record<string, unknown> | undefined;
    if (!c) return;
    const s = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");
    setD((p) => ({ ...p, clientName: s("name"), panName: s("name"), pan: s("pan"), gstin: s("gstin"), businessAddress: s("address") }));
  };
  const text = useMemo(() => {
    const filled = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v || "________"])) as unknown as MrlData;
    filled.auditorAddress = d.auditorAddress; filled.businessAddress = d.businessAddress; filled.cashBalance = d.cashBalance;
    return kind === "tax" ? taxAuditLetter(filled) : statutoryLetter(filled);
  }, [d, kind]);

  const fileName = `MRL-${kind === "tax" ? "TaxAudit" : "Statutory"}-${(d.clientName || "client").replace(/\W+/g, "_")}`;
  const downloadWord = async () => {
    const doc = new Document({ sections: [{ children: text.split("\n").map((l) => new Paragraph({ children: [new TextRun({ text: l, font: "Times New Roman", size: 22 })], spacing: { after: 80 } })) }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${fileName}.docx`; a.click(); URL.revokeObjectURL(a.href);
  };
  const print = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const pre = w.document.createElement("pre");
    pre.style.cssText = "white-space:pre-wrap;font:12pt 'Times New Roman',serif;margin:2cm";
    pre.textContent = text; w.document.title = fileName; w.document.body.appendChild(pre); w.print();
  };

  return (
    <div>
      <PageHeader
        title="Representation letters"
        description="Management representation letters for tax audit (Form 3CD) and statutory audit (SA 580). Fill the details, then review blanks before use."
        actions={<>
          <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(text); toast.success("Copied"); }}><Copy className="mr-1 h-4 w-4" />Copy</Button>
          <Button variant="outline" onClick={print}><Printer className="mr-1 h-4 w-4" />Print</Button>
          <Button onClick={() => void downloadWord()}><Download className="mr-1 h-4 w-4" />Word</Button>
        </>}
      />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3 rounded-lg border bg-card p-5 shadow-card">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={kind === "tax" ? "default" : "outline"} onClick={() => setKind("tax")}>Tax audit (44AB)</Button>
            <Button variant={kind === "statutory" ? "default" : "outline"} onClick={() => setKind("statutory")}>Statutory audit</Button>
          </div>
          <div>
            <Label>Fill from client</Label>
            <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" defaultValue="" onChange={(e) => pick(e.target.value)}>
              <option value="">Choose a client…</option>
              {(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {FIELDS.filter((f) => f.kinds.includes(kind)).map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.yesNo || f.options ? (
                <select id={f.key} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={d[f.key]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })}>
                  {(f.options ?? ["Yes", "No"]).map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.key === "auditorAddress" || f.key === "partners" ? (
                <Textarea id={f.key} className="mt-1" rows={2} value={d[f.key]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })} />
              ) : (
                <Input id={f.key} className="mt-1" value={d[f.key]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        <pre className="max-h-[80vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-card p-6 font-serif text-sm leading-relaxed shadow-card">{text}</pre>
      </div>
    </div>
  );
}
