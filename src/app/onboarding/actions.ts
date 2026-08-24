"use server";

import { redirect } from "next/navigation";
import { completeInstructorOnboarding } from "@/application/auth/use-cases/complete-instructor-onboarding";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface OnboardingFormState {
  error: string | null;
}

export async function completeOnboardingAction(
  _prevState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const deps = await createAuthDeps();
  const userId = await deps.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");

  try {
    await completeInstructorOnboarding(
      { userId, tenantName: String(formData.get("tenantName") ?? "") },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error) };
  }

  redirect("/dashboard");
}
