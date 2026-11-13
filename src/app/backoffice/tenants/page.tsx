import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { listTenants } from "@/application/saas-administration/use-cases/manage-tenants";
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
} from "../_lib/tenant-status";

interface TenantBackofficePageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function tenantsHref(params: { status?: TenantStatus; q?: string }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  const query = search.toString();
  return `/backoffice/tenants${query ? `?${query}` : ""}`;
}

export default async function TenantBackofficePage({
  searchParams,
}: TenantBackofficePageProps) {
  const { deps, shell } = await loadBackofficeContext();
  const params = await searchParams;
  const status = isTenantStatus(params.status) ? params.status : undefined;
  const query = params.q?.trim().slice(0, 100) || undefined;

  const allTenants = await listTenants(deps.tenantBackoffice);
  const counts = countTenantsByStatus(allTenants);
  const tenants = filterTenants(allTenants, { status, query });

  const filters: Array<{
    key: string;
    label: string;
    count: number;
    status?: TenantStatus;
  }> = [
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
      description="Administra el ciclo de vida y contratos de cada negocio"
      current="tenants"
      {...shell}
    >
      <div className="space-y-5 lg:space-y-6">
        {/* Filtros + buscador */}
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
            {status ? (
              <input type="hidden" name="status" value={status} />
            ) : null}
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

        {/* Tabla */}
        <Panel
          title="Cartera de tenants"
          description={`${tenants.length} ${tenants.length === 1 ? "registro" : "registros"}${status ? ` · ${tenantStatusLabels[status]}` : ""}${query ? ` · "${query}"` : ""}`}
          labelledBy="tenant-list-heading"
        >
          {tenants.length > 0 ? (
            <TenantTable tenants={tenants} />
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
              <Building2
                aria-hidden
                className="mx-auto h-8 w-8 text-muted-foreground"
              />
              <p className="mt-3 text-sm font-semibold">
                No hay tenants para este filtro.
              </p>
              <Link
                href="/backoffice/tenants"
                className="mt-2 inline-block text-xs font-semibold text-primary"
              >
                Limpiar filtros
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </BackofficeShell>
  );
}

function TenantTable({ tenants }: { tenants: TenantBackofficeSummary[] }) {
  return (
    <ResponsiveTable
      caption="Listado de tenants"
      rows={tenants}
      rowKey={(t) => t.id}
      columns={[
        {
          key: "tenant",
          header: "Tenant",
          cell: (t) => (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar name={t.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{t.name}</span>
                <span className="block max-w-64 truncate text-xs text-muted-foreground">
                  {t.contactEmail ?? t.contactName ?? "Sin contacto principal"}
                </span>
              </span>
            </span>
          ),
        },
        {
          key: "created",
          header: "Registro",
          cell: (t) => (
            <time
              dateTime={t.createdAt.toISOString()}
              className="metric-number text-xs text-muted-foreground"
            >
              {dateFormatter.format(t.createdAt)}
            </time>
          ),
        },
        {
          key: "status",
          header: "Estado",
          cell: (t) => (
            <ToneBadge tone={tenantStatusTones[t.status]}>
              {tenantStatusLabels[t.status]}
            </ToneBadge>
          ),
        },
        {
          key: "action",
          header: "Acción",
          align: "end",
          cell: (t) => (
            <Link
              href={`/backoffice/tenants/${t.id}`}
              aria-label={`Gestionar ${t.name}`}
              className="inline-flex min-h-8 items-center rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Gestionar
            </Link>
          ),
        },
      ]}
      renderCard={(t) => (
        <Link
          href={`/backoffice/tenants/${t.id}`}
          aria-label={`Gestionar ${t.name}`}
          className="flex items-center gap-3"
        >
          <Avatar name={t.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {t.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {t.contactEmail ?? t.contactName ?? "Sin contacto principal"}
            </span>
          </span>
          <ToneBadge tone={tenantStatusTones[t.status]}>
            {tenantStatusLabels[t.status]}
          </ToneBadge>
        </Link>
      )}
    />
  );
}
