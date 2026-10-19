import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";

/** Resolves the authenticated platform admin and the data needed by the backoffice shell. */
export async function loadBackofficeContext() {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");

  const deps = await createSaasAdministrationDeps();
  if (!(await deps.tenantBackoffice.isPlatformAdmin())) redirect("/dashboard");

  const [profile, operationalMemberships] = await Promise.all([
    auth.profiles.findByUserId(userId),
    auth.memberships.findOperationalByUser(userId),
  ]);

  return {
    deps,
    profile,
    shell: {
      accountName: profile?.fullName || "Cuenta",
      avatarUrl: profile?.avatarUrl ?? null,
      canAccessOperation: operationalMemberships.length > 0,
    },
  };
}
