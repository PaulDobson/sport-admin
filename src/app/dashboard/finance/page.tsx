import Link from "next/link";
import { getCollectionPeriodReport } from "@/application/instructor-finance/use-cases/get-collection-period-report";
import { listPendingCollections } from "@/application/instructor-finance/use-cases/list-pending-collections";
import { listMembershipPlans } from "@/application/instructor-finance/use-cases/manage-membership";
import type { StudentMembershipStatus } from "@/domain/instructor-finance/membership";
import { summarizeCollections } from "@/domain/instructor-finance/collection";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import { EmptyState, Surface } from "@/presentation/components/primitives";
import { formatMoney } from "@/lib/format-money";
import { CollectionList } from "./collection-list";
import { PlanCatalog } from "./plan-catalog";

type FinanceSection = "summary" | "collections" | "plans";

interface FinancePageProps {
  searchParams: Promise<{
    section?: string;
    period?: string;
    from?: string;
    to?: string;
    status?: string;
    archived?: string;
  }>;
}

const sections: ReadonlyArray<{ id: FinanceSection; label: string }> = [
  { id: "summary", label: "Resumen" },
  { id: "collections", label: "Cobros" },
  { id: "plans", label: "Planes" },
];

const collectionStatuses = ["active", "past_due", "expired"] as const;

function buildHref(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/dashboard/finance?${query}` : "/dashboard/finance";
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const section: FinanceSection =
    sections.find((item) => item.id === params.section)?.id ?? "summary";
  const period = params.period ?? today.slice(0, 7);
  const status = collectionStatuses.find((value) => value === params.status) as
    | StudentMembershipStatus
    | undefined;
  const showArchived = params.archived === "true";
  const canManage = membership.role !== "assistant";

  const tenantId = membership.tenantId;
  const finance = await createInstructorFinanceDeps();
  const linkParams = {
    section: params.section,
    period: params.period,
    from: params.from,
    to: params.to,
    status: params.status,
    archived: params.archived,
  };

  const [pending, report, plans] = await Promise.all([
    section === "plans"
      ? Promise.resolve([])
      : listPendingCollections(
          {
            tenantId,
            onDate: today,
            from: params.from,
            to: params.to,
            status,
          },
          finance,
        ),
    section === "summary"
      ? getCollectionPeriodReport({ tenantId, period, onDate: today }, finance)
      : Promise.resolve(null),
    section === "plans"
      ? listMembershipPlans(
          { tenantId, status: showArchived ? "archived" : "active" },
          finance,
        )
      : Promise.resolve([]),
  ]);

  const totals = summarizeCollections(pending);
  const overdueCount = pending.filter((item) => item.isOverdue).length;
  const upcomingCount = pending.length - overdueCount;
  const primaryCurrency = report?.byCurrency[0];
  const collectionRate =
    primaryCurrency && primaryCurrency.collectedAmount > 0
      ? Math.round(
          (primaryCurrency.collectedAmount /
            (primaryCurrency.collectedAmount + primaryCurrency.pendingAmount)) *
            100,
        )
      : 0;

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
              Finanzas
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Membresías y finanzas
            </h1>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">
            Seguimiento de cobros y renovaciones
          </span>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Secciones de finanzas" className="mb-6">
          <ul className="flex gap-2 overflow-x-auto">
            {sections.map((item) => {
              const active = item.id === section;
              return (
                <li key={item.id}>
                  <Link
                    href={buildHref(linkParams, {
                      section: item.id === "summary" ? undefined : item.id,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "inline-flex min-h-11 items-center rounded-full border border-primary/25 bg-navigation-active px-4 text-sm font-semibold text-primary"
                        : "inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {section === "summary" ? (
          <div className="grid gap-6">
            <Surface aria-labelledby="collected-heading">
              <p
                id="collected-heading"
                className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
              >
                Cobrado en {period}
              </p>
              <p className="metric-number mt-2 text-4xl font-bold text-success">
                {primaryCurrency
                  ? formatMoney(
                      primaryCurrency.collectedAmount,
                      primaryCurrency.currency,
                    )
                  : formatMoney(0, "CLP")}
              </p>
              {primaryCurrency ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {collectionRate}% de{" "}
                  {formatMoney(
                    primaryCurrency.collectedAmount +
                      primaryCurrency.pendingAmount,
                    primaryCurrency.currency,
                  )}{" "}
                  cobrable
                </p>
              ) : null}
            </Surface>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={buildHref(linkParams, {
                  section: "collections",
                  status: "past_due",
                })}
                className="rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10 transition-colors hover:bg-surface-raised"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Mora
                </p>
                <p className="metric-number mt-2 text-2xl font-semibold text-warning">
                  {formatMoney(
                    totals[0]?.overdueAmount ?? 0,
                    totals[0]?.currency ?? "CLP",
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {overdueCount} alumnos
                </p>
              </Link>
              <Link
                href={buildHref(linkParams, {
                  section: "collections",
                  status: "active",
                })}
                className="rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10 transition-colors hover:bg-surface-raised"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Por vencer
                </p>
                <p className="metric-number mt-2 text-2xl font-semibold">
                  {upcomingCount}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  membresías con saldo
                </p>
              </Link>
            </div>

            <section aria-labelledby="today-heading">
              <h2 id="today-heading" className="mb-3 text-xl font-semibold">
                Requiere acción hoy
              </h2>
              <CollectionList
                items={pending.filter((item) => item.isOverdue).slice(0, 5)}
                today={today}
                canManage={canManage}
              />
            </section>
          </div>
        ) : null}

        {section === "collections" ? (
          <div className="grid gap-6">
            <form
              className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10 sm:grid-cols-4"
              method="get"
            >
              <input type="hidden" name="section" value="collections" />
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                Desde
                <input
                  className="h-11 rounded-lg border border-input bg-background px-3 text-foreground"
                  type="date"
                  name="from"
                  defaultValue={params.from}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                Hasta
                <input
                  className="h-11 rounded-lg border border-input bg-background px-3 text-foreground"
                  type="date"
                  name="to"
                  defaultValue={params.to}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                Estado
                <select
                  className="h-11 rounded-lg border border-input bg-background px-3 text-foreground"
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
                className="h-11 self-end rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                type="submit"
              >
                Aplicar filtros
              </button>
            </form>

            <section aria-labelledby="collections-heading">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="collections-heading" className="text-xl font-semibold">
                  Cobros pendientes
                </h2>
                <span className="text-sm text-muted-foreground">
                  {pending.length} pendientes
                </span>
              </div>
              <CollectionList
                items={pending}
                today={today}
                canManage={canManage}
              />
            </section>
          </div>
        ) : null}

        {section === "plans" ? (
          <div className="grid gap-4">
            <div className="flex gap-2">
              <Link
                href={buildHref(linkParams, {
                  section: "plans",
                  archived: undefined,
                })}
                aria-current={!showArchived ? "true" : undefined}
                className="text-sm font-semibold text-primary"
              >
                Activos
              </Link>
              <Link
                href={buildHref(linkParams, {
                  section: "plans",
                  archived: "true",
                })}
                aria-current={showArchived ? "true" : undefined}
                className="text-sm font-semibold text-muted-foreground"
              >
                Archivados
              </Link>
            </div>
            <PlanCatalog
              plans={plans}
              showArchived={showArchived}
              canManage={canManage}
            />
          </div>
        ) : null}

        {section === "summary" && pending.length === 0 && !report ? (
          <EmptyState
            title="Sin movimientos"
            description="No hay movimientos para este mes financiero."
          />
        ) : null}
      </div>
    </AppShell>
  );
}
