import { describe, expect, it } from "vitest";
import type { SaasCatalogPlan } from "./plan-catalog";
import { quoteSubscriptionAssignment } from "./subscription-assignment";

const plan: SaasCatalogPlan = {
  id: "plan", slug: "academia", status: "active",
  currentVersion: {
    id: "version", versionNumber: 1, name: "Academia", description: null,
    price: 11900, currency: "CLP", durationUnit: "months", durationCount: 1,
    trialDays: 7, maxStudents: 100, maxUsers: 5, features: ["reports"],
    services: [], legacy: false, createdAt: "2026-01-01T00:00:00Z",
  },
};
const input = {
  plan, startsOn: "2028-01-31", today: "2028-01-30",
  useTrial: false, hasCurrentSubscription: false, activeStudents: 100, activeUsers: 5,
};

describe("initial SaaS subscription preview", () => {
  it("quotes full initial debt, included VAT and an exclusive calendar period without recording payment", () => {
    expect(quoteSubscriptionAssignment(input)).toEqual({
      planId: "plan", planVersionId: "version", startsOn: "2028-01-31",
      trialPeriod: null, firstPaidPeriod: { startsOn: "2028-01-31", endsBefore: "2028-02-29" },
      dueOn: "2028-01-31", initialInvoice: { total: 11900, net: 10000, vat: 1900, vatRate: 19 },
      status: "active", paymentStatus: "pending",
    });
  });
  it("makes trial explicit and defers the first charge to the real end of trial", () => {
    expect(quoteSubscriptionAssignment({ ...input, useTrial: true })).toMatchObject({
      trialPeriod: { startsOn: "2028-01-31", endsBefore: "2028-02-07" },
      firstPaidPeriod: { startsOn: "2028-02-07", endsBefore: "2028-03-07" },
      dueOn: "2028-02-07", initialInvoice: null, status: "trial", paymentStatus: "not_due",
    });
  });
  it("does not create a fictitious payment or invoice for a free plan", () => {
    const quote = quoteSubscriptionAssignment({ ...input, plan: { ...plan, currentVersion: { ...plan.currentVersion, price: 0 } } });
    expect(quote.initialInvoice).toBeNull();
    expect(quote.paymentStatus).toBe("not_due");
  });
  it("accepts an explicit future payment deadline without changing the service period", () => {
    const quote = quoteSubscriptionAssignment({ ...input, dueOn: "2028-02-05" });
    expect(quote.dueOn).toBe("2028-02-05");
    expect(quote.firstPaidPeriod.startsOn).toBe("2028-01-31");
  });
  it.each([
    { hasCurrentSubscription: true },
    { activeStudents: 101 }, { activeUsers: 6 },
    { activeStudents: -1 }, { activeUsers: 1.5 },
    { startsOn: "2028-01-29" }, { startsOn: "2028-02-30" }, { dueOn: "2028-01-29" },
    { plan: { ...plan, status: "archived" as const } },
    { plan: { ...plan, currentVersion: { ...plan.currentVersion, currency: "USD" } } },
    { useTrial: true, plan: { ...plan, currentVersion: { ...plan.currentVersion, trialDays: 0 } } },
  ])("rejects an assignment incompatible with current state %j", (change) => {
    expect(() => quoteSubscriptionAssignment({ ...input, ...change })).toThrow();
  });
});
