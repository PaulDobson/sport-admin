import { z } from "zod";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { TenantBackofficePort } from "../ports/tenant-backoffice-port";

const tenantIdSchema = z.string().uuid("Tenant id must be a UUID");
const transitionSchema = z.object({
  tenantId: tenantIdSchema,
  status: z.enum(["trial", "active", "suspended", "cancelled"]),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must have at least 3 characters")
    .max(500),
});
const schedulePlanSchema = z.object({
  tenantId: tenantIdSchema,
  subscriptionId: z.string().uuid("Subscription id must be a UUID"),
  planId: z.string().uuid("Plan id must be a UUID"),
  effectiveFrom: z.iso.date(),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must have at least 3 characters")
    .max(500),
});

async function assertPlatformAdmin(backoffice: TenantBackofficePort) {
  if (!(await backoffice.isPlatformAdmin())) {
    throw new UnauthorizedError("Platform administrator access required");
  }
}

export async function listTenants(backoffice: TenantBackofficePort) {
  await assertPlatformAdmin(backoffice);
  return backoffice.listTenants();
}

export async function getTenantStatusHistory(
  tenantId: string,
  backoffice: TenantBackofficePort,
) {
  await assertPlatformAdmin(backoffice);
  const validTenantId = parseWithSchema(tenantIdSchema, tenantId);
  return backoffice.getStatusHistory(validTenantId);
}

export async function transitionTenantStatus(
  input: z.input<typeof transitionSchema>,
  backoffice: TenantBackofficePort,
) {
  await assertPlatformAdmin(backoffice);
  const validInput = parseWithSchema(transitionSchema, input);
  await backoffice.transitionStatus(validInput);
}

export async function getTenantPlanManagement(
  tenantId: string,
  backoffice: TenantBackofficePort,
) {
  await assertPlatformAdmin(backoffice);
  const validTenantId = parseWithSchema(tenantIdSchema, tenantId);
  const [plans, entitlements] = await Promise.all([
    backoffice.listPlans(),
    backoffice.getEntitlements(validTenantId),
  ]);
  return { plans, entitlements };
}

export async function scheduleTenantPlanLimits(
  input: z.input<typeof schedulePlanSchema>,
  backoffice: TenantBackofficePort,
) {
  await assertPlatformAdmin(backoffice);
  await backoffice.schedulePlanLimits(
    parseWithSchema(schedulePlanSchema, input),
  );
}
