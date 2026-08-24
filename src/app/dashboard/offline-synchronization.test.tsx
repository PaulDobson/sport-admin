import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineSynchronization } from "./offline-synchronization";
import { synchronizeOfflineCommands } from "@/application/synchronization/use-cases/synchronize-offline-commands";

const close = vi.fn();
const list = vi.fn();

vi.mock(
  "@/application/synchronization/use-cases/synchronize-offline-commands",
  () => ({ synchronizeOfflineCommands: vi.fn() }),
);
vi.mock("@/infrastructure/composition/synchronization-composition", () => ({
  createOfflineSynchronizationDeps: () => ({
    offlineStore: { close, list },
    transport: {},
  }),
}));

const tenantId = "c84d5db9-bc46-4f45-aa31-d16e77327c01";

describe("OfflineSynchronization observability", () => {
  beforeEach(() => {
    close.mockReset();
    list.mockReset();
    vi.mocked(synchronizeOfflineCommands).mockReset();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(cleanup);

  it("records a network failure without tenant identifiers", async () => {
    vi.mocked(synchronizeOfflineCommands).mockRejectedValue(
      new Error(`Network failed for ${tenantId}`),
    );
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<OfflineSynchronization tenantId={tenantId} />);

    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    const serialized = String(error.mock.calls[0][0]);
    expect(JSON.parse(serialized)).toMatchObject({
      area: "offline_sync",
      operation: "flush_queue",
      outcome: "failure",
      errorCode: "NETWORK_FAILURE",
    });
    expect(serialized).not.toContain(tenantId);
  });
});
