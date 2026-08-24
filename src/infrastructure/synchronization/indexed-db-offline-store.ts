import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  offlineStoreNames,
  type OfflineRecord,
  type OfflineStoreName,
  type OfflineStorePort,
} from "@/application/synchronization/ports/offline-store-port";

interface StoredOfflineRecord extends OfflineRecord {
  key: string;
}

interface OfflineStoreSchema {
  key: string;
  value: StoredOfflineRecord;
  indexes: { tenantId: string };
}

interface SportAdminOfflineDb extends DBSchema {
  sessions: OfflineStoreSchema;
  students: OfflineStoreSchema;
  alerts: OfflineStoreSchema;
  metrics: OfflineStoreSchema;
  queue: OfflineStoreSchema;
}

const DEFAULT_DATABASE_NAME = "sport-admin-offline";
const DATABASE_VERSION = 1;

function recordKey(tenantId: string, id: string) {
  return `${tenantId}:${id}`;
}

export class IndexedDbOfflineStore implements OfflineStorePort {
  private databasePromise: Promise<IDBPDatabase<SportAdminOfflineDb>>;

  constructor(databaseName = DEFAULT_DATABASE_NAME) {
    this.databasePromise = openDB<SportAdminOfflineDb>(
      databaseName,
      DATABASE_VERSION,
      {
        upgrade(database) {
          for (const storeName of offlineStoreNames) {
            if (database.objectStoreNames.contains(storeName)) continue;
            const store = database.createObjectStore(storeName, {
              keyPath: "key",
            });
            store.createIndex("tenantId", "tenantId");
          }
        },
      },
    );
  }

  async put<T>(storeName: OfflineStoreName, record: OfflineRecord<T>) {
    const database = await this.databasePromise;
    await database.put(storeName, {
      ...record,
      key: recordKey(record.tenantId, record.id),
    });
  }

  async get<T>(storeName: OfflineStoreName, tenantId: string, id: string) {
    const database = await this.databasePromise;
    const stored = await database.get(storeName, recordKey(tenantId, id));
    return stored ? this.withoutKey<T>(stored) : undefined;
  }

  async list<T>(storeName: OfflineStoreName, tenantId: string) {
    const database = await this.databasePromise;
    const records = await database.getAllFromIndex(
      storeName,
      "tenantId",
      tenantId,
    );
    return records.map((record) => this.withoutKey<T>(record));
  }

  async remove(storeName: OfflineStoreName, tenantId: string, id: string) {
    const database = await this.databasePromise;
    await database.delete(storeName, recordKey(tenantId, id));
  }

  async clearTenant(tenantId: string) {
    const database = await this.databasePromise;
    const transaction = database.transaction(offlineStoreNames, "readwrite");
    await Promise.all(
      offlineStoreNames.map(async (storeName) => {
        const keys = await transaction
          .objectStore(storeName)
          .index("tenantId")
          .getAllKeys(tenantId);
        await Promise.all(
          keys.map((key) => transaction.objectStore(storeName).delete(key)),
        );
      }),
    );
    await transaction.done;
  }

  async close() {
    const database = await this.databasePromise;
    database.close();
  }

  private withoutKey<T>(record: StoredOfflineRecord): OfflineRecord<T> {
    const { key: _key, ...offlineRecord } = record;
    return offlineRecord as OfflineRecord<T>;
  }
}
