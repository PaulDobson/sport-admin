import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { OfflineStorePort } from "@/application/synchronization/ports/offline-store-port";
import type { OfflineCommand } from "@/domain/synchronization/offline-command";

const schema = z.object({
  operationId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: z.literal("attendance.batch"),
  payload: z.object({
    sessionId: z.string().uuid(),
    recordedByMembershipId: z.string().uuid(),
    items: z
      .array(
        z.object({
          studentId: z.string().uuid(),
          status: z.enum(["present", "absent", "late", "excused"]),
          note: z.string().trim().optional(),
          operationId: z.string().uuid(),
        }),
      )
      .min(1),
  }),
});

export async function enqueueOfflineCommand(
  input: z.input<typeof schema>,
  deps: { offlineStore: OfflineStorePort; now?: () => Date },
): Promise<OfflineCommand> {
  const parsed = parseWithSchema(schema, input);
  const now = (deps.now ?? (() => new Date()))();
  const command: OfflineCommand = {
    ...parsed,
    status: "pending",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await deps.offlineStore.put("queue", {
    id: command.operationId,
    tenantId: command.tenantId,
    payload: command,
    updatedAt: now,
    cachedAt: now,
  });
  return command;
}
