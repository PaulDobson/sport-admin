"use server";

import { revalidatePath } from "next/cache";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { updateTenantDetails, type TenantDetailsInput } from "@/application/tenants/manage-tenant-details";
import { DomainError, ValidationError } from "@/domain/shared/errors";
import type { TenantDetails } from "@/domain/tenants/tenant-details";
import { createTenantDetailsDeps } from "@/infrastructure/composition/tenant-details-composition";

export interface GymFormState {
  error: string | null;
  fieldErrors?: Partial<Record<keyof TenantDetailsInput, string>>;
  details?: TenantDetails;
  saved: boolean;
}

export async function updateGymAction(_previous: GymFormState, formData: FormData): Promise<GymFormState> {
  try {
    const context = await loadOperationalContext();
    if (context.status !== "ready") {
      return { error: "Tu sesión o gimnasio activo ya no está disponible. Recarga la página para continuar.", saved: false };
    }
    if (formData.get("tenantId") !== context.membership.tenantId) {
      return { error: "Cambiaste de gimnasio en otra pestaña. Recarga la página antes de guardar.", saved: false };
    }
    const details = await updateTenantDetails(context.membership, {
      name: String(formData.get("name") ?? ""),
      address: String(formData.get("address") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      city: String(formData.get("city") ?? ""),
      region: String(formData.get("region") ?? ""),
    }, await createTenantDetailsDeps());
    revalidatePath("/dashboard", "layout");
    revalidatePath("/select-tenant");
    revalidatePath("/backoffice/tenants");
    return { error: null, saved: true, details };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: "Revisa los campos indicados. Tus cambios no se han guardado.", fieldErrors: Object.fromEntries(error.issues.map(issue => [issue.path, issue.message])), saved: false };
    }
    if (error instanceof DomainError) return { error: error.message, saved: false };
    console.error("Failed to update gym details", error);
    return { error: "No pudimos guardar los datos del gimnasio. Tus cambios siguen aquí; vuelve a intentarlo.", saved: false };
  }
}
