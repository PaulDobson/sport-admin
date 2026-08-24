import { describe, expect, it } from "vitest";
import type { AuditLogEntry, AuditLogPort } from "./audit-log-port";

/** Test-only handle bundling a port implementation with a way to inspect what it persisted. */
export interface AuditLogPortTestHarness {
  port: AuditLogPort;
  recorded: () => Promise<AuditLogEntry[]>;
}

/**
 * Shared contract test suite for `AuditLogPort` implementations. Every adapter
 * (in-memory, Supabase-backed, etc.) SHALL pass this suite so audit behavior
 * stays consistent across infrastructure choices.
 */
export function defineAuditLogPortContract(
  createHarness: () =>
    | AuditLogPortTestHarness
    | Promise<AuditLogPortTestHarness>,
) {
  describe("AuditLogPort contract", () => {
    it("persists a recorded entry", async () => {
      const { port, recorded } = await createHarness();
      const entry: AuditLogEntry = {
        tenantId: "tenant-1",
        actorId: "user-1",
        action: "student.created",
        entityType: "student",
        entityId: "student-1",
        occurredAt: new Date("2026-01-01T00:00:00Z"),
      };

      await port.record(entry);

      expect(await recorded()).toContainEqual(entry);
    });

    it("keeps entries from different tenants distinguishable", async () => {
      const { port, recorded } = await createHarness();

      await port.record({
        tenantId: "tenant-1",
        actorId: "user-1",
        action: "student.created",
        entityType: "student",
        entityId: "student-1",
        occurredAt: new Date("2026-01-01T00:00:00Z"),
      });
      await port.record({
        tenantId: "tenant-2",
        actorId: "user-2",
        action: "student.created",
        entityType: "student",
        entityId: "student-2",
        occurredAt: new Date("2026-01-01T00:00:01Z"),
      });

      const tenantIds = new Set(
        (await recorded()).map((entry) => entry.tenantId),
      );
      expect(tenantIds).toEqual(new Set(["tenant-1", "tenant-2"]));
    });

    it("allows a null actorId for system-initiated actions", async () => {
      const { port, recorded } = await createHarness();
      const entry: AuditLogEntry = {
        tenantId: "tenant-1",
        actorId: null,
        action: "membership.expired",
        entityType: "student_membership",
        entityId: "membership-1",
        occurredAt: new Date("2026-01-01T00:00:00Z"),
      };

      await port.record(entry);

      expect(await recorded()).toContainEqual(entry);
    });
  });
}
