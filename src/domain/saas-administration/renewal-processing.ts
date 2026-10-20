export type RenewalProcessingResult =
  | { status: "idle" }
  | {
    status: "failed"; tenantId: string; subscriptionId: string; periodStartsOn: string;
    errorCode: string; message: string;
  }
  | {
    status: "renewed"; tenantId: string; subscriptionId: string; planVersionId: string;
    periodStartsOn: string; periodEndExclusive: string; dueOn: string; amount: number;
    invoiceId: string | null; changeStatus: "applied" | "blocked" | null; blockedReason: string | null;
  };
export interface RenewalProcessingRequest {
  requestId: string;
  subscriptionId: string | null;
  expectedPeriodEnd: string | null;
}
export interface RenewalProcessorStatus {
  businessDate: string;
  lastRunAt: string | null;
  lastWorkerRunAt: string | null;
  dueCount: number;
  failures: {
    subscriptionId: string; tenantId: string; tenantName: string; periodStartsOn: string;
    attemptCount: number; nextAttemptAt: string | null; errorCode: string;
  }[];
  blockedChanges: {
    id: string; subscriptionId: string; tenantId: string; tenantName: string;
    effectiveOn: string; blockedReason: string;
  }[];
}
