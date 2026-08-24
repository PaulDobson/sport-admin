export type SaasPaymentEventType =
  | "charge.succeeded"
  | "charge.failed"
  | "refund.succeeded"
  | "refund.failed";

export interface SaasPaymentEvent {
  provider: string;
  externalEventId: string;
  type: SaasPaymentEventType;
  externalSubscriptionId: string;
  externalInvoiceId: string | null;
  externalChargeId: string;
  externalRefundId: string | null;
  amount: string;
  currency: string;
  occurredAt: Date;
  reason: string | null;
}
