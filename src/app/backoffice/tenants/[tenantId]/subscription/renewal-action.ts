"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ValidationError, BusinessRuleViolationError } from "@/domain/shared/errors";
import type { RenewalProcessingResult } from "@/domain/saas-administration/renewal-processing";
import { renewSaasSubscription } from "@/application/saas-administration/use-cases/process-subscription-renewals";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { getSaasRenewalConfiguration } from "@/infrastructure/composition/saas-renewal-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface RenewalFormState {
  error: string | null;
  result: Extract<RenewalProcessingResult, { status: "renewed" }> | null;
}
export async function renewalAction(_previous: RenewalFormState, form: FormData): Promise<RenewalFormState> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  try {
    if (!getSaasRenewalConfiguration().enabled) throw new BusinessRuleViolationError(
      "Las renovaciones están desactivadas. Completa la validación PostgreSQL y el despliegue antes de habilitarlas.",
    );
    if (form.get("accepted") !== "on") throw new ValidationError([
      { path: "accepted", message: "Confirma que revisaste el período y el cobro completo antes de renovar." },
    ]);
    const { renewals } = await createSaasAdministrationDeps();
    const result = await renewSaasSubscription({
      requestId: form.get("requestId"), subscriptionId: form.get("subscriptionId"), expectedPeriodEnd: form.get("expectedPeriodEnd"),
    }, renewals);
    revalidatePath("/backoffice/finance/renewals");
    if (result.status !== "renewed") {
      if (result.status === "failed") {
        console.error("Manual SaaS renewal failed", { code: result.errorCode });
        return { result: null, error: result.message };
      }
      throw new BusinessRuleViolationError("No se renovó ningún período. Actualiza el contrato antes de reintentar.");
    }
    revalidatePath("/backoffice/tenants");
    revalidatePath(`/backoffice/tenants/${result.tenantId}/subscription`);
    revalidatePath("/backoffice/finance");
    return { result, error: null };
  } catch (error) {
    return { result: null, error: formatActionError(error) };
  }
}
