import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { Surface } from "@/presentation/components/primitives";
import { ProfileForm } from "./profile-form";
import { ProfileMaintenancePanels } from "./profile-maintenance-panels";

function roleLabel(role: string) {
  return role === "owner"
    ? "Dueño"
    : role === "assistant"
      ? "Asistente"
      : role === "admin"
        ? "Administrador"
        : role;
}

export default async function ProfilePage() {
  const membership = await requireOperationalMembership();
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const [profile, tenants] = await Promise.all([
    auth.profiles.findByUserId(userId),
    auth.tenants.findOperationalByUser(userId),
  ]);
  const label = roleLabel(membership.role);
  const name = profile?.fullName || "Tu cuenta";
  const organizationName =
    tenants.find((tenant) => tenant.id === membership.tenantId)?.name ??
    "Organización activa";

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.65fr)]">
      <Surface className="p-5 sm:p-6">
        <div className="mb-5 border-b border-border/70 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Datos personales
          </p>
          <h2 className="mt-2 text-xl font-medium tracking-tight">
            Tu identidad en Sport Admin
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estos datos se muestran en el menú de cuenta y en las superficies
            autenticadas.
          </p>
        </div>
        <ProfileForm
          fullName={profile?.fullName ?? ""}
          avatarUrl={profile?.avatarUrl ?? null}
        />
      </Surface>
      <ProfileMaintenancePanels
        organizationName={organizationName}
        roleLabel={label}
      />
    </div>
  );
}
