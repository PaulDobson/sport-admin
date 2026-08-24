import { describe, expect, it } from "vitest";
import type {
  OfflineRecord,
  OfflineStoreName,
  OfflineStorePort,
} from "@/application/synchronization/ports/offline-store-port";
import { enqueueOfflineCommand } from "./enqueue-offline-command";

class RecordingOfflineStore implements OfflineStorePort {
  record?: OfflineRecord;

  async put<T>(_storeName: OfflineStoreName, record: OfflineRecord<T>) {
    this.record = record;
  }
  async get<T>() {
    return undefined as OfflineRecord<T> | undefined;
  }
  async list<T>() {
    return [] as OfflineRecord<T>[];
  }
  async remove() {}
  async clearTenant() {}
}

describe("enqueueOfflineCommand", () => {
  it("stores a pending attendance command with retry metadata", async () => {
    const offlineStore = new RecordingOfflineStore();
    const now = new Date("2026-08-23T13:00:00.000Z");
    const command = await enqueueOfflineCommand(
      {
        operationId: "0d23446f-7386-4eba-b217-9f94f2ae45a7",
        tenantId: "c84d5db9-bc46-4f45-aa31-d16e77327c01",
        type: "attendance.batch",
        payload: {
          sessionId: "f1541ed4-ee2c-45df-8618-72d96e682ad7",
          recordedByMembershipId: "89721ba3-65e0-467d-bffa-abf4249cf3c6",
          items: [
            {
              studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1",
              status: "present",
              operationId: "3b39a94c-a8f0-44b2-959a-2e8e1f03c9d1",
            },
          ],
        },
      },
      { offlineStore, now: () => now },
    );

    expect(command).toMatchObject({ status: "pending", retryCount: 0 });
    expect(offlineStore.record).toMatchObject({
      id: command.operationId,
      tenantId: command.tenantId,
      payload: command,
      updatedAt: now,
      cachedAt: now,
    });
  });
});
