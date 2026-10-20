import type { ManualPaymentInput, ManualPaymentResult, ReceiptDeliveryInput, ReceiptDetail, ReceiptSummary } from "@/domain/saas-administration/payment-receipt";

export interface BillingPaymentsPort {
  isPlatformAdmin(): Promise<boolean>;
  pay(input: ManualPaymentInput): Promise<ManualPaymentResult>;
  voidInvoice(input: { invoiceId: string; operationId: string; reason: string }): Promise<void>;
  getReceipt(id: string): Promise<ReceiptDetail>;
  listReceipts(invoiceId: string): Promise<ReceiptSummary[]>;
  requestDelivery(input: ReceiptDeliveryInput): Promise<{ deliveryId: string; status: "queued" }>;
  retryPdf(id: string): Promise<{ status: "queued" | "ready" }>;
  reconcileDelivery(input: { deliveryId: string; providerId: string | null; notSent: boolean; reason: string }): Promise<void>;
}
