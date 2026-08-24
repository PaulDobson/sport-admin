"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activateMembership } from "@/application/instructor-finance/use-cases/manage-membership";
import { createHealthRestriction } from "@/application/evolution-health-attendance/use-cases/manage-student-health";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface StudentDetailFormState {
  error: string | null;
  saved: boolean;
}

async function getRequestMembership() {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) redirect("/onboarding");
  return memberships[0];
}

export async function activateMembershipAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await activateMembership(
      {
        tenantId: actor.tenantId,
        studentId,
        planId: String(formData.get("planId") ?? ""),
        startsOn: String(formData.get("startsOn") ?? ""),
        actorMembershipId: actor.id,
        operationId: randomUUID(),
      },
      await createInstructorFinanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/finance");
  return { error: null, saved: true };
}

export async function createRestrictionAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await createHealthRestriction(
      {
        tenantId: actor.tenantId,
        studentId,
        description: String(formData.get("description") ?? ""),
        operationalAction: String(formData.get("operationalAction") ?? ""),
        severity: String(formData.get("severity") ?? "yellow") as
          | "red"
          | "yellow"
          | "green",
        source: "instructor_report",
        startsOn: String(formData.get("startsOn") ?? ""),
        endsOn: String(formData.get("endsOn") ?? "") || undefined,
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}
