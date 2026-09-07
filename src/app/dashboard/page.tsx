import { redirect } from "next/navigation";
import Link from "next/link";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { getInstructorDay } from "@/application/instructor-operations/use-cases/get-instructor-day";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import { AccountContextMenu } from "@/presentation/components/account-context-menu";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import { CurrentSessionPanel } from "@/presentation/components/current-session-panel";
import { SessionContextRefresh } from "@/presentation/components/session-context-refresh";
import { EmptyState, Surface } from "@/presentation/components/primitives";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import { CurrentSessionPrecache } from "./current-session-precache";
import { OfflineSynchronization } from "./offline-synchronization";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";

interface DashboardPageProps {
  searchParams: Promise<{ location?: string }>;
}

const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

function SessionRow({ session }: { session: DaySession }) {
  return (
    <article className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 border-b border-border py-4 last:border-b-0">
      <time
        className="metric-number text-xl font-semibold text-primary"
        dateTime={session.startsAt.toISOString()}
      >
        {timeFormatter.format(session.startsAt)}
      </time>
      <div className="min-w-0">
        <h3 className="truncate font-semibold">{session.name}</h3>
        <p className="truncate text-sm text-muted-foreground">
          {session.locationName}
        </p>
      </div>
      <p className="text-right text-sm text-muted-foreground">
        <span className="block font-semibold text-foreground">
          {session.confirmedCount}/{session.capacity}
        </span>
        alumnos
      </p>
      <Link
        href={`/dashboard/sessions/${session.id}/attendance`}
        className="col-span-3 justify-self-end text-sm font-semibold text-primary"
      >
        Tomar asistencia
      </Link>
    </article>
  );
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
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const operations = await createInstructorOperationsDeps();
  const [day, profile, tenants] = await Promise.all([
    getInstructorDay(
      {
        tenantId: membership.tenantId,
        locationId: location,
        now: new Date(),
      },
      operations,
    ),
    auth.profiles.findByUserId(userId),
    auth.tenants.findOperationalByUser(userId),
  ]);

  const roleLabel =
    membership.role === "owner"
      ? "Dueño"
      : membership.role === "assistant"
        ? "Asistente"
        : membership.role === "admin"
          ? "Administrador"
          : membership.role;

  const contextPanel = (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-raised p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Estado de jornada
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <p className="metric-number text-2xl font-semibold text-primary">
              {day.activeStudents}
            </p>
            <p className="text-sm text-muted-foreground">alumnos activos</p>
          </div>
          <div>
            <p className="metric-number text-2xl font-semibold">
              {day.upcomingSessions.length + (day.currentSession ? 1 : 0)}
            </p>
            <p className="text-sm text-muted-foreground">sesiones abiertas</p>
          </div>
        </div>
      </div>

      <CurrentSessionPanel
        currentSession={day.currentSession}
        nextSession={day.upcomingSessions[0]}
        role={membership.role}
      />
    </div>
  );

  return (
    <AppShell
      sidebarHeader={<ProductMark context={roleLabel} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={
            <QuickActionMenu
              role={membership.role}
              currentSessionId={day.currentSession?.id}
            />
          }
        />
      }
      topbar={
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Jornada
          </p>
          <h1 className="text-xl font-semibold sm:text-2xl">Panel operativo</h1>
        </div>
      }
      topbarActions={
        <AccountContextMenu
          profileName={profile?.fullName || "Tu cuenta"}
          currentTenantId={membership.tenantId}
          roleLabel={roleLabel}
          tenants={tenants.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
          }))}
          locations={day.locations}
          currentLocationId={location}
        />
      }
      context={contextPanel}
    >
      <div className="mx-auto max-w-5xl">
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

        <nav
          className="mb-6 flex flex-wrap justify-end gap-2"
          aria-label="Accesos rápidos"
        >
          <Link
            href="/dashboard/students"
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised"
          >
            Alumnos
          </Link>
          <Link
            href="/dashboard/finance"
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised"
          >
            Membresías y finanzas
          </Link>
          <Link
            href="/dashboard/reports"
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised"
          >
            Reportes
          </Link>
        </nav>

        <Surface className="mb-6 grid grid-cols-2 gap-0 p-0 sm:grid-cols-3">
          <div className="p-4">
            <p className="metric-number text-3xl font-semibold">
              {day.activeStudents}
            </p>
            <p className="text-sm text-muted-foreground">Alumnos activos</p>
          </div>
          <div className="border-l border-border p-4">
            <p className="metric-number text-3xl font-semibold">
              {day.upcomingSessions.length + (day.currentSession ? 1 : 0)}
            </p>
            <p className="text-sm text-muted-foreground">Sesiones abiertas</p>
          </div>
          <div className="col-span-2 border-t border-border p-4 sm:col-span-1 sm:border-l sm:border-t-0">
            <p className="metric-number text-3xl font-semibold text-warning">
              {day.pendingEnrollments}
            </p>
            <p className="text-sm text-muted-foreground">En espera</p>
          </div>
        </Surface>

        <form
          className="mb-6 flex items-end gap-3"
          method="get"
          aria-label="Filtrar jornada"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
            Locación
            <select
              name="location"
              defaultValue={location ?? ""}
              className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
            >
              <option value="">Todas</option>
              {day.locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Aplicar
          </button>
        </form>

        {day.currentSession || day.upcomingSessions[0] ? (
          <div className="mb-8 lg:hidden">
            {day.currentSession ? (
              <CurrentSessionPrecache sessionId={day.currentSession.id} />
            ) : null}
            <CurrentSessionPanel
              currentSession={day.currentSession}
              nextSession={day.upcomingSessions[0]}
              role={membership.role}
            />
          </div>
        ) : null}

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Próximas sesiones</h2>
            <span className="text-sm text-muted-foreground">
              {day.upcomingSessions.length} programadas
            </span>
          </div>
          {day.upcomingSessions.length > 0 ? (
            <Surface className="px-4 py-0">
              {day.upcomingSessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </Surface>
          ) : (
            <EmptyState
              title="Sin próximas sesiones"
              description="No hay próximas sesiones para este filtro. Cambia la locación o revisa la agenda."
              action={
                <Link
                  href="/dashboard/schedule"
                  className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-surface-raised"
                >
                  Ver agenda
                </Link>
              }
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
