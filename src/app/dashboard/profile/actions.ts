"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/application/auth/use-cases/update-profile";
import { updatePassword } from "@/application/auth/use-cases/update-password";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { getSupabaseUrl } from "@/infrastructure/supabase/env";
import { formatActionError } from "@/app/_lib/format-error";

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET = "profile_instructor";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ── Avatar upload ─────────────────────────────────────────────────────────────

export interface AvatarUploadState {
  status: "idle" | "success" | "error";
  publicUrl: string | null;
  error: string | null;
}

export async function uploadAvatarAction(
  _prev: AvatarUploadState,
  formData: FormData,
): Promise<AvatarUploadState> {
  const client = await createSupabaseServerClient();

  // ── Auth ──
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return {
      status: "error",
      publicUrl: null,
      error: "Tu sesión expiró. Vuelve a ingresar.",
    };
  }

  // ── Validate file ──
  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) {
    return {
      status: "error",
      publicUrl: null,
      error: "No se recibió ningún archivo.",
    };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      status: "error",
      publicUrl: null,
      error: "Solo se aceptan imágenes JPG, PNG, WebP o GIF.",
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      publicUrl: null,
      error: "El archivo supera el límite de 5 MB.",
    };
  }

  // ── Derive storage path ──
  // Convention: {userId}/img_profile/{filename}
  // Using a fixed filename so every new upload replaces the previous one (upsert).
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const storagePath = `${user.id}/img_profile/avatar.${ext}`;

  // ── Upload (upsert replaces the existing file) ──
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true, // replace any existing avatar
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[uploadAvatarAction] Storage upload failed:", {
      message: uploadError.message,
      statusCode: (uploadError as { statusCode?: string }).statusCode,
      path: storagePath,
    });
    return {
      status: "error",
      publicUrl: null,
      error: `No se pudo subir la imagen: ${uploadError.message}`,
    };
  }

  // ── Get public URL ──
  const { data: urlData } = client.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  // Bust the CDN cache by appending a timestamp so the browser loads the new image.
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // ── Persist URL in profile ──
  const auth = await createAuthDeps();
  try {
    await updateProfile(
      {
        userId: user.id,
        // Re-fetch current values to avoid overwriting them
        fullName: String(formData.get("currentFullName") ?? ""),
        avatarUrl: publicUrl,
        phone: String(formData.get("currentPhone") ?? "") || null,
      },
      { profiles: auth.profiles },
    );
  } catch {
    // Upload succeeded but profile update failed — still return the URL
    // so the client can show the image. The user can save the rest of the
    // form to persist it properly.
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard", "layout");

  return { status: "success", publicUrl, error: null };
}

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
        phone: String(formData.get("phone") ?? "") || null,
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

export interface ChangePasswordFormState {
  error: string | null;
  success: boolean;
}

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  try {
    const deps = await createAuthDeps();
    const userId = await deps.auth.getCurrentUserId();
    if (!userId)
      return { error: "Tu sesión expiró. Vuelve a ingresar.", success: false };

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
