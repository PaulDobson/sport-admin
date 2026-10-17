import { describe, expect, it } from "vitest";
import type { MembershipPayment } from "@/domain/instructor-finance/payment";
import type { ProjectionMembership } from "@/domain/instructor-finance/projection";
import { FakeCollectionRepository } from "../testing/fake-collection-repository";
import { FakeFinancialProjectionRepository } from "../testing/fake-financial-projection-repository";
import { FakePaymentRepository } from "../testing/fake-payment-repository";
import {
  getFinanceDashboard,
  selectFinanceCurrency,
  type FinanceIndicators,
} from "./get-finance-dashboard";

const tenantId = "d0000000-0000-4000-8000-000000000001";

function membership(
  overrides: Partial<ProjectionMembership>,
): ProjectionMembership {
  return {
    id: "m-1",
    planId: "plan-full",
    planName: "Plan Full",
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

function payment(overrides: Partial<MembershipPayment>): MembershipPayment {
  return {
    id: "p-1",
    tenantId,
    membershipId: "m-1",
    amount: 30000,
    currency: "CLP",
    status: "paid",
    method: "transfer",
    paidAt: new Date("2026-05-05T12:00:00Z"),
    operationId: "op",
    createdAt: new Date("2026-05-05T12:00:00Z"),
    ...overrides,
  };
}

function setup() {
  const financialProjections = new FakeFinancialProjectionRepository();
  const collections = new FakeCollectionRepository();
  const payments = new FakePaymentRepository();
  return { financialProjections, collections, payments };
}

describe("getFinanceDashboard", () => {
  it("builds indicators per currency without mixing amounts", async () => {
    const deps = setup();
    deps.financialProjections.dataByPeriod["2026-05"] = {
      memberships: [
        membership({ id: "m-1" }),
        membership({ id: "m-2", startsOn: "2026-04-01", expiresOn: "2026-06-30", billingCycle: "quarterly", agreedPrice: 90000, planId: "plan-q", planName: "Trimestral" }),
        membership({ id: "m-3", currency: "USD", agreedPrice: 100, planId: "plan-usd", planName: "Online" }),
      ],
      payments: [
        payment({ id: "p-1", amount: 30000 }),
        payment({ id: "p-2", membershipId: "m-2", amount: 15000 }),
        payment({ id: "p-3", membershipId: "m-3", amount: 50, currency: "USD" }),
      ],
      adjustments: [],
    };
    deps.financialProjections.dataByPeriod["2026-04"] = {
      memberships: [],
      payments: [payment({ id: "p-0", amount: 40000, paidAt: new Date("2026-04-10T12:00:00Z") })],
      adjustments: [],
    };
    deps.collections.accounts.push(
      {
        tenantId,
        membershipId: "m-2",
        studentId: "s-2",
        studentName: "Bruno",
        planName: "Trimestral",
        status: "past_due",
        expiresOn: "2026-04-30",
        nextBillingDate: "2026-05-01",
        expirationGraceDays: 5,
        currency: "CLP",
        contractedAmount: 90000,
        balance: 75000,
      },
      {
        tenantId,
        membershipId: "m-3",
        studentId: "s-3",
        studentName: "Carla",
        planName: "Online",
        status: "active",
        expiresOn: "2026-05-31",
        nextBillingDate: "2026-06-01",
        expirationGraceDays: 5,
        currency: "USD",
        contractedAmount: 100,
        balance: 50,
      },
    );

    const result = await getFinanceDashboard(
      { tenantId, period: "2026-05", onDate: "2026-05-20" },
      deps,
    );

    expect(result.previousPeriod).toBe("2026-04");
    expect(result.currencies).toEqual(["CLP", "USD"]);
    expect(result.indicators).toEqual([
      {
        currency: "CLP",
        collected: 45000,
        previousCollected: 40000,
        variation: 12.5,
        pending: 75000,
        pendingAccounts: 1,
        overdueAmount: 75000,
        overdueStudents: 1,
        currentMemberships: 2,
        newMemberships: 1,
        projected: 60000,
        collectionRate: 75,
      },
      {
        currency: "USD",
        collected: 50,
        previousCollected: 0,
        variation: null,
        pending: 50,
        pendingAccounts: 1,
        overdueAmount: 0,
        overdueStudents: 0,
        currentMemberships: 1,
        newMemberships: 1,
        projected: 100,
        collectionRate: 50,
      },
    ]);
    expect(result.planPerformance.map((plan) => [plan.planName, plan.currency, plan.monthlyAmount, plan.share])).toEqual([
      ["Plan Full", "CLP", 30000, 50],
      ["Trimestral", "CLP", 30000, 50],
      ["Online", "USD", 100, 100],
    ]);
    expect(result.actionItems.map((item) => item.membershipId)).toEqual(["m-2"]);
    expect(deps.financialProjections.requests).toEqual([
      { tenantId, period: "2026-05" },
      { tenantId, period: "2026-04" },
    ]);
  });

  it("reports a 0% collection rate while keeping the collectible amount", async () => {
    const deps = setup();
    deps.financialProjections.data = {
      memberships: [membership({})],
      payments: [],
      adjustments: [],
    };

    const result = await getFinanceDashboard(
      { tenantId, period: "2026-05", onDate: "2026-05-02" },
      deps,
    );

    expect(result.indicators[0]).toMatchObject({
      currency: "CLP",
      collected: 0,
      projected: 30000,
      collectionRate: 0,
      variation: null,
    });
  });

  it("merges recent payments with outstanding balances", async () => {
    const deps = setup();
    deps.payments.memberships.push({
      id: "m-1",
      tenantId,
      agreedPrice: 30000,
      currency: "CLP",
      studentId: "s-1",
      studentName: "Ana",
      planName: "Plan Full",
    });
    deps.payments.payments.push(
      payment({ id: "p-1", paidAt: new Date("2026-05-18T12:00:00Z") }),
      payment({ id: "p-2", status: "voided", paidAt: new Date("2026-05-19T12:00:00Z") }),
    );
    deps.collections.accounts.push({
      tenantId,
      membershipId: "m-9",
      studentId: "s-9",
      studentName: "Diego",
      planName: "Plan Full",
      status: "active",
      expiresOn: "2026-05-19",
      nextBillingDate: "2026-05-20",
      expirationGraceDays: 5,
      currency: "CLP",
      contractedAmount: 30000,
      balance: 30000,
    });

    const result = await getFinanceDashboard(
      { tenantId, period: "2026-05", onDate: "2026-05-20" },
      deps,
    );

    expect(result.movements).toEqual([
      expect.objectContaining({ id: "pending:m-9", status: "pending", amount: 30000, studentName: "Diego" }),
      expect.objectContaining({ id: "payment:p-1", status: "paid", studentName: "Ana", planName: "Plan Full" }),
    ]);
    expect(result.actionItems.map((item) => item.membershipId)).toEqual(["m-9"]);
  });

  it("rejects malformed periods", async () => {
    await expect(
      getFinanceDashboard(
        { tenantId, period: "2026-13", onDate: "2026-05-20" },
        setup(),
      ),
    ).rejects.toThrow();
  });
});

describe("selectFinanceCurrency", () => {
  function indicators(
    currency: string,
    projected: number,
    pending: number,
  ): FinanceIndicators {
    return {
      currency,
      collected: 0,
      previousCollected: 0,
      variation: null,
      pending,
      pendingAccounts: 0,
      overdueAmount: 0,
      overdueStudents: 0,
      currentMemberships: 0,
      newMemberships: 0,
      projected,
      collectionRate: 0,
    };
  }

  it("prefers a valid requested currency and otherwise the largest collectible", () => {
    const data = {
      indicators: [indicators("CLP", 10, 0), indicators("USD", 500, 20)],
    };

    expect(selectFinanceCurrency(data, "CLP")).toBe("CLP");
    expect(selectFinanceCurrency(data, "EUR")).toBe("USD");
    expect(selectFinanceCurrency(data)).toBe("USD");
    expect(selectFinanceCurrency({ indicators: [] })).toBe("CLP");
  });
});
