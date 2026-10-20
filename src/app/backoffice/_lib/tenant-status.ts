import type { TenantStatus } from "@/domain/tenants/tenant";
import type {
  TenantBackofficeSummary,
  TenantTransitionStatus,
} from "@/domain/saas-administration/tenant-backoffice";
import type { ToneBadgeTone } from "@/presentation/components/primitives";

export const tenantStatuses = [
  "active",
  "trial",
  "pending",
  "suspended",
  "cancelled",
] as const satisfies readonly TenantStatus[];

export const tenantStatusLabels: Record<TenantStatus, string> = {
  pending: "Pendiente",
  trial: "Trial",
  active: "Activo",
  suspended: "Suspendido",
  cancelled: "Cancelado",
};

export const tenantStatusTones: Record<TenantStatus, ToneBadgeTone> = {
  pending: "warning",
  trial: "info",
  active: "success",
  suspended: "destructive",
  cancelled: "neutral",
};

/** Background utility per status, used by distribution bars and legends. */
export const tenantStatusFills: Record<TenantStatus, string> = {
  active: "bg-success",
  trial: "bg-info",
  pending: "bg-warning",
  suspended: "bg-destructive",
  cancelled: "bg-chart-muted/60",
};

export const tenantTransitions: Record<TenantStatus, TenantTransitionStatus[]> =
  {
    pending: ["trial", "active", "cancelled"],
    trial: ["active", "suspended", "cancelled"],
    active: ["suspended", "cancelled"],
    suspended: ["trial", "active", "cancelled"],
    cancelled: [],
  };

export function isTenantStatus(value: unknown): value is TenantStatus {
  return tenantStatuses.some((status) => status === value);
}

export function countTenantsByStatus(tenants: TenantBackofficeSummary[]) {
  const counts: Record<TenantStatus, number> = {
    active: 0,
    trial: 0,
    pending: 0,
    suspended: 0,
    cancelled: 0,
  };
  for (const tenant of tenants) counts[tenant.status] += 1;
  return counts;
}

export function filterTenants(
  tenants: TenantBackofficeSummary[],
  { status, query }: { status?: TenantStatus; query?: string },
) {
  const needle = query?.trim().toLocaleLowerCase("es") ?? "";
  return tenants.filter((tenant) => {
    if (status && tenant.status !== status) return false;
    if (!needle) return true;
    return [tenant.name, tenant.contactName, tenant.contactEmail, tenant.phone,
      tenant.address, tenant.city, tenant.region, tenant.billingContactEmail, tenant.billingContactName]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase("es").includes(needle));
  });
}
