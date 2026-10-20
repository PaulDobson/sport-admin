import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin, UsersRound } from "lucide-react";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import { StatusBadge } from "@/presentation/components/primitives";

// Module-level constants — computed once, never again.
const CIRCLE_RADIUS = 42;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// Reuse a single Intl instance across all renders instead of relying on
// toLocaleTimeString() which constructs a new DateTimeFormat under the hood.
const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

const ATTENDANCE_ROLES: readonly TenantMembershipRole[] = [
  "owner",
  "admin",
  "instructor",
  "assistant",
];

export function CurrentSessionPanel({
  currentSession,
  nextSession,
  role,
}: {
  currentSession: DaySession | null;
  nextSession?: DaySession;
  role: TenantMembershipRole;
}) {
  const session = currentSession ?? nextSession;
  if (!session) return null;

  const isCurrent = currentSession !== null;
  const canTakeAttendance = ATTENDANCE_ROLES.includes(role);

  const participants = session.confirmedCount + (session.walkInCount ?? 0);
  const percent =
    session.capacity > 0
      ? Math.min(100, Math.round((participants / session.capacity) * 100))
      : 0;

  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - percent / 100);

  return (
    <section
      aria-label={isCurrent ? "Sesión actual" : "Próxima sesión"}
      className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-5 sm:p-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/18 via-primary/5 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {isCurrent ? "Sesión actual" : "Próxima sesión"}
            </p>
            <StatusBadge tone={isCurrent ? "success" : "info"}>
              {isCurrent ? "En curso" : "Programada"}
            </StatusBadge>
          </div>
          <h2 className="mt-3 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {session.name}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
              <CalendarClock
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span className="metric-number text-foreground">
                <time dateTime={session.startsAt.toISOString()}>
                  {timeFormatter.format(session.startsAt)}
                </time>
                <span aria-hidden="true"> – </span>
                <time dateTime={session.endsAt.toISOString()}>
                  {timeFormatter.format(session.endsAt)}
                </time>
              </span>
            </p>
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {session.locationName}
            </p>
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
              <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="metric-number font-semibold text-foreground">
                {participants}/{session.capacity}
              </span>
              participantes
            </p>
          </div>
          {(session.walkInCount ?? 0) > 0 || session.waitlistedCount > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {(session.walkInCount ?? 0) > 0 ? (
                <span>{session.walkInCount} sin reserva</span>
              ) : null}
              {(session.walkInCount ?? 0) > 0 && session.waitlistedCount > 0
                ? " · "
                : null}
              {session.waitlistedCount > 0 ? (
                <span className="text-warning">
                  {session.waitlistedCount} en espera
                </span>
              ) : null}
            </p>
          ) : null}
          {canTakeAttendance ? (
            <Link
              href={`/dashboard/sessions/${session.id}/attendance`}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {isCurrent ? "Abrir asistencia" : "Preparar asistencia"}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:gap-2">
          <div className="relative h-28 w-28">
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r={CIRCLE_RADIUS}
                fill="none"
                strokeWidth="9"
                className="stroke-white/8"
              />
              <circle
                cx="50"
                cy="50"
                r={CIRCLE_RADIUS}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className={percent >= 100 ? "stroke-warning" : "stroke-primary"}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center">
              <span className="metric-number text-2xl font-bold text-foreground">
                {percent}%
              </span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Cupos ocupados</p>
        </div>
      </div>
    </section>
  );
}
