import { describe, expect, it, vi } from "vitest";
import type {
  OfflineRecord,
  OfflineStorePort,
} from "@/application/synchronization/ports/offline-store-port";
import type { SessionResyncTransportPort } from "@/application/synchronization/ports/session-resync-transport-port";
import { resynchronizeSession } from "./resynchronize-session";

const tenantId = "c84d5db9-bc46-4f45-aa31-d16e77327c01";
const sessionId = "f1541ed4-ee2c-45df-8618-72d96e682ad7";

class CursorStore implements OfflineStorePort {
  record?: OfflineRecord<{ lastEventId: number }>;
  async put<T>(_store: "sessions", record: OfflineRecord<T>) {
    this.record = record as OfflineRecord<{ lastEventId: number }>;
  }
  async get<T>() {
    return this.record as OfflineRecord<T> | undefined;
  }
  async list<T>() {
    return [] as OfflineRecord<T>[];
  }
  async remove() {}
  async clearTenant() {}
}

describe("resynchronizeSession", () => {
  it("recovers missed events after the persisted cursor without Realtime", async () => {
    const offlineStore = new CursorStore();
    offlineStore.record = {
      id: `sync-cursor:${sessionId}`,
      tenantId,
      payload: { lastEventId: 7 },
      updatedAt: new Date("2026-08-23T14:00:00Z"),
      cachedAt: new Date("2026-08-23T14:00:00Z"),
    };
    const listChanges = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 8,
          eventType: "attendance",
          entityId: "event-1",
          operation: "update",
          occurredAt: new Date("2026-08-23T14:05:00Z"),
        },
        {
          id: 9,
          eventType: "alert",
          entityId: "event-2",
          operation: "insert",
          occurredAt: new Date("2026-08-23T14:06:00Z"),
        },
      ])
      .mockResolvedValueOnce([]);
    const transport: SessionResyncTransportPort = { listChanges };

    expect(
      await resynchronizeSession(
        { tenantId, sessionId },
        { offlineStore, transport },
      ),
    ).toEqual({ changed: true, recovered: 2 });
    expect(listChanges).toHaveBeenNthCalledWith(1, sessionId, 7);
    expect(listChanges).toHaveBeenNthCalledWith(2, sessionId, 9);
    expect(offlineStore.record?.payload.lastEventId).toBe(9);
  });
});
