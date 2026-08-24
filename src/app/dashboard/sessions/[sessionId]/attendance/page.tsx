import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAttendanceRoster } from "@/application/evolution-health-attendance/use-cases/get-attendance-roster";
import { getSessionReadiness } from "@/application/evolution-health-attendance/use-cases/get-session-readiness";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { OfflineSynchronization } from "@/app/dashboard/offline-synchronization";
import { AttendanceForm } from "./attendance-form";
import { AlertFreshness } from "./alert-freshness";
import { SessionRealtimeRefresh } from "./session-realtime-refresh";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) redirect("/onboarding");
  const { sessionId } = await params;
  const deps = await createEvolutionHealthAttendanceDeps();
  const tenantId = memberships[0].tenantId;
  const checkedAt = new Date();
  const [participants, readiness] = await Promise.all([
    getAttendanceRoster({ tenantId, sessionId }, deps),
    getSessionReadiness(
      {
        tenantId,
        sessionId,
        onDate: checkedAt.toISOString().slice(0, 10),
        checkedAt,
      },
      deps,
    ),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <OfflineSynchronization tenantId={tenantId} />
      <SessionRealtimeRefresh tenantId={tenantId} sessionId={sessionId} />
      <Link href="/dashboard" className="text-sm font-semibold text-primary">
        Volver a la jornada
      </Link>
      <header className="mb-6 mt-5">
        <p className="mb-1 text-sm font-medium text-primary">Sesión</p>
        <h1 className="text-3xl font-semibold">Tomar asistencia</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Todos comienzan como presentes. Marca solo las excepciones y guarda el
          lote.
        </p>
      </header>
      {readiness.length > 0 ? (
        <section className="mb-6" aria-labelledby="readiness-heading">
          <h2 id="readiness-heading" className="mb-2 text-xl font-semibold">
            Alertas antes de iniciar
          </h2>
          <div className="surface-panel px-4">
            {readiness.map((item) => (
              <article
                key={item.studentId}
                className="grid grid-cols-[auto_1fr] gap-3 border-b border-border py-4 last:border-b-0"
              >
                <span
                  className={`mt-1 h-3 w-3 rounded-full ${
                    item.level === "red"
                      ? "bg-destructive"
                      : item.level === "yellow"
                        ? "bg-warning"
                        : "bg-success"
                  }`}
                  aria-label={`Nivel ${item.level}`}
                />
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/students/${item.studentId}`}
                    className="font-semibold text-foreground"
                  >
                    {item.studentName}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.reason}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {item.operationalAction}
                  </p>
                  <AlertFreshness checkedAt={item.checkedAt.toISOString()} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {participants.length > 0 ? (
        <AttendanceForm
          sessionId={sessionId}
          tenantId={tenantId}
          recordedByMembershipId={memberships[0].id}
          batchOperationId={randomUUID()}
          participants={participants}
          operationIds={participants.map(() => randomUUID())}
        />
      ) : (
        <p className="border-y border-border py-8 text-center text-muted-foreground">
          No hay participantes confirmados en esta sesión.
        </p>
      )}
    </main>
  );
}
