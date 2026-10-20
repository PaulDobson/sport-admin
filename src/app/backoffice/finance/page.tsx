import Link from "next/link";
import {
  AlertOctagon,
  CircleDollarSign,
  Download,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { getSaasFinancialDashboard } from "@/application/saas-administration/use-cases/get-saas-financial-dashboard";
import type { SaasFinancialMetric } from "@/domain/saas-administration/financial-dashboard";
import { formatMoney } from "@/lib/format-money";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import {
  EmptyState,
  Panel,
  StatCard,
  type ToneBadgeTone,
} from "@/presentation/components/primitives";
import {
  DistributionBar,
  InsightRow,
} from "@/presentation/components/backoffice-widgets";
import { loadBackofficeContext } from "../_lib/backoffice-context";
import {
  collectionBreakdown,
  formatDelta,
  formatPeriodLabel,
  formatRate,
  percentChange,
  previousPeriod,
  resolvePeriod,
} from "../_lib/finance-insights";

interface SaasFinancePageProps {
  searchParams: Promise<{ period?: string; currency?: string }>;
}

const definitions = [
  {
    term: "MRR, ARR y ARPA",
    description:
      "MRR = precio / N meses, o precio × 365 / (12 × N días). ARR = MRR × 12; ARPA = MRR por tenant recurrente al cierre. Los cobros proporcionales no se suman otra vez al MRR.",
  },
  {
    term: "Churn",
    description:
      "Tenants cancelados en el mes sobre tenants recurrentes al inicio.",
  },
  {
    term: "Conversión trial",
    description:
      "Trials convertidos a activo sobre trials que finalizan en el mes.",
  },
  {
    term: "Cobranza",
    description:
      "Cobrado neto resta reembolsos; pendiente aún no vence; mora ya alcanzó su fecha de pago.",
  },
];

function deltaBadge(
  delta: string | null,
  fallback?: { label: string; tone: ToneBadgeTone },
) {
  if (!delta) return fallback;
  return {
    label: delta,
    tone: (delta.startsWith("-") ? "destructive" : "success") as ToneBadgeTone,
  };
}

export default async function SaasFinancePage({
  searchParams,
}: SaasFinancePageProps) {
  const { deps, shell } = await loadBackofficeContext();
  const { financialDashboard } = deps;

  const params = await searchParams;
  const period = resolvePeriod(params.period);
  const [allMetrics, previousMetrics] = await Promise.all([
    getSaasFinancialDashboard(period, financialDashboard),
    getSaasFinancialDashboard(previousPeriod(period), financialDashboard),
  ]);
  const currencies = allMetrics.map((metric) => metric.currency);
  const selectedCurrency = currencies.includes(params.currency ?? "")
    ? params.currency
    : undefined;
  const metrics = selectedCurrency
    ? allMetrics.filter((metric) => metric.currency === selectedCurrency)
    : allMetrics;
  const periodLabel = formatPeriodLabel(period);
  const exportHref = `/api/reports/export?report=saas-finance&period=${period}${selectedCurrency ? `&currency=${selectedCurrency}` : ""}`;

  return (
    <BackofficeShell
      title="Finanzas SaaS"
      description={`Auditoría de ingresos y cobranza · ${periodLabel}`}
      current="finance"
      {...shell}
    >
      <div className="space-y-5 lg:space-y-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/backoffice/collections" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Ver cartera de cobros</Link>
          <Link href="/backoffice/finance/issuer" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Configurar emisor de comprobantes</Link>
          <Link href="/backoffice/finance/documents" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Revisar PDF y correo</Link>
        </div>
        <Link href="/backoffice/finance/renewals" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold">
          <Repeat aria-hidden className="h-4 w-4 shrink-0" />Revisar renovaciones y cambios bloqueados
        </Link>
        <form
          method="get"
          aria-label="Filtros financieros"
          className="grid gap-3 rounded-2xl border border-white/6 bg-card p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
        >
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Período UTC
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="h-11 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Moneda
            <select
              name="currency"
              defaultValue={selectedCurrency ?? ""}
              className="h-11 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
            >
              <option value="">Todas, sin mezclar</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <button
              type="submit"
              className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Aplicar
            </button>
            <a
              href={exportHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white/4"
            >
              <Download aria-hidden className="h-4 w-4" />
              Exportar CSV
            </a>
          </div>
        </form>

        {metrics.length > 0 ? (
          metrics.map((metric) => (
            <CurrencyReport
              key={metric.currency}
              metric={metric}
              previous={previousMetrics.find(
                (candidate) => candidate.currency === metric.currency,
              )}
              periodLabel={periodLabel}
              period={period}
              showCurrencyHeading={metrics.length > 1}
            />
          ))
        ) : (
          <EmptyState
            title="No hay movimientos SaaS para este período."
            description="Prueba con otro mes o revisa que existan suscripciones activas."
          />
        )}

        <section
          aria-labelledby="definitions-heading"
          className="rounded-2xl border border-white/6 bg-card p-4 sm:p-5"
        >
          <h2 id="definitions-heading" className="text-base font-semibold">
            Definiciones
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {definitions.map((definition) => (
              <details
                key={definition.term}
                className="group rounded-xl border border-white/5 bg-white/2.5 px-3 py-2.5 open:bg-white/4"
              >
                <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {definition.term}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-1 text-sm text-muted-foreground">
                  {definition.description}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </BackofficeShell>
  );
}

function CurrencyReport({
  metric,
  previous,
  periodLabel,
  period,
  showCurrencyHeading,
}: {
  metric: SaasFinancialMetric;
  previous?: SaasFinancialMetric;
  periodLabel: string;
  period: string;
  showCurrencyHeading: boolean;
}) {
  const money = (amount: number) => formatMoney(amount, metric.currency);
  const breakdown = collectionBreakdown(metric);
  const headingId = `currency-${metric.currency}-heading`;

  return (
    <section aria-labelledby={headingId} className="space-y-4 lg:space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id={headingId}
          className={showCurrencyHeading ? "text-lg font-bold" : "sr-only"}
        >
          Indicadores en {metric.currency}
        </h2>
        {showCurrencyHeading ? (
          <span className="metric-number text-xs text-muted-foreground">
            {periodLabel} · UTC
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="MRR"
          accent="primary"
          icon={TrendingUp}
          value={money(metric.mrr)}
          note={`ARR ${money(metric.arr)}`}
          badge={deltaBadge(formatDelta(percentChange(metric.mrr, previous?.mrr)))}
        />
        <StatCard
          label="Cobrado neto"
          accent="success"
          icon={CircleDollarSign}
          value={money(metric.collectedNet)}
          note="Descontados reembolsos"
          badge={deltaBadge(
            formatDelta(percentChange(metric.collectedNet, previous?.collectedNet)),
          )}
        />
        <StatCard
          label="Pendiente"
          accent="warning"
          icon={Repeat}
          value={money(metric.pendingAmount)}
          note="Aún dentro de plazo"
          badge={
            metric.pendingAmount > 0
              ? { label: "Atención", tone: "warning" }
              : undefined
          }
        />
        <StatCard
          label="Mora"
          accent="destructive"
          icon={AlertOctagon}
          value={money(metric.pastDueAmount)}
          note={`${metric.pastDueTenants} ${metric.pastDueTenants === 1 ? "tenant vencido" : "tenants vencidos"}`}
          badge={
            metric.pastDueAmount > 0
              ? { label: "Vencido", tone: "destructive" }
              : { label: "Al día", tone: "success" }
          }
        />
      </div>
      <nav aria-label={`Detalle de indicadores ${metric.currency}`} className="flex flex-wrap gap-2">
        {([["mrr","Desglosar MRR"],["collected","Desglosar cobrado"],["pending","Desglosar pendiente"],["past_due","Desglosar mora"]] as const).map(([key,label]) =>
          <Link key={key} href={`/backoffice/finance/ledger?period=${period}&currency=${metric.currency}&metric=${key}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs font-semibold">{label}</Link>)}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-6">
        <Panel
          title="Libro de cobranza"
          description={`Facturación del período · ${periodLabel}`}
          labelledBy={`${headingId}-collection`}
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="metric-number text-2xl font-bold tracking-tight sm:text-3xl">
                {money(breakdown.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total facturado (cobrado + pendiente + mora)
              </p>
            </div>
            <p className="metric-number text-sm font-semibold text-success">
              {Math.round(breakdown.collectedShare)}% recaudado
            </p>
          </div>
          <DistributionBar
            label="Composición de la cobranza"
            segments={[
              {
                key: "collected",
                label: "Cobrado neto",
                value: Math.max(metric.collectedNet, 0),
                display: money(metric.collectedNet),
                fillClassName: "bg-success",
              },
              {
                key: "pending",
                label: "Pendiente",
                value: metric.pendingAmount,
                display: money(metric.pendingAmount),
                fillClassName: "bg-warning",
              },
              {
                key: "past-due",
                label: "Mora",
                value: metric.pastDueAmount,
                display: money(metric.pastDueAmount),
                fillClassName: "bg-destructive",
              },
            ]}
          />
          {metric.pastDueTenants > 0 ? (
            <Link
              href="/backoffice/tenants"
              className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-3 text-sm transition-colors hover:bg-destructive/12"
            >
              <span>
                <span className="block font-semibold text-destructive">
                  {metric.pastDueTenants} {metric.pastDueTenants === 1 ? "tenant" : "tenants"} con pagos vencidos
                </span>
                <span className="text-xs text-muted-foreground">
                  Revisa la cartera y gestiona su estado
                </span>
              </span>
              <span className="text-xs font-semibold text-destructive">Revisar</span>
            </Link>
          ) : null}
        </Panel>

        <Panel
          title="Matriz de retención"
          description="Indicadores de salud del ingreso recurrente"
          labelledBy={`${headingId}-retention`}
        >
          <ul className="grid grid-cols-1 gap-2">
            <li>
              <InsightRow
                title="ARR"
                caption="MRR × 12"
                value={money(metric.arr)}
                status={{ label: "Proyección", tone: "info" }}
              />
            </li>
            <li>
              <InsightRow
                title="ARPA"
                caption={`${metric.recurringTenants} tenants recurrentes`}
                value={money(metric.arpa)}
                status={deltaBadge(
                  formatDelta(percentChange(metric.arpa, previous?.arpa)),
                  { label: "Promedio", tone: "neutral" },
                )}
              />
            </li>
            <li>
              <InsightRow
                title="Churn"
                caption={`${metric.churnedTenants} ${metric.churnedTenants === 1 ? "cancelado" : "cancelados"}`}
                value={formatRate(metric.churnRate)}
                status={
                  metric.churnRate > 5
                    ? { label: "Alto", tone: "destructive" }
                    : metric.churnRate > 0
                      ? { label: "Controlado", tone: "warning" }
                      : { label: "Sin bajas", tone: "success" }
                }
              />
            </li>
            <li>
              <InsightRow
                title="Conversión trial"
                caption={`${metric.trialsConverted}/${metric.trialsEnded} trials`}
                value={formatRate(metric.trialConversionRate)}
                status={
                  metric.trialsEnded === 0
                    ? { label: "Sin datos", tone: "neutral" }
                    : metric.trialConversionRate >= 50
                      ? { label: "Saludable", tone: "success" }
                      : { label: "Mejorable", tone: "warning" }
                }
              />
            </li>
          </ul>
        </Panel>
      </div>
    </section>
  );
}
