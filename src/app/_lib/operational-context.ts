import { redirect } from "next/navigation";
import type { TenantMembershipRepositoryPort } from "@/application/auth/ports/tenant-membership-repository-port";
import { resolveActiveTenant } from "@/application/product-experience/resolve-active-tenant";
import type { TenantMembership } from "@/domain/tenants/tenant-membership";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { readActiveTenantCookie } from "@/infrastructure/composition/tenant-context-composition";

export type OperationalContext =
  | { status: "unauthenticated" }
  | { status: "no-membership" }
  | { status: "no-operational-tenant" }
  | { status: "selection-required"; memberships: TenantMembership[] }
  | {
      status: "ready";
      membership: TenantMembership;
      memberships: TenantMembership[];
    };

export async function resolveOperationalContextForUser(
  userId: string,
  memberships: TenantMembershipRepositoryPort,
): Promise<Exclude<OperationalContext, { status: "unauthenticated" }>> {
  const [active, operational, preferredTenantId] = await Promise.all([
    memberships.findActiveByUser(userId),
    memberships.findOperationalByUser(userId),
    readActiveTenantCookie(),
  ]);
  if (active.length === 0) return { status: "no-membership" };
  if (operational.length === 0) return { status: "no-operational-tenant" };

  const resolution = resolveActiveTenant(operational, preferredTenantId);
  if (resolution.status === "selection-required") {
    return { status: "selection-required", memberships: operational };
  }
  if (resolution.status === "unavailable") {
    return { status: "no-operational-tenant" };
  }
  return {
    status: "ready",
    membership: resolution.membership,
    memberships: operational,
  };
}

export async function loadOperationalContext(): Promise<OperationalContext> {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) return { status: "unauthenticated" };
  return resolveOperationalContextForUser(userId, auth.memberships);
}

export async function requireOperationalMembership(): Promise<TenantMembership> {
  const context = await loadOperationalContext();
  if (context.status === "unauthenticated") redirect("/log-in");
  if (context.status === "no-membership") redirect("/onboarding");
  if (context.status === "selection-required") redirect("/select-tenant");
  if (context.status === "no-operational-tenant") redirect("/dashboard");
  return context.membership;
}
