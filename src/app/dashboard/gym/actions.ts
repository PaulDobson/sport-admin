"use server";

import { revalidatePath } from "next/cache";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import {
  updateTenantDetails,
  type TenantDetailsInput,
} from "@/application/tenants/manage-tenant-details";
import { DomainError, ValidationError } from "@/domain/shared/errors";
import type { TenantDetails } from "@/domain/tenants/tenant-details";
import { createTenantDetailsDeps } from "@/infrastructure/composition/tenant-details-composition";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";

// ── Text fields action ────────────────────────────────────────────────────────

export interface GymFormState {
  error: string | null;
  fieldErrors?: Partial<Record<keyof TenantDetailsInput, string>>;
  details?: TenantDetails;
  saved: boolean;
}

export async function updateGymAction(
  _previous: GymFormState,
  formData: FormData,
): Promise<GymFormState> {
  try {
    const context = await loadOperationalContext();
    if (context.status !== "ready") {
      return {
        error:
          "Tu sesión o gimnasio activo ya no está disponible. Recarga la página para continuar.",
        saved: false,
      };
    }
    if (formData.get("tenantId") !== context.membership.tenantId) {
      return {
        error:
          "Cambiaste de gimnasio en otra pestaña. Recarga la página antes de guardar.",
        saved: false,
      };
    }
    const details = await updateTenantDetails(
      context.membership,
      {
        name: String(formData.get("name") ?? ""),
        address: String(formData.get("address") ?? ""),
        contactName: String(formData.get("contactName") ?? ""),
        contactEmail: String(formData.get("contactEmail") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        city: String(formData.get("city") ?? ""),
        region: String(formData.get("region") ?? ""),
      },
      await createTenantDetailsDeps(),
    );
    revalidatePath("/dashboard", "layout");
    revalidatePath("/select-tenant");
    revalidatePath("/backoffice/tenants");
    return { error: null, saved: true, details };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        error: "Revisa los campos indicados. Tus cambios no se han guardado.",
        fieldErrors: Object.fromEntries(
          error.issues.map((issue) => [issue.path, issue.message]),
        ),
        saved: false,
      };
    }
    if (error instanceof DomainError)
      return { error: error.message, saved: false };
    console.error("Failed to update gym details", error);
    return {
      error:
        "No pudimos guardar los datos del gimnasio. Tus cambios siguen aquí; vuelve a intentarlo.",
      saved: false,
    };
  }
}

// ── Logo upload action ────────────────────────────────────────────────────────

const BUCKET = "profile_instructor";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export interface GymLogoUploadState {
  status: "idle" | "success" | "error";
  publicUrl: string | null;
  error: string | null;
}

export async function uploadGymLogoAction(
  _prev: GymLogoUploadState,
  formData: FormData,
): Promise<GymLogoUploadState> {
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
  const file = formData.get("logo") as File | null;
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
  // Convention: {userId}/img_gym/logo.{ext}  (fixed name → upsert replaces)
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const storagePath = `${user.id}/img_gym/logo.${ext}`;

  // ── Upload (upsert replaces any existing logo) ──
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[uploadGymLogoAction] Storage upload failed:", {
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

  // ── Get public URL with cache-bust ──
  const { data: urlData } = client.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // ── Persist URL in tenant_details ──
  // We need the tenantId from the form — passed by the client as a hidden field.
  const tenantId = String(formData.get("tenantId") ?? "");
  if (tenantId) {
    const context = await loadOperationalContext();
    if (
      context.status === "ready" &&
      context.membership.tenantId === tenantId
    ) {
      try {
        const repo = await createTenantDetailsDeps();
        const existing = await repo.findByTenantId(tenantId);
        if (existing) {
          await repo.update({ ...existing, logoUrl: publicUrl });
        }
      } catch {
        // Upload succeeded — surface the URL even if the DB persist failed.
        // The user can save the form again to retry.
      }
    }
  }

  revalidatePath("/dashboard/gym");
  revalidatePath("/dashboard", "layout");

  return { status: "success", publicUrl, error: null };
}
