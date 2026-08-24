export type SynchronizationEntityType = "attendance" | "health";

export interface SynchronizationConflict {
  entityType: SynchronizationEntityType;
  entityId: string;
  localVersion: number;
  serverVersion: number;
  localUpdatedAt: Date;
  serverUpdatedAt: Date;
}

export interface SynchronizationConflictResolution {
  action: "apply-local" | "keep-server" | "manual-review";
  preserveServerTransition: boolean;
}

export function resolveSynchronizationConflict(
  conflict: SynchronizationConflict,
): SynchronizationConflictResolution {
  if (conflict.entityType === "health") {
    return { action: "manual-review", preserveServerTransition: true };
  }
  return {
    action:
      conflict.localUpdatedAt >= conflict.serverUpdatedAt
        ? "apply-local"
        : "keep-server",
    preserveServerTransition: false,
  };
}
