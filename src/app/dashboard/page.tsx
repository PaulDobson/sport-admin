import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, SlidersHorizontal } from "lucide-react";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { getInstructorDay } from "@/application/instructor-operations/use-cases/get-instructor-day";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { CurrentSessionPanel } from "@/presentation/components/current-session-panel";
import { SessionContextRefresh } from "@/presentation/components/session-context-refresh";
import { EmptyState } from "@/presentation/components/primitives";
import { CurrentSessionPrecache } from "./current-session-precache";
import { OfflineSynchronization } from "./offline-synchronization";

interface DashboardPageProps {
  searchParams: Promise<{ location?: string }>;
}

const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

function SessionRow({ session }: { session: DaySession }) {
  return (
    <article className="group grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-white/2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] sm:px-5">
      <div className="text-center">
        <time
          className="metric-number block text-lg font-bold text-primary"
          dateTime={session.startsAt.toISOString()}
        >
          {timeFormatter.format(session.startsAt)}
        </time>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Inicio
        </span>
      </div>
      <div className="min-w-0 border-l border-white/6 pl-4">
        <h3 className="truncate font-bold text-foreground">{session.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{session.locationName}</span>
        </p>
      </div>
      <p className="text-right text-xs text-muted-foreground sm:text-sm">
        <span className="metric-number block font-bold text-foreground">
          {session.confirmedCount + (session.walkInCount ?? 0)}/{session.capacity}
        </span>
        alumnos
      </p>
      <Link
        href={`/dashboard/sessions/${session.id}/attendance`}
        className="col-span-3 inline-flex min-h-9 items-center gap-1.5 justify-self-end rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/15 sm:col-span-1"
      >
        Asistencia
        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
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
  const operations = await createInstructorOperationsDeps();
  const day = await getInstructorDay(
    {
      tenantId: membership.tenantId,
      locationId: location,
      now: new Date(),
    },
    operations,
  );

  return (
    <div className="mx-auto max-w-6xl py-1">
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

      {day.currentSession || day.upcomingSessions[0] ? (
        <div className="mb-8">
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

      <section
        aria-label="Resumen de jornada"
        className="mb-10 grid grid-cols-3 border-y border-white/7"
      >
        <div className="py-5 pr-3 sm:py-6 sm:pr-6">
          <p className="metric-number text-2xl font-bold sm:text-3xl">
            {day.activeStudents}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground sm:text-sm">
            Alumnos activos
          </p>
        </div>
        <div className="border-l border-white/7 px-3 py-5 sm:px-6 sm:py-6">
          <p className="metric-number text-2xl font-bold sm:text-3xl">
            {day.upcomingSessions.length + (day.currentSession ? 1 : 0)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground sm:text-sm">
            Sesiones abiertas
          </p>
        </div>
        <div className="border-l border-white/7 py-5 pl-3 sm:py-6 sm:pl-6">
          <p className="metric-number text-2xl font-bold text-warning sm:text-3xl">
            {day.pendingEnrollments}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground sm:text-sm">
            En espera
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Agenda de hoy
            </p>
            <h2 className="text-xl font-bold">Próximas sesiones</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {day.upcomingSessions.length} programadas para esta jornada
            </p>
          </div>
          <form
            className="flex items-center gap-2"
            method="get"
            aria-label="Filtrar jornada"
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="hidden h-4 w-4 text-muted-foreground sm:block"
            />
            <label htmlFor="dashboard-location" className="sr-only">
              Locación
            </label>
            <select
              id="dashboard-location"
              name="location"
              defaultValue={location ?? ""}
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/8 bg-card/65 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-44"
            >
              <option value="">Todas las locaciones</option>
              {day.locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Aplicar
            </button>
          </form>
        </div>
        {day.upcomingSessions.length > 0 ? (
          <div className="divide-y divide-white/5 overflow-hidden rounded-xl bg-card/55">
            {day.upcomingSessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
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
  );
}
