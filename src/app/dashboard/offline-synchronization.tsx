"use client";

import { useEffect, useState } from "react";
import { synchronizeOfflineCommands } from "@/application/synchronization/use-cases/synchronize-offline-commands";
import type { OfflineCommand } from "@/domain/synchronization/offline-command";
import { createObservability } from "@/infrastructure/composition/observability-composition";
import { createOfflineSynchronizationDeps } from "@/infrastructure/composition/synchronization-composition";

export function OfflineSynchronization({ tenantId }: { tenantId: string }) {
  const [conflicts, setConflicts] = useState<OfflineCommand[]>([]);
  useEffect(() => {
    let running = false;
    const synchronize = async () => {
      if (!navigator.onLine || running) return;
      running = true;
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
        const queue = await deps.offlineStore.list<OfflineCommand>(
          "queue",
          tenantId,
        );
        setConflicts(
          queue
            .map((record) => record.payload)
            .filter((command) => command.status === "conflict"),
        );
      } catch {
        observability.record({
          area: "offline_sync",
          operation: "flush_queue",
          outcome: "failure",
          durationMs: performance.now() - startedAt,
          errorCode: "NETWORK_FAILURE",
        });
      } finally {
        await deps.offlineStore.close();
        running = false;
      }
    };
    void synchronize();
    window.addEventListener("online", synchronize);
    return () => window.removeEventListener("online", synchronize);
  }, [tenantId]);

  if (conflicts.length === 0) return null;
  return (
    <section role="alert" className="mb-5 border border-warning bg-card p-4">
      <h2 className="font-semibold">Conflictos de sincronización</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {conflicts.length} operación pendiente de revisión manual. Los cambios
        de salud del servidor se conservaron.
      </p>
    </section>
  );
}
