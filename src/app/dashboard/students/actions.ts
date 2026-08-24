"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createStudent } from "@/application/instructor-operations/use-cases/create-student";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface StudentFormState {
  error: string | null;
  saved: boolean;
}

export async function createStudentAction(
  _previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) redirect("/onboarding");

  const contactValue = String(formData.get("contactValue") ?? "").trim();
  const operations = await createInstructorOperationsDeps();
  try {
    await createStudent(
      {
        tenantId: memberships[0].tenantId,
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
