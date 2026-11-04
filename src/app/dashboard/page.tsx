import { redirect } from "next/navigation";
import {
  getFinanceDashboard,
  selectFinanceCurrency,
} from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import { getInstructorDay } from "@/application/instructor-operations/use-cases/get-instructor-day";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { createTenantDetailsDeps } from "@/infrastructure/composition/tenant-details-composition";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { CurrentSessionPanel } from "@/presentation/components/current-session-panel";
import { SessionContextRefresh } from "@/presentation/components/session-context-refresh";
import { CurrentSessionPrecache } from "./current-session-precache";
import { OfflineSynchronization } from "./offline-synchronization";
import {
  DashboardOverview,
  type DashboardFinanceSummary,
} from "./dashboard-overview";

// ── Greeting helpers ─────────────────────────────────────────────────────────

function greetingForHour(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function DashboardGreeting({
  profileName,
  academyName,
  now,
}: {
  profileName: string | null;
  academyName: string | null;
  now: Date;
}) {
  const greeting = greetingForHour(now.getHours());
  // Show only the first name to keep the greeting friendly and brief.
  const firstName = profileName?.split(" ")[0] ?? null;

  return (
    <div className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
      <div>
        <p className="text-lg font-bold text-foreground sm:text-xl">
          {firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`}
        </p>
        {academyName ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{academyName}</p>
        ) : null}
      </div>
    </div>
  );
}

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
  // Reuse a single auth instance — loadOperationalContext already created one
  // internally; we create a second here only to fetch the profile. Keeping it
  // in the same Promise.all as the heavier operations avoids a sequential roundtrip.
  const [auth, tenantDetailsRepo, operations] = await Promise.all([
    createAuthDeps(),
    createTenantDetailsDeps(),
    createInstructorOperationsDeps(),
  ]);
  const userId = await auth.auth.getCurrentUserId();
  const [day, finance, profile, tenantDetails] = await Promise.all([
    getInstructorDay(
      { tenantId: membership.tenantId, locationId: location, now },
      operations,
    ),
    membership.role === "assistant"
      ? Promise.resolve(undefined)
      : loadFinanceSummary(membership.tenantId, now),
    userId ? auth.profiles.findByUserId(userId) : Promise.resolve(null),
    tenantDetailsRepo.findByTenantId(membership.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-7xl py-1">
      <OfflineSynchronization tenantId={membership.tenantId} />
      <DashboardGreeting
        profileName={profile?.fullName ?? null}
        academyName={tenantDetails?.name ?? null}
        now={now}
      />
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
