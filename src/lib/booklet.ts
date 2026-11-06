// Builds the engagement working-paper booklet as a Word (.docx) file in the browser.
import {
  AlignmentType, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface BookletInput {
  firmName: string;
  engagement: Row; // includes clients(*)
  tasks: Row[]; // includes profiles(full_name)
  timeLogs: Row[];
  queries: Row[];
  dayLogs: Row[];
}

const NAVY = "1F2A44";
const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) =>
  new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, color: NAVY, bold: true })] });

const kv = (label: string, value: unknown) =>
  new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true, size: 20 }), new TextRun({ text: s(value), size: 20 })] });

const cell = (text: string, header = false) =>
  new TableCell({
    ...(header ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY } } : {}),
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 18, ...(header ? { color: "FFFFFF" } : {}) })] })],
  });

function table(headers: string[], rows: unknown[][]) {
  if (!rows.length) return new Paragraph({ children: [new TextRun({ text: "None recorded.", italics: true, size: 18 })] });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((x) => cell(x, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((v) => cell(s(v))) })),
    ],
  });
}

export async function buildBooklet(d: BookletInput): Promise<Blob> {
  const e = d.engagement;
  const c = e["clients"] ?? {};
  const hoursByTask = new Map<string, number>();
  for (const t of d.timeLogs) hoursByTask.set(t["task_id"], (hoursByTask.get(t["task_id"]) ?? 0) + Number(t["hours"] ?? 0));
  const team = [...new Set(d.tasks.map((t) => t["profiles"]?.["full_name"]).filter(Boolean))] as string[];
  const areas = new Map<string, Row[]>();
  for (const t of d.tasks) {
    const a = t["area"] || "General";
    areas.set(a, [...(areas.get(a) ?? []), t]);
  }

  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.firmName, bold: true, size: 32, color: NAVY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Engagement Working Paper Booklet", size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `${s(e["title"])} · FY ${s(e["financial_year"])}`, size: 22 })] }),
    h("1. Engagement Details"),
    kv("Client", c["name"]), kv("PAN", c["pan"]), kv("GSTIN", c["gstin"]),
    kv("Engagement type", e["engagement_type"]), kv("Financial year", e["financial_year"]),
    kv("Period", `${s(e["period_from"])} to ${s(e["period_to"])}`), kv("Due date", e["due_date"]), kv("Status", e["status"]),
    kv("Notes", e["notes"]),
    h("2. Audit Team"),
    table(["Sr", "Name"], team.map((n, i) => [i + 1, n])),
    h("3. Task-wise Working Papers"),
  ];
  if (!d.tasks.length) children.push(table([], []));
  for (const [area, ts] of areas) {
    children.push(h(area, HeadingLevel.HEADING_2));
    children.push(table(
      ["Task", "WP ref", "Assigned to", "Status", "Priority", "Due", "Est. hrs", "Logged hrs"],
      ts.map((t) => [t["title"], t["working_paper_ref"], t["profiles"]?.["full_name"], t["status"], t["priority"], t["due_date"], t["estimated_hours"], hoursByTask.get(t["id"]) ?? 0]),
    ));
  }
  children.push(
    h("4. Query Sheet"),
    table(["Sr", "Query", "Response", "Status"], d.queries.map((q, i) => [i + 1, q["query_text"], q["response"], q["status"]])),
    h("5. Audit Day Logs"),
  );
  if (!d.dayLogs.length) children.push(table([], []));
  for (const l of d.dayLogs) {
    children.push(h(`${l["log_date"]} — ${s(l["auditor_name"])}${l["is_confirmed"] ? ` (confirmed by ${s(l["confirmed_by"])})` : ""}`, HeadingLevel.HEADING_2));
    children.push(table(["Area", "Summary", "Staff"], (l["work"] ?? []).map((w: Row) => [w["area"], w["summary"], w["staff"]])));
    if ((l["observations"] ?? []).length)
      children.push(table(["Party", "Ref", "Amount", "Observation", "Mgmt response", "Status"],
        l["observations"].map((o: Row) => [o["party"], o["ref_no"], o["amount"], o["observation"], o["response"], o["status"]])));
    if ((l["pending_docs"] ?? []).length)
      children.push(table(["Document pending", "Responsible", "Status"], l["pending_docs"].map((p: Row) => [p["doc"], p["responsible"], p["status"]])));
    if (l["next_plan"]) children.push(kv("Next day plan", l["next_plan"]));
  }
  children.push(
    h("6. Sign-off"),
    kv("Prepared by", ""), kv("Reviewed by", ""), kv("Partner", ""),
    kv("Generated on", new Date().toLocaleString("en-IN")),
  );

  const doc = new Document({ styles: { default: { document: { run: { font: "Calibri" } } } }, sections: [{ children }] });
  return Packer.toBlob(doc);
}
