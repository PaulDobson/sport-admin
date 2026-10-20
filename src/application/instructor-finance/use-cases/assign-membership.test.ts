import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BusinessRuleViolationError,
  ConflictError,
  NotFoundError,
} from "@/domain/shared/errors";
import { FakeMembershipRepository } from "../testing/fake-membership-repository";
import { FakePaymentRepository } from "../testing/fake-payment-repository";
import {
  assignMembership,
  CURRENT_MEMBERSHIP_CONFLICT_MESSAGE,
} from "./manage-membership";

const tenantId = "e0000000-0000-4000-8000-000000000001";
const studentId = "e0000000-0000-4000-8000-000000000002";
const planId = "e0000000-0000-4000-8000-000000000003";
const actorMembershipId = "e0000000-0000-4000-8000-000000000004";
const assignmentToken = "e0000000-0000-4000-8000-000000000005";
const paymentOperationId = "e0000000-0000-4000-8000-000000000006";

let memberships: FakeMembershipRepository;
let payments: FakePaymentRepository;

function input(overrides: Record<string, unknown> = {}) {
  return {
    tenantId,
    studentId,
    planId,
    startsOn: "2026-05-01",
    actorMembershipId,
    assignmentToken,
    ...overrides,
  };
}

function initialPayment(amount: number) {
  return {
    amount,
    method: "transfer" as const,
    paidAt: new Date("2026-05-01T12:00:00Z"),
    reference: "TRX-1",
    operationId: paymentOperationId,
  };
}

beforeEach(() => {
  memberships = new FakeMembershipRepository();
  payments = new FakePaymentRepository();
  memberships.plans.push({
    id: planId,
    tenantId,
    name: "Plan Full",
    price: 30000,
    currency: "CLP",
    billingCycle: "monthly",
    expirationGraceDays: 5,
    benefits: [],
    status: "active",
  });
  const create = memberships.create.bind(memberships);
  memberships.create = async (createInput) => {
    const membership = await create(createInput);
    payments.memberships.push({
      id: membership.id,
      tenantId: membership.tenantId,
      agreedPrice: membership.agreedPrice,
      currency: membership.currency,
    });
    return membership;
  };
});

describe("assignMembership", () => {
  it("assigns a plan without payment leaving the full balance pending", async () => {
    const result = await assignMembership(input(), { memberships, payments });

    expect(result.payment).toBeNull();
    expect(result.paymentError).toBeUndefined();
    expect(result.membership).toMatchObject({
      studentId,
      planId,
      agreedPrice: 30000,
      currency: "CLP",
      billingCycle: "monthly",
      expiresOn: "2026-05-31",
      status: "active",
    });
    await expect(
      payments.getBalance(tenantId, result.membership.id),
    ).resolves.toMatchObject({ balance: 30000 });
  });

  it("records a full initial payment and settles the balance", async () => {
    const result = await assignMembership(
      input({ initialPayment: initialPayment(30000) }),
      { memberships, payments },
    );

    expect(result.payment).toMatchObject({
      amount: 30000,
      currency: "CLP",
      method: "transfer",
      operationId: paymentOperationId,
    });
    await expect(
      payments.getBalance(tenantId, result.membership.id),
    ).resolves.toMatchObject({ balance: 0 });
  });

  it("keeps the difference pending after a partial payment", async () => {
    const result = await assignMembership(
      input({ initialPayment: initialPayment(10000) }),
      { memberships, payments },
    );

    await expect(
      payments.getBalance(tenantId, result.membership.id),
    ).resolves.toMatchObject({ balance: 20000 });
  });

  it("is idempotent when the same confirmation is retried", async () => {
    const first = await assignMembership(
      input({ initialPayment: initialPayment(10000) }),
      { memberships, payments },
    );
    const second = await assignMembership(
      input({ initialPayment: initialPayment(10000) }),
      { memberships, payments },
    );

    expect(second.membership.id).toBe(first.membership.id);
    expect(second.payment?.id).toBe(first.payment?.id);
    expect(memberships.memberships).toHaveLength(1);
    expect(payments.payments).toHaveLength(1);
  });

  it.each(["active", "paused", "past_due"] as const)(
    "rejects students with a %s membership without creating records",
    async (status) => {
      await assignMembership(
        input({
          assignmentToken: "e0000000-0000-4000-8000-000000000099",
        }),
        { memberships, payments },
      );
      memberships.memberships[0].status = status;

      await expect(
        assignMembership(input({ initialPayment: initialPayment(30000) }), {
          memberships,
          payments,
        }),
      ).rejects.toThrow(
        new ConflictError(CURRENT_MEMBERSHIP_CONFLICT_MESSAGE),
      );
      expect(memberships.memberships).toHaveLength(1);
      expect(payments.payments).toHaveLength(0);
    },
  );

  it("rejects archived plans", async () => {
    memberships.plans[0].status = "archived";

    await expect(
      assignMembership(input(), { memberships, payments }),
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
    expect(memberships.memberships).toHaveLength(0);
  });

  it("rejects unknown plans", async () => {
    await expect(
      assignMembership(
        input({ planId: "e0000000-0000-4000-8000-000000000042" }),
        { memberships, payments },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("keeps the membership and reports the error when the payment fails", async () => {
    payments.record = vi
      .fn()
      .mockRejectedValueOnce(new Error("payment rejected"));

    const result = await assignMembership(
      input({ initialPayment: initialPayment(30000) }),
      { memberships, payments },
    );

    expect(result.membership.status).toBe("active");
    expect(result.payment).toBeNull();
    expect(result.paymentError).toBe("payment rejected");
    expect(memberships.memberships).toHaveLength(1);
  });

  it("retries only the payment after a partial failure", async () => {
    const record = payments.record.bind(payments);
    payments.record = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockImplementation(record);

    const first = await assignMembership(
      input({ initialPayment: initialPayment(30000) }),
      { memberships, payments },
    );
    const retry = await assignMembership(
      input({ initialPayment: initialPayment(30000) }),
      { memberships, payments },
    );

    expect(first.paymentError).toBe("timeout");
    expect(retry.membership.id).toBe(first.membership.id);
    expect(retry.payment).toMatchObject({ amount: 30000 });
    expect(memberships.memberships).toHaveLength(1);
    expect(payments.payments).toHaveLength(1);
  });

  it("rejects non-positive initial payments before creating the membership", async () => {
    await expect(
      assignMembership(input({ initialPayment: initialPayment(0) }), {
        memberships,
        payments,
      }),
    ).rejects.toThrow();
    expect(memberships.memberships).toHaveLength(0);
  });
});
