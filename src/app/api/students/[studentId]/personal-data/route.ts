import { exportStudentPersonalData } from "@/application/evolution-health-attendance/use-cases/manage-student-privacy";
import { DomainError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { resolveOperationalContextForUser } from "@/app/_lib/operational-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const context = await resolveOperationalContextForUser(
    userId,
    auth.memberships,
  );
  if (context.status === "selection-required")
    return Response.json(
      { error: "Tenant selection required" },
      { status: 409 },
    );
  if (context.status !== "ready")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await params;
  try {
    const data = await exportStudentPersonalData(
      { tenantId: context.membership.tenantId, studentId },
      await createEvolutionHealthAttendanceDeps(),
    );
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="student-${studentId}-data.json"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json(
      { error: "Personal data export failed" },
      { status: 500 },
    );
  }
}
