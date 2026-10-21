import type { SaasFeature } from "./plan-entitlement";

export interface AssignmentRequest {
  tenantId: string;
  planVersionId: string;
  startsOn: string;
  useTrial: boolean;
  dueOn: string | null;
}

export interface AssignmentPreview extends AssignmentRequest {
  fingerprint: string;
  tenantName: string;
  tenantStatus: string;
  businessDate: string;
  planId: string;
  planName: string;
  versionNumber: number;
  trialEndExclusive: string | null;
  firstPaidPeriod: { startsOn: string; endsBefore: string };
  resolvedDueOn: string;
  price: number;
  initialAmount: number;
  createsInvoice: boolean;
  net: number;
  vat: number;
  durationUnit: "days" | "months";
  durationCount: number;
  activeStudents: number;
  activeUsers: number;
  maxStudents: number;
  maxUsers: number;
  features: SaasFeature[];
  services: string[];
}

export interface AssignmentConfirmation extends AssignmentRequest {
  fingerprint: string;
  operationId: string;
  reason: string;
}

export interface AssignmentResult {
  tenantId: string;
  subscriptionId: string;
  planVersionId: string;
  invoiceId: string | null;
  status: "trial" | "active";
  initialAmount: number;
  periodEndExclusive: string;
}

export interface SubscriptionManagement {
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  businessDate: string;
  activeStudents: number;
  activeUsers: number;
  scheduledChange: {
    id: string;
    planName: string;
    price: number;
    currency: string;
    effectiveOn: string;
    status: "scheduled" | "blocked";
    reason: string;
    blockedReason: string | null;
  } | null;
  subscription: {
    id: string;
    planId: string;
    planVersionId: string | null;
    planName: string | null;
    status: "trial" | "active" | "past_due" | "suspended";
    paymentStatus: "pending" | "paid" | "failed" | "partial" | "not_due";
    startsOn: string;
    periodStartsOn: string;
    periodEndExclusive: string;
    nextBillingDate: string | null;
    price: number;
    currency: string;
    durationUnit: "days" | "months" | null;
    durationCount: number | null;
  } | null;
}
