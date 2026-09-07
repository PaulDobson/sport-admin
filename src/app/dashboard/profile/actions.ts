"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/application/auth/use-cases/update-profile";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";

export interface ProfileFormState {
  error: string | null;
  saved: boolean;
}

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId)
    return { error: "Tu sesión expiró. Vuelve a ingresar.", saved: false };

  try {
    await updateProfile(
      {
        userId,
        fullName: String(formData.get("fullName") ?? ""),
        avatarUrl: String(formData.get("avatarUrl") ?? ""),
      },
      { profiles: auth.profiles },
    );
    revalidatePath("/dashboard/profile");
    revalidatePath("/backoffice/profile");
    revalidatePath("/dashboard", "layout");
    return { error: null, saved: true };
  } catch {
    return {
      error: "No pudimos guardar los datos del perfil. Revisa los campos.",
      saved: false,
    };
  }
}
