import { redirect } from "next/navigation";
import Link from "next/link";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { getInstructorDay } from "@/application/instructor-operations/use-cases/get-instructor-day";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
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
  const deps = await createAuthDeps();
  const userId = await deps.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");

  const activeMemberships = await deps.memberships.findActiveByUser(userId);
  if (activeMemberships.length === 0) redirect("/onboarding");

  const memberships = await deps.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) {
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

  const { location } = await searchParams;
  const operations = await createInstructorOperationsDeps();
  const day = await getInstructorDay(
    {
      tenantId: memberships[0].tenantId,
      locationId: location,
      now: new Date(),
    },
    operations,
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <OfflineSynchronization tenantId={memberships[0].tenantId} />
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Jornada</p>
          <h1 className="text-3xl font-semibold">Panel operativo</h1>
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          {new Intl.DateTimeFormat("es", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </p>
      </header>

      <nav className="mb-6 flex flex-wrap justify-end gap-2">
        <Link
          href="/dashboard/students"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold text-foreground"
        >
          Alumnos
        </Link>
        <Link
          href="/dashboard/finance"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold text-foreground"
        >
          Membresías y finanzas
        </Link>
        <Link
          href="/dashboard/reports"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold text-foreground"
        >
          Reportes
        </Link>
      </nav>

      <section className="mb-6 grid grid-cols-2 border-y border-border sm:grid-cols-3">
        <div className="py-4">
          <p className="metric-number text-3xl font-semibold">
            {day.activeStudents}
          </p>
          <p className="text-sm text-muted-foreground">Alumnos activos</p>
        </div>
        <div className="border-l border-border py-4 pl-4">
          <p className="metric-number text-3xl font-semibold">
            {day.upcomingSessions.length + (day.currentSession ? 1 : 0)}
          </p>
          <p className="text-sm text-muted-foreground">Sesiones abiertas</p>
        </div>
        <div className="col-span-2 border-t border-border py-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4">
          <p className="metric-number text-3xl font-semibold text-warning">
            {day.pendingEnrollments}
          </p>
          <p className="text-sm text-muted-foreground">En espera</p>
        </div>
      </section>

      <form className="mb-6 flex items-end gap-3" method="get">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
          Locación
          <select
            name="location"
            defaultValue={location ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
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
          className="h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
        >
          Aplicar
        </button>
      </form>

      {day.currentSession ? (
        <section className="mb-8 rounded-lg border border-primary bg-card p-5 shadow-lg shadow-black/10">
          <CurrentSessionPrecache sessionId={day.currentSession.id} />
          <p className="mb-3 text-sm font-semibold uppercase text-primary">
            En curso ahora
          </p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                {day.currentSession.name}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {day.currentSession.locationName} · hasta las{" "}
                {timeFormatter.format(day.currentSession.endsAt)}
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="metric-number block text-2xl font-semibold">
                {day.currentSession.confirmedCount}/
                {day.currentSession.capacity}
              </span>
              <span className="text-sm text-muted-foreground">presentes</span>
            </p>
          </div>
          <Link
            href={`/dashboard/sessions/${day.currentSession.id}/attendance`}
            className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground"
          >
            Abrir asistencia
          </Link>
        </section>
      ) : null}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Próximas sesiones</h2>
          <span className="text-sm text-muted-foreground">
            {day.upcomingSessions.length} programadas
          </span>
        </div>
        {day.upcomingSessions.length > 0 ? (
          <div className="surface-panel px-4">
            {day.upcomingSessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <p className="border-y border-border py-8 text-center text-muted-foreground">
            No hay próximas sesiones para este filtro.
          </p>
        )}
      </section>
    </main>
  );
}
