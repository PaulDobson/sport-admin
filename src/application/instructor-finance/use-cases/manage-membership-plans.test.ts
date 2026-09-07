import { beforeEach, describe, expect, it } from "vitest";
import { FakeMembershipRepository } from "../testing/fake-membership-repository";
import {
  activateMembership,
  createMembershipPlan,
  listMembershipPlans,
  setMembershipPlanStatus,
  updateMembershipPlan,
} from "./manage-membership";

const tenantId = "aa000000-0000-4000-8000-000000000001";
const studentId = "aa000000-0000-4000-8000-000000000002";
const actorMembershipId = "aa000000-0000-4000-8000-000000000003";
const operationId = "aa000000-0000-4000-8000-000000000004";

let repository: FakeMembershipRepository;

beforeEach(() => {
  repository = new FakeMembershipRepository();
});

async function seedPlan() {
  return createMembershipPlan(
    {
      tenantId,
      name: "Mensual",
      price: 45000,
      billingCycle: "monthly",
      expirationGraceDays: 5,
    },
    { memberships: repository },
  );
}

describe("membership plan catalog", () => {
  it("creates a plan with CLP by default and lists it as active", async () => {
    const plan = await seedPlan();

    expect(plan.currency).toBe("CLP");
    expect(plan.status).toBe("active");
    await expect(
      listMembershipPlans({ tenantId }, { memberships: repository }),
    ).resolves.toHaveLength(1);
  });

  it("reports how many memberships each plan has", async () => {
    const plan = await seedPlan();
    await activateMembership(
      {
        tenantId,
        studentId,
        planId: plan.id,
        startsOn: "2026-09-01",
        actorMembershipId,
        operationId,
      },
      { memberships: repository },
    );

    const [listed] = await listMembershipPlans(
      { tenantId },
      { memberships: repository },
    );
    expect(listed.membershipCount).toBe(1);
  });

  it("updates commercial attributes without touching live memberships", async () => {
    const plan = await seedPlan();
    await activateMembership(
      {
        tenantId,
        studentId,
        planId: plan.id,
        startsOn: "2026-09-01",
        actorMembershipId,
        operationId,
      },
      { memberships: repository },
    );

    const updated = await updateMembershipPlan(
      {
        tenantId,
        planId: plan.id,
        name: "Mensual Plus",
        price: 60000,
        currency: "CLP",
        billingCycle: "monthly",
        expirationGraceDays: 10,
        benefits: ["3 clases semanales"],
      },
      { memberships: repository },
    );

    expect(updated.price).toBe(60000);
    expect(updated.benefits).toEqual(["3 clases semanales"]);
    expect(repository.memberships[0].agreedPrice).toBe(45000);
    expect(repository.memberships[0].expirationGraceDays).toBe(5);
  });

  it("archives a plan so it stops being assignable and can be reactivated", async () => {
    const plan = await seedPlan();

    await setMembershipPlanStatus(
      { tenantId, planId: plan.id, status: "archived" },
      { memberships: repository },
    );
    await expect(repository.findActivePlans(tenantId)).resolves.toHaveLength(0);
    await expect(
      listMembershipPlans(
        { tenantId, status: "archived" },
        { memberships: repository },
      ),
    ).resolves.toHaveLength(1);
    await expect(
      activateMembership(
        {
          tenantId,
          studentId,
          planId: plan.id,
          startsOn: "2026-09-01",
          actorMembershipId,
          operationId,
        },
        { memberships: repository },
      ),
    ).rejects.toThrow(/archived/i);

    await setMembershipPlanStatus(
      { tenantId, planId: plan.id, status: "active" },
      { memberships: repository },
    );
    await expect(repository.findActivePlans(tenantId)).resolves.toHaveLength(1);
  });

  it("rejects invalid commercial input", () => {
    expect(() =>
      createMembershipPlan(
        {
          tenantId,
          name: "Inválido",
          price: -1,
          billingCycle: "monthly",
          expirationGraceDays: 5,
        },
        { memberships: repository },
      ),
    ).toThrow();
    expect(() =>
      createMembershipPlan(
        {
          tenantId,
          name: "Inválido",
          price: 1000,
          currency: "clp",
          billingCycle: "monthly",
          expirationGraceDays: 5,
        },
        { memberships: repository },
      ),
    ).toThrow();
    expect(() =>
      createMembershipPlan(
        {
          tenantId,
          name: "Inválido",
          price: 1000,
          billingCycle: "monthly",
          expirationGraceDays: 400,
        },
        { memberships: repository },
      ),
    ).toThrow();
  });
});
