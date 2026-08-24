import type { AuditLogPort } from "@/application/shared/audit/audit-log-port";
import {
  resolveSynchronizationConflict,
  type SynchronizationConflict,
} from "@/domain/synchronization/conflict";

export async function resolveAndAuditSynchronizationConflict(
  input: SynchronizationConflict & { tenantId: string; actorId: string | null },
  deps: { audit: AuditLogPort; now?: () => Date },
) {
  const resolution = resolveSynchronizationConflict(input);
  await deps.audit.record({
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: "synchronization_conflict",
    entityType: input.entityType,
    entityId: input.entityId,
    occurredAt: (deps.now ?? (() => new Date()))(),
    metadata: {
      localVersion: input.localVersion,
      serverVersion: input.serverVersion,
      resolution: resolution.action,
      preserveServerTransition: resolution.preserveServerTransition,
    },
  });
  return resolution;
}
