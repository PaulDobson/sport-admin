import Link from "next/link";
import { CreditCard } from "lucide-react";
import {
  getFinanceDashboard,
  selectFinanceCurrency,
} from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import { listPendingCollections } from "@/application/instructor-finance/use-cases/list-pending-collections";
import { listMembershipPlans } from "@/application/instructor-finance/use-cases/manage-membership";
import type { CollectionItem } from "@/domain/instructor-finance/collection";
import {
  summarizePlanPerformance,
  type PlanPerformance,
} from "@/domain/instructor-finance/dashboard";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { CollectionDateFilter } from "./collection-date-filter";
import { CollectionList } from "./collection-list";
import { financeHref } from "./finance-href";
import { LinkTabs } from "./link-tabs";
import { PlanCatalog } from "./plan-catalog";
import { FinanceSummary } from "./summary/finance-summary";

type FinanceSection = "summary" | "collections" | "plans";

interface FinancePageProps {
  searchParams: Promise<{
    section?: string;
    period?: string;
    currency?: string;
    from?: string;
    to?: string;
    status?: string;
    archived?: string;
  }>;
}

type FinanceDeps = Awaited<ReturnType<typeof createInstructorFinanceDeps>>;

const sections: ReadonlyArray<{ id: FinanceSection; label: string }> = [
  { id: "summary", label: "Resumen" },
  { id: "collections", label: "Cobros" },
  { id: "plans", label: "Planes" },
];

const collectionStatuses = [
  { id: "active", label: "Al día" },
  { id: "past_due", label: "En mora" },
  { id: "expired", label: "Vencidas" },
] as const;

type CollectionStatus = (typeof collectionStatuses)[number]["id"];

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value?: string) {
  return value && DATE_PATTERN.test(value) ? value : undefined;
}

/** Plan performance with agreed prices; the catalog degrades gracefully without it. */
async function loadPlanPerformance(
  finance: FinanceDeps,
  tenantId: string,
  period: string,
): Promise<PlanPerformance[]> {
  try {
    const month = await finance.financialProjections.loadMonth(
      tenantId,
      period,
    );
    return summarizePlanPerformance(month.memberships, period);
  } catch {
    return [];
  }
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = today.slice(0, 7);
  const section: FinanceSection =
    sections.find((item) => item.id === params.section)?.id ?? "summary";
  const period =
    params.period && PERIOD_PATTERN.test(params.period)
      ? params.period
      : currentPeriod;
  const status = collectionStatuses.find((item) => item.id === params.status)
    ?.id as CollectionStatus | undefined;
  const from = validDate(params.from);
  const to = validDate(params.to);
  const showArchived = params.archived === "true";
  const canManage = membership.role !== "assistant";

  const tenantId = membership.tenantId;
  const finance = await createInstructorFinanceDeps();
  const linkParams = {
    section: params.section,
    period: params.period,
    currency: params.currency,
    from,
    to,
    status,
    archived: params.archived,
  };

  const [dashboard, collections, activePlans, archivedPlans, performance] =
    await Promise.all([
      section === "summary"
        ? getFinanceDashboard({ tenantId, period, onDate: today }, finance)
        : Promise.resolve(null),
      section === "collections"
        ? listPendingCollections(
            { tenantId, onDate: today, from, to },
            finance,
          )
        : Promise.resolve([] as CollectionItem[]),
      section === "plans"
        ? listMembershipPlans({ tenantId, status: "active" }, finance)
        : Promise.resolve([]),
      section === "plans"
        ? listMembershipPlans({ tenantId, status: "archived" }, finance)
        : Promise.resolve([]),
      section === "plans"
        ? loadPlanPerformance(finance, tenantId, currentPeriod)
        : Promise.resolve([] as PlanPerformance[]),
    ]);

  const shownPlans = showArchived ? archivedPlans : activePlans;
  const monthlyRevenueByPlan = Object.fromEntries(
    shownPlans.flatMap((plan) => {
      const match = performance.find(
        (item) => item.planId === plan.id && item.currency === plan.currency,
      );
      return match ? [[plan.id, match.monthlyAmount]] : [];
    }),
  );
  const visibleCollections = status
    ? collections.filter((item) => item.status === status)
    : collections;

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkTabs
          label="Secciones de finanzas"
          tabs={sections.map((item) => ({
            id: item.id,
            label: item.label,
            href: financeHref(linkParams, {
              section: item.id === "summary" ? undefined : item.id,
            }),
            active: item.id === section,
          }))}
        />
        {canManage ? (
          <Link
            href={financeHref(linkParams, { assign: "1" })}
            scroll={false}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CreditCard className="size-4" aria-hidden />
            Asignar plan
          </Link>
        ) : null}
      </div>

      {dashboard ? (
        <FinanceSummary
          dashboard={dashboard}
          currency={selectFinanceCurrency(dashboard, params.currency)}
          today={today}
          canManage={canManage}
          linkParams={linkParams}
        />
      ) : null}

      {section === "collections" ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LinkTabs
              label="Estado de los cobros"
              compact
              tabs={[
                {
                  id: "all",
                  label: "Todos",
                  href: financeHref(linkParams, { status: undefined }),
                  active: !status,
                  count: collections.length,
                },
                ...collectionStatuses.map((item) => ({
                  id: item.id,
                  label: item.label,
                  href: financeHref(linkParams, { status: item.id }),
                  active: status === item.id,
                  count: collections.filter(
                    (collection) => collection.status === item.id,
                  ).length,
                })),
              ]}
            />
            <CollectionDateFilter from={from} to={to} status={status} />
          </div>

          <section aria-labelledby="collections-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="collections-heading" className="text-xl font-semibold">
                Cobros pendientes
              </h2>
              <span className="text-sm text-muted-foreground">
                {visibleCollections.length} pendientes
              </span>
            </div>
            <CollectionList
              items={visibleCollections}
              today={today}
              canManage={canManage}
            />
          </section>
        </div>
      ) : null}

      {section === "plans" ? (
        <div className="grid gap-4">
          <LinkTabs
            label="Estado de los planes"
            compact
            tabs={[
              {
                id: "active",
                label: "Activos",
                href: financeHref(linkParams, {
                  section: "plans",
                  archived: undefined,
                }),
                active: !showArchived,
                count: activePlans.length,
              },
              {
                id: "archived",
                label: "Archivados",
                href: financeHref(linkParams, {
                  section: "plans",
                  archived: "true",
                }),
                active: showArchived,
                count: archivedPlans.length,
              },
            ]}
          />
          <PlanCatalog
            plans={shownPlans}
            showArchived={showArchived}
            canManage={canManage}
            monthlyRevenueByPlan={monthlyRevenueByPlan}
          />
        </div>
      ) : null}
    </div>
  );
}
