"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/domain/evolution-health-attendance/attendance";
import { saveAttendanceBatch } from "@/application/evolution-health-attendance/use-cases/save-attendance-batch";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { searchAttendanceStudents } from "@/application/evolution-health-attendance/use-cases/search-attendance-students";

export interface AttendanceStudentSearchState {
  error: string | null;
  students: Array<{ studentId: string; studentName: string }>;
  page: number;
  total: number;
  search: string;
  searched: boolean;
}

export async function searchAttendanceStudentsAction(
  _previousState: AttendanceStudentSearchState,
  formData: FormData,
): Promise<AttendanceStudentSearchState> {
  const membership = await requireOperationalMembership();
  const search = String(formData.get("search") ?? "").trim();
  try {
    const deps = await createEvolutionHealthAttendanceDeps();
    const page = Number(formData.get("page") ?? 1);
    const result = await searchAttendanceStudents(
      { tenantId: membership.tenantId, search, page },
      deps,
    );
    return {
      error: null,
      students: result.students,
      page,
      total: result.total,
      search,
      searched: true,
    };
  } catch (error) {
    return { error: formatActionError(error), students: [], page: 1, total: 0, search, searched: true };
  }
}

export interface AttendanceFormState {
  error: string | null;
  saved: boolean;
}

export async function saveAttendanceAction(
  _previousState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const membership = await requireOperationalMembership();

  const studentIds = formData.getAll("studentId").map(String);
  const statuses = formData.getAll("status").map(String);
  const notes = formData.getAll("note").map(String);
  const operationIds = formData.getAll("operationId").map(String);
  const sessionId = String(formData.get("sessionId") ?? "");
  const deps = await createEvolutionHealthAttendanceDeps();

  try {
    await saveAttendanceBatch(
      {
        tenantId: membership.tenantId,
        sessionId,
        recordedByMembershipId: membership.id,
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
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/schedule");
  return { error: null, saved: true };
}
