import { z } from "zod";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AuditLogPort } from "@/application/shared/audit/audit-log-port";
import type { TenantMembershipRepositoryPort } from "../ports/tenant-membership-repository-port";
import type { TenantRepositoryPort } from "../ports/tenant-repository-port";

const completeInstructorOnboardingSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  tenantName: z.string().trim().min(1, "Tenant name is required"),
});

export type CompleteInstructorOnboardingInput = z.infer<
  typeof completeInstructorOnboardingSchema
>;

export interface CompleteInstructorOnboardingDeps {
  tenants: TenantRepositoryPort;
  memberships: TenantMembershipRepositoryPort;
  audit: AuditLogPort;
}

/**
 * Creates the instructor's first tenant (trial) and owner membership.
 * A user who already has an active membership has already onboarded.
 */
export async function completeInstructorOnboarding(
  input: CompleteInstructorOnboardingInput,
  deps: CompleteInstructorOnboardingDeps,
) {
  const { userId, tenantName } = parseWithSchema(
    completeInstructorOnboardingSchema,
    input,
  );

  const existingMemberships = await deps.memberships.findActiveByUser(userId);
  if (existingMemberships.length > 0) {
    throw new BusinessRuleViolationError(
      "User has already completed onboarding",
    );
  }

  const tenant = await deps.tenants.create({
    name: tenantName,
    createdBy: userId,
  });
  const membership = await deps.memberships.create({
    tenantId: tenant.id,
    userId,
    role: "owner",
  });

  await deps.audit.record({
    tenantId: tenant.id,
    actorId: userId,
    action: "tenant.onboarded",
    entityType: "tenant",
    entityId: tenant.id,
    occurredAt: new Date(),
  });

  return { tenant, membership };
}
