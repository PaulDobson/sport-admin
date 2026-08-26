import type { TenantMembership } from "@/domain/tenants/tenant-membership";
import { describe, expect, it } from "vitest";
import { resolveActiveTenant } from "./resolve-active-tenant";

function membership(tenantId: string): TenantMembership {
  return {
    id: `membership-${tenantId}`,
    tenantId,
    userId: "user-1",
    role: "owner",
    status: "active",
    createdAt: new Date("2026-08-24T10:00:00.000Z"),
  };
}

describe("resolveActiveTenant", () => {
  it("selects the only operational membership", () => {
    const result = resolveActiveTenant([membership("tenant-1")]);
    expect(result).toMatchObject({
      status: "selected",
      membership: { tenantId: "tenant-1" },
    });
  });

  it("honors a preferred tenant that remains operational", () => {
    const result = resolveActiveTenant(
      [membership("tenant-1"), membership("tenant-2")],
      "tenant-2",
    );
    expect(result).toMatchObject({
      status: "selected",
      membership: { tenantId: "tenant-2" },
    });
  });

  it("requires selection when a stale cookie does not match multiple memberships", () => {
    const result = resolveActiveTenant(
      [membership("tenant-1"), membership("tenant-2")],
      "tenant-old",
    );
    expect(result.status).toBe("selection-required");
  });

  it("reports unavailable when no operational memberships exist", () => {
    expect(resolveActiveTenant([], "tenant-old")).toEqual({
      status: "unavailable",
    });
  });
});
