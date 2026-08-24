import type { OfflineCommandTransportPort } from "@/application/synchronization/ports/offline-command-transport-port";
import type {
  OfflineRecord,
  OfflineStorePort,
} from "@/application/synchronization/ports/offline-store-port";
import type { OfflineCommand } from "@/domain/synchronization/offline-command";

export async function synchronizeOfflineCommands(
  tenantId: string,
  deps: {
    offlineStore: OfflineStorePort;
    transport: OfflineCommandTransportPort;
    now?: () => Date;
  },
) {
  const queued = await deps.offlineStore.list<OfflineCommand>(
    "queue",
    tenantId,
  );
  let confirmed = 0;
  let failed = 0;

  for (const record of queued) {
    if (!["pending", "failed"].includes(record.payload.status)) continue;
    const now = (deps.now ?? (() => new Date()))();
    const syncing: OfflineCommand = {
      ...record.payload,
      status: "syncing",
      updatedAt: now,
    };
    await deps.offlineStore.put("queue", {
      ...record,
      payload: syncing,
      updatedAt: now,
    });

    try {
      const result = await deps.transport.send(syncing);
      if (result.confirmed) {
        await deps.offlineStore.remove("queue", tenantId, record.id);
        confirmed += 1;
        continue;
      }
      if (result.conflict) {
        await deps.offlineStore.put("queue", {
          ...record,
          payload: {
            ...syncing,
            status: "conflict",
            conflict: result.conflict,
            lastError: result.error,
            updatedAt: now,
          },
          updatedAt: now,
        });
        failed += 1;
        continue;
      }
      await markFailed(
        record,
        syncing,
        result.error ?? "Sync was not confirmed",
        deps,
      );
      failed += 1;
    } catch (error) {
      await markFailed(
        record,
        syncing,
        error instanceof Error ? error.message : "Network error",
        deps,
      );
      failed += 1;
    }
  }

  return { confirmed, failed };
}

async function markFailed(
  record: OfflineRecord<OfflineCommand>,
  command: OfflineCommand,
  error: string,
  deps: { offlineStore: OfflineStorePort; now?: () => Date },
) {
  const now = (deps.now ?? (() => new Date()))();
  await deps.offlineStore.put("queue", {
    ...record,
    payload: {
      ...command,
      status: "failed",
      retryCount: command.retryCount + 1,
      lastError: error,
      updatedAt: now,
    },
    updatedAt: now,
  });
}
