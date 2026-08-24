"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/domain/evolution-health-attendance/attendance";
import { saveAttendanceBatch } from "@/application/evolution-health-attendance/use-cases/save-attendance-batch";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface AttendanceFormState {
  error: string | null;
  saved: boolean;
}

export async function saveAttendanceAction(
  _previousState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) redirect("/onboarding");

  const studentIds = formData.getAll("studentId").map(String);
  const statuses = formData.getAll("status").map(String);
  const notes = formData.getAll("note").map(String);
  const operationIds = formData.getAll("operationId").map(String);
  const sessionId = String(formData.get("sessionId") ?? "");
  const deps = await createEvolutionHealthAttendanceDeps();

  try {
    await saveAttendanceBatch(
      {
        tenantId: memberships[0].tenantId,
        sessionId,
        recordedByMembershipId: memberships[0].id,
        items: studentIds.map((studentId, index) => ({
          studentId,
          status: statuses[index] as AttendanceStatus,
          note: notes[index] || undefined,
          operationId: operationIds[index],
        })),
      },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  revalidatePath(`/dashboard/sessions/${sessionId}/attendance`);
  return { error: null, saved: true };
}
