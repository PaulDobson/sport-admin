import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { getAttendanceRoster } from "@/application/evolution-health-attendance/use-cases/get-attendance-roster";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { OfflineSynchronization } from "@/app/dashboard/offline-synchronization";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { Surface } from "@/presentation/components/primitives";
import {
  sessionDateFormatter,
  sessionTimeFormatter,
} from "@/app/dashboard/schedule/session-presentation";
import { AttendanceForm } from "./attendance-form";
import { SessionRealtimeRefresh } from "./session-realtime-refresh";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const membership = await requireOperationalMembership();
  const { sessionId } = await params;
  const tenantId = membership.tenantId;
  const operations = await createInstructorOperationsDeps();
  const session = await operations.scheduleSessions.findById(tenantId, sessionId);
  if (!session) notFound();
  const deps = await createEvolutionHealthAttendanceDeps();
  const participants = await getAttendanceRoster({ tenantId, sessionId }, deps);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/schedule"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver a sesiones
      </Link>
      <Surface className="mb-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Asistencia de la sesión
          </p>
          <h1 className="mt-1 text-2xl font-bold [overflow-wrap:anywhere]">
            {session.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <p className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              <time dateTime={session.startsAt.toISOString()}>
                {sessionDateFormatter.format(session.startsAt)}
              </time>
            </p>
            <p className="flex items-center gap-2 font-semibold">
              <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              <time dateTime={session.startsAt.toISOString()}>
                {sessionTimeFormatter.format(session.startsAt)}
              </time>
              <span aria-hidden="true">–</span>
              <span className="sr-only">hasta</span>
              <time dateTime={session.endsAt.toISOString()}>
                {sessionTimeFormatter.format(session.endsAt)}
              </time>
            </p>
            <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="[overflow-wrap:anywhere]">{session.locationName}</span>
            </p>
          </div>
        </header>
      </Surface>
      <OfflineSynchronization tenantId={tenantId} />
      <SessionRealtimeRefresh tenantId={tenantId} sessionId={sessionId} />
      <p className="mb-6 mt-2 text-sm text-muted-foreground">
        Los alumnos sin registro comienzan como presentes. Añade a quienes
        llegaron sin reserva, marca las excepciones y guarda el lote.
      </p>
      <AttendanceForm
        sessionId={sessionId}
        tenantId={tenantId}
        recordedByMembershipId={membership.id}
        batchOperationId={randomUUID()}
        participants={participants}
        operationIds={participants.map(() => randomUUID())}
      />
    </div>
  );
}
