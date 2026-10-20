import Link from "next/link";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Search, UserRound } from "lucide-react";
import {
  getTenantPlanManagement,
  getTenantStatusHistory,
  listTenants,
} from "@/application/saas-administration/use-cases/manage-tenants";
import type { TenantStatus } from "@/domain/tenants/tenant";
import type { TenantBackofficeSummary } from "@/domain/saas-administration/tenant-backoffice";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import {
  Avatar,
  Panel,
  ResponsiveTable,
  ToneBadge,
} from "@/presentation/components/primitives";
import { loadBackofficeContext } from "../_lib/backoffice-context";
import {
  countTenantsByStatus,
  filterTenants,
  isTenantStatus,
  tenantStatuses,
  tenantStatusLabels,
  tenantStatusTones,
  tenantTransitions,
} from "../_lib/tenant-status";
import { TenantStatusForm } from "./tenant-status-form";
import { PlanLimitsForm } from "./plan-limits-form";

interface TenantBackofficePageProps {
  searchParams: Promise<{ status?: string; tenant?: string; q?: string }>;
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function tenantsHref(params: {
  status?: TenantStatus;
  q?: string;
  tenant?: string;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.tenant) search.set("tenant", params.tenant);
  const query = search.toString();
  return `/backoffice/tenants${query ? `?${query}` : ""}`;
}

export default async function TenantBackofficePage({
  searchParams,
}: TenantBackofficePageProps) {
  const { deps, shell } = await loadBackofficeContext();
  const { tenantBackoffice } = deps;

  const params = await searchParams;
  const status = isTenantStatus(params.status) ? params.status : undefined;
  const query = params.q?.trim().slice(0, 100) || undefined;
  const allTenants = await listTenants(tenantBackoffice);
  const counts = countTenantsByStatus(allTenants);
  const tenants = filterTenants(allTenants, { status, query });
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

  const filters: Array<{ key: string; label: string; count: number; status?: TenantStatus }> = [
    { key: "all", label: "Todos", count: allTenants.length },
    ...tenantStatuses.map((value) => ({
      key: value,
      label: tenantStatusLabels[value],
      count: counts[value],
      status: value,
    })),
  ];

  return (
    <BackofficeShell
      title="Tenants"
      description="Administra el ciclo de vida, plan y límites de cada negocio"
      current="tenants"
      {...shell}
    >
      <div className="space-y-5 lg:space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav
            aria-label="Filtrar por estado"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {filters.map((filter) => {
              const active = filter.status === status;
              return (
                <Link
                  key={filter.key}
                  href={tenantsHref({ status: filter.status, q: query })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-white/8 text-muted-foreground hover:bg-white/4 hover:text-foreground"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`metric-number rounded-full px-1.5 text-[10px] ${
                      active ? "bg-primary/20" : "bg-white/8"
                    }`}
                  >
                    {filter.count}
                  </span>
                </Link>
              );
            })}
          </nav>

          <form method="get" role="search" className="relative lg:w-80">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <label htmlFor="tenant-search" className="sr-only">
              Buscar tenant
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="tenant-search"
              type="search"
              name="q"
              defaultValue={query ?? ""}
              maxLength={100}
              placeholder="Nombre, contacto o ubicación…"
              className="h-11 w-full rounded-xl border border-white/8 bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </form>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <Panel
            title="Cartera de tenants"
            description={`${tenants.length} ${tenants.length === 1 ? "registro" : "registros"}${status ? ` · ${tenantStatusLabels[status]}` : ""}${query ? ` · “${query}”` : ""}`}
            labelledBy="tenant-list-heading"
            className={selectedTenant ? "order-2 lg:order-none" : undefined}
          >
            {tenants.length > 0 ? (
              <TenantTable
                tenants={tenants}
                selectedId={selectedTenant?.id}
                hrefFor={(tenant) =>
                  `${tenantsHref({ status, q: query, tenant: tenant.id })}#detalle-tenant`
                }
              />
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                <Building2 aria-hidden className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">No hay tenants para este filtro.</p>
                <Link
                  href="/backoffice/tenants"
                  className="mt-2 inline-block text-xs font-semibold text-primary"
                >
                  Limpiar filtros
                </Link>
              </div>
            )}
          </Panel>

          <aside
            id="detalle-tenant"
            aria-label="Detalle del tenant"
            className={`scroll-mt-28 ${selectedTenant ? "order-1 lg:order-none" : ""}`}
          >
            {selectedTenant ? (
              <div className="grid min-w-0 grid-cols-1 gap-5 lg:sticky lg:top-[calc(var(--topbar-height)+1.5rem)]">
                <Link
                  href={tenantsHref({ status, q: query })}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground lg:hidden"
                >
                  <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
                  Volver al listado
                </Link>
                <TenantSummaryCard tenant={selectedTenant} />

                <Panel
                  title="Cambiar estado"
                  description="Cada transición queda registrada con su motivo"
                  labelledBy="status-heading"
                >
                  <TenantStatusForm
                    key={selectedTenant.id}
                    tenantId={selectedTenant.id}
                    availableStatuses={tenantTransitions[selectedTenant.status]}
                  />
                </Panel>

                <Panel
                  title="Plan y límites"
                  description="Uso actual frente al plan contratado"
                  labelledBy="plan-heading"
                >
                  {planManagement?.entitlements ? (
                    <PlanLimitsForm
                      key={selectedTenant.id}
                      tenantId={selectedTenant.id}
                      entitlements={planManagement.entitlements}
                      plans={planManagement.plans}
                      minimumDate={today}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Este tenant no tiene una suscripción vigente.
                    </p>
                  )}
                  <Link
                    href={`/backoffice/tenants/${selectedTenant.id}/subscription`}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold"
                  >
                    Gestionar suscripción
                  </Link>
                </Panel>

                <Panel
                  title="Historial"
                  description={`Cambios de estado · ${selectedTenant.name}`}
                  labelledBy="history-heading"
                >
                  {history.length > 0 ? (
                    <ol className="relative ml-1.5 border-l border-white/10">
                      {history.map((entry) => (
                        <li key={entry.id} className="relative pb-5 pl-5 last:pb-0">
                          <span
                            aria-hidden="true"
                            className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card"
                          />
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                            {entry.previousStatus ? (
                              <ToneBadge tone={tenantStatusTones[entry.previousStatus]}>
                                {tenantStatusLabels[entry.previousStatus]}
                              </ToneBadge>
                            ) : (
                              <ToneBadge>Inicio</ToneBadge>
                            )}
                            <span aria-label="a">→</span>
                            <ToneBadge tone={tenantStatusTones[entry.newStatus]}>
                              {tenantStatusLabels[entry.newStatus]}
                            </ToneBadge>
                          </p>
                          <p className="mt-1.5 text-sm text-muted-foreground">
                            {entry.reason}
                          </p>
                          <time
                            className="metric-number mt-1 block text-[11px] text-muted-foreground/80"
                            dateTime={entry.occurredAt.toISOString()}
                          >
                            {dateTimeFormatter.format(entry.occurredAt)}
                          </time>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sin cambios registrados.
                    </p>
                  )}
                </Panel>
              </div>
            ) : (
              <div className="hidden rounded-2xl border border-dashed border-white/10 bg-card/40 px-6 py-12 text-center lg:block">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 aria-hidden className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-base font-semibold">
                  Selecciona un tenant
                </h2>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Elige un negocio del listado para administrar su estado, plan
                  y revisar su historial.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </BackofficeShell>
  );
}

function TenantSummaryCard({ tenant }: { tenant: TenantBackofficeSummary }) {
  return (
    <section
      aria-labelledby="selected-tenant-heading"
      className="relative overflow-hidden rounded-2xl border border-white/6 bg-card p-4 sm:p-5"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />
      <div className="relative flex items-start gap-3">
        <Avatar name={tenant.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2
              id="selected-tenant-heading"
              className="truncate text-lg font-bold tracking-tight"
            >
              {tenant.name}
            </h2>
            <ToneBadge tone={tenantStatusTones[tenant.status]}>
              {tenantStatusLabels[tenant.status]}
            </ToneBadge>
          </div>
          <p className="metric-number mt-0.5 text-xs text-muted-foreground">
            Registro {dateFormatter.format(tenant.createdAt)}
          </p>
        </div>
      </div>
      <h3 className="relative mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto principal</h3>
      <dl className="relative mt-3 grid gap-3 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <dt className="sr-only">Nombre del contacto principal</dt>
          <UserRound aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <dd className="min-w-0 break-words text-foreground">{tenant.contactName ?? "Sin nombre de contacto principal"}</dd>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <dt className="sr-only">Email del contacto principal</dt>
          <Mail aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <dd className="min-w-0 break-words text-foreground">{tenant.contactEmail ?? "Sin email de contacto principal"}</dd>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <dt className="sr-only">Teléfono</dt>
          <Phone aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <dd className="min-w-0 break-words text-foreground">{tenant.phone ?? "Sin teléfono registrado"}</dd>
        </div>
      </dl>
      <h3 className="relative mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ubicación</h3>
      <dl className="relative mt-3 grid gap-3 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <dt className="sr-only">Dirección</dt>
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <dd className="min-w-0 break-words text-foreground">{tenant.address ?? "Sin dirección registrada"}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Ciudad</dt>
            <dd className="mt-1 break-words">{tenant.city ?? "Sin ciudad registrada"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Región</dt>
            <dd className="mt-1 break-words">{tenant.region ?? "Sin región registrada"}</dd>
          </div>
        </div>
      </dl>
      <h3 className="relative mt-5 border-t border-border pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facturación</h3>
      <dl className="relative mt-3 grid gap-3 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <dt className="sr-only">Nombre del contacto de facturación</dt>
          <UserRound aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <dd className="min-w-0 break-words text-foreground">
            {tenant.billingContactName ?? "Sin nombre de contacto de facturación"}
          </dd>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <dt className="sr-only">Correo de facturación</dt>
          <Mail aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <dd className="min-w-0 break-words text-foreground">
            {tenant.billingContactEmail ?? "Sin contacto de facturación"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function TenantTable({
  tenants,
  selectedId,
  hrefFor,
}: {
  tenants: TenantBackofficeSummary[];
  selectedId?: string;
  hrefFor: (tenant: TenantBackofficeSummary) => string;
}) {
  return (
    <ResponsiveTable
      caption="Listado de tenants"
      rows={tenants}
      rowKey={(tenant) => tenant.id}
      columns={[
        {
          key: "tenant",
          header: "Tenant",
          cell: (tenant) => (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar name={tenant.name} size="sm" />
              <span className="min-w-0">
                <span
                  className={`block truncate font-semibold ${
                    tenant.id === selectedId ? "text-primary" : ""
                  }`}
                >
                  {tenant.name}
                </span>
                <span className="block max-w-64 truncate text-xs text-muted-foreground">
                  {tenant.contactEmail ?? tenant.contactName ?? "Sin contacto principal"}
                </span>
              </span>
            </span>
          ),
        },
        {
          key: "created",
          header: "Registro",
          cell: (tenant) => (
            <time
              dateTime={tenant.createdAt.toISOString()}
              className="metric-number text-xs text-muted-foreground"
            >
              {dateFormatter.format(tenant.createdAt)}
            </time>
          ),
        },
        {
          key: "status",
          header: "Estado",
          cell: (tenant) => (
            <ToneBadge tone={tenantStatusTones[tenant.status]}>
              {tenantStatusLabels[tenant.status]}
            </ToneBadge>
          ),
        },
        {
          key: "action",
          header: "Acción",
          align: "end",
          cell: (tenant) => (
            <Link
              href={hrefFor(tenant)}
              aria-current={tenant.id === selectedId ? "true" : undefined}
              aria-label={`Gestionar ${tenant.name}`}
              className={`inline-flex min-h-8 items-center rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                tenant.id === selectedId
                  ? "bg-primary text-primary-foreground"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              {tenant.id === selectedId ? "Seleccionado" : "Gestionar"}
            </Link>
          ),
        },
      ]}
      renderCard={(tenant) => (
        <Link
          href={hrefFor(tenant)}
          aria-current={tenant.id === selectedId ? "true" : undefined}
          aria-label={`Gestionar ${tenant.name}`}
          className="flex items-center gap-3"
        >
          <Avatar name={tenant.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-sm font-semibold ${
                tenant.id === selectedId ? "text-primary" : ""
              }`}
            >
              {tenant.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {tenant.contactEmail ?? tenant.contactName ?? "Sin contacto principal"}
            </span>
          </span>
          <ToneBadge tone={tenantStatusTones[tenant.status]}>
            {tenantStatusLabels[tenant.status]}
          </ToneBadge>
        </Link>
      )}
    />
  );
}
