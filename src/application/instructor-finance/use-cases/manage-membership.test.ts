import { beforeEach, describe, expect, it } from "vitest";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { FakeMembershipRepository } from "../testing/fake-membership-repository";
import {
  activateMembership,
  cancelMembership,
  expireMembership,
  listCurrentMemberships,
  pauseMembership,
  renewMembership,
  createMembershipPlan,
} from "./manage-membership";

const tenantId = "b0000000-0000-4000-8000-000000000001";
const studentId = "b0000000-0000-4000-8000-000000000002";
const planId = "b0000000-0000-4000-8000-000000000003";
const actorMembershipId = "b0000000-0000-4000-8000-000000000004";
let repository: FakeMembershipRepository;

function operationId(value: number) {
  return `b0000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;
}

beforeEach(() => {
  repository = new FakeMembershipRepository();
  repository.plans.push({
    id: planId,
    tenantId,
    price: 300,
    currency: "USD",
    billingCycle: "quarterly",
    expirationGraceDays: 10,
    benefits: [],
    status: "active",
  });
});

describe("membership lifecycle", () => {
  it("defaults new plans to CLP", async () => {
    const plan = await createMembershipPlan(
      {
        tenantId,
        name: "Local Monthly",
        price: 30000,
        billingCycle: "monthly",
        expirationGraceDays: 10,
      },
      { memberships: repository },
    );

    expect(plan.currency).toBe("CLP");
  });

  it("creates an active plan definition", async () => {
    const plan = await createMembershipPlan(
      {
        tenantId,
        name: "Quarterly",
        price: 300,
        currency: "USD",
        billingCycle: "quarterly",
        expirationGraceDays: 10,
      },
      { memberships: repository },
    );
    expect(plan).toMatchObject({
      name: "Quarterly",
      billingCycle: "quarterly",
    });
  });

  it("uses PostgreSQL-compatible month-end dates", async () => {
    repository.plans[0].billingCycle = "monthly";
    const membership = await activateMembership(
      {
        tenantId,
        studentId,
        planId,
        startsOn: "2027-01-31",
        actorMembershipId,
        operationId: operationId(11),
      },
      { memberships: repository },
    );

    expect(membership.nextBillingDate).toBe("2027-02-28");
    expect(membership.expiresOn).toBe("2027-02-27");
  });

  it("activates, pauses, renews, and cancels with an event per transition", async () => {
    const membership = await activateMembership(
      {
        tenantId,
        studentId,
        planId,
        startsOn: "2026-08-01",
        actorMembershipId,
        operationId: operationId(1),
      },
      { memberships: repository },
    );
    expect(membership).toMatchObject({
      status: "active",
      agreedPrice: 300,
      currency: "USD",
      billingCycle: "quarterly",
      expiresOn: "2026-10-31",
      nextBillingDate: "2026-11-01",
    });

    await pauseMembership(
      {
        tenantId,
        membershipId: membership.id,
        effectiveOn: "2026-09-01",
        actorMembershipId,
        operationId: operationId(2),
      },
      { memberships: repository },
    );
    await renewMembership(
      {
        tenantId,
        membershipId: membership.id,
        effectiveOn: "2026-10-15",
        actorMembershipId,
        operationId: operationId(3),
      },
      { memberships: repository },
    );
    await cancelMembership(
      {
        tenantId,
        membershipId: membership.id,
        effectiveOn: "2026-11-15",
        actorMembershipId,
        operationId: operationId(4),
      },
      { memberships: repository },
    );

    expect(membership.status).toBe("cancelled");
    expect(repository.events.map((event) => event.type)).toEqual([
      "membership_activated",
      "membership_paused",
      "membership_active",
      "membership_cancelled",
    ]);
  });

  it("moves an overdue membership through grace and then expires it", async () => {
    const membership = await activateMembership(
      {
        tenantId,
        studentId,
        planId,
        startsOn: "2026-05-01",
        actorMembershipId,
        operationId: operationId(5),
      },
      { memberships: repository },
    );
    await expireMembership(
      {
        tenantId,
        membershipId: membership.id,
        effectiveOn: "2026-08-02",
        actorMembershipId,
        operationId: operationId(6),
      },
      { memberships: repository },
    );
    expect(membership.status).toBe("past_due");
    expect(
      await listCurrentMemberships(
        { tenantId, studentId, onDate: "2026-08-05" },
        { memberships: repository },
      ),
    ).toHaveLength(1);

    await expireMembership(
      {
        tenantId,
        membershipId: membership.id,
        effectiveOn: "2026-08-12",
        actorMembershipId,
        operationId: operationId(7),
      },
      { memberships: repository },
    );
    expect(membership.status).toBe("expired");
    expect(
      await listCurrentMemberships(
        { tenantId, studentId, onDate: "2026-08-12" },
        { memberships: repository },
      ),
    ).toHaveLength(0);
  });

  it("rejects transitions from a cancelled membership", async () => {
    const membership = await activateMembership(
      {
        tenantId,
        studentId,
        planId,
        startsOn: "2026-08-01",
        actorMembershipId,
        operationId: operationId(8),
      },
      { memberships: repository },
    );
    await cancelMembership(
      {
        tenantId,
        membershipId: membership.id,
        effectiveOn: "2026-08-02",
        actorMembershipId,
        operationId: operationId(9),
      },
      { memberships: repository },
    );

    await expect(
      renewMembership(
        {
          tenantId,
          membershipId: membership.id,
          effectiveOn: "2026-08-03",
          actorMembershipId,
          operationId: operationId(10),
        },
        { memberships: repository },
      ),
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
});
