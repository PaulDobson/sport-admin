"use server";

import { revalidatePath } from "next/cache";
import { archiveStudent } from "@/application/instructor-operations/use-cases/archive-student";
import { createStudent } from "@/application/instructor-operations/use-cases/create-student";
import { updateStudent } from "@/application/instructor-operations/use-cases/update-student";
import { UnauthorizedError } from "@/domain/shared/errors";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { requireOperationalMembership } from "@/app/_lib/operational-context";

export interface StudentFormState {
  error: string | null;
  saved: boolean;
}

function assertCanManageStudents(role: string) {
  if (role === "assistant") {
    throw new UnauthorizedError("No tienes permiso para administrar alumnos");
  }
}

export async function createStudentAction(
  _previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const membership = await requireOperationalMembership();
  try {
    assertCanManageStudents(membership.role);
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  const contactValue = String(formData.get("contactValue") ?? "").trim();
  const operations = await createInstructorOperationsDeps();
  try {
    await createStudent(
      {
        tenantId: membership.tenantId,
        fullName: String(formData.get("fullName") ?? ""),
        birthDate: String(formData.get("birthDate") ?? "") || null,
        photoUrl: null,
        contacts: contactValue
          ? [
              {
                type: String(formData.get("contactType") ?? "phone") as
                  | "email"
                  | "phone",
                label: null,
                value: contactValue,
                isPrimary: true,
              },
            ]
          : [],
      },
      operations,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  revalidatePath("/dashboard/students");
  return { error: null, saved: true };
}

export async function updateStudentAction(
  _previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const membership = await requireOperationalMembership();
  const studentId = String(formData.get("studentId") ?? "");
  const contactValue = String(formData.get("contactValue") ?? "").trim();
  try {
    assertCanManageStudents(membership.role);
    await updateStudent(
      {
        tenantId: membership.tenantId,
        studentId,
        fullName: String(formData.get("fullName") ?? ""),
        birthDate: String(formData.get("birthDate") ?? "") || null,
        primaryContact: contactValue
          ? {
              type: String(formData.get("contactType") ?? "phone") as
                | "email"
                | "phone"
                | "emergency",
              label: null,
              value: contactValue,
            }
          : null,
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
