import type {
  TenantBackofficeSummary,
  SaasPlanOption,
  TenantEntitlementUsage,
  TenantStatusHistoryEntry,
  TenantTransitionStatus,
} from "@/domain/saas-administration/tenant-backoffice";

export interface TenantBackofficePort {
  isPlatformAdmin(): Promise<boolean>;
  listTenants(): Promise<TenantBackofficeSummary[]>;
  getStatusHistory(tenantId: string): Promise<TenantStatusHistoryEntry[]>;
  transitionStatus(input: {
    tenantId: string;
    status: TenantTransitionStatus;
    reason: string;
  }): Promise<void>;
  listPlans(): Promise<SaasPlanOption[]>;
  getEntitlements(tenantId: string): Promise<TenantEntitlementUsage | null>;
  schedulePlanLimits(input: {
    tenantId: string;
    subscriptionId: string;
    planId: string;
    effectiveFrom: string;
    reason: string;
  }): Promise<void>;
}
