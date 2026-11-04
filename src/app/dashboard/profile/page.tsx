import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createOwnerBillingDeps } from "@/infrastructure/composition/owner-billing-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { Avatar } from "@/presentation/components/primitives";
import { ProfileTabs } from "./profile-tabs";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import type { OwnerBilling } from "@/domain/saas-administration/owner-billing";

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
    tenants.find((t) => t.id === membership.tenantId)?.name ??
    "Organización activa";

  const isOwner = membership.role === "owner";

  let billing: OwnerBilling | null = null;
  let catalogPlans: SaasCatalogPlan[] = [];

  if (isOwner) {
    try {
      const [billingDeps, saasDeps] = await Promise.all([
        createOwnerBillingDeps(),
        createSaasAdministrationDeps(),
      ]);
      [billing, catalogPlans] = await Promise.all([
        billingDeps.ownerBilling.get(membership.tenantId, 1),
        saasDeps.planCatalog.list(),
      ]);
    } catch {
      // Non-fatal: panels render with empty state
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── Identity hero ── 
      <div className="mb-6 flex items-center gap-4 border-b border-border/50 pb-6">
        <Avatar name={name} src={profile?.avatarUrl} size="lg" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {name}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {label} · {organizationName}
          </p>
        </div>
      </div>
*/}
      {/* ── Tabbed sections ── */}
      <ProfileTabs
        fullName={profile?.fullName ?? ""}
        avatarUrl={profile?.avatarUrl ?? null}
        email={profile?.email ?? null}
        phone={profile?.phone ?? null}
        isOwner={isOwner}
        billing={billing}
        catalogPlans={catalogPlans}
      />
    </div>
  );
}
