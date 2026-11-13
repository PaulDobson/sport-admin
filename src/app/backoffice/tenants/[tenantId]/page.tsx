import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import {
  getTenantStatusHistory,
  listTenants,
} from "@/application/saas-administration/use-cases/manage-tenants";
import type { TenantBackofficeSummary, TenantStatusHistoryEntry } from "@/domain/saas-administration/tenant-backoffice";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Avatar, Panel, ToneBadge } from "@/presentation/components/primitives";
import { InsightRow } from "@/presentation/components/backoffice-widgets";
import { loadBackofficeContext } from "../../_lib/backoffice-context";
import {
  tenantStatusLabels,
  tenantStatusTones,
  tenantTransitions,
} from "../../_lib/tenant-status";
import { TenantStatusForm } from "../tenant-status-form";

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const [{ tenantId }, { deps, shell }] = await Promise.all([
    params,
    loadBackofficeContext(),
  ]);

  if (!z.uuid().safeParse(tenantId).success) notFound();

  const allTenants = await listTenants(deps.tenantBackoffice);
  const tenant = allTenants.find((t) => t.id === tenantId);
  if (!tenant) notFound();

  const history = await getTenantStatusHistory(tenantId, deps.tenantBackoffice);

  return (
    <BackofficeShell
      title={tenant.name}
      description="Gestión del tenant"
      current="tenants"
      {...shell}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/backoffice/tenants"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          Volver a Tenants
        </Link>

        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-white/6 bg-card p-5 sm:p-6">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar name={tenant.name} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {tenant.name}
                  </h1>
                  <ToneBadge tone={tenantStatusTones[tenant.status]}>
                    {tenantStatusLabels[tenant.status]}
                  </ToneBadge>
                </div>
                <p className="metric-number mt-1 text-xs text-muted-foreground">
                  Registrado el {dateFormatter.format(tenant.createdAt)}
                </p>
              </div>
            </div>
            <Link
              href={`/backoffice/tenants/${tenantId}/subscription`}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 text-sm font-semibold transition-colors hover:bg-surface-overlay"
            >
              <ClipboardList aria-hidden className="h-4 w-4" />
              Gestionar suscripción
            </Link>
          </div>
        </div>

        {/* Contenido principal: 2 columnas en md */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna izquierda */}
          <div className="space-y-6">
            {/* Contacto */}
            <Panel title="Contacto" labelledBy="contact-heading">
              <dl className="grid gap-3 text-sm">
                <ContactRow
                  icon={<UserRound aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label="Contacto principal"
                  value={tenant.contactName}
                  empty="Sin nombre de contacto"
                />
                <ContactRow
                  icon={<Mail aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label="Email"
                  value={tenant.contactEmail}
                  empty="Sin email de contacto"
                />
                <ContactRow
                  icon={<Phone aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label="Teléfono"
                  value={tenant.phone}
                  empty="Sin teléfono"
                />
              </dl>

              <h3 className="mt-5 border-t border-white/6 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Facturación
              </h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <ContactRow
                  icon={<UserRound aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label="Contacto de facturación"
                  value={tenant.billingContactName}
                  empty="Sin contacto de facturación"
                />
                <ContactRow
                  icon={<Mail aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label="Email de facturación"
                  value={tenant.billingContactEmail}
                  empty="Sin email de facturación"
                />
              </dl>

              <h3 className="mt-5 border-t border-white/6 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ubicación
              </h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <ContactRow
                  icon={<MapPin aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label="Dirección"
                  value={tenant.address}
                  empty="Sin dirección"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Ciudad</dt>
                    <dd className="mt-1 font-medium">{tenant.city ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Región</dt>
                    <dd className="mt-1 font-medium">{tenant.region ?? "—"}</dd>
                  </div>
                </div>
              </dl>
            </Panel>

            {/* Acciones rápidas */}
            <Panel title="Acciones" labelledBy="actions-heading">
              <div className="grid gap-2">
                <InsightRow
                  title="Suscripción y plan"
                  caption="Asignar, cambiar o revisar el contrato"
                  href={`/backoffice/tenants/${tenantId}/subscription`}
                  leading={
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <ClipboardList aria-hidden className="h-4 w-4" />
                    </span>
                  }
                />
                <InsightRow
                  title="Cobros"
                  caption="Ver historial de cobros de esta academia"
                  href={`/backoffice/collections?tenant=${tenantId}`}
                  leading={
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-info/10 text-info">
                      <Building2 aria-hidden className="h-4 w-4" />
                    </span>
                  }
                />
              </div>
            </Panel>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Cambiar estado */}
            <Panel
              title="Cambiar estado"
              description="Cada transición queda registrada con su motivo"
              labelledBy="status-heading"
            >
              <TenantStatusForm
                key={tenant.id}
                tenantId={tenant.id}
                availableStatuses={tenantTransitions[tenant.status]}
              />
            </Panel>

            {/* Historial */}
            <Panel
              title="Historial de estado"
              description={`${history.length} ${history.length === 1 ? "cambio" : "cambios"} registrados`}
              labelledBy="history-heading"
            >
              <StatusTimeline history={history} />
            </Panel>
          </div>
        </div>
      </div>
    </BackofficeShell>
  );
}

function ContactRow({
  icon,
  label,
  value,
  empty,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  empty: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words font-medium text-foreground">
          {value ?? <span className="font-normal text-muted-foreground">{empty}</span>}
        </dd>
      </div>
    </div>
  );
}

function StatusTimeline({ history }: { history: TenantStatusHistoryEntry[] }) {
  const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
    );
  }

  return (
    <ol className="relative ml-2 border-l border-white/8">
      {history.map((entry) => (
        <li key={entry.id} className="relative pb-5 pl-5 last:pb-0">
          <span
            aria-hidden
            className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card"
          />
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {entry.previousStatus ? (
              <ToneBadge tone={tenantStatusTones[entry.previousStatus]}>
                {tenantStatusLabels[entry.previousStatus]}
              </ToneBadge>
            ) : (
              <ToneBadge>
                <RefreshCw aria-hidden className="mr-1 h-2.5 w-2.5" />
                Inicio
              </ToneBadge>
            )}
            <span aria-label="cambió a" className="text-muted-foreground">→</span>
            <ToneBadge tone={tenantStatusTones[entry.newStatus]}>
              {tenantStatusLabels[entry.newStatus]}
            </ToneBadge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{entry.reason}</p>
          <time
            className="metric-number mt-1 block text-[11px] text-muted-foreground/70"
            dateTime={entry.occurredAt.toISOString()}
          >
            {dateTimeFormatter.format(entry.occurredAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
