import { Suspense } from "react";
import {
  listMembershipPlans,
} from "@/application/instructor-finance/use-cases/manage-membership";
import {
  summarizePlanPerformance,
  type PlanPerformance,
} from "@/domain/instructor-finance/dashboard";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { LinkTabs } from "../link-tabs";
import { PlanCatalog } from "../plan-catalog";
import { AssignPlanFromUrl } from "../assign-plan-from-url";

type FinanceDeps = Awaited<ReturnType<typeof createInstructorFinanceDeps>>;

async function loadPlanPerformance(
  finance: FinanceDeps,
  tenantId: string,
  period: string,
): Promise<PlanPerformance[]> {
  try {
    const month = await finance.financialProjections.loadMonth(tenantId, period);
    return summarizePlanPerformance(month.memberships, period);
  } catch {
    return [];
  }
}

interface PlansPageProps {
  searchParams: Promise<{ archived?: string }>;
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const showArchived = params.archived === "true";
  const canManage = membership.role !== "assistant";
  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = today.slice(0, 7);

  const finance = await createInstructorFinanceDeps();
  const [activePlans, archivedPlans, performance] = await Promise.all([
    listMembershipPlans({ tenantId: membership.tenantId, status: "active" }, finance),
    listMembershipPlans({ tenantId: membership.tenantId, status: "archived" }, finance),
    loadPlanPerformance(finance, membership.tenantId, currentPeriod),
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mantención de planes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define y administra los planes de membresía que ofreces a tus alumnos.
        </p>
      </div>

      <LinkTabs
        label="Estado de los planes"
        compact
        tabs={[
          {
            id: "active",
            label: "Activos",
            href: "/dashboard/finance/plans",
            active: !showArchived,
            count: activePlans.length,
          },
          {
            id: "archived",
            label: "Archivados",
            href: "/dashboard/finance/plans?archived=true",
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

      {canManage ? (
        <Suspense fallback={null}>
          <AssignPlanFromUrl />
        </Suspense>
      ) : null}
    </div>
  );
}
