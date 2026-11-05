import { z } from "zod";
import { fyOf, generateCompliance } from "./compliance";
import type { ComplianceDraft } from "./compliance";

export const CLIENT_HEADERS = ["Name of Client", "Type of Entity", "PAN", "Contact Person", "Phone", "Email", "Address", "Type of Engagement", "Compliance Packs", "Tax Audit Applicable"];
export const PACK_CODES = ["GST_MONTHLY", "GST_QRMP", "TDS", "ITR", "TAX_AUDIT", "ROC", "PF_ESI"] as const;
export const fySchema = z.string().regex(/^\d{4}-\d{2}$/).refine(fy => Number(fy.slice(5)) === (Number(fy.slice(0, 4)) + 1) % 100, "Invalid financial year");
export const procedureSchema = z.object({ title: z.string().trim().min(1).max(2000), area: z.string().max(200).default(""), reference: z.string().max(500).default(""), priority: z.enum(["High", "Medium", "Low"]).default("Medium") });
export const programSchema = z.object({ name: z.string().trim().min(1).max(200), engagement_type: z.string().max(200).default("Statutory Audit"), items: z.array(procedureSchema).min(1).max(500) });
export type Program = z.infer<typeof programSchema>;
export const clientRowSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(300), entity_type: z.string().max(100), pan: z.string().max(20), gstin: z.string().max(30),
  contact_person: z.string().max(300), contact_phone: z.string().max(50), contact_email: z.union([z.literal(""), z.string().email()]), address: z.string().max(3000),
  engagements: z.array(z.object({ type: z.string().min(1).max(200), label: z.string().min(1).max(300) })).max(20), packs: z.array(z.enum(PACK_CODES)),
});
export type ClientImportRow = z.infer<typeof clientRowSchema>;
export const bulkSchema = z.object({ financial_year: fySchema, rows: z.array(clientRowSchema).min(1).max(1000) });

export function engagementTypes(text: string) {
  const choices = [["statutory", "Statutory Audit"], ["tax audit", "Tax Audit"], ["internal", "Internal Audit"], ["gst", "GST Audit"], ["due diligence", "Due Diligence"], ["certification", "Certification"]];
  if (!text.trim()) return [];
  const found = choices.filter(([key]) => text.toLowerCase().includes(key ?? "")).map(([, label]) => ({ type: label ?? "Other", label: label ?? text }));
  return found.length ? found : [{ type: "Other", label: text.trim() }];
}

export function parsePacks(text: string, auditFlag = "") {
  const aliases: Record<string, string> = { GST: "GST_MONTHLY", GSTMONTHLY: "GST_MONTHLY", QRMP: "GST_QRMP", GSTQRMP: "GST_QRMP", INCOME_TAX: "ITR", INCOMETAX: "ITR", AUDIT: "TAX_AUDIT", TAXAUDIT: "TAX_AUDIT", PF: "PF_ESI", ESI: "PF_ESI", PFESI: "PF_ESI" };
  const values = text.toUpperCase().split(/[,;|/]/).map(p => p.trim().replace(/ /g, "_")).filter(Boolean).map(p => aliases[p] ?? p);
  const unknown = values.filter(p => !PACK_CODES.includes(p as typeof PACK_CODES[number]));
  if (unknown.length) throw new Error(`Unknown compliance pack: ${unknown.join(", ")}`);
  const flag = auditFlag.trim().toUpperCase();
  let result = [...new Set(values)];
  if (["Y", "YES", "TRUE", "1", "APPLICABLE"].includes(flag)) result = [...result.filter(p => p !== "ITR"), "TAX_AUDIT"];
  else if (["N", "NO", "FALSE", "0", "NOT APPLICABLE", "NA"].includes(flag)) result = result.filter(p => p !== "TAX_AUDIT");
  else if (flag) throw new Error("Tax Audit Applicable must be Y or N");
  return [...new Set(result)] as typeof PACK_CODES[number][];
}

export function parseClientRows(rows: Record<string, string>[], defaults = "") {
  if (!rows.length || !("Name of Client" in (rows[0] ?? {}))) throw new Error("Missing required column: Name of Client");
  return rows.map((row, i) => {
    try {
      const packs = row["Compliance Packs"] || row["Compliance packs"] || row["Packs"] || row["compliance_packs"] || row["PACKS"] || defaults;
      const flag = row["Tax Audit Applicable"] || row["Tax audit applicable"] || row["Tax Audit"] || row["tax_audit_applicable"] || row["Tax Audit Y/N"] || row["Audit Applicable"] || "";
      return { row: i + 2, value: clientRowSchema.parse({ name: row["Name of Client"] ?? "", entity_type: row["Type of Entity"] ?? "", pan: (row["PAN"] ?? "").toUpperCase(), gstin: (row["GSTIN"] ?? "").toUpperCase(), contact_person: row["Contact Person"] ?? "", contact_phone: row["Phone"] ?? "", contact_email: row["Email"] ?? "", address: row["Address"] ?? "", engagements: engagementTypes(row["Type of Engagement"] ?? ""), packs: parsePacks(packs, flag) }), error: "" };
    } catch (e) { return { row: i + 2, value: null, error: e instanceof z.ZodError ? e.issues.map(x => x.message).join("; ") : (e as Error).message }; }
  });
}

// Keep the original import pack scope, while honouring this firm's due-date extensions.
export function importDeadlines(fy: string, packs: string[], overrides: Record<string, string> = {}): ComplianceDraft[] {
  const start = Number(fy.slice(0, 4));
  const out: ComplianceDraft[] = [];
  if (packs.includes("GST_MONTHLY")) out.push(...generateCompliance(start, ["GST"], overrides).filter(x => !x.title.startsWith("GSTR-9")));
  if (packs.includes("TDS")) out.push(...generateCompliance(start, ["TDS"], overrides).filter(x => x.title.startsWith("TDS return")));
  if (packs.includes("TAX_AUDIT")) out.push(...generateCompliance(start, ["Tax Audit"], overrides));
  else if (packs.includes("ITR")) out.push(...generateCompliance(start, ["Income Tax"], overrides).filter(x => x.title.startsWith("ITR")));
  if (packs.includes("ROC")) out.push(...generateCompliance(start, ["ROC"], overrides).filter(x => !x.title.startsWith("DIR-3")));
  if (packs.includes("GST_QRMP")) [[start, 7], [start, 10], [start + 1, 1], [start + 1, 4]].forEach(([y, m], i) => out.push({ title: `GSTR-1 QRMP Q${i + 1} — FY ${fy}`, category: "GST", financial_year: fy, due_date: `${y}-${String(m).padStart(2, "0")}-13` }));
  if (packs.includes("PF_ESI")) for (let i = 0; i < 12; i++) {
    const date = new Date(Date.UTC(start, 4 + i, 15));
    out.push({ title: `PF/ESI — ${new Date(Date.UTC(start, 3 + i, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}`, category: "Other" as ComplianceDraft["category"], financial_year: fy, due_date: date.toISOString().slice(0, 10) });
  }
  return out;
}
export const currentImportFY = () => fyOf(new Date().toISOString().slice(0, 10));