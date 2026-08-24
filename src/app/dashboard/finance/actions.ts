"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createMembershipPlan } from "@/application/instructor-finance/use-cases/manage-membership";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface PlanFormState {
  error: string | null;
  saved: boolean;
}

export async function createPlanAction(
  _previousState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const actors = await auth.memberships.findOperationalByUser(userId);
  if (actors.length === 0) redirect("/onboarding");

  try {
    await createMembershipPlan(
      {
        tenantId: actors[0].tenantId,
        name: String(formData.get("name") ?? ""),
        price: Number(formData.get("price")),
        currency: String(formData.get("currency") ?? "").toUpperCase(),
        billingCycle: String(formData.get("billingCycle") ?? "monthly") as
          | "monthly"
          | "quarterly"
          | "semiannual"
          | "annual",
        expirationGraceDays: Number(formData.get("expirationGraceDays")),
      },
      await createInstructorFinanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/students");
  return { error: null, saved: true };
}
