import { describe, expect, it } from "vitest";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { completeInstructorOnboarding } from "./complete-instructor-onboarding";
import {
  FakeAuditLog,
  FakeTenantMembershipRepository,
  FakeTenantRepository,
} from "../testing/fakes";

describe("completeInstructorOnboarding", () => {
  it("creates a trial tenant and an owner membership, and records an audit entry", async () => {
    const tenants = new FakeTenantRepository();
    const memberships = new FakeTenantMembershipRepository();
    const audit = new FakeAuditLog();

    const result = await completeInstructorOnboarding(
      {
        userId: "00000000-0000-0000-0000-000000000001",
        tenantName: "Studio Fit",
      },
      { tenants, memberships, audit },
    );

    expect(result.tenant.name).toBe("Studio Fit");
    expect(result.tenant.status).toBe("trial");
    expect(result.membership.role).toBe("owner");
    expect(result.membership.status).toBe("active");
    expect(audit.entries).toEqual([
      expect.objectContaining({
        action: "tenant.onboarded",
        tenantId: result.tenant.id,
        actorId: "00000000-0000-0000-0000-000000000001",
      }),
    ]);
  });

  it("rejects onboarding a user who already has an active membership", async () => {
    const tenants = new FakeTenantRepository();
    const memberships = new FakeTenantMembershipRepository();
    const audit = new FakeAuditLog();
    const userId = "00000000-0000-0000-0000-000000000001";

    await completeInstructorOnboarding(
      { userId, tenantName: "First Studio" },
      { tenants, memberships, audit },
    );

    await expect(
      completeInstructorOnboarding(
        { userId, tenantName: "Second Studio" },
        { tenants, memberships, audit },
      ),
    ).rejects.toThrow(BusinessRuleViolationError);
  });
});
