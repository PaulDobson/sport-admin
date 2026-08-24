import { describe, expect, it } from "vitest";
import type { ProjectionMembership } from "./projection";
import { calculateMonthlyFinancialProjections } from "./projection";

const memberships: ProjectionMembership[] = [
  ["monthly", 120, "USD"],
  ["quarterly", 300, "USD"],
  ["semiannual", 600, "USD"],
  ["annual", 1200, "USD"],
  ["monthly", 120, "EUR"],
].map(([billingCycle, agreedPrice, currency], index) => ({
  id: `membership-${index}`,
  startsOn: "2026-01-01",
  expiresOn: "2026-12-31",
  agreedPrice: agreedPrice as number,
  currency: currency as string,
  billingCycle: billingCycle as ProjectionMembership["billingCycle"],
  status: "active",
  expirationGraceDays: 0,
}));

describe("monthly financial projections", () => {
  it("normalizes cycles and separates currencies without duplicate totals", () => {
    const payment = {
      id: "payment-usd",
      tenantId: "tenant",
      membershipId: "membership-0",
      amount: 250,
      currency: "USD",
      status: "paid" as const,
      paidAt: new Date("2026-08-15T12:00:00Z"),
      operationId: "operation",
      createdAt: new Date("2026-08-15T12:00:00Z"),
    };
    const projections = calculateMonthlyFinancialProjections({
      period: "2026-08",
      memberships: [
        ...memberships,
        memberships[0],
        { ...memberships[0], id: "paused", status: "paused" },
      ],
      payments: [
        payment,
        payment,
        { ...payment, id: "payment-eur", amount: 80, currency: "EUR" },
      ],
      adjustments: [
        {
          id: "discount",
          tenantId: "tenant",
          membershipId: "membership-0",
          kind: "discount",
          amount: 20,
          currency: "USD",
          effectiveOn: "2026-08-10",
          reason: "Discount",
          createdAt: new Date("2026-08-10T12:00:00Z"),
        },
        {
          id: "tax",
          tenantId: "tenant",
          membershipId: "membership-0",
          kind: "tax",
          amount: 10,
          currency: "USD",
          effectiveOn: "2026-08-10",
          reason: "Tax",
          createdAt: new Date("2026-08-10T12:00:00Z"),
        },
      ],
    });

    expect(projections).toEqual([
      {
        period: "2026-08",
        currency: "EUR",
        contractedAmount: 120,
        collectibleAmount: 120,
        collectedAmount: 80,
      },
      {
        period: "2026-08",
        currency: "USD",
        contractedAmount: 420,
        collectibleAmount: 410,
        collectedAmount: 250,
      },
    ]);
  });

  it("applies grace policy and excludes adjustments from inactive memberships", () => {
    const projections = calculateMonthlyFinancialProjections({
      period: "2026-08",
      memberships: [
        {
          ...memberships[0],
          id: "past-due-in-grace",
          status: "past_due",
          expiresOn: "2026-07-31",
          expirationGraceDays: 10,
        },
        {
          ...memberships[0],
          id: "past-due-outside-grace",
          status: "past_due",
          expiresOn: "2026-07-15",
          expirationGraceDays: 10,
        },
      ],
      payments: [
        {
          id: "late-payment",
          tenantId: "tenant",
          membershipId: "past-due-outside-grace",
          amount: 40,
          currency: "USD",
          status: "paid",
          paidAt: new Date("2026-08-05T12:00:00Z"),
          operationId: "late-operation",
          createdAt: new Date("2026-08-05T12:00:00Z"),
        },
      ],
      adjustments: [
        {
          id: "inactive-tax",
          tenantId: "tenant",
          membershipId: "past-due-outside-grace",
          kind: "tax",
          amount: 25,
          currency: "USD",
          effectiveOn: "2026-08-05",
          reason: "Inactive adjustment",
          createdAt: new Date("2026-08-05T12:00:00Z"),
        },
      ],
    });

    expect(projections).toEqual([
      {
        period: "2026-08",
        currency: "USD",
        contractedAmount: 120,
        collectibleAmount: 120,
        collectedAmount: 40,
      },
    ]);
  });
});
