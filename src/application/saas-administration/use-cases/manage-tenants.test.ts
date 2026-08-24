import { describe, expect, it } from "vitest";
import { UnauthorizedError, ValidationError } from "@/domain/shared/errors";
import type {
  TenantBackofficeSummary,
  SaasPlanOption,
  TenantEntitlementUsage,
  TenantStatusHistoryEntry,
  TenantTransitionStatus,
} from "@/domain/saas-administration/tenant-backoffice";
import type { TenantBackofficePort } from "../ports/tenant-backoffice-port";
import {
  getTenantPlanManagement,
  getTenantStatusHistory,
  listTenants,
  scheduleTenantPlanLimits,
  transitionTenantStatus,
} from "./manage-tenants";

class FakeTenantBackoffice implements TenantBackofficePort {
  isAdmin = true;
  tenants: TenantBackofficeSummary[] = [];
  history: TenantStatusHistoryEntry[] = [];
  transitions: {
    tenantId: string;
    status: TenantTransitionStatus;
    reason: string;
  }[] = [];
  plans: SaasPlanOption[] = [];
  entitlements: TenantEntitlementUsage | null = null;
  scheduledPlans: Parameters<TenantBackofficePort["schedulePlanLimits"]>[0][] =
    [];

  async isPlatformAdmin() {
    return this.isAdmin;
  }

  async listTenants() {
    return this.tenants;
  }

  async getStatusHistory() {
    return this.history;
  }

  async transitionStatus(input: {
    tenantId: string;
    status: TenantTransitionStatus;
    reason: string;
  }) {
    this.transitions.push(input);
  }

  async listPlans() {
    return this.plans;
  }

  async getEntitlements() {
    return this.entitlements;
  }

  async schedulePlanLimits(
    input: Parameters<TenantBackofficePort["schedulePlanLimits"]>[0],
  ) {
    this.scheduledPlans.push(input);
  }
}

describe("SaaS tenant administration", () => {
  it("lists tenants and their status history for a platform administrator", async () => {
    const backoffice = new FakeTenantBackoffice();
    backoffice.tenants.push({
      id: "e0000000-0000-4000-8000-000000000001",
      name: "Pending Academy",
      status: "pending",
      billingContactName: null,
      billingContactEmail: null,
      createdAt: new Date("2026-08-22T10:00:00Z"),
    });
    backoffice.history.push({
      id: "e0000000-0000-4000-8000-000000000011",
      previousStatus: "pending",
      newStatus: "trial",
      reason: "Registration verified",
      actorUserId: "e0000000-0000-4000-8000-000000000021",
      occurredAt: new Date("2026-08-22T11:00:00Z"),
    });

    await expect(listTenants(backoffice)).resolves.toHaveLength(1);
    await expect(
      getTenantStatusHistory(backoffice.tenants[0].id, backoffice),
    ).resolves.toEqual(backoffice.history);
  });

  it("validates and delegates a status transition with its reason", async () => {
    const backoffice = new FakeTenantBackoffice();

    await transitionTenantStatus(
      {
        tenantId: "e0000000-0000-4000-8000-000000000001",
        status: "suspended",
        reason: "  Payment overdue  ",
      },
      backoffice,
    );

    expect(backoffice.transitions).toEqual([
      {
        tenantId: "e0000000-0000-4000-8000-000000000001",
        status: "suspended",
        reason: "Payment overdue",
      },
    ]);
  });

  it("rejects unauthorized access and invalid transition reasons", async () => {
    const backoffice = new FakeTenantBackoffice();
    backoffice.isAdmin = false;
    await expect(listTenants(backoffice)).rejects.toThrow(UnauthorizedError);

    backoffice.isAdmin = true;
    await expect(
      transitionTenantStatus(
        {
          tenantId: "e0000000-0000-4000-8000-000000000001",
          status: "active",
          reason: "x",
        },
        backoffice,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("retrieves usage and schedules validated plan limits", async () => {
    const backoffice = new FakeTenantBackoffice();
    const tenantId = "e0000000-0000-4000-8000-000000000001";
    const subscriptionId = "e0000000-0000-4000-8000-000000000002";
    const planId = "e0000000-0000-4000-8000-000000000003";
    backoffice.plans.push({
      id: planId,
      name: "Connected",
      maxStudents: 100,
      maxUsers: 5,
      features: ["offline", "realtime"],
    });
    backoffice.entitlements = {
      subscriptionId,
      planId,
      activeStudents: 12,
      activeUsers: 2,
      maxStudents: 25,
      maxUsers: 3,
      features: ["reports"],
    };

    await expect(
      getTenantPlanManagement(tenantId, backoffice),
    ).resolves.toEqual({
      plans: backoffice.plans,
      entitlements: backoffice.entitlements,
    });
    await scheduleTenantPlanLimits(
      {
        tenantId,
        subscriptionId,
        planId,
        effectiveFrom: "2026-09-01",
        reason: "  Upgrade requested  ",
      },
      backoffice,
    );
    expect(backoffice.scheduledPlans).toEqual([
      {
        tenantId,
        subscriptionId,
        planId,
        effectiveFrom: "2026-09-01",
        reason: "Upgrade requested",
      },
    ]);
  });
});
