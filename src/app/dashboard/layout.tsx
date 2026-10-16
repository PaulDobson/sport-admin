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
  const tenantName =
    tenants.find((tenant) => tenant.id === membership.tenantId)?.name ??
    "Organización activa";
  const tenantOptions = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
  }));

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
            tenants: tenantOptions,
          }}
        />
      }
    >
      {children}
    </AppShell>
  );
}
