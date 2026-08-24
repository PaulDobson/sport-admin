import { ConsoleObservability } from "@/infrastructure/observability/console-observability";

export function createObservability() {
  return new ConsoleObservability();
}
