import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, UsersRound } from "lucide-react";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { StatusBadge } from "@/presentation/components/primitives";
import { SessionMaintenance } from "./session-maintenance";
import {
  groupSessionsByDate,
  isSessionCurrent,
  operationalDateKey,
  sessionCapacity,
  sessionDateFormatter,
  sessionOccupiedCount,
  sessionTimeFormatter,
} from "./session-presentation";

export function SessionList({
  sessions,
  now,
  canManage = false,
}: {
  sessions: DaySession[];
  now: Date;
  canManage?: boolean;
}) {
  const today = operationalDateKey(now);
  return (
    <div className="space-y-7">
      {groupSessionsByDate(sessions).map((group) => (
        <section key={group.date} aria-labelledby={`date-${group.date}`}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-primary" />
            <h3 id={`date-${group.date}`} className="font-semibold capitalize">
              {group.date === today ? "Hoy · " : ""}
              {sessionDateFormatter.format(group.sessions[0].startsAt)}
            </h3>
            <span className="text-xs text-muted-foreground">
              {group.sessions.length} {group.sessions.length === 1 ? "sesión" : "sesiones"}
            </span>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {group.sessions.map((session) => {
              const current =
                session.status !== "cancelled" &&
                session.status !== "completed" &&
                isSessionCurrent(session, now);
              const statusLabel =
                session.status === "cancelled"
                  ? "Cancelada"
                  : session.status === "completed"
                    ? "Finalizada"
                    : current
                      ? "En curso"
                      : session.endsAt <= now
                        ? "Finalizada"
                        : "Próxima";
              const { available, percent } = sessionCapacity(session);
              const occupied = sessionOccupiedCount(session);
              const walkIns = session.walkInCount ?? 0;
              const attended = session.attendedCount ?? 0;
              return (
                <article
                  key={session.id}
                  aria-labelledby={`session-${session.id}`}
                  className={`rounded-xl border p-4 shadow-lg shadow-black/10 sm:p-5 ${
                    current
                      ? "border-primary/50 bg-linear-to-br from-primary/10 to-card"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusBadge
                          tone={
                            current
                              ? "success"
                              : session.status === "cancelled"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {statusLabel}
                        </StatusBadge>
                        {available === 0 ? <StatusBadge tone="warning">Cupo completo</StatusBadge> : null}
                      </div>
                      <h4 id={`session-${session.id}`} className="wrap-break-word text-xl font-bold">
                        {session.name}
                      </h4>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <time dateTime={session.startsAt.toISOString()}>
                            {sessionTimeFormatter.format(session.startsAt)}
                          </time>
                          <span aria-hidden="true">–</span>
                          <time dateTime={session.endsAt.toISOString()}>
                            {operationalDateKey(session.endsAt) !== group.date
                              ? `${sessionDateFormatter.format(session.endsAt)} · `
                              : ""}
                            {sessionTimeFormatter.format(session.endsAt)}
                          </time>
                        </p>
                        <p className="flex min-w-0 items-center gap-2 wrap-break-word">
                          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                          {session.locationName}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 rounded-lg border border-border/70 bg-background/35 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <UsersRound aria-hidden="true" className="h-4 w-4" />
                        Participantes
                      </p>
                      <p className="metric-number mt-1 text-2xl font-bold">
                        {occupied}<span className="text-base font-normal text-muted-foreground"> / {session.capacity}</span>
                      </p>
                      <div
                        role="meter"
                        aria-label={`Ocupación de ${session.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        aria-valuetext={`${occupied} participantes de ${session.capacity} cupos`}
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className={`h-full rounded-full ${available === 0 ? "bg-warning" : "bg-primary"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {session.confirmedCount} con reserva{walkIns > 0 ? ` · ${walkIns} sin reserva` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {available} cupos disponibles · {session.waitlistedCount} en espera
                      </p>
                      {attended > 0 ? (
                        <p className="mt-2 text-xs font-semibold text-primary">
                          {attended} {attended === 1 ? "presente" : "presentes"} registrados
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">
                      {current ? "Registra la asistencia de este entrenamiento." : "Revisa participantes y prepara la asistencia."}
                    </p>
                    {session.status !== "cancelled" ? (
                      <Link
                        href={`/dashboard/sessions/${session.id}/attendance`}
                        aria-label={`Tomar asistencia de ${session.name}`}
                        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto ${
                          current
                            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border-border bg-surface-raised hover:bg-surface-overlay"
                        }`}
                      >
                        Tomar asistencia
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                  {canManage && session.status !== "completed" ? (
                    <SessionMaintenance session={session} />
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
