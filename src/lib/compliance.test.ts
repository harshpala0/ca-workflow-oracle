import { describe, expect, it } from "vitest";
import { ageBucket, fyOf, generateCompliance, outstanding } from "./compliance";

describe("compliance calendar", () => {
  const items = generateCompliance(2026, ["GST", "TDS", "Income Tax", "Tax Audit", "ROC"]);
  const due = (t: string) => items.find((i) => i.title.startsWith(t))?.due_date;

  it("GSTR-1 for April falls on 11 May", () => expect(due("GSTR-1 — Apr 2026")).toBe("2026-05-11"));
  it("GSTR-3B for December falls on 20 January next year", () =>
    expect(due("GSTR-3B — Dec 2026")).toBe("2027-01-20"));
  it("March TDS payment is due 30 April", () => expect(due("TDS payment — Mar 2027")).toBe("2027-04-30"));
  it("Q4 TDS return is due 31 May", () => expect(due("TDS return Q4")).toBe("2027-05-31"));
  it("non-audit ITR is due 31 July", () => expect(due("ITR (non-audit)")).toBe("2027-07-31"));
  it("tax audit report is due 30 September", () => expect(due("Tax audit report")).toBe("2027-09-30"));
  it("only selected packs are generated", () =>
    expect(generateCompliance(2026, ["ROC"]).every((i) => i.category === "ROC")).toBe(true));
});

describe("CBDT/ICAI due-date overrides", () => {
  it("extended tax audit date replaces 30 September", () => {
    const items = generateCompliance(2026, ["Tax Audit"], { TAX_AUDIT_REPORT: "2027-10-31" });
    expect(items.find((i) => i.title.startsWith("Tax audit report"))?.due_date).toBe("2027-10-31");
  });
  it("ITR audit case stays 31 October without override", () =>
    expect(generateCompliance(2026, ["Tax Audit"]).find((i) => i.title.startsWith("ITR (audit"))?.due_date).toBe("2027-10-31"));
  it("Income Tax pack does not include tax audit items", () =>
    expect(generateCompliance(2026, ["Income Tax"]).some((i) => i.title.includes("Tax audit") || i.title.includes("audit case"))).toBe(false));
});

describe("financial year", () => {
  it("31 March belongs to previous FY", () => expect(fyOf("2027-03-31")).toBe("2026-27"));
  it("1 April starts new FY", () => expect(fyOf("2027-04-01")).toBe("2027-28"));
});

describe("receivables", () => {
  const today = new Date("2026-10-10T00:00:00Z");
  it("45-day-old invoice is in 31-60 bucket", () => expect(ageBucket("2026-08-26", today)).toBe("31-60"));
  it("100-day-old invoice is in 90+ bucket", () => expect(ageBucket("2026-07-02", today)).toBe("90+"));
  it("paid invoice has nothing outstanding", () =>
    expect(outstanding({ total_amount: 1180, amount_received: 0, payment_status: "Paid" })).toBe(0));
  it("partial payment leaves the balance", () =>
    expect(outstanding({ total_amount: 1180, amount_received: 500, payment_status: "Partial" })).toBe(680));
});
