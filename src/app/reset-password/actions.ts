"use server";

import { requestPasswordReset } from "@/application/auth/use-cases/request-password-reset";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface ResetPasswordFormState {
  error: string | null;
  success: boolean;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  try {
    const deps = await createAuthDeps();
    await requestPasswordReset(
      { email: String(formData.get("email") ?? "") },
      deps,
    );
    return { error: null, success: true };
  } catch (error) {
    return { error: formatActionError(error), success: false };
  }
}
