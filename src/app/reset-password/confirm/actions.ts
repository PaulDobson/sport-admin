"use server";

import { updatePassword } from "@/application/auth/use-cases/update-password";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface ConfirmPasswordFormState {
  error: string | null;
  success: boolean;
}

export async function confirmPasswordAction(
  _prevState: ConfirmPasswordFormState,
  formData: FormData,
): Promise<ConfirmPasswordFormState> {
  try {
    const deps = await createAuthDeps();
    const userId = await deps.auth.getCurrentUserId();
    if (!userId) {
      return { error: "El enlace es invalido o ha expirado.", success: false };
    }

    await updatePassword(
      {
        password: String(formData.get("password") ?? ""),
        passwordConfirmation: String(
          formData.get("passwordConfirmation") ?? "",
        ),
      },
      deps,
    );
    return { error: null, success: true };
  } catch (error) {
    return { error: formatActionError(error), success: false };
  }
}
