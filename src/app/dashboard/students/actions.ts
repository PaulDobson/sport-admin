"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { archiveStudent } from "@/application/instructor-operations/use-cases/archive-student";
import { createStudent } from "@/application/instructor-operations/use-cases/create-student";
import { updateStudent } from "@/application/instructor-operations/use-cases/update-student";
import { createHealthCondition } from "@/application/evolution-health-attendance/use-cases/manage-student-health";
import {
  getTenantHealthPolicy,
  registerStudentHealthConsent,
} from "@/application/evolution-health-attendance/use-cases/manage-student-privacy";
import { assignMembership } from "@/application/instructor-finance/use-cases/manage-membership";
import { UnauthorizedError } from "@/domain/shared/errors";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { collectionOperationId } from "@/app/dashboard/finance/operation-id";

export interface StudentFormState {
  error: string | null;
  saved: boolean;
  createdStudentId?: string;
}

function assertCanManageStudents(role: string) {
  if (role === "assistant") {
    throw new UnauthorizedError("No tienes permiso para administrar alumnos");
  }
}

export async function createStudentAction(
  previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const membership = await requireOperationalMembership();
  if (previousState.createdStudentId) {
    return {
      ...previousState,
      error: "El alumno ya fue creado. Abre su ficha para completar sus datos.",
    };
  }
  try {
    assertCanManageStudents(membership.role);
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  const allergyNotes = String(formData.get("allergies") ?? "").trim();
  const representedConsentConfirmed =
    formData.get("representedConsentConfirmed") === "confirmed";
  const operations = await createInstructorOperationsDeps();
  let health: Awaited<
    ReturnType<typeof createEvolutionHealthAttendanceDeps>
  > | null = null;

  let policyVersion: string | undefined;
  if (allergyNotes) {
    if (!representedConsentConfirmed) {
      return {
        error:
          "Para guardar alergias, confirma que el alumno o su tutor otorgó consentimiento explícito.",
        saved: false,
      };
    }
    try {
      health = await createEvolutionHealthAttendanceDeps();
      const policy = await getTenantHealthPolicy(
        { tenantId: membership.tenantId },
        health,
      );
      if (!policy.healthEnabled || !policy.policyVersion) {
        return {
          error:
            "No se pueden guardar alergias hasta que la política de salud esté aprobada y activa.",
          saved: false,
        };
      }
      policyVersion = policy.policyVersion;
    } catch (error) {
      return { error: formatActionError(error), saved: false };
    }
  }

  let studentId: string | undefined;
  try {
    const { student } = await createStudent(
      {
        tenantId: membership.tenantId,
        fullName: String(formData.get("fullName") ?? ""),
        birthDate: String(formData.get("birthDate") ?? "") || null,
        photoUrl: photoUrl || null,
        gender: String(formData.get("gender") ?? ""),
        heightCm: String(formData.get("heightCm") ?? ""),
        weightKg: String(formData.get("weightKg") ?? ""),
        emergencyContactName:
          String(formData.get("emergencyContactName") ?? "").trim() || null,
        emergencyContactEmail:
          String(formData.get("emergencyContactEmail") ?? "").trim() || null,
        emergencyContactPhone:
          String(formData.get("emergencyContactPhone") ?? "").trim() || null,
        contacts: [
          ...(contactEmail
            ? [
                {
                  type: "email" as const,
                  label: null,
                  value: contactEmail,
                  isPrimary: true,
                },
              ]
            : []),
          ...(contactPhone
            ? [
                {
                  type: "phone" as const,
                  label: null,
                  value: contactPhone,
                  isPrimary: true,
                },
              ]
            : []),
        ],
      },
      operations,
    );
    studentId = student.id;
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  if (allergyNotes) {
    if (!health || !policyVersion || !studentId) {
      return {
        error:
          "El alumno fue creado, pero no se pudo iniciar el registro de alergias. Revisa su ficha antes de volver a enviar.",
        saved: false,
        createdStudentId: studentId,
      };
    }
    try {
      await registerStudentHealthConsent(
        {
          tenantId: membership.tenantId,
          studentId,
          policyVersion,
          decision: "granted",
          operationId: randomUUID(),
          representedConsentConfirmed: true,
        },
        health,
      );
      await createHealthCondition(
        {
          tenantId: membership.tenantId,
          studentId,
          name: "Alergias",
          source: "student_registration",
          notes: allergyNotes,
          startedOn: new Date().toISOString().slice(0, 10),
        },
        health,
      );
    } catch (error) {
      revalidatePath("/dashboard/students");
      revalidatePath(`/dashboard/students/${studentId}`);
      return {
        error: `${formatActionError(error)} El alumno ya fue creado; revisa su ficha antes de volver a registrar.`,
        saved: false,
        createdStudentId: studentId,
      };
    }
  }

  revalidatePath("/dashboard/students");
  if (studentId) revalidatePath(`/dashboard/students/${studentId}`);

  // Optional membership assignment — only when the instructor selected a plan.
  const membershipPlanId = String(
    formData.get("membershipPlanId") ?? "",
  ).trim();
  const membershipStartsOn = String(
    formData.get("membershipStartsOn") ?? "",
  ).trim();
  if (membershipPlanId && studentId) {
    const startsOn =
      membershipStartsOn || new Date().toISOString().slice(0, 10);
    const assignmentToken = collectionOperationId([
      membership.tenantId,
      studentId,
      membershipPlanId,
      startsOn,
      "initial-assignment",
    ]);
    try {
      const finance = await createInstructorFinanceDeps();
      await assignMembership(
        {
          tenantId: membership.tenantId,
          studentId,
          planId: membershipPlanId,
          startsOn,
          actorMembershipId: membership.id,
          assignmentToken,
        },
        finance,
      );
      revalidatePath("/dashboard/finance");
      revalidatePath(`/dashboard/students/${studentId}`);
    } catch (error) {
      // Student was created; report membership failure without blocking.
      return {
        error: `Alumno creado, pero no se pudo asignar la membresía: ${formatActionError(error)}`,
        saved: false,
        createdStudentId: studentId,
      };
    }
  }

  return { error: null, saved: true, createdStudentId: studentId };
}

export async function updateStudentAction(
  _previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const membership = await requireOperationalMembership();
  const studentId = String(formData.get("studentId") ?? "");
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  try {
    assertCanManageStudents(membership.role);
    await updateStudent(
      {
        tenantId: membership.tenantId,
        studentId,
        fullName: String(formData.get("fullName") ?? ""),
        birthDate: String(formData.get("birthDate") ?? "") || null,
        photoUrl: photoUrl || null,
        gender: String(formData.get("gender") ?? ""),
        heightCm: String(formData.get("heightCm") ?? ""),
        weightKg: String(formData.get("weightKg") ?? ""),
        emergencyContactName:
          String(formData.get("emergencyContactName") ?? "").trim() || null,
        emergencyContactEmail:
          String(formData.get("emergencyContactEmail") ?? "").trim() || null,
        emergencyContactPhone:
          String(formData.get("emergencyContactPhone") ?? "").trim() || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
      },
      await createInstructorOperationsDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function archiveStudentAction(
  _previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const membership = await requireOperationalMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    assertCanManageStudents(membership.role);
    await archiveStudent(
      { tenantId: membership.tenantId, studentId },
      await createInstructorOperationsDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}
