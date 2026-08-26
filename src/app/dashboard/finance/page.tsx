import Link from "next/link";
import { redirect } from "next/navigation";
import { getMonthlyFinancialProjection } from "@/application/instructor-finance/use-cases/get-monthly-financial-projection";
import { getMembershipFollowUps } from "@/application/instructor-finance/use-cases/get-membership-follow-ups";
import type { StudentMembershipStatus } from "@/domain/instructor-finance/membership";
import type { MembershipFollowUpKind } from "@/domain/instructor-finance/membership-follow-up";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { PlanForm } from "./plan-form";

interface FinancePageProps {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
}

const statusLabels: Record<StudentMembershipStatus, string> = {
  active: "Activa",
  paused: "Pausada",
  past_due: "En mora",
  expired: "Vencida",
  cancelled: "Cancelada",
};

const kindLabels: Record<MembershipFollowUpKind, string> = {
  renewal: "Renovación",
  past_due: "Mora",
  expiration: "Vencimiento",
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const membership = await requireOperationalMembership();

  const today = new Date();
  const defaultTo = new Date(today);
  defaultTo.setUTCDate(defaultTo.getUTCDate() + 90);
  const params = await searchParams;
  const period = params.period ?? today.toISOString().slice(0, 7);
  const from = params.from ?? toDateInput(today);
  const to = params.to ?? toDateInput(defaultTo);
  const allowedStatuses = ["active", "past_due", "expired"] as const;
  const status = allowedStatuses.find((value) => value === params.status);
  const finance = await createInstructorFinanceDeps();
  const tenantId = membership.tenantId;
  const [projections, followUps] = await Promise.all([
    getMonthlyFinancialProjection(
      { tenantId, period },
      { financialProjections: finance.financialProjections },
    ),
    getMembershipFollowUps(
      { tenantId, from, to, status },
      { membershipFollowUps: finance.membershipFollowUps },
    ),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 block text-sm font-semibold text-primary"
          >
            Volver al panel
          </Link>
          <h1 className="text-3xl font-semibold">Membresías y finanzas</h1>
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          Seguimiento de cobros y renovaciones
        </p>
      </header>

      <form
        className="mb-6 grid gap-3 border-y border-border py-4 sm:grid-cols-4"
        method="get"
      >
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Mes financiero
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
            type="month"
            name="period"
            defaultValue={period}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Desde
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
            type="date"
            name="from"
            defaultValue={from}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Hasta
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
            type="date"
            name="to"
            defaultValue={to}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Estado
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
            name="status"
            defaultValue={status ?? ""}
          >
            <option value="">Todos</option>
            <option value="active">Activa</option>
            <option value="past_due">En mora</option>
            <option value="expired">Vencida</option>
          </select>
        </label>
        <button
          className="h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground sm:col-start-4"
          type="submit"
        >
          Aplicar filtros
        </button>
      </form>

      {membership.role !== "assistant" ? (
        <section className="mb-8" aria-labelledby="new-plan-heading">
          <h2 id="new-plan-heading" className="mb-3 text-xl font-semibold">
            Nuevo plan
          </h2>
          <PlanForm />
        </section>
      ) : null}

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">Proyección mensual</h2>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        {projections.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {projections.map((projection) => (
              <article key={projection.currency} className="surface-panel p-4">
                <p className="mb-3 text-sm font-semibold text-primary">
                  {projection.currency}
                </p>
                <dl className="grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Contratado
                    </dt>
                    <dd className="metric-number mt-1 text-lg font-semibold">
                      {formatMoney(
                        projection.contractedAmount,
                        projection.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Cobrable</dt>
                    <dd className="metric-number mt-1 text-lg font-semibold">
                      {formatMoney(
                        projection.collectibleAmount,
                        projection.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Cobrado</dt>
                    <dd className="metric-number mt-1 text-lg font-semibold text-success">
                      {formatMoney(
                        projection.collectedAmount,
                        projection.currency,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-y border-border py-8 text-center text-muted-foreground">
            No hay movimientos para este mes.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">Seguimiento</h2>
          <span className="text-sm text-muted-foreground">
            {followUps.length} pendientes
          </span>
        </div>
        {followUps.length > 0 ? (
          <div className="surface-panel px-4">
            {followUps.map((item) => (
              <article
                key={item.membershipId}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-border py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/students/${item.studentId}`}
                    className="truncate font-semibold text-foreground"
                  >
                    {item.studentName}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {kindLabels[item.kind]} · {statusLabels[item.status]}
                  </p>
                </div>
                <div className="text-right">
                  <time
                    className="metric-number block font-semibold"
                    dateTime={item.followUpOn}
                  >
                    {item.followUpOn}
                  </time>
                  <span
                    className={
                      item.kind === "past_due"
                        ? "text-sm font-semibold text-warning"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {formatMoney(item.balance, item.currency)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-y border-border py-8 text-center text-muted-foreground">
            No hay membresías para estos filtros.
          </p>
        )}
      </section>
    </main>
  );
}
