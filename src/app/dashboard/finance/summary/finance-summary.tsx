import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  FinanceDashboard,
  FinanceIndicators,
} from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import type {
  MovementStatus,
  PlanPerformance,
  RecentMovement,
} from "@/domain/instructor-finance/dashboard";
import { formatMoney } from "@/lib/format-money";
import { formatPeriod, formatShortDate } from "@/lib/format-date";
import {
  Panel,
  ResponsiveTable,
  StatCard,
  ToneBadge,
  type ToneBadgeTone,
} from "@/presentation/components/primitives";
import { CollectionList } from "../collection-list";
import { financeHref, type FinanceLinkParams } from "../finance-href";
import { LinkTabs } from "../link-tabs";

const secondaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const movementStatus: Record<
  MovementStatus,
  { label: string; tone: ToneBadgeTone }
> = {
  paid: { label: "Pagado", tone: "success" },
  pending: { label: "Pendiente", tone: "info" },
  overdue: { label: "En mora", tone: "destructive" },
};

const barColors = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

const percent = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

function emptyIndicators(currency: string): FinanceIndicators {
  return {
    currency,
    collected: 0,
    previousCollected: 0,
    variation: null,
    pending: 0,
    pendingAccounts: 0,
    overdueAmount: 0,
    overdueStudents: 0,
    currentMemberships: 0,
    newMemberships: 0,
    projected: 0,
    collectionRate: 0,
  };
}

function variationBadge(variation: number | null): {
  label: string;
  tone: ToneBadgeTone;
} {
  if (variation === null) return { label: "Sin base", tone: "neutral" };
  if (variation === 0) return { label: "0 %", tone: "neutral" };
  return {
    label: `${percent.format(variation)} %`,
    tone: variation > 0 ? "success" : "destructive",
  };
}

function rateTone(rate: number): ToneBadgeTone {
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "destructive";
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

interface FinanceSummaryProps {
  dashboard: FinanceDashboard;
  currency: string;
  today: string;
  canManage: boolean;
  linkParams: FinanceLinkParams;
}

export function FinanceSummary({
  dashboard,
  currency,
  today,
  canManage,
  linkParams,
}: FinanceSummaryProps) {
  const indicators =
    dashboard.indicators.find((indicator) => indicator.currency === currency) ??
    emptyIndicators(currency);
  const movements = dashboard.movements.filter(
    (movement) => movement.currency === currency,
  );
  const performance = dashboard.planPerformance.filter(
    (plan) => plan.currency === currency,
  );
  const money = (amount: number) => formatMoney(amount, currency);
  const periodLabel = formatPeriod(dashboard.period);
  const assignHref = financeHref(linkParams, { assign: "1" });
  const collectionsHref = financeHref(linkParams, {
    section: "collections",
    status: undefined,
  });
  const plansHref = financeHref(linkParams, {
    section: "plans",
    status: undefined,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Periodo
          </p>
          <h2 className="mt-1 text-xl font-semibold first-letter:uppercase text-foreground">
            {periodLabel}
          </h2>
        </div>
        <form
          method="get"
          action="/dashboard/finance"
          aria-label="Elegir periodo"
          className="flex items-end gap-2"
        >
          {linkParams.currency ? (
            <input type="hidden" name="currency" value={linkParams.currency} />
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Mes
            <input
              type="month"
              name="period"
              defaultValue={dashboard.period}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <button type="submit" className={secondaryLinkClass}>
            Ver periodo
          </button>
        </form>
      </div>

      {dashboard.currencies.length > 1 ? (
        <LinkTabs
          label="Moneda"
          compact
          tabs={dashboard.currencies.map((code) => ({
            id: code,
            label: code,
            href: financeHref(linkParams, { currency: code }),
            active: code === currency,
          }))}
        />
      ) : null}

      <section aria-labelledby="indicators-heading">
        <h2 id="indicators-heading" className="sr-only">
          Indicadores de {periodLabel}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Cobrado del mes"
            value={money(indicators.collected)}
            accent="primary"
            icon={CircleDollarSign}
            badge={variationBadge(indicators.variation)}
            note={`Mes anterior: ${money(indicators.previousCollected)}`}
            href={collectionsHref}
          />
          <StatCard
            label="Por cobrar"
            value={money(indicators.pending)}
            accent="warning"
            icon={CalendarClock}
            badge={
              indicators.overdueStudents > 0
                ? {
                    label: `${indicators.overdueStudents} en mora`,
                    tone: "warning",
                  }
                : { label: "Al día", tone: "success" }
            }
            note={`${money(indicators.overdueAmount)} en mora · ${plural(
              indicators.pendingAccounts,
              "cuenta",
              "cuentas",
            )}`}
            href={financeHref(linkParams, {
              section: "collections",
              status: "past_due",
            })}
          />
          <StatCard
            label="Membresías vigentes"
            value={indicators.currentMemberships}
            accent="info"
            icon={Users}
            badge={{
              label: `+${indicators.newMemberships} altas`,
              tone: indicators.newMemberships > 0 ? "info" : "neutral",
            }}
            note={plural(
              indicators.newMemberships,
              "alta en el mes",
              "altas en el mes",
            )}
            href="/dashboard/students"
          />
          <StatCard
            label="Proyectado"
            value={money(indicators.projected)}
            accent="success"
            icon={TrendingUp}
            badge={{
              label: `${indicators.collectionRate} % cobrado`,
              tone:
                indicators.projected > 0
                  ? rateTone(indicators.collectionRate)
                  : "neutral",
            }}
            note="Cobrable del mes según membresías vigentes"
            href={plansHref}
          />
        </div>
      </section>

      <section aria-labelledby="today-heading" className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="today-heading" className="text-lg font-semibold">
            Requiere acción hoy
          </h2>
          <Link
            href={collectionsHref}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
          >
            Ver todos los cobros
          </Link>
        </div>
        <CollectionList
          items={dashboard.actionItems}
          today={today}
          canManage={canManage}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel
          title="Movimientos recientes"
          description="Pagos registrados y saldos pendientes"
          labelledBy="movements-heading"
          className="lg:col-span-7"
        >
          {movements.length > 0 ? (
            <MovementsTable movements={movements} />
          ) : (
            <PanelEmpty
              title="Sin movimientos todavía"
              description="Cuando asignes un plan o registres un pago aparecerá aquí."
              action={
                canManage ? (
                  <Link href={assignHref} className={primaryLinkClass}>
                    Asignar plan
                  </Link>
                ) : null
              }
            />
          )}
        </Panel>

        <Panel
          title="Rendimiento por plan"
          description="Ingreso mensual equivalente por plan vigente"
          labelledBy="plan-performance-heading"
          className="lg:col-span-5"
        >
          {performance.length > 0 ? (
            <PlanPerformanceList plans={performance} />
          ) : (
            <PanelEmpty
              title="Ningún plan con alumnos vigentes"
              description="Crea un plan y asígnalo para ver cuánto aporta cada uno."
              action={
                canManage ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link href={plansHref} className={secondaryLinkClass}>
                      Crear plan
                    </Link>
                    <Link href={assignHref} className={primaryLinkClass}>
                      Asignar plan
                    </Link>
                  </div>
                ) : null
              }
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function PanelEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function MovementBadge({ status }: { status: MovementStatus }) {
  const { label, tone } = movementStatus[status];
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

function StudentLink({
  movement,
  className,
}: {
  movement: RecentMovement;
  className: string;
}) {
  return (
    <Link href={`/dashboard/students/${movement.studentId}`} className={className}>
      {movement.studentName}
    </Link>
  );
}

function MovementsTable({ movements }: { movements: RecentMovement[] }) {
  return (
    <ResponsiveTable
      caption="Movimientos recientes"
      rows={movements}
      rowKey={(movement) => movement.id}
      columns={[
        {
          key: "date",
          header: "Fecha",
          cell: (movement) => (
            <span className="whitespace-nowrap text-muted-foreground">
              {formatShortDate(movement.date)}
            </span>
          ),
        },
        {
          key: "student",
          header: "Alumno",
          cell: (movement) => (
            <StudentLink
              movement={movement}
              className="font-semibold text-foreground hover:text-primary"
            />
          ),
        },
        {
          key: "plan",
          header: "Plan",
          cell: (movement) => (
            <span className="text-muted-foreground">{movement.planName}</span>
          ),
        },
        {
          key: "amount",
          header: "Monto",
          align: "end",
          cell: (movement) => (
            <span className="metric-number font-semibold">
              {formatMoney(movement.amount, movement.currency)}
            </span>
          ),
        },
        {
          key: "status",
          header: "Estado",
          align: "end",
          cell: (movement) => <MovementBadge status={movement.status} />,
        },
      ]}
      renderCard={(movement) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <StudentLink
              movement={movement}
              className="block truncate font-semibold text-foreground hover:text-primary"
            />
            <p className="truncate text-xs text-muted-foreground">
              {movement.planName} · {formatShortDate(movement.date)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="metric-number font-semibold">
              {formatMoney(movement.amount, movement.currency)}
            </span>
            <MovementBadge status={movement.status} />
          </div>
        </div>
      )}
    />
  );
}

function PlanPerformanceList({ plans }: { plans: PlanPerformance[] }) {
  return (
    <ul className="grid gap-4" aria-label="Planes por ingreso mensual">
      {plans.map((plan, index) => (
        <li key={`${plan.planId}:${plan.currency}`} className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">
                {plan.planName}
              </p>
              <p className="text-xs text-muted-foreground">
                {plural(plan.studentCount, "alumno", "alumnos")} ·{" "}
                {formatMoney(plan.monthlyAmount, plan.currency)} al mes
              </p>
            </div>
            <span className="metric-number shrink-0 text-sm font-semibold text-foreground">
              {plan.share} %
            </span>
          </div>
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-white/6"
          >
            <div
              className={`h-full rounded-full ${barColors[index % barColors.length]}`}
              style={{ width: `${Math.max(plan.share, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
