// Standard Indian statutory due-date templates used to generate a client's compliance calendar.
export type CompliancePack = "GST" | "TDS" | "Income Tax" | "Tax Audit" | "ROC";

export const COMPLIANCE_PACKS: CompliancePack[] = ["GST", "TDS", "Income Tax", "Tax Audit", "ROC"];

export interface ComplianceDraft {
  title: string;
  category: CompliancePack;
  due_date: string; // YYYY-MM-DD
  financial_year: string;
}

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function iso(y: number, m: number, d: number) {
  // m is 1-12; clamp day to month length
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** fyStart = calendar year the FY begins in, e.g. 2026 for FY 2026-27. */
/** Statutory event keys whose due dates CBDT/ICAI/MCA may extend; overrides map key -> YYYY-MM-DD. */
export const DUE_EVENTS: { key: string; label: string }[] = [
  { key: "ITR_NON_AUDIT", label: "ITR (non-audit)" },
  { key: "TAX_AUDIT_REPORT", label: "Tax audit report (3CA/3CB-3CD)" },
  { key: "ITR_AUDIT", label: "ITR (audit case)" },
  { key: "ADV_TAX_Q1", label: "Advance tax 15%" },
  { key: "ADV_TAX_Q2", label: "Advance tax 45%" },
  { key: "ADV_TAX_Q3", label: "Advance tax 75%" },
  { key: "ADV_TAX_Q4", label: "Advance tax 100%" },
  { key: "TDS_Q1", label: "TDS return Q1" },
  { key: "TDS_Q2", label: "TDS return Q2" },
  { key: "TDS_Q3", label: "TDS return Q3" },
  { key: "TDS_Q4", label: "TDS return Q4" },
  { key: "GSTR9", label: "GSTR-9 annual return" },
  { key: "AOC4", label: "AOC-4" },
  { key: "MGT7", label: "MGT-7" },
  { key: "DIR3", label: "DIR-3 KYC" },
];

/** "2026-27" for any date between 1 Apr 2026 and 31 Mar 2027. */
export function fyOf(date: string): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const s = m >= 4 ? y : y - 1;
  return `${s}-${String((s + 1) % 100).padStart(2, "0")}`;
}

export function generateCompliance(fyStart: number, packs: CompliancePack[], overrides: Record<string, string> = {}): ComplianceDraft[] {
  const ov = (key: string, d: string) => overrides[key] || d;
  const fy = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
  const out: ComplianceDraft[] = [];
  const add = (category: CompliancePack, title: string, due: string) =>
    out.push({ title, category, due_date: due, financial_year: fy });

  // Each FY month i (0 = April) -> the following calendar month is when returns fall due.
  for (let i = 0; i < 12; i++) {
    const periodMonth = ((3 + i) % 12) + 1; // 4..12,1..3
    const periodYear = i < 9 ? fyStart : fyStart + 1;
    const dueMonth = (periodMonth % 12) + 1;
    const dueYear = periodMonth === 12 ? periodYear + 1 : periodYear;
    const label = `${MONTHS[i]} ${periodYear}`;
    if (packs.includes("GST")) {
      add("GST", `GSTR-1 — ${label}`, iso(dueYear, dueMonth, 11));
      add("GST", `GSTR-3B — ${label}`, iso(dueYear, dueMonth, 20));
    }
    if (packs.includes("TDS")) {
      // March TDS payment is due 30 April; others on the 7th.
      add("TDS", `TDS payment — ${label}`, periodMonth === 3 ? iso(dueYear, dueMonth, 30) : iso(dueYear, dueMonth, 7));
    }
  }

  if (packs.includes("GST")) add("GST", `GSTR-9 annual return — FY ${fy}`, ov("GSTR9", iso(fyStart + 1, 12, 31)));
  if (packs.includes("TDS")) {
    add("TDS", `TDS return Q1 (24Q/26Q) — FY ${fy}`, ov("TDS_Q1", iso(fyStart, 7, 31)));
    add("TDS", `TDS return Q2 (24Q/26Q) — FY ${fy}`, ov("TDS_Q2", iso(fyStart, 10, 31)));
    add("TDS", `TDS return Q3 (24Q/26Q) — FY ${fy}`, ov("TDS_Q3", iso(fyStart + 1, 1, 31)));
    add("TDS", `TDS return Q4 (24Q/26Q) — FY ${fy}`, ov("TDS_Q4", iso(fyStart + 1, 5, 31)));
  }
  if (packs.includes("Income Tax")) {
    add("Income Tax", `Advance tax 15% — FY ${fy}`, ov("ADV_TAX_Q1", iso(fyStart, 6, 15)));
    add("Income Tax", `Advance tax 45% — FY ${fy}`, ov("ADV_TAX_Q2", iso(fyStart, 9, 15)));
    add("Income Tax", `Advance tax 75% — FY ${fy}`, ov("ADV_TAX_Q3", iso(fyStart, 12, 15)));
    add("Income Tax", `Advance tax 100% — FY ${fy}`, ov("ADV_TAX_Q4", iso(fyStart + 1, 3, 15)));
    add("Income Tax", `ITR (non-audit) — FY ${fy}`, ov("ITR_NON_AUDIT", iso(fyStart + 1, 7, 31)));
  }
  if (packs.includes("Tax Audit")) {
    add("Tax Audit", `Tax audit report (3CA/3CB-3CD) — FY ${fy}`, ov("TAX_AUDIT_REPORT", iso(fyStart + 1, 9, 30)));
    add("Tax Audit", `ITR (audit case) — FY ${fy}`, ov("ITR_AUDIT", iso(fyStart + 1, 10, 31)));
  }
  if (packs.includes("ROC")) {
    add("ROC", `AOC-4 financial statements — FY ${fy}`, ov("AOC4", iso(fyStart + 1, 10, 30)));
    add("ROC", `MGT-7 annual return — FY ${fy}`, ov("MGT7", iso(fyStart + 1, 11, 29)));
    add("ROC", `DIR-3 KYC — FY ${fy}`, ov("DIR3", iso(fyStart + 1, 9, 30)));
  }
  return out.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export type AgeBucket = "0-30" | "31-60" | "61-90" | "90+";

export function ageBucket(invoiceDate: string, today: Date = new Date()): AgeBucket {
  const days = Math.floor((today.getTime() - new Date(invoiceDate + "T00:00:00Z").getTime()) / 86400000);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function outstanding(inv: { total_amount: number | null; amount_received: number; payment_status: string }) {
  if (inv.payment_status === "Paid") return 0;
  return Math.max(0, Number(inv.total_amount ?? 0) - Number(inv.amount_received ?? 0));
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
