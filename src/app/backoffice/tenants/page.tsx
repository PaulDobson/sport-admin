import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getTenantPlanManagement,
  getTenantStatusHistory,
  listTenants,
} from "@/application/saas-administration/use-cases/manage-tenants";
import type { TenantStatus } from "@/domain/tenants/tenant";
import type { TenantTransitionStatus } from "@/domain/saas-administration/tenant-backoffice";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { TenantStatusForm } from "./tenant-status-form";
import { PlanLimitsForm } from "./plan-limits-form";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";

interface TenantBackofficePageProps {
  searchParams: Promise<{ status?: string; tenant?: string }>;
}

const statusLabels: Record<TenantStatus, string> = {
  pending: "Pendiente",
  trial: "Trial",
  active: "Activo",
  suspended: "Suspendido",
  cancelled: "Cancelado",
};

const transitions: Record<TenantStatus, TenantTransitionStatus[]> = {
  pending: ["trial", "active", "cancelled"],
  trial: ["active", "suspended", "cancelled"],
  active: ["suspended", "cancelled"],
  suspended: ["trial", "active", "cancelled"],
  cancelled: [],
};

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function TenantBackofficePage({
  searchParams,
}: TenantBackofficePageProps) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");

  const { tenantBackoffice } = await createSaasAdministrationDeps();
  if (!(await tenantBackoffice.isPlatformAdmin())) redirect("/dashboard");
  const [profile, operationalMemberships] = await Promise.all([
    auth.profiles.findByUserId(userId),
    auth.memberships.findOperationalByUser(userId),
  ]);
  const canAccessOperation = operationalMemberships.length > 0;

  const params = await searchParams;
  const allowedStatuses = [
    "pending",
    "trial",
    "active",
    "suspended",
    "cancelled",
  ] as const;
  const status = allowedStatuses.find((value) => value === params.status);
  const allTenants = await listTenants(tenantBackoffice);
  const tenants = status
    ? allTenants.filter((tenant) => tenant.status === status)
    : allTenants;
  const selectedTenant = allTenants.find(
    (tenant) => tenant.id === params.tenant,
  );
  const [history, planManagement] = selectedTenant
    ? await Promise.all([
        getTenantStatusHistory(selectedTenant.id, tenantBackoffice),
        getTenantPlanManagement(selectedTenant.id, tenantBackoffice),
      ])
    : [[], null];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <BackofficeShell
      title="Tenants"
      current="tenants"
      accountName={profile?.fullName || "Cuenta"}
      canAccessOperation={canAccessOperation}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-primary">
              Administración SaaS
            </p>
            <h1 className="text-3xl font-semibold">Tenants</h1>
          </div>
          <div className="text-right">
            <Link
              href="/backoffice/finance"
              className="block text-sm font-semibold text-primary"
            >
              Finanzas SaaS
            </Link>
            <p className="metric-number mt-1 text-sm text-muted-foreground">
              {tenants.length} registros
            </p>
          </div>
        </header>

        <form
          className="mb-6 flex items-end gap-3 border-y border-border py-4"
          method="get"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
            Estado
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
            >
              <option value="">Todos</option>
              {allowedStatuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-md border border-border px-4 font-semibold"
          >
            Filtrar
          </button>
        </form>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <article key={tenant.id} className="surface-panel p-4">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      {tenant.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {tenant.billingContactEmail ??
                        "Sin contacto de facturación"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {statusLabels[tenant.status]}
                  </span>
                </div>
                <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    Registro: {dateFormatter.format(tenant.createdAt)}
                  </span>
                  <Link
                    href={`/backoffice/tenants?${new URLSearchParams({
                      ...(status ? { status } : {}),
                      tenant: tenant.id,
                    })}`}
                    className="font-semibold text-primary"
                  >
                    Ver historial
                  </Link>
                </div>
                <TenantStatusForm
                  tenantId={tenant.id}
                  availableStatuses={transitions[tenant.status]}
                />
              </article>
            ))}
            {tenants.length === 0 ? (
              <p className="border-y border-border py-10 text-center text-muted-foreground">
                No hay tenants para este filtro.
              </p>
            ) : null}
          </div>

          <aside
            className="border-l-0 border-border lg:border-l lg:pl-5"
            aria-labelledby="history-heading"
          >
            <section className="mb-8" aria-labelledby="plan-heading">
              <h2 id="plan-heading" className="mb-3 text-xl font-semibold">
                Plan y límites
              </h2>
              {selectedTenant && planManagement?.entitlements ? (
                <PlanLimitsForm
                  tenantId={selectedTenant.id}
                  entitlements={planManagement.entitlements}
                  plans={planManagement.plans}
                  minimumDate={today}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {selectedTenant
                    ? "Este tenant no tiene una suscripción vigente."
                    : "Selecciona un tenant para administrar su plan."}
                </p>
              )}
            </section>
            <h2 id="history-heading" className="mb-3 text-xl font-semibold">
              Historial {selectedTenant ? `· ${selectedTenant.name}` : ""}
            </h2>
            {selectedTenant && history.length > 0 ? (
              <ol className="space-y-4">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-b border-border pb-4 last:border-b-0"
                  >
                    <p className="font-semibold">
                      {entry.previousStatus
                        ? statusLabels[entry.previousStatus]
                        : "Inicio"}
                      {" → "}
                      {statusLabels[entry.newStatus]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.reason}
                    </p>
                    <time
                      className="mt-2 block text-xs text-muted-foreground"
                      dateTime={entry.occurredAt.toISOString()}
                    >
                      {dateFormatter.format(entry.occurredAt)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedTenant
                  ? "Sin cambios registrados."
                  : "Selecciona un tenant para revisar sus cambios."}
              </p>
            )}
          </aside>
        </section>
      </div>
    </BackofficeShell>
  );
}
