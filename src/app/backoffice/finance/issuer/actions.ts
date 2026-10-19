"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveSaasBillingIssuer } from "@/application/saas-administration/use-cases/manage-billing-issuer";
import type { BillingIssuer } from "@/domain/saas-administration/billing-issuer";
import { ValidationError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface IssuerFormState {
  error: string | null;
  fieldErrors: Record<string, string>;
  issuer: BillingIssuer | null;
}

export async function saveIssuerAction(_previous: IssuerFormState, form: FormData): Promise<IssuerFormState> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  try {
    const { billingIssuer } = await createSaasAdministrationDeps();
    const issuer = await saveSaasBillingIssuer({
      operationId: form.get("operationId"), expectedVersionId: form.get("expectedVersionId") || null,
      legalName: form.get("legalName"), taxId: form.get("taxId"),
      address: form.get("address"), email: form.get("email"), reason: form.get("reason"),
    }, billingIssuer);
    revalidatePath("/backoffice/finance/issuer");
    revalidatePath("/backoffice/collections");
    return { error: null, fieldErrors: {}, issuer };
  } catch (error) {
    return { error: formatActionError(error), issuer: null,
      fieldErrors: error instanceof ValidationError ? Object.fromEntries(error.issues.map((i) => [i.path, i.message])) : {} };
  }
}
