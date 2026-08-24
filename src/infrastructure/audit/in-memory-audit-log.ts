import type {
  AuditLogEntry,
  AuditLogPort,
} from "@/application/shared/audit/audit-log-port";

/** In-memory `AuditLogPort` adapter for tests and local development without Supabase. */
export class InMemoryAuditLog implements AuditLogPort {
  private readonly entries: AuditLogEntry[] = [];

  async record(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findAll(): Promise<AuditLogEntry[]> {
    return [...this.entries];
  }
}
