"use server";

import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { writeActiveTenantCookie } from "@/infrastructure/composition/tenant-context-composition";
import { resolveOperationalContextForUser } from "@/app/_lib/operational-context";

export async function selectTenantAction(formData: FormData) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const tenantId = String(formData.get("tenantId") ?? "");
  const context = await resolveOperationalContextForUser(
    userId,
    auth.memberships,
  );
  const memberships =
    context.status === "ready" || context.status === "selection-required"
      ? context.memberships
      : [];
  if (!memberships.some((membership) => membership.tenantId === tenantId)) {
    redirect("/select-tenant?error=invalid");
  }
  await writeActiveTenantCookie(tenantId);
  redirect("/dashboard");
}
