import { describe, expect, it } from "vitest";
import type { CollectionItem } from "./collection";
import {
  collectionRate,
  countNewMemberships,
  cycleEnd,
  mergeRecentMovements,
  monthlyEquivalent,
  periodVariation,
  previousPeriod,
  renewalExpiresOn,
  summarizePlanPerformance,
  type RecentPayment,
} from "./dashboard";
import type { ProjectionMembership } from "./projection";

function membership(
  overrides: Partial<ProjectionMembership> = {},
): ProjectionMembership {
  return {
    id: "m-1",
    planId: "plan-a",
    planName: "Plan A",
    startsOn: "2026-05-01",
    expiresOn: "2026-05-31",
    agreedPrice: 30000,
    currency: "CLP",
    billingCycle: "monthly",
    status: "active",
    expirationGraceDays: 5,
    ...overrides,
  };
}

describe("periodVariation", () => {
  it("returns null without a previous baseline", () => {
    expect(periodVariation(1000, 0)).toBeNull();
  });

  it("returns a percentage with one decimal", () => {
    expect(periodVariation(1125, 1000)).toBe(12.5);
    expect(periodVariation(900, 1000)).toBe(-10);
  });
});

describe("collectionRate", () => {
  it("returns 0 when nothing is collectible or collected", () => {
    expect(collectionRate(0, 0)).toBe(0);
  });

  it("rounds and caps at 100", () => {
    expect(collectionRate(2, 3)).toBe(67);
    expect(collectionRate(150, 100)).toBe(100);
    expect(collectionRate(10, 0)).toBe(100);
  });
});

describe("monthlyEquivalent", () => {
  it("divides the price by the cycle months", () => {
    expect(monthlyEquivalent(30000, "monthly")).toBe(30000);
    expect(monthlyEquivalent(90000, "quarterly")).toBe(30000);
    expect(monthlyEquivalent(100, "semiannual")).toBe(16.67);
    expect(monthlyEquivalent(120000, "annual")).toBe(10000);
  });
});

describe("previousPeriod", () => {
  it("wraps across years", () => {
    expect(previousPeriod("2026-05")).toBe("2026-04");
    expect(previousPeriod("2026-01")).toBe("2025-12");
  });
});

describe("countNewMemberships", () => {
  it("counts memberships that start inside the period", () => {
    const memberships = [
      membership({ id: "a", startsOn: "2026-05-01" }),
      membership({ id: "b", startsOn: "2026-05-31" }),
      membership({ id: "c", startsOn: "2026-04-30" }),
      membership({ id: "d", startsOn: "2026-05-10", currency: "USD" }),
    ];
    expect(countNewMemberships(memberships, "2026-05")).toBe(3);
    expect(countNewMemberships(memberships, "2026-05", "CLP")).toBe(2);
  });
});

describe("summarizePlanPerformance", () => {
  it("groups current memberships by plan and currency using agreed price", () => {
    const result = summarizePlanPerformance(
      [
        membership({ id: "a", agreedPrice: 30000 }),
        membership({ id: "b", agreedPrice: 25000 }),
        membership({
          id: "c",
          planId: "plan-b",
          planName: "Plan B",
          agreedPrice: 135000,
          billingCycle: "quarterly",
          startsOn: "2026-04-01",
          expiresOn: "2026-06-30",
        }),
        membership({ id: "d", status: "cancelled" }),
        membership({ id: "e", startsOn: "2026-06-01", expiresOn: "2026-06-30" }),
        membership({ id: "f", currency: "USD", agreedPrice: 50 }),
      ],
      "2026-05",
    );

    expect(result).toEqual([
      {
        planId: "plan-a",
        planName: "Plan A",
        currency: "CLP",
        studentCount: 2,
        monthlyAmount: 55000,
        share: 55,
      },
      {
        planId: "plan-b",
        planName: "Plan B",
        currency: "CLP",
        studentCount: 1,
        monthlyAmount: 45000,
        share: 45,
      },
      {
        planId: "plan-a",
        planName: "Plan A",
        currency: "USD",
        studentCount: 1,
        monthlyAmount: 50,
        share: 100,
      },
    ]);
  });

  it("includes past-due memberships still inside their grace period", () => {
    const result = summarizePlanPerformance(
      [
        membership({
          status: "past_due",
          startsOn: "2026-04-01",
          expiresOn: "2026-04-28",
          expirationGraceDays: 5,
        }),
      ],
      "2026-05",
    );
    expect(result).toHaveLength(1);
  });
});

describe("mergeRecentMovements", () => {
  const payment = (overrides: Partial<RecentPayment>): RecentPayment => ({
    id: "p-1",
    membershipId: "m-1",
    studentId: "s-1",
    studentName: "Ana",
    planName: "Plan A",
    amount: 30000,
    currency: "CLP",
    status: "paid",
    paidAt: new Date("2026-05-10T12:00:00Z"),
    ...overrides,
  });
  const pending = (overrides: Partial<CollectionItem>): CollectionItem => ({
    membershipId: "m-2",
    studentId: "s-2",
    studentName: "Bruno",
    planName: "Plan B",
    status: "past_due",
    expiresOn: "2026-05-01",
    nextBillingDate: "2026-05-02",
    expirationGraceDays: 5,
    currency: "CLP",
    contractedAmount: 30000,
    balance: 30000,
    dueOn: "2026-05-02",
    overdueDays: 9,
    isOverdue: true,
    ...overrides,
  });

  it("sorts paid and outstanding items newest first and excludes voided payments", () => {
    const result = mergeRecentMovements(
      [
        payment({ id: "p-1" }),
        payment({ id: "p-2", status: "voided" }),
        payment({ id: "p-3", paidAt: new Date("2026-05-12T12:00:00Z") }),
      ],
      [
        pending({}),
        pending({
          membershipId: "m-3",
          studentName: "Carla",
          dueOn: "2026-05-11",
          isOverdue: false,
          balance: 10000,
        }),
      ],
      10,
    );

    expect(result.map((item) => [item.id, item.status])).toEqual([
      ["payment:p-3", "paid"],
      ["pending:m-3", "pending"],
      ["payment:p-1", "paid"],
      ["pending:m-2", "overdue"],
    ]);
  });

  it("applies the limit", () => {
    expect(
      mergeRecentMovements([payment({})], [pending({})], 1),
    ).toHaveLength(1);
  });
});

describe("cycleEnd", () => {
  it.each([
    ["2026-05-01", "monthly", "2026-05-31"],
    ["2026-05-15", "monthly", "2026-06-14"],
    ["2026-01-31", "monthly", "2026-02-27"],
    ["2024-01-31", "monthly", "2024-02-28"],
    ["2024-02-29", "annual", "2025-02-27"],
    ["2025-12-31", "monthly", "2026-01-30"],
    ["2025-11-30", "quarterly", "2026-02-27"],
    ["2026-03-01", "semiannual", "2026-08-31"],
    ["2026-01-01", "annual", "2026-12-31"],
  ] as const)("%s + %s ends on %s", (startsOn, cycle, expected) => {
    expect(cycleEnd(startsOn, cycle)).toBe(expected);
  });
});

describe("renewalExpiresOn", () => {
  it("starts from the next billing date when it is later", () => {
    expect(
      renewalExpiresOn({
        nextBillingDate: "2026-06-01",
        effectiveOn: "2026-05-20",
        cycle: "monthly",
      }),
    ).toBe("2026-06-30");
  });

  it("starts from the effective date when billing already lapsed", () => {
    expect(
      renewalExpiresOn({
        nextBillingDate: "2026-04-01",
        effectiveOn: "2026-05-10",
        cycle: "monthly",
      }),
    ).toBe("2026-06-09");
  });
});
