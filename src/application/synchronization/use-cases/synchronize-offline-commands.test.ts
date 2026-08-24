import { describe, expect, it } from "vitest";
import type { OfflineCommandTransportPort } from "@/application/synchronization/ports/offline-command-transport-port";
import type {
  OfflineRecord,
  OfflineStorePort,
} from "@/application/synchronization/ports/offline-store-port";
import type { OfflineCommand } from "@/domain/synchronization/offline-command";
import { synchronizeOfflineCommands } from "./synchronize-offline-commands";

const tenantId = "c84d5db9-bc46-4f45-aa31-d16e77327c01";
const now = new Date("2026-08-23T14:00:00.000Z");

function command(operationId: string): OfflineCommand {
  return {
    operationId,
    tenantId,
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
    status: "pending",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

class QueueStore implements OfflineStorePort {
  records = new Map<string, OfflineRecord<OfflineCommand>>();
  removed: string[] = [];
  async put<T>(_store: "queue", record: OfflineRecord<T>) {
    this.records.set(record.id, record as OfflineRecord<OfflineCommand>);
  }
  async get<T>() {
    return undefined as OfflineRecord<T> | undefined;
  }
  async list<T>() {
    return [...this.records.values()] as OfflineRecord<T>[];
  }
  async remove(_store: "queue", _tenantId: string, id: string) {
    this.removed.push(id);
    this.records.delete(id);
  }
  async clearTenant() {}
}

describe("synchronizeOfflineCommands", () => {
  it("removes only commands confirmed by the server and retains failures for retry", async () => {
    const store = new QueueStore();
    const accepted = command("0d23446f-7386-4eba-b217-9f94f2ae45a7");
    const rejected = command("6f4ea75f-6b57-4731-945e-c39411d2949c");
    await store.put("queue", {
      id: accepted.operationId,
      tenantId,
      payload: accepted,
      updatedAt: now,
      cachedAt: now,
    });
    await store.put("queue", {
      id: rejected.operationId,
      tenantId,
      payload: rejected,
      updatedAt: now,
      cachedAt: now,
    });
    const transport: OfflineCommandTransportPort = {
      send: async (item) => ({
        confirmed: item.operationId === accepted.operationId,
        error: "RLS rejected command",
      }),
    };

    expect(
      await synchronizeOfflineCommands(tenantId, {
        offlineStore: store,
        transport,
        now: () => now,
      }),
    ).toEqual({ confirmed: 1, failed: 1 });
    expect(store.removed).toEqual([accepted.operationId]);
    expect(store.records.get(rejected.operationId)?.payload).toMatchObject({
      status: "failed",
      retryCount: 1,
    });
  });
});
