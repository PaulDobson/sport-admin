import Link from "next/link";
import { CalendarClock, MapPin, UsersRound } from "lucide-react";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import { StatusBadge, Surface } from "@/presentation/components/primitives";

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
    <Surface
      aria-label={isCurrent ? "Sesión actual" : "Próxima sesión"}
      className="p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {isCurrent ? "Sesión actual" : "Próxima sesión"}
        </p>
        <StatusBadge tone={isCurrent ? "success" : "info"}>
          {isCurrent ? "En curso" : "Programada"}
        </StatusBadge>
      </div>
      <h2 className="mt-3 text-lg font-semibold">{session.name}</h2>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
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
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <UsersRound className="h-4 w-4" aria-hidden="true" />
          <span>
            <span className="metric-number font-semibold text-foreground">
              {session.confirmedCount}/{session.capacity}
            </span>{" "}
            confirmados
          </span>
        </span>
        {session.waitlistedCount > 0 ? (
          <span className="mt-1 block text-warning">
            {session.waitlistedCount} en espera
          </span>
        ) : null}
      </p>
      {canTakeAttendance ? (
        <Link
          href={`/dashboard/sessions/${session.id}/attendance`}
          className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {isCurrent ? "Abrir asistencia" : "Preparar asistencia"}
        </Link>
      ) : null}
    </Surface>
  );
}
