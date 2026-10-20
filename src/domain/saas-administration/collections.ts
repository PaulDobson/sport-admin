export const collectionStatuses = ["all", "open", "past_due", "paid", "draft", "void", "refunded"] as const;
export type CollectionStatusFilter = typeof collectionStatuses[number];
export type CollectionStatus = Exclude<CollectionStatusFilter, "all">;

export interface CollectionFilters {
  tenantId: string | null;
  query: string;
  status: CollectionStatusFilter;
  currency: string | null;
  dueFrom: string | null;
  dueUntil: string | null;
  page: number;
  pageSize: number;
}

export interface SaasCollection {
  id: string;
  tenantId: string;
  tenantName: string;
  subscriptionId: string;
  invoiceNumber: string;
  storedStatus: CollectionStatus;
  status: CollectionStatus;
  kind: "legacy" | "initial" | "renewal" | "upgrade";
  amount: number;
  currency: string;
  confirmedAmount: number;
  balance: number;
  inFlightCount: number;
  importedSettlement: boolean;
  periodStartsOn: string;
  periodEndExclusive: string | null;
  dueOn: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  planName: string | null;
}

export interface CollectionsPage {
  businessDate: string;
  total: number;
  page: number;
  pageSize: number;
  items: SaasCollection[];
}

export interface CollectionCharge {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded";
  occurredAt: string;
  provider: string | null;
  manualMethod: "transfer" | "cash" | "external_card" | null;
  manualReference: string | null;
}

export interface CollectionRefund {
  id: string;
  chargeId: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  requestedAt: string;
  processedAt: string | null;
  reason: string;
}

export interface CollectionDetail {
  businessDate: string;
  invoice: SaasCollection;
  charges: CollectionCharge[];
  refunds: CollectionRefund[];
  chargeCount: number;
  refundCount: number;
}
