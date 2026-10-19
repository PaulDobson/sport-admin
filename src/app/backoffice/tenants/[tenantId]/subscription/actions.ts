"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  confirmSaasAssignment, previewSaasAssignment,
} from "@/application/saas-administration/use-cases/manage-subscriptions";
import type { AssignmentPreview, AssignmentResult } from "@/domain/saas-administration/subscription-management";
import { ConflictError, ValidationError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { cancelSaasPlanChange, confirmSaasPlanChange, previewSaasPlanChange } from "@/application/saas-administration/use-cases/change-subscription-plan";
import type { PlanChangePreview, PlanChangeResult } from "@/domain/saas-administration/plan-change-management";

export interface AssignmentFormState {
  error: string | null;
  fieldErrors: Record<string, string>;
  preview: AssignmentPreview | null;
  result: AssignmentResult | null;
  stale: boolean;
}

export async function assignmentAction(
  previous: AssignmentFormState, form: FormData,
): Promise<AssignmentFormState> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  const request = {
    tenantId: form.get("tenantId"), planVersionId: form.get("planVersionId"),
    startsOn: form.get("startsOn"), useTrial: form.get("useTrial") === "on",
    dueOn: form.get("dueOn") || null,
  };
  const confirming = form.get("intent") === "confirm";
  try {
    const { subscriptions } = await createSaasAdministrationDeps();
    if (!confirming) {
      const preview = await previewSaasAssignment(request, subscriptions);
      return { error: null, fieldErrors: {}, preview, result: null, stale: false };
    }

    if (form.get("accepted") !== "on") {
      throw new ValidationError([{ path: "accepted", message: "Confirma que revisaste las condiciones y el cobro pendiente." }]);
    }
    const result = await confirmSaasAssignment({
      ...request, fingerprint: form.get("fingerprint"),
      operationId: form.get("operationId"), reason: form.get("reason"),
    }, subscriptions);
    revalidatePath("/backoffice/tenants");
    revalidatePath("/backoffice/finance");
    return { error: null, fieldErrors: {}, preview: null, result, stale: false };
  } catch (error) {
    return {
      error: formatActionError(error),
      fieldErrors: error instanceof ValidationError
        ? Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message])) : {},
      preview: confirming && !(error instanceof ConflictError) ? previous.preview : null,
      result: null, stale: error instanceof ConflictError,
    };
  }
}

export interface PlanChangeFormState {
  error: string | null;
  preview: PlanChangePreview | null;
  result: PlanChangeResult | null;
  stale: boolean;
}

export async function planChangeAction(previous: PlanChangeFormState, form: FormData): Promise<PlanChangeFormState> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  const request = { tenantId: form.get("tenantId"), planVersionId: form.get("planVersionId") };
  const confirming = form.get("intent") === "confirm";
  try {
    const { subscriptions } = await createSaasAdministrationDeps();
    if (!confirming) return {
      error: null, result: null, stale: false, preview: await previewSaasPlanChange(request, subscriptions),
    };
    if (form.get("accepted") !== "on") throw new ValidationError([
      { path: "accepted", message: "Confirma que revisaste fechas, límites y efecto monetario." },
    ]);
    const result = await confirmSaasPlanChange({
      ...request, operationId: form.get("operationId"), fingerprint: form.get("fingerprint"), reason: form.get("reason"),
    }, subscriptions);
    revalidatePath("/backoffice/tenants");
    revalidatePath("/backoffice/finance");
    return { error: null, preview: null, result, stale: false };
  } catch (error) {
    return {
      error: formatActionError(error), result: null, stale: error instanceof ConflictError,
      preview: confirming && !(error instanceof ConflictError) ? previous.preview : null,
    };
  }
}

export async function cancelPlanChangeAction(
  _previous: { error: string | null; saved: boolean }, form: FormData,
): Promise<{ error: string | null; saved: boolean }> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  try {
    const { subscriptions } = await createSaasAdministrationDeps();
    await cancelSaasPlanChange({
      tenantId: form.get("tenantId"), scheduledChangeId: form.get("scheduledChangeId"),
      operationId: form.get("operationId"), reason: form.get("reason"),
    }, subscriptions);
    revalidatePath("/backoffice/tenants");
    return { error: null, saved: true };
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
}
