import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  offlineStoreNames,
  type OfflineRecord,
} from "@/application/synchronization/ports/offline-store-port";
import { IndexedDbOfflineStore } from "./indexed-db-offline-store";

const databaseName = "sport-admin-offline-test";

afterEach(async () => {
  await deleteDB(databaseName);
});

describe("IndexedDbOfflineStore", () => {
  it("persists every offline store after closing and reopening", async () => {
    const tenantId = "c84d5db9-bc46-4f45-aa31-d16e77327c01";
    const updatedAt = new Date("2026-08-23T12:00:00.000Z");
    const cachedAt = new Date("2026-08-23T12:01:00.000Z");
    const first = new IndexedDbOfflineStore(databaseName);

    await Promise.all(
      offlineStoreNames.map((storeName) =>
        first.put(storeName, {
          id: `${storeName}-1`,
          tenantId,
          payload: { storeName },
          updatedAt,
          cachedAt,
        }),
      ),
    );
    await first.close();

    const reopened = new IndexedDbOfflineStore(databaseName);
    for (const storeName of offlineStoreNames) {
      const record = await reopened.get<{ storeName: string }>(
        storeName,
        tenantId,
        `${storeName}-1`,
      );
      expect(record).toEqual<OfflineRecord>({
        id: `${storeName}-1`,
        tenantId,
        payload: { storeName },
        updatedAt,
        cachedAt,
      });
    }
    await reopened.close();
  });

  it("isolates records and clearing by tenant", async () => {
    const store = new IndexedDbOfflineStore(databaseName);
    const base = {
      id: "session-1",
      payload: {},
      updatedAt: new Date(),
      cachedAt: new Date(),
    };
    await store.put("sessions", { ...base, tenantId: "tenant-a" });
    await store.put("sessions", { ...base, tenantId: "tenant-b" });

    await store.clearTenant("tenant-a");

    expect(await store.list("sessions", "tenant-a")).toEqual([]);
    expect(await store.list("sessions", "tenant-b")).toHaveLength(1);
    await store.close();
  });
});
