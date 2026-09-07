import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { TenantStatus } from "@/domain/tenants/tenant";
import type {
  TenantBackofficeSummary,
  SaasPlanOption,
  TenantEntitlementUsage,
  TenantStatusHistoryEntry,
  TenantTransitionStatus,
} from "@/domain/saas-administration/tenant-backoffice";
import type { TenantBackofficePort } from "@/application/saas-administration/ports/tenant-backoffice-port";

interface TenantSummaryRow {
  id: string;
  name: string;
  status: TenantStatus;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  created_at: string;
}

interface TenantHistoryRow {
  id: string;
  previous_status: TenantStatus | null;
  new_status: TenantStatus;
  reason: string;
  actor_user_id: string | null;
  occurred_at: string;
}

interface SaasPlanRow {
  id: string;
  name: string;
  max_students: number;
  max_users: number;
  features: SaasPlanOption["features"];
}

interface TenantEntitlementRow {
  subscription_id: string;
  plan_id: string;
  active_students: number;
  active_users: number;
  max_students: number;
  max_users: number;
  features: TenantEntitlementUsage["features"];
}

export class SupabaseTenantBackoffice implements TenantBackofficePort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async isPlatformAdmin(): Promise<boolean> {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throw error;
    return data === true;
  }

  async listTenants(): Promise<TenantBackofficeSummary[]> {
    const { data, error } = await this.client.rpc("list_saas_tenants");
    if (error) throw error;
    return ((data ?? []) as TenantSummaryRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      billingContactName: row.billing_contact_name,
      billingContactEmail: row.billing_contact_email,
      createdAt: new Date(row.created_at),
    }));
  }

  async getStatusHistory(
    tenantId: string,
  ): Promise<TenantStatusHistoryEntry[]> {
    const { data, error } = await this.client.rpc(
      "get_saas_tenant_status_history",
      { target_tenant: tenantId },
    );
    if (error) throw error;
    return ((data ?? []) as TenantHistoryRow[]).map((row) => ({
      id: row.id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      reason: row.reason,
      actorUserId: row.actor_user_id,
      occurredAt: new Date(row.occurred_at),
    }));
  }

  async transitionStatus(input: {
    tenantId: string;
    status: TenantTransitionStatus;
    reason: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("transition_saas_tenant_status", {
      target_tenant: input.tenantId,
      target_status: input.status,
      transition_reason: input.reason,
    });
    if (error) throw error;
  }

  async listPlans(): Promise<SaasPlanOption[]> {
    const { data, error } = await this.client.rpc("list_active_saas_plans");
    if (error) throw error;
    return ((data ?? []) as SaasPlanRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      maxStudents: row.max_students,
      maxUsers: row.max_users,
      features: row.features,
    }));
  }

  async getEntitlements(
    tenantId: string,
  ): Promise<TenantEntitlementUsage | null> {
    const { data, error } = await this.client.rpc(
      "get_saas_tenant_entitlements",
      {
        target_tenant: tenantId,
      },
    );
    if (error) throw error;
    const row = (data?.[0] ?? null) as TenantEntitlementRow | null;
    return row
      ? {
          subscriptionId: row.subscription_id,
          planId: row.plan_id,
          activeStudents: Number(row.active_students),
          activeUsers: Number(row.active_users),
          maxStudents: row.max_students,
          maxUsers: row.max_users,
          features: row.features,
        }
      : null;
  }

  async schedulePlanLimits(input: {
    tenantId: string;
    subscriptionId: string;
    planId: string;
    effectiveFrom: string;
    reason: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("schedule_saas_plan_limits", {
      target_tenant: input.tenantId,
      target_subscription: input.subscriptionId,
      target_plan: input.planId,
      target_effective_from: input.effectiveFrom,
      change_reason: input.reason,
    });
    if (error) throw error;
  }
}
