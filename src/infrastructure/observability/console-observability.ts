import type {
  ObservabilityEvent,
  ObservabilityPort,
} from "@/application/shared/observability/observability-port";

const safeErrorCode = /^[A-Z0-9_]{1,40}$/;

export class ConsoleObservability implements ObservabilityPort {
  record(event: ObservabilityEvent) {
    const entry = {
      type: "sport_admin_observability",
      area: event.area,
      operation: event.operation,
      outcome: event.outcome,
      durationMs: Math.max(0, Math.round(event.durationMs)),
      ...(event.itemCount === undefined
        ? {}
        : { itemCount: Math.max(0, Math.round(event.itemCount)) }),
      ...(event.errorCode && safeErrorCode.test(event.errorCode)
        ? { errorCode: event.errorCode }
        : {}),
    };

    const serialized = JSON.stringify(entry);
    if (event.outcome === "failure") {
      console.error(serialized);
    } else if (event.outcome === "rejected") {
      console.warn(serialized);
    } else {
      console.info(serialized);
    }
  }
}
