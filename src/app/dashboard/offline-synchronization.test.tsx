import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
const pendingCommand = {
  operationId: "operation-1",
  tenantId,
  type: "attendance.batch" as const,
  payload: {
    sessionId: "session-1",
    recordedByMembershipId: "membership-1",
    items: [],
  },
  status: "pending" as const,
  retryCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

  it("shows offline status without opening a synchronization loop", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<OfflineSynchronization tenantId={tenantId} />);

    expect(await waitFor(() => screen.getByText("Sin conexión"))).toBeTruthy();
    expect(synchronizeOfflineCommands).not.toHaveBeenCalled();
  });

  it("shows pending queue state after a successful flush", async () => {
    vi.mocked(synchronizeOfflineCommands).mockResolvedValue({
      confirmed: 0,
      failed: 0,
    });
    list.mockResolvedValue([
      { id: "operation-1", tenantId, payload: pendingCommand },
    ]);

    render(<OfflineSynchronization tenantId={tenantId} />);

    expect(
      await waitFor(() => screen.getByText(/Cambios pendientes/)),
    ).toBeTruthy();
    expect(screen.getByText(/1 pendientes/)).toBeTruthy();
  });

  it("shows conflict state with text and alert semantics", async () => {
    vi.mocked(synchronizeOfflineCommands).mockResolvedValue({
      confirmed: 0,
      failed: 0,
    });
    list.mockResolvedValue([
      {
        id: "operation-1",
        tenantId,
        payload: { ...pendingCommand, status: "conflict" },
      },
    ]);

    render(<OfflineSynchronization tenantId={tenantId} />);

    expect(
      await waitFor(() => screen.getByText(/Conflicto por resolver/)),
    ).toBeTruthy();
    expect(
      screen.getByRole("alert", { name: "Conflictos de sincronización" }),
    ).toBeTruthy();
  });
});
