"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { archiveSaasPlan, publishSaasPlanVersion } from "@/application/saas-administration/use-cases/manage-plan-catalog";
import { ValidationError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface PlanFormState {
  error: string | null;
  fieldErrors: Record<string, string>;
  saved: boolean;
}

async function requireUser() {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
}

function numberField(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
}

function actionFailure(error: unknown): PlanFormState {
  return {
    error: formatActionError(error),
    fieldErrors: error instanceof ValidationError
      ? Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message]))
      : {},
    saved: false,
  };
}

export async function publishPlanAction(
  _previousState: PlanFormState, form: FormData,
): Promise<PlanFormState> {
  await requireUser();
  try {
    const { planCatalog } = await createSaasAdministrationDeps();
    await publishSaasPlanVersion({
      planId: form.get("planId") || null,
      expectedVersionId: form.get("expectedVersionId") || null,
      operationId: form.get("operationId"),
      reason: form.get("reason"),
      terms: {
        name: form.get("name"),
        description: String(form.get("description") ?? "").trim() || null,
        price: numberField(form, "price"),
        durationUnit: form.get("durationUnit"), durationCount: numberField(form, "durationCount"),
        trialDays: numberField(form, "trialDays"),
        maxStudents: numberField(form, "maxStudents"), maxUsers: numberField(form, "maxUsers"),
        features: form.getAll("features"),
        services: String(form.get("services") ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      },
    }, planCatalog);
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/backoffice/plans");
  revalidatePath("/backoffice/plans/[planId]", "page");
  return { error: null, fieldErrors: {}, saved: true };
}

export async function archivePlanAction(
  _previousState: PlanFormState, form: FormData,
): Promise<PlanFormState> {
  await requireUser();
  try {
    const { planCatalog } = await createSaasAdministrationDeps();
    await archiveSaasPlan({
      planId: form.get("planId"), expectedVersionId: form.get("expectedVersionId"),
      operationId: form.get("operationId"), reason: form.get("reason"),
    }, planCatalog);
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/backoffice/plans");
  revalidatePath("/backoffice/plans/[planId]", "page");
  return { error: null, fieldErrors: {}, saved: true };
}
