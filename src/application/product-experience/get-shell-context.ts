import type { ProfileRepositoryPort } from "@/application/auth/ports/profile-repository-port";
import type { TenantMembershipRepositoryPort } from "@/application/auth/ports/tenant-membership-repository-port";
import type { TenantRepositoryPort } from "@/application/auth/ports/tenant-repository-port";
import type { InstructorDayRepositoryPort } from "@/application/instructor-operations/ports/instructor-day-repository-port";
import { getInstructorDay } from "@/application/instructor-operations/use-cases/get-instructor-day";
import type { InstructorDay } from "@/domain/instructor-operations/instructor-day";
import type { UserProfile } from "@/domain/shared/user-profile";
import type { Tenant } from "@/domain/tenants/tenant";
import type { TenantMembership } from "@/domain/tenants/tenant-membership";
import { resolveActiveTenant } from "./resolve-active-tenant";

interface TenantOption {
  tenant: Tenant;
  membership: TenantMembership;
}

export type ShellContext =
  | { status: "unavailable"; profile: UserProfile | null }
  | {
      status: "selection-required";
      profile: UserProfile | null;
      tenants: TenantOption[];
    }
  | {
      status: "ready";
      profile: UserProfile | null;
      active: TenantOption;
      tenants: TenantOption[];
      day: InstructorDay;
    };

interface ShellContextDeps {
  profiles: ProfileRepositoryPort;
  memberships: TenantMembershipRepositoryPort;
  tenants: TenantRepositoryPort;
  instructorDay: InstructorDayRepositoryPort;
}

export async function getShellContext(
  input: {
    userId: string;
    preferredTenantId?: string | null;
    locationId?: string;
    now: Date;
  },
  deps: ShellContextDeps,
): Promise<ShellContext> {
  const [profile, memberships, tenants] = await Promise.all([
    deps.profiles.findByUserId(input.userId),
    deps.memberships.findOperationalByUser(input.userId),
    deps.tenants.findOperationalByUser(input.userId),
  ]);
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const options = memberships.flatMap((membership) => {
    const tenant = tenantById.get(membership.tenantId);
    return tenant ? [{ tenant, membership }] : [];
  });
  const resolution = resolveActiveTenant(
    options.map((option) => option.membership),
    input.preferredTenantId,
  );

  if (resolution.status === "unavailable") {
    return { status: "unavailable", profile };
  }
  if (resolution.status === "selection-required") {
    return { status: "selection-required", profile, tenants: options };
  }

  const active = options.find(
    (option) => option.membership.id === resolution.membership.id,
  );
  if (!active) return { status: "unavailable", profile };

  const day = await getInstructorDay(
    {
      tenantId: active.tenant.id,
      locationId: input.locationId,
      now: input.now,
    },
    { instructorDay: deps.instructorDay },
  );
  return { status: "ready", profile, active, tenants: options, day };
}
