import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { Json } from "@/infrastructure/supabase/database.types";
import type {
  AuditLogEntry,
  AuditLogPort,
} from "@/application/shared/audit/audit-log-port";

/** Persists audit entries to the append-only `audit_log` table. No update/delete: see migration 0002. */
export class SupabaseAuditLog implements AuditLogPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async record(entry: AuditLogEntry): Promise<void> {
    const { error } = await this.client.from("audit_log").insert({
      tenant_id: entry.tenantId,
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      occurred_at: entry.occurredAt.toISOString(),
      metadata: (entry.metadata ?? {}) as Json,
    });
    if (error) throw error;
  }
}
