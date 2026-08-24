export const offlineStoreNames = [
  "sessions",
  "students",
  "alerts",
  "metrics",
  "queue",
] as const;

export type OfflineStoreName = (typeof offlineStoreNames)[number];

export interface OfflineRecord<T = unknown> {
  id: string;
  tenantId: string;
  payload: T;
  updatedAt: Date;
  cachedAt: Date;
}

export interface OfflineStorePort {
  put<T>(storeName: OfflineStoreName, record: OfflineRecord<T>): Promise<void>;
  get<T>(
    storeName: OfflineStoreName,
    tenantId: string,
    id: string,
  ): Promise<OfflineRecord<T> | undefined>;
  list<T>(
    storeName: OfflineStoreName,
    tenantId: string,
  ): Promise<OfflineRecord<T>[]>;
  remove(
    storeName: OfflineStoreName,
    tenantId: string,
    id: string,
  ): Promise<void>;
  clearTenant(tenantId: string): Promise<void>;
}
