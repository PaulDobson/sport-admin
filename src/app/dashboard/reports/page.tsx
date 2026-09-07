import Link from "next/link";
import { getOperationalReport } from "@/application/reporting/use-cases/get-operational-report";
import { getMonthlyFinancialProjection } from "@/application/instructor-finance/use-cases/get-monthly-financial-projection";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createReportingDeps } from "@/infrastructure/composition/reporting-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import { EmptyState, Surface } from "@/presentation/components/primitives";

interface ReportsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    location?: string;
    period?: string;
    currency?: string;
  }>;
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function queryString(values: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const membership = await requireOperationalMembership();

  const params = await searchParams;
  const today = new Date();
  const monthStart = `${today.toISOString().slice(0, 7)}-01`;
  const from =
    params.from && datePattern.test(params.from) ? params.from : monthStart;
  const to =
    params.to && datePattern.test(params.to)
      ? params.to
      : today.toISOString().slice(0, 10);
  const period =
    params.period && periodPattern.test(params.period)
      ? params.period
      : today.toISOString().slice(0, 7);
  const tenantId = membership.tenantId;
  const [reporting, finance] = await Promise.all([
    createReportingDeps(),
    createInstructorFinanceDeps(),
  ]);
  const locations = await reporting.locations.findActiveByTenant(tenantId);
  const locationId = locations.some(
    (location) => location.id === params.location,
  )
    ? params.location
    : undefined;
  const [operational, allFinancial] = await Promise.all([
    getOperationalReport(
      { tenantId, from, to, locationId },
      { operationalReports: reporting.operationalReports },
    ),
    getMonthlyFinancialProjection(
      { tenantId, period },
      { financialProjections: finance.financialProjections },
    ),
  ]);
  const currencies = allFinancial.map((row) => row.currency);
  const currency = currencies.includes(params.currency ?? "")
    ? params.currency
    : undefined;
  const financial = currency
    ? allFinancial.filter((row) => row.currency === currency)
    : allFinancial;
  const sharedQuery = { from, to, location: locationId, period, currency };

  const roleLabel =
    membership.role === "owner"
      ? "Dueño"
      : membership.role === "assistant"
        ? "Asistente"
        : membership.role === "admin"
          ? "Administrador"
          : membership.role;

  return (
    <AppShell
      sidebarHeader={<ProductMark context={roleLabel} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={<QuickActionMenu role={membership.role} />}
        />
      }
      topbar={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Reportes
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Operación y finanzas
            </h1>
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl">
        <form
          className="mb-8 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10 sm:grid-cols-5"
          method="get"
        >
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Desde
            <input
              className="h-10 rounded-lg border border-input bg-background px-3"
              type="date"
              name="from"
              defaultValue={from}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Hasta
            <input
              className="h-10 rounded-lg border border-input bg-background px-3"
              type="date"
              name="to"
              defaultValue={to}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Locación
            <select
              className="h-10 rounded-lg border border-input bg-background px-3"
              name="location"
              defaultValue={locationId ?? ""}
            >
              <option value="">Todas</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Mes financiero
            <input
              className="h-10 rounded-lg border border-input bg-background px-3"
              type="month"
              name="period"
              defaultValue={period}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Moneda
            <select
              className="h-10 rounded-lg border border-input bg-background px-3"
              name="currency"
              defaultValue={currency ?? ""}
            >
              <option value="">Todas, sin mezclar</option>
              {currencies.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button
            className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:col-start-5"
            type="submit"
          >
            Aplicar
          </button>
        </form>

        <section className="mb-10" aria-labelledby="operations-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="operations-heading" className="text-xl font-semibold">
              Operación
            </h2>
            <a
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-raised"
              href={`/api/reports/export?${queryString({ report: "operational", ...sharedQuery })}`}
            >
              Exportar CSV
            </a>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Surface>
              <dt className="text-sm text-muted-foreground">Alumnos activos</dt>
              <dd className="metric-number mt-1 text-2xl font-semibold">
                {operational.activeStudents}
              </dd>
            </Surface>
            <Surface>
              <dt className="text-sm text-muted-foreground">Asistencias</dt>
              <dd className="metric-number mt-1 text-2xl font-semibold">
                {operational.attendance.total}
              </dd>
            </Surface>
            <Surface>
              <dt className="text-sm text-muted-foreground">Evaluaciones</dt>
              <dd className="metric-number mt-1 text-2xl font-semibold">
                {operational.evaluations}
              </dd>
            </Surface>
            <Surface>
              <dt className="text-sm text-muted-foreground">
                Alertas abiertas
              </dt>
              <dd className="metric-number mt-1 text-2xl font-semibold text-warning">
                {operational.openAlerts}
              </dd>
            </Surface>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Presentes {operational.attendance.present} · Ausentes{" "}
            {operational.attendance.absent} · Tarde{" "}
            {operational.attendance.late} · Justificadas{" "}
            {operational.attendance.excused}
          </p>
        </section>

        <section aria-labelledby="finance-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="finance-heading" className="text-xl font-semibold">
              Finanzas del instructor
            </h2>
            <a
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-raised"
              href={`/api/reports/export?${queryString({ report: "instructor-finance", period, currency })}`}
            >
              Exportar CSV
            </a>
          </div>
          {financial.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {financial.map((row) => (
                <Surface key={row.currency}>
                  <h3 className="mb-3 font-semibold">{row.currency}</h3>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Contratado</dt>
                      <dd className="metric-number mt-1 font-semibold">
                        {row.contractedAmount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cobrable</dt>
                      <dd className="metric-number mt-1 font-semibold">
                        {row.collectibleAmount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cobrado</dt>
                      <dd className="metric-number mt-1 font-semibold text-success">
                        {row.collectedAmount}
                      </dd>
                    </div>
                  </dl>
                </Surface>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin datos financieros"
              description="No hay datos financieros para este período o moneda."
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
