"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/application/auth/use-cases/sign-in";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface LogInFormState {
  error: string | null;
}

export async function logInAction(
  _prevState: LogInFormState,
  formData: FormData,
): Promise<LogInFormState> {
  const deps = await createAuthDeps();

  try {
    await signIn(
      {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error) };
  }

  const userId = await deps.auth.getCurrentUserId();
  const memberships = userId
    ? await deps.memberships.findActiveByUser(userId)
    : [];
  redirect(memberships.length > 0 ? "/dashboard" : "/onboarding");
}
