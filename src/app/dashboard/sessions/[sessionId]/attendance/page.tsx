import { randomUUID } from "node:crypto";
import Link from "next/link";
import { getAttendanceRoster } from "@/application/evolution-health-attendance/use-cases/get-attendance-roster";
import { getSessionReadiness } from "@/application/evolution-health-attendance/use-cases/get-session-readiness";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { OfflineSynchronization } from "@/app/dashboard/offline-synchronization";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import { EmptyState, Surface } from "@/presentation/components/primitives";
import { AttendanceForm } from "./attendance-form";
import { AlertFreshness } from "./alert-freshness";
import { SessionRealtimeRefresh } from "./session-realtime-refresh";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const membership = await requireOperationalMembership();
  const { sessionId } = await params;
  const deps = await createEvolutionHealthAttendanceDeps();
  const tenantId = membership.tenantId;
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

  const roleLabel =
    membership.role === "owner"
      ? "Dueño"
      : membership.role === "assistant"
        ? "Asistente"
        : membership.role === "admin"
          ? "Administrador"
          : membership.role;

  return (
    <AppShell
      sidebarHeader={<ProductMark context={roleLabel} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={<QuickActionMenu role={membership.role} />}
        />
      }
      topbar={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Sesión
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Tomar asistencia
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-primary"
          >
            Volver a la jornada
          </Link>
        </div>
      }
      topbarActions={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-foreground"
            aria-label="Seleccionar tenant"
          >
            <span
              className="h-2 w-2 rounded-full bg-success"
              aria-hidden="true"
            />
            {roleLabel}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-foreground"
            aria-label="Cuenta"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {membership.role.slice(0, 1).toUpperCase()}
            </span>
            Cuenta
          </button>
        </>
      }
      context={
        <Surface className="space-y-4" tone="raised">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Estado
          </p>
          <div>
            <p className="metric-number text-2xl font-semibold text-primary">
              {participants.length}
            </p>
            <p className="text-sm text-muted-foreground">participantes</p>
          </div>
        </Surface>
      }
    >
      <div className="mx-auto max-w-3xl">
        <OfflineSynchronization tenantId={tenantId} />
        <SessionRealtimeRefresh tenantId={tenantId} sessionId={sessionId} />
        <p className="mb-6 mt-2 text-sm text-muted-foreground">
          Todos comienzan como presentes. Marca solo las excepciones y guarda el
          lote.
        </p>
        {readiness.length > 0 ? (
          <section className="mb-6" aria-labelledby="readiness-heading">
            <h2 id="readiness-heading" className="mb-2 text-xl font-semibold">
              Alertas antes de iniciar
            </h2>
            <Surface className="px-4 py-0">
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
            </Surface>
          </section>
        ) : null}
        {participants.length > 0 ? (
          <AttendanceForm
            sessionId={sessionId}
            tenantId={tenantId}
            recordedByMembershipId={membership.id}
            batchOperationId={randomUUID()}
            participants={participants}
            operationIds={participants.map(() => randomUUID())}
          />
        ) : (
          <EmptyState
            title="Sin participantes confirmados"
            description="No hay participantes confirmados en esta sesión. Revisa la agenda o confirma alumnos antes de tomar asistencia."
          />
        )}
      </div>
    </AppShell>
  );
}
