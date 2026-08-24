import Link from "next/link";
import { redirect } from "next/navigation";
import { getSaasFinancialDashboard } from "@/application/saas-administration/use-cases/get-saas-financial-dashboard";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";

interface SaasFinancePageProps {
  searchParams: Promise<{ period?: string; currency?: string }>;
}

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatRate(rate: number) {
  return new Intl.NumberFormat("es", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(rate / 100);
}

export default async function SaasFinancePage({
  searchParams,
}: SaasFinancePageProps) {
  const auth = await createAuthDeps();
  if (!(await auth.auth.getCurrentUserId())) redirect("/log-in");

  const { financialDashboard } = await createSaasAdministrationDeps();
  if (!(await financialDashboard.isPlatformAdmin())) redirect("/dashboard");

  const params = await searchParams;
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const period =
    params.period && periodPattern.test(params.period)
      ? params.period
      : currentPeriod;
  const allMetrics = await getSaasFinancialDashboard(
    period,
    financialDashboard,
  );
  const currencies = allMetrics.map((metric) => metric.currency);
  const selectedCurrency = currencies.includes(params.currency ?? "")
    ? params.currency
    : undefined;
  const metrics = selectedCurrency
    ? allMetrics.filter((metric) => metric.currency === selectedCurrency)
    : allMetrics;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">
            Administración SaaS
          </p>
          <h1 className="text-3xl font-semibold">Finanzas de plataforma</h1>
        </div>
        <Link
          href="/backoffice/tenants"
          className="text-sm font-semibold text-primary"
        >
          Ver tenants
        </Link>
      </header>

      <form
        className="mb-8 grid gap-3 border-y border-border py-4 sm:grid-cols-[1fr_1fr_auto]"
        method="get"
      >
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Período UTC
          <input
            type="month"
            name="period"
            defaultValue={period}
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Moneda
          <select
            name="currency"
            defaultValue={selectedCurrency ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
          >
            <option value="">Todas, sin mezclar</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-10 self-end rounded-md bg-primary px-4 font-semibold text-primary-foreground"
        >
          Aplicar
        </button>
      </form>

      <div className="mb-6 flex justify-end">
        <a
          href={`/api/reports/export?report=saas-finance&period=${period}${selectedCurrency ? `&currency=${selectedCurrency}` : ""}`}
          className="text-sm font-semibold text-primary"
        >
          Exportar CSV
        </a>
      </div>

      {metrics.length > 0 ? (
        <section
          className="mb-10 space-y-6"
          aria-label="Indicadores por moneda"
        >
          {metrics.map((metric) => (
            <article key={metric.currency} className="surface-panel p-5 sm:p-6">
              <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-border pb-4">
                <h2 className="text-xl font-semibold">{metric.currency}</h2>
                <span className="text-sm text-muted-foreground">
                  {period} · UTC
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">MRR</dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold">
                    {formatMoney(metric.mrr, metric.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ARR</dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold">
                    {formatMoney(metric.arr, metric.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ARPA</dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold">
                    {formatMoney(metric.arpa, metric.currency)}
                  </dd>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.recurringTenants} tenants recurrentes
                  </p>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Churn</dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold text-warning">
                    {formatRate(metric.churnRate)}
                  </dd>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.churnedTenants} cancelados
                  </p>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Conversión trial
                  </dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold">
                    {formatRate(metric.trialConversionRate)}
                  </dd>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.trialsConverted}/{metric.trialsEnded} trials
                  </p>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Cobrado neto
                  </dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold text-success">
                    {formatMoney(metric.collectedNet, metric.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pendiente</dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold">
                    {formatMoney(metric.pendingAmount, metric.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Mora</dt>
                  <dd className="metric-number mt-1 text-2xl font-semibold text-warning">
                    {formatMoney(metric.pastDueAmount, metric.currency)}
                  </dd>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.pastDueTenants} tenants
                  </p>
                </div>
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <p className="mb-10 border-y border-border py-10 text-center text-muted-foreground">
          No hay movimientos SaaS para este período.
        </p>
      )}

      <section aria-labelledby="definitions-heading">
        <h2 id="definitions-heading" className="mb-3 text-xl font-semibold">
          Definiciones
        </h2>
        <dl className="grid gap-x-8 border-y border-border sm:grid-cols-2">
          <div className="border-b border-border py-4">
            <dt className="font-semibold">MRR, ARR y ARPA</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Precio normalizado por ciclo; ARR = MRR × 12; ARPA = MRR por
              tenant recurrente al cierre.
            </dd>
          </div>
          <div className="border-b border-border py-4">
            <dt className="font-semibold">Churn</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Tenants cancelados en el mes sobre tenants recurrentes al inicio.
            </dd>
          </div>
          <div className="border-b border-border py-4 sm:border-b-0">
            <dt className="font-semibold">Conversión trial</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Trials convertidos a activo sobre trials que finalizan en el mes.
            </dd>
          </div>
          <div className="py-4">
            <dt className="font-semibold">Cobranza</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Cobrado neto resta reembolsos; pendiente aún no vence; mora ya
              alcanzó su fecha de pago.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
