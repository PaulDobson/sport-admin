import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsoleObservability } from "./console-observability";

describe("ConsoleObservability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits only allow-listed operational fields", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const observability = new ConsoleObservability();

    observability.record({
      area: "offline_sync",
      operation: "flush_queue",
      outcome: "success",
      durationMs: 12.6,
      itemCount: 5,
      tenantId: "c84d5db9-bc46-4f45-aa31-d16e77327c01",
      medicalNote: "Dolor de rodilla",
    } as Parameters<ConsoleObservability["record"]>[0]);

    expect(info).toHaveBeenCalledOnce();
    const serialized = String(info.mock.calls[0][0]);
    expect(JSON.parse(serialized)).toEqual({
      type: "sport_admin_observability",
      area: "offline_sync",
      operation: "flush_queue",
      outcome: "success",
      durationMs: 13,
      itemCount: 5,
    });
    expect(serialized).not.toContain("c84d5db9");
    expect(serialized).not.toContain("Dolor");
  });

  it("drops unsafe error text and uses severity by outcome", () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const observability = new ConsoleObservability();

    observability.record({
      area: "saas_webhook",
      operation: "process",
      outcome: "failure",
      durationMs: -1,
      errorCode: "student c84d5db9 has condition",
    });

    const serialized = String(error.mock.calls[0][0]);
    expect(JSON.parse(serialized)).toEqual({
      type: "sport_admin_observability",
      area: "saas_webhook",
      operation: "process",
      outcome: "failure",
      durationMs: 0,
    });
  });
});
