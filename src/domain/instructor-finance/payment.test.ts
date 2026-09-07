import { describe, expect, it } from "vitest";
import type { FinancialAdjustment, MembershipPayment } from "./payment";
import { calculateMembershipBalance } from "./payment";

function payment(
  overrides: Partial<MembershipPayment> & Pick<MembershipPayment, "id">,
): MembershipPayment {
  return {
    tenantId: "tenant",
    membershipId: "membership",
    amount: 0,
    currency: "CLP",
    status: "paid",
    method: "cash",
    operationId: `operation-${overrides.id}`,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

function adjustment(
  overrides: Partial<FinancialAdjustment> & Pick<FinancialAdjustment, "id">,
): FinancialAdjustment {
  return {
    tenantId: "tenant",
    membershipId: "membership",
    kind: "discount",
    amount: 0,
    currency: "CLP",
    effectiveOn: "2026-09-01",
    reason: "reason",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

describe("membership balance", () => {
  it("keeps a positive balance after a partial payment", () => {
    const balance = calculateMembershipBalance({
      membershipId: "membership",
      currency: "CLP",
      contractedAmount: 45000,
      payments: [payment({ id: "first", amount: 20000, method: "transfer" })],
      adjustments: [],
    });

    expect(balance.paidAmount).toBe(20000);
    expect(balance.balance).toBe(25000);
  });

  it("settles the balance once accumulated payments cover the contracted amount", () => {
    const balance = calculateMembershipBalance({
      membershipId: "membership",
      currency: "CLP",
      contractedAmount: 45000,
      payments: [
        payment({ id: "first", amount: 20000, method: "cash" }),
        payment({ id: "second", amount: 15000, method: "transfer" }),
        payment({ id: "third", amount: 10000, method: "card" }),
      ],
      adjustments: [],
    });

    expect(balance.paidAmount).toBe(45000);
    expect(balance.balance).toBe(0);
  });

  it("preserves the collection method of every recorded payment", () => {
    const payments = [
      payment({ id: "first", amount: 10000, method: "cash" }),
      payment({ id: "second", amount: 10000, method: "card" }),
    ];

    expect(payments.map((item) => item.method)).toEqual(["cash", "card"]);
    expect(
      calculateMembershipBalance({
        membershipId: "membership",
        currency: "CLP",
        contractedAmount: 20000,
        payments,
        adjustments: [],
      }).balance,
    ).toBe(0);
  });

  it("ignores payments that are not settled", () => {
    const balance = calculateMembershipBalance({
      membershipId: "membership",
      currency: "CLP",
      contractedAmount: 45000,
      payments: [
        payment({ id: "first", amount: 20000, status: "paid" }),
        payment({ id: "second", amount: 25000, status: "refunded" }),
      ],
      adjustments: [],
    });

    expect(balance.balance).toBe(25000);
  });

  it("applies discounts and credits against the contracted amount and taxes in favour", () => {
    const balance = calculateMembershipBalance({
      membershipId: "membership",
      currency: "CLP",
      contractedAmount: 45000,
      payments: [payment({ id: "first", amount: 30000 })],
      adjustments: [
        adjustment({ id: "discount", kind: "discount", amount: 5000 }),
        adjustment({ id: "credit", kind: "credit", amount: 2000 }),
        adjustment({ id: "tax", kind: "tax", amount: 1000 }),
      ],
    });

    expect(balance.adjustedAmount).toBe(39000);
    expect(balance.balance).toBe(9000);
  });
});
