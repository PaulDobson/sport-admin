import { z } from "zod";
import { saveAttendanceBatch } from "@/application/evolution-health-attendance/use-cases/save-attendance-batch";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";

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
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Invalid command" }, { status: 400 });
  const membership = memberships.find(
    (item) => item.tenantId === parsed.data.tenantId,
  );
  if (!membership)
    return Response.json({ error: "Forbidden tenant" }, { status: 403 });

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
    return Response.json({
      confirmed: true,
      operationId: parsed.data.operationId,
    });
  } catch (error) {
    console.error("Offline command synchronization failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { confirmed: false, error: "Command was rejected" },
      { status: 422 },
    );
  }
}
