import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { listTenants } from "@/application/saas-administration/use-cases/manage-tenants";
import { getSaasFinancialDashboard } from "@/application/saas-administration/use-cases/get-saas-financial-dashboard";
import type { TenantBackofficeSummary } from "@/domain/saas-administration/tenant-backoffice";
import { formatMoney } from "@/lib/format-money";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import {
  Avatar,
  EmptyState,
  Panel,
  ResponsiveTable,
  StatCard,
  ToneBadge,
  type ToneBadgeTone,
} from "@/presentation/components/primitives";
import {
  DistributionBar,
  InsightRow,
} from "@/presentation/components/backoffice-widgets";
import { loadBackofficeContext } from "./_lib/backoffice-context";
import {
  collectionBreakdown,
  formatDelta,
  formatPeriodLabel,
  formatRate,
  percentChange,
  pickPrimaryMetric,
  previousPeriod,
  resolvePeriod,
} from "./_lib/finance-insights";
import {
  countTenantsByStatus,
  tenantStatuses,
  tenantStatusFills,
  tenantStatusLabels,
  tenantStatusTones,
} from "./_lib/tenant-status";

interface BackofficeOverviewPageProps {
  searchParams: Promise<{ currency?: string }>;
}

interface AttentionItem {
  key: string;
  title: string;
  caption: string;
  href: string;
  status: { label: string; tone: ToneBadgeTone };
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function BackofficeOverviewPage({
  searchParams,
}: BackofficeOverviewPageProps) {
  const { deps, shell } = await loadBackofficeContext();
  const params = await searchParams;
  const period = resolvePeriod(undefined);
  const [tenants, metrics, previousMetrics] = await Promise.all([
    listTenants(deps.tenantBackoffice),
    getSaasFinancialDashboard(period, deps.financialDashboard),
    getSaasFinancialDashboard(previousPeriod(period), deps.financialDashboard),
  ]);

  const metric = pickPrimaryMetric(metrics, params.currency);
  const previous = previousMetrics.find(
    (candidate) => candidate.currency === metric?.currency,
  );
  const counts = countTenantsByStatus(tenants);
  const recentTenants = [...tenants]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 6);
  const periodLabel = formatPeriodLabel(period);
  const mrrDelta = metric ? formatDelta(percentChange(metric.mrr, previous?.mrr)) : null;
  const collectedDelta = metric
    ? formatDelta(percentChange(metric.collectedNet, previous?.collectedNet))
    : null;
  const breakdown = metric ? collectionBreakdown(metric) : null;

  const attention: AttentionItem[] = [];
  if (counts.pending > 0) {
    attention.push({
      key: "pending",
      title: `${counts.pending} ${counts.pending === 1 ? "tenant pendiente" : "tenants pendientes"} de activación`,
      caption: "Define trial o activación",
      href: "/backoffice/tenants?status=pending",
      status: { label: "Revisar", tone: "warning" },
    });
  }
  if (metric && metric.pastDueTenants > 0) {
    attention.push({
      key: "past-due",
      title: `${metric.pastDueTenants} ${metric.pastDueTenants === 1 ? "tenant" : "tenants"} en mora`,
      caption: `${formatMoney(metric.pastDueAmount, metric.currency)} vencido`,
      href: `/backoffice/finance?currency=${metric.currency}`,
      status: { label: "Cobrar", tone: "destructive" },
    });
  }
  if (counts.suspended > 0) {
    attention.push({
      key: "suspended",
      title: `${counts.suspended} ${counts.suspended === 1 ? "tenant suspendido" : "tenants suspendidos"}`,
      caption: "Evalúa reactivación o cancelación",
      href: "/backoffice/tenants?status=suspended",
      status: { label: "Suspendido", tone: "destructive" },
    });
  }
  if (counts.trial > 0) {
    attention.push({
      key: "trial",
      title: `${counts.trial} ${counts.trial === 1 ? "tenant" : "tenants"} en trial`,
      caption: "Oportunidad de conversión a plan pagado",
      href: "/backoffice/tenants?status=trial",
      status: { label: "Convertir", tone: "info" },
    });
  }

  return (
    <BackofficeShell
      title="Resumen de plataforma"
      description={`Gestión administrativa y financiera · ${periodLabel}`}
      current="overview"
      {...shell}
    >
      <div className="space-y-5 lg:space-y-6">
        {metrics.length > 1 ? (
          <nav
            aria-label="Moneda del resumen"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            {metrics.map((candidate) => {
              const active = candidate.currency === metric?.currency;
              return (
                <Link
                  key={candidate.currency}
                  href={`/backoffice?currency=${candidate.currency}`}
                  aria-current={active ? "page" : undefined}
                  className={`metric-number inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-white/8 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {candidate.currency}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <section
          aria-label="Indicadores clave"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
        >
          <StatCard
            label="MRR"
            accent="primary"
            icon={TrendingUp}
            value={metric ? formatMoney(metric.mrr, metric.currency) : "—"}
            note={
              metric ? `ARR ${formatMoney(metric.arr, metric.currency)}` : "Sin movimientos"
            }
            badge={
              mrrDelta
                ? {
                    label: mrrDelta,
                    tone: mrrDelta.startsWith("-") ? "destructive" : "success",
                  }
                : undefined
            }
            href="/backoffice/finance"
          />
          <StatCard
            label="Cobrado neto"
            accent="success"
            icon={CircleDollarSign}
            value={metric ? formatMoney(metric.collectedNet, metric.currency) : "—"}
            note={`Recaudado en ${periodLabel}`}
            badge={
              collectedDelta
                ? {
                    label: collectedDelta,
                    tone: collectedDelta.startsWith("-") ? "destructive" : "success",
                  }
                : undefined
            }
            href="/backoffice/finance"
          />
          <StatCard
            label="Pendiente de pago"
            accent="warning"
            icon={Clock3}
            value={metric ? formatMoney(metric.pendingAmount, metric.currency) : "—"}
            note="Aún dentro de plazo"
            badge={
              metric && metric.pendingAmount > 0
                ? { label: "Atención", tone: "warning" }
                : undefined
            }
            href="/backoffice/finance"
          />
          <StatCard
            label="Tenants activos"
            accent="info"
            icon={Building2}
            value={counts.active}
            note={`${tenants.length} registrados · ${counts.trial} en trial`}
            badge={
              metric && metric.pastDueTenants > 0
                ? { label: `${metric.pastDueTenants} en mora`, tone: "destructive" }
                : undefined
            }
            href="/backoffice/tenants?status=active"
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-6">
          <Panel
            title="Tenants recientes"
            description="Últimos negocios registrados en la plataforma"
            labelledBy="recent-tenants-heading"
            action={<PanelLink href="/backoffice/tenants">Ver todos</PanelLink>}
          >
            {recentTenants.length > 0 ? (
              <RecentTenantsTable tenants={recentTenants} />
            ) : (
              <EmptyState
                title="Aún no hay tenants"
                description="Cuando un negocio se registre aparecerá en este listado."
              />
            )}
          </Panel>

          <div className="grid min-w-0 grid-cols-1 content-start gap-5 lg:gap-6">
            <Panel
              title="Requiere atención"
              description="Acciones sugeridas para hoy"
              labelledBy="attention-heading"
              action={
                attention.length > 0 ? (
                  <ToneBadge tone="warning">{attention.length}</ToneBadge>
                ) : undefined
              }
            >
              {attention.length > 0 ? (
                <ul className="grid grid-cols-1 gap-2">
                  {attention.map((item) => (
                    <li key={item.key}>
                      <InsightRow
                        title={item.title}
                        caption={item.caption}
                        status={item.status}
                        href={item.href}
                        leading={
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/4 text-muted-foreground">
                            <AlertTriangle aria-hidden className="h-4 w-4" />
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl bg-success/8 px-3 py-4 text-sm text-success">
                  Todo en orden. No hay pendientes críticos.
                </p>
              )}
            </Panel>

            <Panel
              title="Estado de la cartera"
              description={`${tenants.length} tenants en total`}
              labelledBy="portfolio-heading"
            >
              <DistributionBar
                label="Distribución de tenants por estado"
                segments={tenantStatuses.map((status) => ({
                  key: status,
                  label: tenantStatusLabels[status],
                  value: counts[status],
                  fillClassName: tenantStatusFills[status],
                }))}
              />
            </Panel>
          </div>
        </div>

        {metric && breakdown ? (
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <Panel
              title="Cobranza del período"
              description={`${periodLabel} · ${metric.currency}`}
              labelledBy="collection-heading"
              action={<PanelLink href="/backoffice/finance">Detalle</PanelLink>}
            >
              <p className="metric-number text-2xl font-bold tracking-tight">
                {formatMoney(breakdown.total, metric.currency)}
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Facturación total del período
              </p>
              <DistributionBar
                label="Composición de la cobranza"
                segments={[
                  {
                    key: "collected",
                    label: "Cobrado neto",
                    value: Math.max(metric.collectedNet, 0),
                    display: formatMoney(metric.collectedNet, metric.currency),
                    fillClassName: "bg-success",
                  },
                  {
                    key: "pending",
                    label: "Pendiente",
                    value: metric.pendingAmount,
                    display: formatMoney(metric.pendingAmount, metric.currency),
                    fillClassName: "bg-warning",
                  },
                  {
                    key: "past-due",
                    label: "Mora",
                    value: metric.pastDueAmount,
                    display: formatMoney(metric.pastDueAmount, metric.currency),
                    fillClassName: "bg-destructive",
                  },
                ]}
              />
            </Panel>

            <Panel
              title="Retención y crecimiento"
              description="Salud del negocio recurrente"
              labelledBy="retention-heading"
            >
              <ul className="grid grid-cols-1 gap-2">
                <li>
                  <InsightRow
                    title="ARPA"
                    caption={`${metric.recurringTenants} tenants recurrentes`}
                    value={formatMoney(metric.arpa, metric.currency)}
                    status={{ label: "Promedio", tone: "info" }}
                  />
                </li>
                <li>
                  <InsightRow
                    title="Churn"
                    caption={`${metric.churnedTenants} ${metric.churnedTenants === 1 ? "cancelación" : "cancelaciones"} en el mes`}
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
                    title="Conversión de trial"
                    caption={`${metric.trialsConverted}/${metric.trialsEnded} trials finalizados`}
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
                <li>
                  <InsightRow
                    title="ARR proyectado"
                    caption="MRR × 12"
                    value={formatMoney(metric.arr, metric.currency)}
                    status={{ label: "Proyección", tone: "success" }}
                  />
                </li>
              </ul>
            </Panel>
          </div>
        ) : (
          <EmptyState
            title="Sin movimientos financieros este mes"
            description="Cuando existan suscripciones o pagos en el período, verás aquí la cobranza y los indicadores de retención."
            action={<PanelLink href="/backoffice/finance">Ir a Finanzas SaaS</PanelLink>}
          />
        )}
      </div>
    </BackofficeShell>
  );
}

function PanelLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
    >
      {children}
      <ArrowRight aria-hidden className="h-3.5 w-3.5" />
    </Link>
  );
}

function RecentTenantsTable({ tenants }: { tenants: TenantBackofficeSummary[] }) {
  const manageHref = (tenant: TenantBackofficeSummary) =>
    `/backoffice/tenants?tenant=${tenant.id}#detalle-tenant`;

  return (
    <ResponsiveTable
      caption="Tenants recientes"
      rows={tenants}
      rowKey={(tenant) => tenant.id}
      columns={[
        {
          key: "date",
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
          key: "tenant",
          header: "Tenant",
          cell: (tenant) => (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar name={tenant.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{tenant.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {tenant.billingContactEmail ?? "Sin contacto de facturación"}
                </span>
              </span>
            </span>
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
              href={manageHref(tenant)}
              className="text-xs font-semibold text-primary hover:underline"
              aria-label={`Gestionar ${tenant.name}`}
            >
              Gestionar
            </Link>
          ),
        },
      ]}
      renderCard={(tenant) => (
        <Link
          href={manageHref(tenant)}
          aria-label={`Gestionar ${tenant.name}`}
          className="flex items-center gap-3"
        >
          <Avatar name={tenant.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{tenant.name}</span>
            <span className="metric-number block truncate text-xs text-muted-foreground">
              {dateFormatter.format(tenant.createdAt)}
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
