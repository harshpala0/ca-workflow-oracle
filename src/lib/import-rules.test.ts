import { describe, expect, it } from "vitest";
import { engagementTypes, parseClientRows, parsePacks, importDeadlines } from "./import-rules";
import { BASIC_AUDIT_PROGRAMS, parseProcedureRows } from "./audit-programs";

describe("cafh import parity", () => {
  it("creates statutory and tax engagements from a combined cell", () => {
    expect(engagementTypes("Statutory & Tax Audit")).toEqual([{ type: "Statutory Audit", label: "Statutory Audit" }, { type: "Tax Audit", label: "Tax Audit" }]);
  });
  it("retains a clients-only row without inventing an engagement", () => {
    expect(parseClientRows([{ "Name of Client": "Example" }])[0]?.value?.engagements).toEqual([]);
  });
  it("rejects a nameless row before import", () => {
    expect(parseClientRows([{ "Name of Client": "" }])[0]?.value).toBeNull();
  });
  it("normalizes PAN and preserves leading-zero contact text", () => {
    const value = parseClientRows([{ "Name of Client": "Example", PAN: "abcde1234f", Phone: "0123456789" }])[0]?.value;
    expect(value?.pan).toBe("ABCDE1234F"); expect(value?.contact_phone).toBe("0123456789");
  });
  it("forces audit packs for applicable tax audit", () => {
    expect(parsePacks("GST;ITR", "Y")).toEqual(["GST_MONTHLY", "TAX_AUDIT"]);
  });
  it("removes audit pack without inventing ITR for N", () => {
    expect(parsePacks("TAX_AUDIT", "N")).toEqual([]);
  });
  it("imports monthly GST with 24 filings", () => {
    expect(importDeadlines("2026-27", ["GST_MONTHLY"])).toHaveLength(24);
  });
  it("honours tax audit extensions and excludes non-audit ITR", () => {
    const dates = importDeadlines("2026-27", ["ITR", "TAX_AUDIT"], { TAX_AUDIT_REPORT: "2027-10-31" });
    expect(dates).toHaveLength(2); expect(dates[0]?.due_date).toBe("2027-10-31"); expect(dates.some(x => x.title.includes("non-audit"))).toBe(false);
  });
  it("preserves imported audit descriptions, area, reference and priority", () => {
    expect(parseProcedureRows([{ Description: "Inspect bank confirmations", Area: "Bank", Reference: "SA 505", Priority: "High" }], "Bank program", "Statutory Audit").items[0]).toEqual({ title: "Inspect bank confirmations", area: "Bank", reference: "SA 505", priority: "High" });
  });
  it("includes all 16 basic execution procedures from the working papers", () => {
    expect(BASIC_AUDIT_PROGRAMS[0]?.items).toHaveLength(16);
    expect(BASIC_AUDIT_PROGRAMS[0]?.items[0]?.title).toBe("Obtain PPE register; reconcile to financials and GL");
  });
});