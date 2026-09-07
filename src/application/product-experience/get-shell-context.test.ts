import { describe, expect, it, vi } from "vitest";
import type { InstructorDayRepositoryPort } from "@/application/instructor-operations/ports/instructor-day-repository-port";
import type { TenantMembership } from "@/domain/tenants/tenant-membership";
import { getShellContext } from "./get-shell-context";

const userId = "10000000-0000-4000-8000-000000000001";
const tenantId = "10000000-0000-4000-8000-000000000002";
const otherTenantId = "10000000-0000-4000-8000-000000000003";

function membership(id: string): TenantMembership {
  return {
    id: `membership-${id}`,
    tenantId: id,
    userId,
    role: "owner",
    status: "active",
    createdAt: new Date("2026-08-24T10:00:00.000Z"),
  };
}

function tenant(id: string) {
  return {
    id,
    name: id === tenantId ? "Box Norte" : "Box Sur",
    status: "active" as const,
    createdBy: userId,
    createdAt: new Date("2026-08-24T10:00:00.000Z"),
  };
}

function instructorDay(): InstructorDayRepositoryPort {
  return {
    countActiveStudents: vi.fn().mockResolvedValue(12),
    listActiveLocations: vi.fn().mockResolvedValue([]),
    listOpenSessions: vi.fn().mockResolvedValue([]),
  };
}

describe("getShellContext", () => {
  it("composes identity in parallel and loads the validated tenant day", async () => {
    let resolveProfile!: (value: null) => void;
    let resolveMemberships!: (value: TenantMembership[]) => void;
    let resolveTenants!: (value: ReturnType<typeof tenant>[]) => void;
    const profiles = {
      findByUserId: vi.fn(
        () => new Promise<null>((resolve) => (resolveProfile = resolve)),
      ),
      updateByUserId: vi.fn(),
    };
    const memberships = {
      create: vi.fn(),
      findActiveByUser: vi.fn(),
      findOperationalByUser: vi.fn(
        () =>
          new Promise<TenantMembership[]>(
            (resolve) => (resolveMemberships = resolve),
          ),
      ),
    };
    const tenants = {
      create: vi.fn(),
      findById: vi.fn(),
      findOperationalByUser: vi.fn(
        () =>
          new Promise<ReturnType<typeof tenant>[]>(
            (resolve) => (resolveTenants = resolve),
          ),
      ),
    };
    const day = instructorDay();

    const pending = getShellContext(
      { userId, preferredTenantId: tenantId, now: new Date() },
      { profiles, memberships, tenants, instructorDay: day },
    );
    expect(profiles.findByUserId).toHaveBeenCalledOnce();
    expect(memberships.findOperationalByUser).toHaveBeenCalledOnce();
    expect(tenants.findOperationalByUser).toHaveBeenCalledOnce();

    resolveProfile(null);
    resolveMemberships([membership(tenantId)]);
    resolveTenants([tenant(tenantId)]);
    const result = await pending;

    expect(result).toMatchObject({
      status: "ready",
      active: { tenant: { id: tenantId }, membership: { role: "owner" } },
    });
    expect(day.countActiveStudents).toHaveBeenCalledWith(tenantId);
  });

  it("does not read a day when a stale tenant is not authorized", async () => {
    const day = instructorDay();
    const result = await getShellContext(
      {
        userId,
        preferredTenantId: "10000000-0000-4000-8000-000000000099",
        now: new Date(),
      },
      {
        profiles: {
          findByUserId: vi.fn().mockResolvedValue(null),
          updateByUserId: vi.fn(),
        },
        memberships: {
          create: vi.fn(),
          findActiveByUser: vi.fn(),
          findOperationalByUser: vi
            .fn()
            .mockResolvedValue([
              membership(tenantId),
              membership(otherTenantId),
            ]),
        },
        tenants: {
          create: vi.fn(),
          findById: vi.fn(),
          findOperationalByUser: vi
            .fn()
            .mockResolvedValue([tenant(tenantId), tenant(otherTenantId)]),
        },
        instructorDay: day,
      },
    );

    expect(result.status).toBe("selection-required");
    expect(day.countActiveStudents).not.toHaveBeenCalled();
  });
});
