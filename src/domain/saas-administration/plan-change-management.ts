import type { SaasFeature } from "./plan-entitlement";

export interface PlanChangeRequest { tenantId: string; planVersionId: string }
export interface PlanChangePreview extends PlanChangeRequest {
  subscriptionId: string;
  currentVersionId: string;
  currentPlanName: string | null;
  planName: string;
  versionNumber: number;
  fingerprint: string;
  kind: "upgrade" | "downgrade" | "equivalent";
  businessDate: string;
  effectiveOn: string;
  periodStartsOn: string;
  periodEndExclusive: string;
  remainingDays: number;
  currentRateNumerator: string;
  currentRateDenominator: string;
  newRateNumerator: string;
  newRateDenominator: string;
  amountDue: number;
  net: number;
  vat: number;
  price: number;
  durationUnit: "days" | "months";
  durationCount: number;
  activeStudents: number;
  activeUsers: number;
  maxStudents: number;
  maxUsers: number;
  features: SaasFeature[];
  services: string[];
}
export interface PlanChangeConfirmation extends PlanChangeRequest {
  fingerprint: string; operationId: string; reason: string;
}
export interface PlanChangeResult extends PlanChangeRequest {
  subscriptionId: string; kind: "upgrade" | "downgrade" | "equivalent";
  effectiveOn: string; amountDue: number; invoiceId: string | null; scheduledChangeId: string | null;
}
export interface CancelPlanChangeInput {
  tenantId: string; scheduledChangeId: string; operationId: string; reason: string;
}
