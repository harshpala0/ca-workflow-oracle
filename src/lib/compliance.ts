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
export function generateCompliance(fyStart: number, packs: CompliancePack[]): ComplianceDraft[] {
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

  if (packs.includes("GST")) add("GST", `GSTR-9 annual return — FY ${fy}`, iso(fyStart + 1, 12, 31));
  if (packs.includes("TDS")) {
    add("TDS", `TDS return Q1 (24Q/26Q) — FY ${fy}`, iso(fyStart, 7, 31));
    add("TDS", `TDS return Q2 (24Q/26Q) — FY ${fy}`, iso(fyStart, 10, 31));
    add("TDS", `TDS return Q3 (24Q/26Q) — FY ${fy}`, iso(fyStart + 1, 1, 31));
    add("TDS", `TDS return Q4 (24Q/26Q) — FY ${fy}`, iso(fyStart + 1, 5, 31));
  }
  if (packs.includes("Income Tax")) {
    add("Income Tax", `Advance tax 15% — FY ${fy}`, iso(fyStart, 6, 15));
    add("Income Tax", `Advance tax 45% — FY ${fy}`, iso(fyStart, 9, 15));
    add("Income Tax", `Advance tax 75% — FY ${fy}`, iso(fyStart, 12, 15));
    add("Income Tax", `Advance tax 100% — FY ${fy}`, iso(fyStart + 1, 3, 15));
    add("Income Tax", `ITR (non-audit) — FY ${fy}`, iso(fyStart + 1, 7, 31));
  }
  if (packs.includes("Tax Audit")) {
    add("Tax Audit", `Tax audit report (3CA/3CB-3CD) — FY ${fy}`, iso(fyStart + 1, 9, 30));
    add("Tax Audit", `ITR (audit case) — FY ${fy}`, iso(fyStart + 1, 10, 31));
  }
  if (packs.includes("ROC")) {
    add("ROC", `AOC-4 financial statements — FY ${fy}`, iso(fyStart + 1, 10, 30));
    add("ROC", `MGT-7 annual return — FY ${fy}`, iso(fyStart + 1, 11, 29));
    add("ROC", `DIR-3 KYC — FY ${fy}`, iso(fyStart + 1, 9, 30));
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
