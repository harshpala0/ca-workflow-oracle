import { AUDIT_SECTIONS } from "./audit-sections";
import { programSchema, type Program } from "./import-rules";

// Starter procedures from cafh's checked-in working-paper checklist, not its private master-program database.
export const BASIC_AUDIT_PROGRAMS: Program[] = [
  { name: "Basic statutory audit", engagement_type: "Statutory Audit", sectionIds: ["3.1-3.5", "3.6-3.8", "3.10-3.19", "3.20-3.24"] },
  { name: "Fixed assets audit", engagement_type: "Statutory Audit", sectionIds: ["3.1-3.5"] },
  { name: "Investments, receivables & bank", engagement_type: "Statutory Audit", sectionIds: ["3.6-3.8"] },
  { name: "Equity & liabilities", engagement_type: "Statutory Audit", sectionIds: ["3.10-3.19"] },
  { name: "Revenue, inventory & expenses", engagement_type: "Statutory Audit", sectionIds: ["3.20-3.24"] },
].map(({ sectionIds, ...program }) => ({ ...program, items: AUDIT_SECTIONS.filter(s => sectionIds.includes(s.id)).flatMap(s => s.fields.flatMap(f => f.type === "table" ? f.rows.map(row => ({ title: row[1] ?? "", area: row[0] ?? "", reference: s.id, priority: "Medium" as const })) : [])) }));

export const PROCEDURE_HEADERS = ["Sr No", "Area", "Description", "Reference", "Priority"];
export function parseProcedureRows(rows: Record<string, string>[], name: string, engagement_type: string) {
  return programSchema.parse({ name, engagement_type, items: rows.map(row => ({ title: row["Description"] || row["description"] || row["Task"] || row["title"] || "", area: row["Area"] || row["area"] || "", reference: row["Reference"] || row["reference"] || "", priority: row["Priority"] || row["priority"] || "Medium" })) });
}