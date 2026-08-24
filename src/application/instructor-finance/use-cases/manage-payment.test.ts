import { beforeEach, describe, expect, it } from "vitest";
import { FakePaymentRepository } from "../testing/fake-payment-repository";
import {
  getMembershipBalance,
  getMembershipPaymentHistory,
  recordMembershipPayment,
} from "./manage-payment";

const tenantId = "c0000000-0000-4000-8000-000000000001";
const membershipId = "c0000000-0000-4000-8000-000000000002";
const actorMembershipId = "c0000000-0000-4000-8000-000000000003";
const operationId = "c0000000-0000-4000-8000-000000000004";
let repository: FakePaymentRepository;

beforeEach(() => {
  repository = new FakePaymentRepository();
  repository.memberships.push({
    id: membershipId,
    tenantId,
    agreedPrice: 1000,
    currency: "USD",
  });
});

describe("membership payments", () => {
  it("calculates adjusted amount and remaining balance", async () => {
    await recordMembershipPayment(
      {
        tenantId,
        membershipId,
        amount: 500,
        currency: "USD",
        paidAt: new Date("2026-08-22T12:00:00Z"),
        reference: "receipt-500",
        actorMembershipId,
        operationId,
        adjustments: [
          { kind: "discount", amount: 100, reason: "Launch discount" },
          { kind: "credit", amount: 50, reason: "Referral credit" },
          { kind: "tax", amount: 30, reason: "Local tax" },
        ],
      },
      { payments: repository },
    );

    await expect(
      getMembershipBalance(
        { tenantId, membershipId },
        { payments: repository },
      ),
    ).resolves.toEqual({
      membershipId,
      currency: "USD",
      contractedAmount: 1000,
      adjustedAmount: 880,
      paidAmount: 500,
      balance: 380,
    });
  });

  it("returns the original payment for a repeated operation", async () => {
    const input = {
      tenantId,
      membershipId,
      amount: 500,
      currency: "USD",
      paidAt: new Date("2026-08-22T12:00:00Z"),
      actorMembershipId,
      operationId,
      adjustments: [
        { kind: "discount" as const, amount: 100, reason: "Discount" },
      ],
    };
    const first = await recordMembershipPayment(input, {
      payments: repository,
    });
    const repeated = await recordMembershipPayment(input, {
      payments: repository,
    });

    expect(repeated.id).toBe(first.id);
    expect(repository.payments).toHaveLength(1);
    expect(repository.adjustments).toHaveLength(1);
    expect(repository.events).toHaveLength(1);
  });

  it("preserves payment and adjustment history", async () => {
    await recordMembershipPayment(
      {
        tenantId,
        membershipId,
        amount: 500,
        currency: "USD",
        paidAt: new Date("2026-08-22T12:00:00Z"),
        actorMembershipId,
        operationId,
        adjustments: [{ kind: "tax", amount: 30, reason: "Tax" }],
      },
      { payments: repository },
    );
    const history = await getMembershipPaymentHistory(
      { tenantId, membershipId },
      { payments: repository },
    );

    expect(history.payments).toHaveLength(1);
    expect(history.adjustments).toHaveLength(1);
    expect(history.payments[0].reference).toBeUndefined();
  });
});
