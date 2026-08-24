import { IndexedDbOfflineStore } from "@/infrastructure/synchronization/indexed-db-offline-store";
import { FetchOfflineCommandTransport } from "@/infrastructure/synchronization/fetch-offline-command-transport";
import { FetchSessionResyncTransport } from "@/infrastructure/synchronization/fetch-session-resync-transport";

export function createOfflineStore() {
  return new IndexedDbOfflineStore();
}

export function createOfflineSynchronizationDeps() {
  return {
    offlineStore: createOfflineStore(),
    transport: new FetchOfflineCommandTransport(),
  };
}

export function createSessionResynchronizationDeps() {
  return {
    offlineStore: createOfflineStore(),
    transport: new FetchSessionResyncTransport(),
  };
}
