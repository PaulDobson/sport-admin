import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin, UsersRound } from "lucide-react";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import { StatusBadge } from "@/presentation/components/primitives";

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
  const canTakeAttendance = [
    "owner",
    "admin",
    "instructor",
    "assistant",
  ].includes(role);

  return (
    <section
      aria-label={isCurrent ? "Sesión actual" : "Próxima sesión"}
      className="relative overflow-hidden rounded-xl bg-surface-raised px-5 py-5 sm:px-6"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-primary"
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {isCurrent ? "Sesión actual" : "Próxima sesión"}
            </p>
            <StatusBadge tone={isCurrent ? "success" : "info"}>
              {isCurrent ? "En curso" : "Programada"}
            </StatusBadge>
          </div>
          <h2 className="mt-2 truncate text-xl font-bold sm:text-2xl">
            {session.name}
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              <time dateTime={session.startsAt.toISOString()}>
                {session.startsAt.toLocaleTimeString("es", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <span aria-hidden="true">-</span>
              <time dateTime={session.endsAt.toISOString()}>
                {session.endsAt.toLocaleTimeString("es", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {session.locationName}
            </p>
            <p className="flex items-center gap-2">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              <span className="metric-number font-semibold text-foreground">
                {session.confirmedCount + (session.walkInCount ?? 0)}/{session.capacity}
              </span>
              participantes
              {(session.walkInCount ?? 0) > 0 ? (
                <span>· {session.walkInCount} sin reserva</span>
              ) : null}
              {session.waitlistedCount > 0 ? (
                <span className="text-warning">
                  · {session.waitlistedCount} en espera
                </span>
              ) : null}
            </p>
          </div>
        </div>
        {canTakeAttendance ? (
          <Link
            href={`/dashboard/sessions/${session.id}/attendance`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isCurrent ? "Abrir asistencia" : "Preparar asistencia"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
