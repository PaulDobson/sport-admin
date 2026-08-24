import { defineAuditLogPortContract } from "@/application/shared/audit/audit-log-port.contract";
import { InMemoryAuditLog } from "./in-memory-audit-log";

defineAuditLogPortContract(() => {
  const log = new InMemoryAuditLog();
  return { port: log, recorded: () => log.findAll() };
});
