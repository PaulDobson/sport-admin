"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  scheduleTenantPlanLimits,
  transitionTenantStatus,
} from "@/application/saas-administration/use-cases/manage-tenants";
import type { TenantTransitionStatus } from "@/domain/saas-administration/tenant-backoffice";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface TenantStatusFormState {
  error: string | null;
  saved: boolean;
}

export async function transitionTenantStatusAction(
  _previousState: TenantStatusFormState,
  formData: FormData,
): Promise<TenantStatusFormState> {
  const auth = await createAuthDeps();
  if (!(await auth.auth.getCurrentUserId())) redirect("/log-in");

  try {
    const { tenantBackoffice } = await createSaasAdministrationDeps();
    await transitionTenantStatus(
      {
        tenantId: String(formData.get("tenantId") ?? ""),
        status: String(formData.get("status") ?? "") as TenantTransitionStatus,
        reason: String(formData.get("reason") ?? ""),
      },
      tenantBackoffice,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  revalidatePath("/backoffice/tenants");
  return { error: null, saved: true };
}

export async function scheduleTenantPlanLimitsAction(
  _previousState: TenantStatusFormState,
  formData: FormData,
): Promise<TenantStatusFormState> {
  const auth = await createAuthDeps();
  if (!(await auth.auth.getCurrentUserId())) redirect("/log-in");

  try {
    const { tenantBackoffice } = await createSaasAdministrationDeps();
    await scheduleTenantPlanLimits(
      {
        tenantId: String(formData.get("tenantId") ?? ""),
        subscriptionId: String(formData.get("subscriptionId") ?? ""),
        planId: String(formData.get("planId") ?? ""),
        effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
        reason: String(formData.get("reason") ?? ""),
      },
      tenantBackoffice,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }

  revalidatePath("/backoffice/tenants");
  return { error: null, saved: true };
}
