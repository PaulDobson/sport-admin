"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/application/auth/use-cases/sign-in";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { createStudentPortalDeps } from "@/infrastructure/composition/student-portal-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface LogInFormState {
  error: string | null;
}

export async function logInAction(
  _prevState: LogInFormState,
  formData: FormData,
): Promise<LogInFormState> {
  const requestedNext = String(formData.get("next") ?? "");
  const portalInviteNext = requestedNext.startsWith("/portal/accept?token=")
    ? requestedNext
    : null;
  const deps = await createAuthDeps();

  try {
    await signIn(
      {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error) };
  }

  if (portalInviteNext) redirect(portalInviteNext);
  if (requestedNext === "/billing" || requestedNext.startsWith("/billing?")) redirect(requestedNext);

  const userId = await deps.auth.getCurrentUserId();
  const memberships = userId
    ? await deps.memberships.findActiveByUser(userId)
    : [];
  if (memberships.length > 0) {
    if (userId && memberships.some((m) => m.role === "owner")
      && (await deps.memberships.findOperationalByUser(userId)).length === 0) redirect("/billing");
    redirect("/dashboard");
  }

  if (userId) {
    const portal = await createStudentPortalDeps();
    if ((await portal.portal.listMyStudents()).length > 0) redirect("/portal");
  }

  const { tenantBackoffice } = await createSaasAdministrationDeps();
  if (await tenantBackoffice.isPlatformAdmin()) redirect("/backoffice");

  redirect("/onboarding");
}
