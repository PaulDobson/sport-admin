import type { TenantStatus } from "@/domain/tenants/tenant";
import type { SaasFeature } from "./plan-entitlement";

export type TenantTransitionStatus = Exclude<TenantStatus, "pending">;

export interface TenantBackofficeSummary {
  id: string;
  name: string;
  status: TenantStatus;
  billingContactName: string | null;
  billingContactEmail: string | null;
  createdAt: Date;
}

export interface TenantStatusHistoryEntry {
  id: string;
  previousStatus: TenantStatus | null;
  newStatus: TenantStatus;
  reason: string;
  actorUserId: string | null;
  occurredAt: Date;
}

export interface SaasPlanOption {
  id: string;
  name: string;
  maxStudents: number;
  maxUsers: number;
  features: SaasFeature[];
}

export interface TenantEntitlementUsage {
  subscriptionId: string;
  planId: string;
  activeStudents: number;
  activeUsers: number;
  maxStudents: number;
  maxUsers: number;
  features: SaasFeature[];
}
