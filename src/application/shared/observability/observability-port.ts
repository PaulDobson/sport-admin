export type ObservabilityArea =
  | "application"
  | "offline_sync"
  | "realtime_resync"
  | "rls"
  | "saas_webhook";

export type ObservabilityOutcome = "success" | "rejected" | "failure";

export interface ObservabilityEvent {
  area: ObservabilityArea;
  operation: string;
  outcome: ObservabilityOutcome;
  durationMs: number;
  itemCount?: number;
  errorCode?: string;
}

export interface ObservabilityPort {
  record(event: ObservabilityEvent): void;
}
