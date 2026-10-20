"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHealthRestriction } from "@/application/evolution-health-attendance/use-cases/manage-student-health";
import {
  correctStudentPersonalData,
  registerStudentHealthConsent,
  requestStudentErasure,
} from "@/application/evolution-health-attendance/use-cases/manage-student-privacy";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { requireOperationalMembership } from "@/app/_lib/operational-context";

export interface StudentDetailFormState {
  error: string | null;
  saved: boolean;
}

async function getRequestMembership() {
  const membership = await requireOperationalMembership();
  if (membership.role === "assistant") redirect("/dashboard/students");
  return membership;
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

export async function registerConsentAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await registerStudentHealthConsent(
      {
        tenantId: actor.tenantId,
        studentId,
        policyVersion: String(formData.get("policyVersion") ?? ""),
        decision: String(formData.get("decision") ?? "") as
          | "granted"
          | "revoked",
        operationId: randomUUID(),
        representedConsentConfirmed:
          formData.get("representedConsentConfirmed") === "confirmed",
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function correctPersonalDataAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await correctStudentPersonalData(
      {
        tenantId: actor.tenantId,
        studentId,
        fullName: String(formData.get("fullName") ?? "") || undefined,
        birthDate: String(formData.get("birthDate") ?? "") || undefined,
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function requestErasureAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await requestStudentErasure(
      {
        tenantId: actor.tenantId,
        studentId,
        reason: String(formData.get("reason") ?? "") as
          | "subject_request"
          | "consent_withdrawn"
          | "tenant_request",
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}
