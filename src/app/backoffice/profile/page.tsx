import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { ProfileForm } from "@/app/dashboard/profile/profile-form";

export default async function BackofficeProfilePage() {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");

  const { tenantBackoffice } = await createSaasAdministrationDeps();
  if (!(await tenantBackoffice.isPlatformAdmin())) redirect("/dashboard");

  const [profile, operationalMemberships] = await Promise.all([
    auth.profiles.findByUserId(userId),
    auth.memberships.findOperationalByUser(userId),
  ]);
  const name = profile?.fullName || "Cuenta";

  return (
    <BackofficeShell
      title="Perfil"
      current="profile"
      accountName={name}
      canAccessOperation={operationalMemberships.length > 0}
    >
      <div className="mx-auto max-w-3xl">
        <Surface className="p-5 sm:p-6">
          <div className="mb-5 border-b border-border/70 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-warning">
              Cuenta SaaS
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight">
              Perfil del usuario
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estos datos se usan para identificar tu cuenta dentro de Sport
              Admin.
            </p>
          </div>
          <ProfileForm
            fullName={profile?.fullName ?? ""}
            avatarUrl={profile?.avatarUrl ?? null}
          />
        </Surface>
      </div>
    </BackofficeShell>
  );
}
