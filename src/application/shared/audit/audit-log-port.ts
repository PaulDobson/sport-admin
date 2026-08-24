/** A single, append-only audit trail entry. Every privileged or sensitive action SHALL record one. */
export interface AuditLogEntry {
  tenantId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Port for recording audit entries. Infrastructure adapters (e.g. a Supabase-backed
 * audit log table) implement this interface; application use cases depend on it,
 * never on a concrete adapter.
 */
export interface AuditLogPort {
  record(entry: AuditLogEntry): Promise<void>;
}
