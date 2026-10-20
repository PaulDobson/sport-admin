import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { StatusBadge } from "@/presentation/components/primitives";
import { SessionMaintenance } from "./session-maintenance";
import {
  isSessionCurrent,
  operationalDateKey,
  sessionCapacity,
  sessionDateFormatter,
  sessionTimeFormatter,
} from "./session-presentation";

// Module-level constant — not recreated per render.
const TABLE_HEADERS = [
  "Fecha y hora",
  "Clase",
  "Ubicación",
  "Estado",
  "Cupos",
  "Acciones",
] as const;

export function SessionTable({
  sessions,
  now,
  canManage,
}: {
  sessions: DaySession[];
  now: Date;
  canManage: boolean;
}) {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-border bg-card"
      tabIndex={0}
      role="region"
      aria-label="Tabla de sesiones"
    >
      <table className="w-full min-w-175 text-left text-sm">
        <caption className="sr-only">Sesiones del período seleccionado</caption>
        <thead className="border-b border-border bg-surface-raised/60 text-xs text-muted-foreground">
          <tr>
            {TABLE_HEADERS.map((label) => (
              <th key={label} scope="col" className="px-4 py-3 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sessions.map((session) => {
            const cancelled = session.status === "cancelled";
            const completed = session.status === "completed";
            const current =
              !cancelled && !completed && isSessionCurrent(session, now);
            const label = cancelled
              ? "Cancelada"
              : completed || session.endsAt <= now
                ? "Finalizada"
                : current
                  ? "En curso"
                  : "Próxima";

            // Compute occupied once — sessionCapacity returns it now.
            const { occupied, percent, available } = sessionCapacity(session);

            // Compute date keys once per row.
            const startsDateKey = operationalDateKey(session.startsAt);
            const endsDateKey = operationalDateKey(session.endsAt);
            const crossesMidnight = startsDateKey !== endsDateKey;

            return (
              <tr
                key={session.id}
                className="align-middle transition-colors hover:bg-surface-raised/40"
              >
                <td className="px-4 py-4">
                  <p className="font-medium">
                    {sessionDateFormatter.format(session.startsAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <time dateTime={session.startsAt.toISOString()}>
                      {sessionTimeFormatter.format(session.startsAt)}
                    </time>
                    {" – "}
                    <time dateTime={session.endsAt.toISOString()}>
                      {crossesMidnight
                        ? `${sessionDateFormatter.format(session.endsAt)} · `
                        : ""}
                      {sessionTimeFormatter.format(session.endsAt)}
                    </time>
                  </p>
                </td>
                <th scope="row" className="px-4 py-3 font-semibold">
                  {session.name}
                </th>
                <td className="px-4 py-3 text-muted-foreground">
                  {session.locationName}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge
                    tone={
                      cancelled ? "warning" : current ? "success" : "neutral"
                    }
                  >
                    {label}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <p className="whitespace-nowrap text-xs">
                    <span className="metric-number font-semibold">
                      {occupied}/{session.capacity}
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      participantes
                    </span>
                  </p>
                  <div
                    role="meter"
                    aria-label={`Ocupación de ${session.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-valuetext={`${occupied} participantes de ${session.capacity} cupos`}
                    className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={`h-full rounded-full ${available === 0 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(session.walkInCount ?? 0) > 0
                      ? `${session.walkInCount} sin reserva · `
                      : ""}
                    {session.waitlistedCount} en espera
                  </p>
                </td>
                <td className="w-32 px-4 py-3">
                  <div className="flex items-center gap-1">
                    {!cancelled ? (
                      <Link
                        href={`/dashboard/sessions/${session.id}/attendance`}
                        title="Tomar asistencia"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors hover:border-primary/40 hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        aria-label={`Tomar asistencia de ${session.name}`}
                      >
                        <ClipboardCheck
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      </Link>
                    ) : null}
                    {canManage && !completed ? (
                      <SessionMaintenance session={session} compact />
                    ) : null}
                    {cancelled && (!canManage || completed) ? (
                      <span className="text-xs text-muted-foreground">
                        Sin acciones
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
