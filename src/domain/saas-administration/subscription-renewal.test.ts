import { describe, expect, it } from "vitest";
import { quoteSubscriptionRenewal, type RenewalInput, type RenewalTerms } from "./subscription-renewal";

const terms: RenewalTerms = { versionId: "base", price: 11900, duration: { unit: "months", count: 1 }, maxStudents: 100, maxUsers: 5 };
const input: RenewalInput = {
  today: "2028-02-29", currentPeriod: { startsOn: "2028-01-31", endsBefore: "2028-02-29" },
  anchorOn: "2028-01-31", periodIndex: 0, status: "active", terms,
  firstInvoiceDueOn: null, activeStudents: 20, activeUsers: 2, scheduledChange: null,
};
describe("subscription renewal quote", () => {
  it("retains the original end-of-month anchor after February and includes VAT", () => {
    expect(quoteSubscriptionRenewal(input)).toMatchObject({
      period: { startsOn: "2028-02-29", endsBefore: "2028-03-31" }, anchorOn: "2028-01-31",
      periodIndex: 1, total: 11900, net: 10000, vat: 1900, createsInvoice: true, invoiceKind: "renewal",
    });
  });
  it("ends trial and starts the first paid full period with its confirmed deadline", () => {
    expect(quoteSubscriptionRenewal({
      ...input, status: "trial", anchorOn: "2028-02-29", firstInvoiceDueOn: "2028-03-02",
    })).toMatchObject({
      period: { startsOn: "2028-02-29", endsBefore: "2028-03-29" }, periodIndex: 0,
      status: "active", invoiceKind: "initial", dueOn: "2028-03-02",
    });
  });
  it("starts a complete new duration after an upgrade transition without skipping a period", () => {
    expect(quoteSubscriptionRenewal({ ...input, anchorOn: "2028-02-29", terms: { ...terms, duration: { unit: "days", count: 60 } } }))
      .toMatchObject({ period: { startsOn: "2028-02-29", endsBefore: "2028-04-29" }, periodIndex: 0 });
  });
  it("applies a scheduled contracted version even if today's catalog is not available", () => {
    const next = { ...terms, versionId: "archived-version", price: 5000, duration: { unit: "months" as const, count: 3 } };
    expect(quoteSubscriptionRenewal({
      ...input, scheduledChange: { id: "change", effectiveOn: "2028-02-29", terms: next },
    })).toMatchObject({
      terms: next, anchorOn: "2028-02-29", periodIndex: 0,
      period: { startsOn: "2028-02-29", endsBefore: "2028-05-29" },
      change: { id: "change", status: "applied", reason: null }, total: 5000,
    });
  });
  it.each([{ activeStudents: 21, activeUsers: 2 }, { activeStudents: 20, activeUsers: 3 }])(
    "blocks changed usage %j and renews the previous contract", (usage) => {
      const result = quoteSubscriptionRenewal({
        ...input, ...usage, scheduledChange: { id: "change", effectiveOn: "2028-02-29", terms: { ...terms, versionId: "small", maxStudents: 20, maxUsers: 2 } },
      });
      expect(result).toMatchObject({ terms, periodIndex: 1, change: { status: "blocked", reason: expect.stringContaining("Se renovó el plan anterior") } });
    },
  );
  it("does not block a contracted renewal merely because its existing usage exceeds its own cap", () => {
    expect(quoteSubscriptionRenewal({ ...input, activeStudents: 101 }).terms).toBe(terms);
  });
  it("creates no invoice for a free full period", () => {
    expect(quoteSubscriptionRenewal({ ...input, terms: { ...terms, price: 0 } })).toMatchObject({ total: 0, net: 0, vat: 0, createsInvoice: false });
  });
  it.each(["past_due", "suspended"] as const)("preserves %s rather than reactivating automatically", (status) => {
    expect(quoteSubscriptionRenewal({ ...input, status }).status).toBe(status);
  });
  it("renews one overdue period per call, preserving catch-up boundaries", () => {
    const first = quoteSubscriptionRenewal({ ...input, today: "2028-06-01" });
    const second = quoteSubscriptionRenewal({ ...input, today: "2028-06-01", currentPeriod: first.period, periodIndex: first.periodIndex });
    expect(first.period.endsBefore).toBe("2028-03-31");
    expect(second.period).toEqual({ startsOn: "2028-03-31", endsBefore: "2028-04-30" });
  });
  it.each([
    { today: "2028-02-28" }, { periodIndex: -1 }, { activeStudents: -1 }, { anchorOn: "2028-01-30" },
    { terms: { ...terms, price: 1.5 } },
    { status: "trial", anchorOn: "2028-01-31" },
    { status: "trial", anchorOn: "2028-02-29", firstInvoiceDueOn: "2028-02-28" },
    { scheduledChange: { id: "change", effectiveOn: "2028-03-01", terms } },
  ] satisfies Partial<RenewalInput>[])("rejects inconsistent renewal inputs %j", (override) => {
    expect(() => quoteSubscriptionRenewal({ ...input, ...override })).toThrow();
  });
});
