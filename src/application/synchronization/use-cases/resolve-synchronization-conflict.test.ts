import { describe, expect, it } from "vitest";
import type {
  AuditLogEntry,
  AuditLogPort,
} from "@/application/shared/audit/audit-log-port";
import { resolveAndAuditSynchronizationConflict } from "./resolve-synchronization-conflict";

class RecordingAudit implements AuditLogPort {
  entries: AuditLogEntry[] = [];

  async record(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}

const base = {
  tenantId: "c84d5db9-bc46-4f45-aa31-d16e77327c01",
  actorId: "89721ba3-65e0-467d-bffa-abf4249cf3c6",
  entityId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1",
  localVersion: 2,
  serverVersion: 3,
  localUpdatedAt: new Date("2026-08-23T14:05:00Z"),
  serverUpdatedAt: new Date("2026-08-23T14:00:00Z"),
};

describe("resolveAndAuditSynchronizationConflict", () => {
  it("uses last write for attendance and audits the decision", async () => {
    const audit = new RecordingAudit();
    expect(
      await resolveAndAuditSynchronizationConflict(
        { ...base, entityType: "attendance" },
        { audit },
      ),
    ).toEqual({ action: "apply-local", preserveServerTransition: false });
    expect(audit.entries).toHaveLength(1);
  });

  it("preserves sensitive health transitions for manual review", async () => {
    const audit = new RecordingAudit();
    expect(
      await resolveAndAuditSynchronizationConflict(
        { ...base, entityType: "health" },
        { audit },
      ),
    ).toEqual({ action: "manual-review", preserveServerTransition: true });
  });
});
