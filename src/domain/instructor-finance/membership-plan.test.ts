import { describe, expect, it } from "vitest";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import type { MembershipPlan } from "./membership";
import { assertPlanAssignable, isPlanAssignable } from "./membership";

function plan(overrides: Partial<MembershipPlan> = {}): MembershipPlan {
  return {
    id: "plan",
    tenantId: "tenant",
    name: "Mensual",
    price: 45000,
    currency: "CLP",
    billingCycle: "monthly",
    expirationGraceDays: 5,
    benefits: [],
    status: "active",
    ...overrides,
  };
}

describe("membership plan catalog", () => {
  it("treats an active plan as assignable", () => {
    expect(isPlanAssignable(plan())).toBe(true);
    expect(() => assertPlanAssignable(plan())).not.toThrow();
  });

  it("rejects assigning an archived plan", () => {
    expect(isPlanAssignable(plan({ status: "archived" }))).toBe(false);
    expect(() => assertPlanAssignable(plan({ status: "archived" }))).toThrow(
      BusinessRuleViolationError,
    );
  });

  it("carries benefits as part of the plan definition", () => {
    expect(plan({ benefits: ["2 clases semanales"] }).benefits).toEqual([
      "2 clases semanales",
    ]);
  });
});
