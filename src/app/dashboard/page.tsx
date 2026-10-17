import { redirect } from "next/navigation";
import {
  getFinanceDashboard,
  selectFinanceCurrency,
} from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import { getInstructorDay } from "@/application/instructor-operations/use-cases/get-instructor-day";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { CurrentSessionPanel } from "@/presentation/components/current-session-panel";
import { SessionContextRefresh } from "@/presentation/components/session-context-refresh";
import { CurrentSessionPrecache } from "./current-session-precache";
import { OfflineSynchronization } from "./offline-synchronization";
import {
  DashboardOverview,
  type DashboardFinanceSummary,
} from "./dashboard-overview";

/** The finance block is optional: a failure here must never break the day view. */
async function loadFinanceSummary(
  tenantId: string,
  now: Date,
): Promise<DashboardFinanceSummary | undefined> {
  try {
    const today = now.toISOString().slice(0, 10);
    const dashboard = await getFinanceDashboard(
      { tenantId, period: today.slice(0, 7), onDate: today },
      await createInstructorFinanceDeps(),
    );
    const currency = selectFinanceCurrency(dashboard);
    const main = dashboard.indicators.find(
      (indicator) => indicator.currency === currency,
    );
    return {
      currency,
      collected: main?.collected ?? 0,
      pending: main?.pending ?? 0,
      overdueStudents: main?.overdueStudents ?? 0,
      collectionRate: main?.collectionRate ?? 0,
    };
  } catch {
    return undefined;
  }
}

interface DashboardPageProps {
  searchParams: Promise<{ location?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const context = await loadOperationalContext();
  if (context.status === "unauthenticated") redirect("/log-in");
  if (context.status === "no-membership") redirect("/onboarding");
  if (context.status === "selection-required") redirect("/select-tenant");
  if (context.status === "no-operational-tenant") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Cuenta no habilitada</h1>
        <p>
          Tu cuenta no tiene un tenant activo. Contacta al administrador para
          revisar su estado.
        </p>
      </main>
    );
  }
  const membership = context.membership;

  const { location } = await searchParams;
  const now = new Date();
  const operations = await createInstructorOperationsDeps();
  const [day, finance] = await Promise.all([
    getInstructorDay(
      {
        tenantId: membership.tenantId,
        locationId: location,
        now,
      },
      operations,
    ),
    membership.role === "assistant"
      ? Promise.resolve(undefined)
      : loadFinanceSummary(membership.tenantId, now),
  ]);

  return (
    <div className="mx-auto max-w-7xl py-1">
      <OfflineSynchronization tenantId={membership.tenantId} />
      <SessionContextRefresh
        boundaryTimes={[
          ...(day.currentSession
            ? [
                day.currentSession.startsAt.toISOString(),
                day.currentSession.endsAt.toISOString(),
              ]
            : []),
          ...(day.upcomingSessions[0]
            ? [day.upcomingSessions[0].startsAt.toISOString()]
            : []),
        ]}
      />

      {day.currentSession ? (
        <CurrentSessionPrecache sessionId={day.currentSession.id} />
      ) : null}
      <DashboardOverview
        day={day}
        location={location}
        now={now}
        finance={finance}
        hero={
          <CurrentSessionPanel
            currentSession={day.currentSession}
            nextSession={day.upcomingSessions[0]}
            role={membership.role}
          />
        }
      />
    </div>
  );
}
