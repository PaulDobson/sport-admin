"use client";

import { startTransition, useEffect, useState } from "react";
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

// Module-level constants — not recreated on every render.
const STATUS_LABEL: Record<SynchronizationStatus, string> = {
  online: "Sincronizado",
  offline: "Sin conexión",
  syncing: "Sincronizando",
  pending: "Cambios pendientes",
  conflict: "Conflicto por resolver",
};

const BADGE_STATUS: Record<
  SynchronizationStatus,
  Parameters<typeof SyncStatusBadge>[0]["status"]
> = {
  online: "synced",
  offline: "offline",
  syncing: "syncing",
  pending: "pending",
  conflict: "conflict",
};

export function OfflineSynchronization({ tenantId }: { tenantId: string }) {
  const [conflicts, setConflicts] = useState<OfflineCommand[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  // Always start with "online" to match the server render, then correct on the
  // client inside the effect to avoid a hydration mismatch.
  const [status, setStatus] = useState<SynchronizationStatus>("online");

  useEffect(() => {
    let running = false;
    let disposed = false;

    // Correct the initial status now that we're on the client.
    // Wrapped in startTransition to avoid a synchronous setState inside an
    // effect body, which would trigger cascading renders.
    if (!navigator.onLine) {
      startTransition(() => setStatus("offline"));
    }

    // Reads the current queue state using a single deps instance and closes it
    // when done, returning the derived counts for the caller to apply.
    const readQueue = async (): Promise<{
      nextConflicts: OfflineCommand[];
      nextPendingCount: number;
    }> => {
      const deps = createOfflineSynchronizationDeps();
      try {
        const queue = await deps.offlineStore.list<OfflineCommand>(
          "queue",
          tenantId,
        );
        const commands = queue.map((record) => record.payload);
        const nextConflicts = commands.filter(
          (command) => command.status === "conflict",
        );
        const nextPendingCount = commands.filter((command) =>
          ["pending", "failed", "syncing"].includes(command.status),
        ).length;
        return { nextConflicts, nextPendingCount };
      } finally {
        await deps.offlineStore.close();
      }
    };

    // Applies queue state to React state — always called after readQueue.
    const applyQueueState = ({
      nextConflicts,
      nextPendingCount,
    }: {
      nextConflicts: OfflineCommand[];
      nextPendingCount: number;
    }) => {
      if (disposed) return;
      setConflicts(nextConflicts);
      setPendingCount(nextPendingCount);
      setStatus(
        nextConflicts.length > 0
          ? "conflict"
          : nextPendingCount > 0
            ? "pending"
            : navigator.onLine
              ? "online"
              : "offline",
      );
    };

    const synchronize = async () => {
      if (!navigator.onLine || running || disposed) return;
      running = true;
      setStatus("syncing");
      const startedAt = performance.now();
      // Single deps instance shared between synchronize and readQueue calls
      // within this flow, preventing double-open of the IndexedDB connection.
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
        // Close before re-reading to avoid two open connections.
        await deps.offlineStore.close();
        const queueState = await readQueue();
        applyQueueState(queueState);
      } catch {
        observability.record({
          area: "offline_sync",
          operation: "flush_queue",
          outcome: "failure",
          durationMs: performance.now() - startedAt,
          errorCode: "NETWORK_FAILURE",
        });
        try {
          await deps.offlineStore.close();
        } catch {
          // Ignore close errors on failure path.
        }
        if (!disposed) setStatus("offline");
      } finally {
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

  return (
    <div className="mb-5 space-y-3" aria-live="polite">
      <SyncStatusBadge status={BADGE_STATUS[status]}>
        {STATUS_LABEL[status]}
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
