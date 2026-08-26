import type { TenantMembership } from "@/domain/tenants/tenant-membership";

export type ActiveTenantResolution =
  | { status: "selected"; membership: TenantMembership }
  | { status: "selection-required"; memberships: TenantMembership[] }
  | { status: "unavailable" };

export function resolveActiveTenant(
  memberships: TenantMembership[],
  preferredTenantId?: string | null,
): ActiveTenantResolution {
  if (memberships.length === 0) return { status: "unavailable" };

  const preferred = preferredTenantId
    ? memberships.find(
        (membership) => membership.tenantId === preferredTenantId,
      )
    : undefined;
  if (preferred) return { status: "selected", membership: preferred };

  if (memberships.length === 1) {
    return { status: "selected", membership: memberships[0] };
  }

  return { status: "selection-required", memberships };
}
