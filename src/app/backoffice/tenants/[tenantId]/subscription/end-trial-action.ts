"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { endSaasTrial } from "@/application/saas-administration/use-cases/manage-subscriptions";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface EndTrialFormState {
  error: string | null;
  done: boolean;
}

export async function endTrialAction(
  _previous: EndTrialFormState,
  form: FormData,
): Promise<EndTrialFormState> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  try {
    const { subscriptions } = await createSaasAdministrationDeps();
    await endSaasTrial(
      {
        tenantId: form.get("tenantId"),
        operationId: form.get("operationId"),
        reason: form.get("reason"),
      },
      subscriptions,
    );
    revalidatePath("/backoffice/tenants");
    revalidatePath(`/backoffice/tenants/${form.get("tenantId")}/subscription`);
    return { error: null, done: true };
  } catch (error) {
    return { error: formatActionError(error), done: false };
  }
}
