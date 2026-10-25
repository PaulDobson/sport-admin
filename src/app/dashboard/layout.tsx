import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import { OperationalRouteTopbar } from "@/presentation/components/operational-route-topbar";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import { AssignPlanFromUrl } from "./finance/assign-plan-from-url";
import { canManageTenantDetails } from "@/domain/tenants/tenant-details";
import { checkInstructorSetup } from "./_lib/instructor-setup-check";
import {
  InstructorSetupWizard,
  SetupWizardTopbarButton,
} from "./instructor-setup-wizard";

function roleLabel(role: string) {
  return role === "owner"
    ? "Dueño"
    : role === "assistant"
      ? "Asistente"
      : role === "admin"
        ? "Administrador"
        : role;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await loadOperationalContext();
  if (context.status === "unauthenticated") redirect("/log-in");
  if (context.status === "no-membership") redirect("/onboarding");
  if (context.status === "selection-required") redirect("/select-tenant");
  if (context.status === "no-operational-tenant") return children;

  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const [profile, tenants] = await Promise.all([
    auth.profiles.findByUserId(userId),
    auth.tenants.findOperationalByUser(userId),
  ]);
  const membership = context.membership;
  const label = roleLabel(membership.role);
  const activeTenant = tenants.find(
    (tenant) => tenant.id === membership.tenantId,
  );
  const tenantName = activeTenant?.name ?? "Organización activa";
  const tenantOptions = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
  }));

  // Wizard: only for owners (who created the tenant), not assistants/instructors.
  const canSeeWizard =
    membership.role === "owner" && activeTenant !== undefined;
  const setupState = canSeeWizard
    ? await checkInstructorSetup(membership.tenantId, activeTenant.createdAt)
    : null;

  return (
    <AppShell
      sidebarHeader={<ProductMark context={label} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={<QuickActionMenu role={membership.role} />}
        />
      }
      topbar={
        <OperationalRouteTopbar
          tenantName={tenantName}
          account={{
            profileName: profile?.fullName || "Tu cuenta",
            currentTenantId: membership.tenantId,
            roleLabel: label,
            canManageGym: canManageTenantDetails(membership.role),
            canReadBilling: membership.role === "owner",
            tenants: tenantOptions,
          }}
          extraActions={
            setupState?.showWizard ? (
              <SetupWizardTopbarButton
                completedCount={
                  (setupState.hasDiscipline ? 1 : 0) +
                  (setupState.hasPlan ? 1 : 0) +
                  (setupState.hasStudent ? 1 : 0) +
                  (setupState.hasMembership ? 1 : 0)
                }
              />
            ) : undefined
          }
        />
      }
    >
      {children}
      {membership.role !== "assistant" ? (
        <Suspense fallback={null}>
          <AssignPlanFromUrl />
        </Suspense>
      ) : null}
      {setupState?.showWizard && activeTenant ? (
        <InstructorSetupWizard
          hasDiscipline={setupState.hasDiscipline}
          hasLocation={setupState.hasLocation}
          hasPlan={setupState.hasPlan}
          hasStudent={setupState.hasStudent}
          hasMembership={setupState.hasMembership}
          tenantCreatedAt={activeTenant.createdAt.toISOString()}
        />
      ) : null}
    </AppShell>
  );
}
