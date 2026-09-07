"use client";

import { useEffect, useState } from "react";
import { synchronizeOfflineCommands } from "@/application/synchronization/use-cases/synchronize-offline-commands";
import type { OfflineCommand } from "@/domain/synchronization/offline-command";
import { createObservability } from "@/infrastructure/composition/observability-composition";
import { createOfflineSynchronizationDeps } from "@/infrastructure/composition/synchronization-composition";
import { Alert, SyncStatusBadge } from "@/presentation/components/primitives";

export type SynchronizationStatus =
  | "online"
  | "offline"
  | "syncing"
  | "pending"
  | "conflict";

export function OfflineSynchronization({ tenantId }: { tenantId: string }) {
  const [conflicts, setConflicts] = useState<OfflineCommand[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<SynchronizationStatus>(
    typeof navigator !== "undefined" && !navigator.onLine
      ? "offline"
      : "online",
  );
  useEffect(() => {
    let running = false;
    let disposed = false;
    const readQueue = async () => {
      const deps = createOfflineSynchronizationDeps();
      try {
        const queue = await deps.offlineStore.list<OfflineCommand>(
          "queue",
          tenantId,
        );
        if (disposed) return;
        const commands = queue.map((record) => record.payload);
        const nextConflicts = commands.filter(
          (command) => command.status === "conflict",
        );
        const nextPendingCount = commands.filter((command) =>
          ["pending", "failed", "syncing"].includes(command.status),
        ).length;
        setConflicts(nextConflicts);
        setPendingCount(nextPendingCount);
        setStatus((current) =>
          nextConflicts.length > 0
            ? "conflict"
            : nextPendingCount > 0
              ? "pending"
              : navigator.onLine
                ? "online"
                : "offline",
        );
      } finally {
        await deps.offlineStore.close();
      }
    };
    const synchronize = async () => {
      if (!navigator.onLine || running || disposed) return;
      running = true;
      setStatus("syncing");
      const startedAt = performance.now();
      const deps = createOfflineSynchronizationDeps();
      const observability = createObservability();
      try {
        const result = await synchronizeOfflineCommands(tenantId, deps);
        observability.record({
          area: "offline_sync",
          operation: "flush_queue",
          outcome: result.failed === 0 ? "success" : "failure",
          durationMs: performance.now() - startedAt,
          itemCount: result.confirmed + result.failed,
          errorCode: result.failed === 0 ? undefined : "COMMANDS_REJECTED",
        });
        await readQueue();
      } catch {
        observability.record({
          area: "offline_sync",
          operation: "flush_queue",
          outcome: "failure",
          durationMs: performance.now() - startedAt,
          errorCode: "NETWORK_FAILURE",
        });
        if (!disposed) setStatus("offline");
      } finally {
        await deps.offlineStore.close();
        running = false;
      }
    };
    const handleOffline = () => setStatus("offline");
    const handleOnline = () => void synchronize();
    void synchronize();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [tenantId]);

  const statusLabel: Record<SynchronizationStatus, string> = {
    online: "Sincronizado",
    offline: "Sin conexión",
    syncing: "Sincronizando",
    pending: "Cambios pendientes",
    conflict: "Conflicto por resolver",
  };

  const badgeStatus: Record<
    SynchronizationStatus,
    Parameters<typeof SyncStatusBadge>[0]["status"]
  > = {
    online: "synced",
    offline: "offline",
    syncing: "syncing",
    pending: "pending",
    conflict: "conflict",
  };

  return (
    <div className="mb-5 space-y-3" aria-live="polite">
      <SyncStatusBadge status={badgeStatus[status]}>
        {statusLabel[status]}
        {pendingCount > 0 ? ` · ${pendingCount} pendientes` : ""}
      </SyncStatusBadge>
      {conflicts.length > 0 ? (
        <Alert title="Conflictos de sincronización" tone="warning">
          <p>
            {conflicts.length} operación pendiente de revisión manual. Los
            cambios de salud del servidor se conservaron.
          </p>
        </Alert>
      ) : null}
    </div>
  );
}
