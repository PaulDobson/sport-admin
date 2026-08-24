import { exportStudentPersonalData } from "@/application/evolution-health-attendance/use-cases/manage-student-privacy";
import { DomainError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await params;
  try {
    const data = await exportStudentPersonalData(
      { tenantId: memberships[0].tenantId, studentId },
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
