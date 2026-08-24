import Link from "next/link";
import { redirect } from "next/navigation";
import { getOperationalReport } from "@/application/reporting/use-cases/get-operational-report";
import { getMonthlyFinancialProjection } from "@/application/instructor-finance/use-cases/get-monthly-financial-projection";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createReportingDeps } from "@/infrastructure/composition/reporting-composition";

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
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) redirect("/dashboard");

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
  const tenantId = memberships[0].tenantId;
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

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 block text-sm font-semibold text-primary"
          >
            Volver al panel
          </Link>
          <h1 className="text-3xl font-semibold">Reportes</h1>
        </div>
      </header>

      <form
        className="mb-8 grid gap-3 border-y border-border py-4 sm:grid-cols-5"
        method="get"
      >
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Desde
          <input
            className="h-10 rounded-md border border-input bg-background px-3"
            type="date"
            name="from"
            defaultValue={from}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Hasta
          <input
            className="h-10 rounded-md border border-input bg-background px-3"
            type="date"
            name="to"
            defaultValue={to}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Locación
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
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
            className="h-10 rounded-md border border-input bg-background px-3"
            type="month"
            name="period"
            defaultValue={period}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Moneda
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
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
          className="h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground sm:col-start-5"
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
            className="text-sm font-semibold text-primary"
            href={`/api/reports/export?${queryString({ report: "operational", ...sharedQuery })}`}
          >
            Exportar CSV
          </a>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="surface-panel p-4">
            <dt className="text-sm text-muted-foreground">Alumnos activos</dt>
            <dd className="metric-number mt-1 text-2xl font-semibold">
              {operational.activeStudents}
            </dd>
          </div>
          <div className="surface-panel p-4">
            <dt className="text-sm text-muted-foreground">Asistencias</dt>
            <dd className="metric-number mt-1 text-2xl font-semibold">
              {operational.attendance.total}
            </dd>
          </div>
          <div className="surface-panel p-4">
            <dt className="text-sm text-muted-foreground">Evaluaciones</dt>
            <dd className="metric-number mt-1 text-2xl font-semibold">
              {operational.evaluations}
            </dd>
          </div>
          <div className="surface-panel p-4">
            <dt className="text-sm text-muted-foreground">Alertas abiertas</dt>
            <dd className="metric-number mt-1 text-2xl font-semibold text-warning">
              {operational.openAlerts}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Presentes {operational.attendance.present} · Ausentes{" "}
          {operational.attendance.absent} · Tarde {operational.attendance.late}{" "}
          · Justificadas {operational.attendance.excused}
        </p>
      </section>

      <section aria-labelledby="finance-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="finance-heading" className="text-xl font-semibold">
            Finanzas del instructor
          </h2>
          <a
            className="text-sm font-semibold text-primary"
            href={`/api/reports/export?${queryString({ report: "instructor-finance", period, currency })}`}
          >
            Exportar CSV
          </a>
        </div>
        {financial.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {financial.map((row) => (
              <article key={row.currency} className="surface-panel p-4">
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
              </article>
            ))}
          </div>
        ) : (
          <p className="border-y border-border py-8 text-center text-muted-foreground">
            No hay datos financieros para este período.
          </p>
        )}
      </section>
    </main>
  );
}
