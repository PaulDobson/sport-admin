"use server";

import { registerInstructor } from "@/application/auth/use-cases/register-instructor";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface SignUpFormState {
  error: string | null;
  success: boolean;
}

export async function signUpAction(
  _prevState: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  try {
    const deps = await createAuthDeps();
    await registerInstructor(
      {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        fullName: String(formData.get("fullName") ?? ""),
      },
      deps,
    );
    return { error: null, success: true };
  } catch (error) {
    return { error: formatActionError(error), success: false };
  }
}
