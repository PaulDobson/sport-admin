import { z } from "zod";
import { saveAttendanceBatch } from "@/application/evolution-health-attendance/use-cases/save-attendance-batch";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { createObservability } from "@/infrastructure/composition/observability-composition";

const schema = z.object({
  operationId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: z.literal("attendance.batch"),
  payload: z.object({
    sessionId: z.string().uuid(),
    items: z
      .array(
        z.object({
          studentId: z.string().uuid(),
          status: z.enum(["present", "absent", "late", "excused"]),
          note: z.string().optional(),
          operationId: z.string().uuid(),
        }),
      )
      .min(1),
  }),
});

export async function POST(request: Request) {
  const startedAt = performance.now();
  const observability = createObservability();
  const record = (
    area: "offline_sync" | "rls",
    outcome: "success" | "rejected" | "failure",
    errorCode?: string,
    itemCount?: number,
  ) =>
    observability.record({
      area,
      operation: "process_commands",
      outcome,
      durationMs: performance.now() - startedAt,
      errorCode,
      itemCount,
    });
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) {
    record("rls", "rejected", "UNAUTHENTICATED");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) {
    record("rls", "rejected", "NO_ACTIVE_MEMBERSHIP");
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    record("offline_sync", "rejected", "INVALID_COMMAND");
    return Response.json({ error: "Invalid command" }, { status: 400 });
  }
  const membership = memberships.find(
    (item) => item.tenantId === parsed.data.tenantId,
  );
  if (!membership) {
    record("rls", "rejected", "FORBIDDEN_TENANT");
    return Response.json({ error: "Forbidden tenant" }, { status: 403 });
  }

  try {
    await saveAttendanceBatch(
      {
        tenantId: membership.tenantId,
        sessionId: parsed.data.payload.sessionId,
        recordedByMembershipId: membership.id,
        items: parsed.data.payload.items,
      },
      await createEvolutionHealthAttendanceDeps(),
    );
    record(
      "offline_sync",
      "success",
      undefined,
      parsed.data.payload.items.length,
    );
    return Response.json({
      confirmed: true,
      operationId: parsed.data.operationId,
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "COMMAND_REJECTED";
    record(
      code === "42501" ? "rls" : "offline_sync",
      code === "42501" ? "rejected" : "failure",
      code,
      parsed.data.payload.items.length,
    );
    return Response.json(
      { confirmed: false, error: "Command was rejected" },
      { status: 422 },
    );
  }
}
